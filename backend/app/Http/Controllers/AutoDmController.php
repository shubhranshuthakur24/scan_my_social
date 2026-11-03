<?php

namespace App\Http\Controllers;

use App\Http\Requests\AutoDmRequest;
use App\Jobs\ExecuteAutomationActionJob;
use App\Models\AutodmLinkClick;
use App\Models\AutodmReminderEvent;
use App\Models\AutomationFlow;
use App\Models\AutomationFlowMessage;
use App\Models\AutomationLog;
use App\Models\InstagramAccount;
use App\Models\InstagramAccountMediaAnalytics;
use App\Models\LeadForm;
use App\Services\AutoDmTemplateCatalogService;
use App\Services\ImageCompressionService;
use App\Services\MediaUrlService;
use App\Services\MetaApiService;
use App\Services\PlanService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AutoDmController extends Controller
{
    public function __construct(
        private readonly MediaUrlService $mediaUrlService,
        private readonly ImageCompressionService $imageCompressionService
    ) {}

    /**
     * Display the AutoDM Dashboard
     */
    public function index(MetaApiService $metaApiService)
    {
        $user = auth()->user();
        $userId = (int) $user->id;
        $allAccounts = InstagramAccount::query()
            ->where('user_id', $userId)
            ->latest()
            ->get(['id', 'username', 'status', 'profile_url', 'profile_picture_url', 'ig_account_id', 'updated_at']);
        $activeAccounts = $allAccounts->where('status', 'active');
        $hasActiveAccount = $activeAccounts->isNotEmpty();

        $accounts = $this->hydrateAccountsForAutodm(
            $allAccounts,
            $metaApiService
        );
        $selectedAccount = $activeAccounts->first();
        $connectedCount = $allAccounts->count();
        $activeConnectedCount = $activeAccounts->count();
        $accountLimit = PlanService::instagramAccountLimit($user);
        $canConnectMore = PlanService::canConnectMoreInstagramAccounts($user);
        $hasPaidPlan = PlanService::hasActivePaidPlan($user);
        $activePlanTier = PlanService::activePlanTier($user);
        $disconnectedAccount = $allAccounts->firstWhere('status', 'disconnected');
        $disconnectToast = null;

        if ($disconnectedAccount) {
            $accountLabel = trim((string) $disconnectedAccount->username);
            if ($accountLabel === '') {
                $accountLabel = trim((string) $disconnectedAccount->ig_account_id);
            }

            $disconnectToast = [
                'account_id' => (int) $disconnectedAccount->id,
                'username' => $disconnectedAccount->username,
                'updated_at' => optional($disconnectedAccount->updated_at)->toIso8601String(),
                'message' => "Instagram account @{$accountLabel} disconnected. Reconnect to resume AutoDM flows.",
            ];
        }

        $flows = AutomationFlow::where('user_id', $userId)
            ->with([
                'instagramAccount',
                'messageVariants' => fn ($query) => $query
                    ->where('message_type', 'reply')
                    ->where('is_active', true)
                    ->select('id', 'automation_flow_id', 'message_text', 'media_url')
                    ->oldest('id'),
            ])
            ->withCount([
                'logs as runs_count',
                'logs as sent_runs_count' => fn ($query) => $query->where('status', 'sent'),
                'logs as failed_runs_count' => fn ($query) => $query->where('status', 'failed'),
            ])
            ->latest()
            ->get();

        $flowIds = $flows->pluck('id')->filter()->values();
        $clickCountsByFlow = collect();
        $clickCountsByMessage = collect();
        $reminderMetricsByFlow = collect();
        $recentLogsByFlow = collect();

        if ($flowIds->isNotEmpty()) {
            $clickCountsByFlow = AutodmLinkClick::query()
                ->whereIn('automation_flow_id', $flowIds)
                ->selectRaw('automation_flow_id, COUNT(*) as clicks_count')
                ->groupBy('automation_flow_id')
                ->pluck('clicks_count', 'automation_flow_id');

            $clickCountsByMessage = AutodmLinkClick::query()
                ->whereIn('automation_flow_id', $flowIds)
                ->whereNotNull('automation_flow_message_id')
                ->selectRaw('automation_flow_message_id, COUNT(*) as clicks_count')
                ->groupBy('automation_flow_message_id')
                ->pluck('clicks_count', 'automation_flow_message_id');

            $reminderMetricsByFlow = AutodmReminderEvent::query()
                ->whereIn('automation_flow_id', $flowIds)
                ->selectRaw('automation_flow_id')
                ->selectRaw("SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count")
                ->selectRaw("SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count")
                ->selectRaw("SUM(CASE WHEN status = 'skipped_window' THEN 1 ELSE 0 END) as skipped_window_count")
                ->selectRaw('SUM(clicks_count) as clicks_count')
                ->groupBy('automation_flow_id')
                ->get()
                ->keyBy('automation_flow_id');

            $recentLogs = AutomationLog::query()
                ->whereIn('automation_flow_id', $flowIds)
                ->orderByDesc('id')
                ->get(['id', 'automation_flow_id', 'status', 'error_message', 'recipient_ig_id', 'created_at']);

            $recentLogsByFlow = $recentLogs
                ->groupBy('automation_flow_id')
                ->map(fn ($logs) => $logs->take(5)->values());
        }

        $flows->each(function (AutomationFlow $flow) use ($clickCountsByFlow, $clickCountsByMessage, $reminderMetricsByFlow, $recentLogsByFlow): void {
            $firstVariant = $flow->messageVariants->first();
            $replyPreview = trim((string) ($firstVariant?->message_text ?? ''));
            if ($replyPreview === '' && filled($firstVariant?->media_url)) {
                $replyPreview = '[Image reply]';
            }

            $flow->messageVariants->transform(function (AutomationFlowMessage $variant) use ($clickCountsByMessage) {
                $variant->setAttribute(
                    'preview_media_url',
                    $this->mediaUrlService->previewUrl((string) ($variant->media_url ?? ''))
                );
                $variant->setAttribute(
                    'clicks_count',
                    (int) ($clickCountsByMessage[$variant->id] ?? 0)
                );

                return $variant;
            });

            $reminderMetrics = $reminderMetricsByFlow->get($flow->id);
            $flow->setAttribute('reply_preview', $replyPreview !== '' ? $replyPreview : null);
            $flow->setAttribute('clicks_count', (int) ($clickCountsByFlow[$flow->id] ?? 0));
            $flow->setAttribute('reminder_metrics', [
                'scheduled' => (int) ($reminderMetrics?->scheduled_count ?? 0),
                'sent' => (int) ($reminderMetrics?->sent_count ?? 0),
                'skipped_window' => (int) ($reminderMetrics?->skipped_window_count ?? 0),
                'clicked' => (int) ($reminderMetrics?->clicks_count ?? 0),
            ]);
            $flow->setAttribute(
                'recent_logs',
                ($recentLogsByFlow[$flow->id] ?? collect())->values()
            );
        });

        $performance = [
            'total_runs' => 0,
            'sent_runs' => 0,
            'failed_runs' => 0,
            'success_rate' => 0,
            'runs_last_7_days' => 0,
            'total_clicks' => 0,
            'reminder_scheduled' => 0,
            'reminder_sent' => 0,
            'reminder_skipped_window' => 0,
            'reminder_clicked' => 0,
            'active_flows' => $flows->where('status', 'active')->count(),
            'paused_flows' => $flows->where('status', 'paused')->count(),
        ];

        if ($flowIds->isNotEmpty()) {
            $aggregate = AutomationLog::whereIn('automation_flow_id', $flowIds)
                ->selectRaw('COUNT(*) as total_runs')
                ->selectRaw("SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_runs")
                ->selectRaw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs")
                ->first();

            $totalRuns = (int) ($aggregate?->total_runs ?? 0);
            $sentRuns = (int) ($aggregate?->sent_runs ?? 0);
            $failedRuns = (int) ($aggregate?->failed_runs ?? 0);

            $performance['total_runs'] = $totalRuns;
            $performance['sent_runs'] = $sentRuns;
            $performance['failed_runs'] = $failedRuns;
            $performance['success_rate'] = $totalRuns > 0
                ? round(($sentRuns / $totalRuns) * 100, 1)
                : 0;
            $performance['runs_last_7_days'] = AutomationLog::whereIn('automation_flow_id', $flowIds)
                ->where('created_at', '>=', now()->subDays(7))
                ->count();
            $performance['total_clicks'] = AutodmLinkClick::whereIn('automation_flow_id', $flowIds)->count();
            $performance['reminder_scheduled'] = (int) $reminderMetricsByFlow->sum('scheduled_count');
            $performance['reminder_sent'] = (int) $reminderMetricsByFlow->sum('sent_count');
            $performance['reminder_skipped_window'] = (int) $reminderMetricsByFlow->sum('skipped_window_count');
            $performance['reminder_clicked'] = (int) $reminderMetricsByFlow->sum('clicks_count');
        }

        return Inertia::render('AutoDM/Index', [
            'account' => $selectedAccount,
            'accounts' => $accounts->values(),
            'selectedAccountId' => $selectedAccount?->id,
            'has_active_account' => $hasActiveAccount,
            'connectedCount' => $connectedCount,
            'activeConnectedCount' => $activeConnectedCount,
            'accountLimit' => $accountLimit,
            'canConnectMore' => $canConnectMore,
            'hasPaidPlan' => $hasPaidPlan,
            'activePlanTier' => $activePlanTier,
            'disconnectToast' => $disconnectToast,
            'flows' => $flows,
            'performance' => $performance,
        ]);
    }

    /**
     * Show the Flow Builder Form
     */
    public function create(Request $request, MetaApiService $metaApiService, AutoDmTemplateCatalogService $templateCatalogService)
    {
        $user = auth()->user();
        $userId = (int) $user->id;
        $accounts = $this->hydrateAccountsForAutodm(
            $this->activeInstagramAccountsQuery($userId)->get(),
            $metaApiService
        );
        $selectedAccount = $this->resolveSelectedInstagramAccountFromRequest(
            $accounts,
            (int) $request->query('instagram_account_id', 0)
        ) ?? $accounts->first();

        if (! $selectedAccount) {
            return redirect()
                ->route('autodm.index')
                ->with('warning', 'Connect your Instagram account before creating a flow.');
        }

        $duplicateTriggerMediaUrlsByAccount = $this->buildDuplicateTriggerMediaUrlsByAccount(
            $userId,
            $accounts->pluck('id')->all()
        );

        return Inertia::render('AutoDM/Create', [
            'account' => $selectedAccount,
            'accounts' => $accounts->values(),
            'selectedAccountId' => $selectedAccount->id,
            'connectedCount' => $accounts->count(),
            'accountLimit' => PlanService::instagramAccountLimit($user),
            'canConnectMore' => PlanService::canConnectMoreInstagramAccounts($user),
            'hasPaidPlan' => PlanService::hasActivePaidPlan($user),
            'flow' => null,
            'lead_forms' => $this->buildLeadFormOptions($userId),
            'autodm_templates' => $templateCatalogService->catalogForUser($user),
            'duplicate_trigger_media_urls' => $this->buildDuplicateTriggerMediaUrls(
                $userId,
                (int) $selectedAccount->id
            ),
            'duplicate_trigger_media_urls_by_account' => $duplicateTriggerMediaUrlsByAccount,
        ]);
    }

    /**
     * Show the Flow Builder Form for editing an existing flow
     */
    public function edit(Request $request, AutomationFlow $flow, MetaApiService $metaApiService, AutoDmTemplateCatalogService $templateCatalogService)
    {
        if ($flow->user_id !== auth()->id()) {
            abort(403);
        }

        $user = auth()->user();
        $userId = (int) $user->id;
        $accounts = $this->hydrateAccountsForAutodm(
            $this->activeInstagramAccountsQuery($userId)->get(),
            $metaApiService
        );
        $selectedAccount = $this->resolveSelectedInstagramAccountFromRequest(
            $accounts,
            (int) $request->query('instagram_account_id', (int) $flow->instagram_account_id)
        ) ?? $accounts->first();
        $duplicateTriggerMediaUrlsByAccount = $this->buildDuplicateTriggerMediaUrlsByAccount(
            $userId,
            $accounts->pluck('id')->all(),
            (int) $flow->id
        );

        $flow->load([
            'messageVariants' => fn ($query) => $query
                ->where('message_type', 'reply')
                ->where('is_active', true)
                ->select('id', 'automation_flow_id', 'message_text', 'media_url')
                ->oldest('id'),
        ]);

        $publicCommentReply = collect($flow->public_comment_reply ?? [])
            ->map(fn ($message) => trim((string) $message))
            ->filter()
            ->values()
            ->all();
        $publicCommentReply = $this->hydratePublicCommentReplies(
            $publicCommentReply,
            trim((string) $flow->name),
            is_array($flow->keywords) ? $flow->keywords : []
        );
        $isCommentTriggerFlow = in_array((string) $flow->trigger_type, ['post', 'reel'], true);

        return Inertia::render('AutoDM/Create', [
            'account' => $selectedAccount,
            'accounts' => $accounts->values(),
            'selectedAccountId' => $selectedAccount?->id,
            'connectedCount' => $accounts->count(),
            'accountLimit' => PlanService::instagramAccountLimit($user),
            'canConnectMore' => PlanService::canConnectMoreInstagramAccounts($user),
            'hasPaidPlan' => PlanService::hasActivePaidPlan($user),
            'flow' => [
                'id' => $flow->id,
                'instagram_account_id' => (int) $flow->instagram_account_id,
                'name' => $flow->name,
                'trigger_type' => $flow->trigger_type,
                'trigger_value' => $flow->trigger_value,
                'trigger_media_url' => $flow->trigger_media_url,
                'lead_form_id' => $flow->lead_form_id,
                'keywords' => $flow->keywords ?? [],
                'match_all_comments' => $isCommentTriggerFlow ? (bool) $flow->match_all_comments : false,
                'reply_messages' => $flow->messageVariants
                    ->map(fn (AutomationFlowMessage $variant) => [
                        'message_text' => $variant->message_text,
                        'media_url' => $variant->media_url,
                        'preview_media_url' => $this->mediaUrlService->previewUrl((string) ($variant->media_url ?? '')),
                    ])
                    ->values()
                    ->all(),
                'opening_message_enabled' => (bool) $flow->opening_message_enabled,
                'opening_message' => $flow->opening_message ?? '',
                'opening_button_text' => $flow->opening_button_text ?? '',
                'public_reply_enabled' => $isCommentTriggerFlow ? true : false,
                'public_comment_reply' => $isCommentTriggerFlow ? $publicCommentReply : [],
                'public_reply_limit_enabled' => $isCommentTriggerFlow ? (bool) $flow->public_reply_limit_enabled : false,
                'public_reply_limit_count' => $isCommentTriggerFlow ? (int) ($flow->public_reply_limit_count ?? 200) : 200,
                'ask_to_follow_enabled' => (bool) $flow->ask_to_follow_enabled,
                'ask_to_follow_strict' => (bool) $flow->ask_to_follow_strict,
                'ask_to_follow_message' => $flow->ask_to_follow_message ?? '',
                'reminder_enabled' => (bool) $flow->reminder_enabled,
                'reminder_delay_hours' => (int) ($flow->reminder_delay_hours ?? 20),
                'reminder_messages' => collect($flow->reminder_messages ?? [])
                    ->map(fn ($message) => trim((string) $message))
                    ->filter()
                    ->values()
                    ->all(),
                'reminder_primary_button_text' => $flow->reminder_primary_button_text ?? 'Show me more',
                'reminder_secondary_button_text' => $flow->reminder_secondary_button_text ?? 'Not now',
                'reminder_more_message' => $flow->reminder_more_message ?? 'Awesome. Tell me what you need next and I will help.',
                'reminder_offer_url' => $flow->reminder_offer_url ?? '',
                'reminder_offer_button_text' => $flow->reminder_offer_button_text ?? 'Get Premium',
            ],
            'lead_forms' => $this->buildLeadFormOptions($userId),
            'autodm_templates' => $templateCatalogService->catalogForUser($user),
            'duplicate_trigger_media_urls' => $this->buildDuplicateTriggerMediaUrls(
                $userId,
                $selectedAccount?->id ? (int) $selectedAccount->id : null,
                (int) $flow->id
            ),
            'duplicate_trigger_media_urls_by_account' => $duplicateTriggerMediaUrlsByAccount,
        ]);
    }

    /**
     * Store a new automation flow
     */
    public function store(AutoDmRequest $request)
    {
        $validated = $request->validated();
        $account = $this->resolveOwnedActiveInstagramAccount(
            (int) auth()->id(),
            (int) ($validated['instagram_account_id'] ?? 0)
        );
        if (! $account) {
            return back()
                ->withErrors(['instagram_account_id' => 'Selected Instagram account is invalid.'])
                ->withInput();
        }

        $leadFormId = $this->resolveLeadFormId($validated, (int) auth()->id());

        // Parse keywords: user types "price, info" -> save as ["price", "info"]
        $keywordArray = array_filter(array_map('trim', explode(',', (string) ($validated['keywords'] ?? ''))));
        if (
            $this->hasDuplicateTriggerContent(
                (int) auth()->id(),
                (int) $account->id,
                (string) ($validated['trigger_type'] ?? ''),
                (string) ($validated['trigger_value'] ?? ''),
                (string) ($validated['trigger_media_url'] ?? '')
            )
        ) {
            return back()->withErrors([
                'trigger_value' => 'This content is already used in another flow.',
            ])->withInput();
        }

        $rawReplyMessages = collect($validated['reply_messages'] ?? []);
        $hasReplyUploads = ! empty($request->file('reply_images', []));
        if (! $hasReplyUploads && $rawReplyMessages->every(fn ($variant) => trim((string) ($variant['message_text'] ?? '')) === '' && trim((string) ($variant['media_url'] ?? '')) === '')) {
            return back()->withErrors([
                'reply_messages' => 'Add a reply message with text or an image URL.',
            ])->withInput();
        }

        $openingMessageEnabled = (bool) ($validated['opening_message_enabled'] ?? false);
        $openingMessage = $openingMessageEnabled
            ? trim((string) ($validated['opening_message'] ?? ''))
            : null;
        $openingButtonText = $openingMessageEnabled
            ? trim((string) ($validated['opening_button_text'] ?? ''))
            : null;

        if ($openingMessageEnabled && $openingMessage === '') {
            return back()->withErrors([
                'opening_message' => 'Opening message is required when enabled.',
            ])->withInput();
        }

        $askToFollowEnabled = (bool) ($validated['ask_to_follow_enabled'] ?? false);
        $askToFollowStrict = $askToFollowEnabled && (bool) ($validated['ask_to_follow_strict'] ?? false);
        $askToFollowMessage = $askToFollowEnabled
            ? trim((string) ($validated['ask_to_follow_message'] ?? ''))
            : null;

        if ($askToFollowEnabled && $askToFollowMessage === '') {
            return back()->withErrors([
                'ask_to_follow_message' => 'Ask to follow message is required when enabled.',
            ])->withInput();
        }

        $reminderEnabled = (bool) ($validated['reminder_enabled'] ?? false);
        $reminderDelayHours = $reminderEnabled
            ? (int) ($validated['reminder_delay_hours'] ?? 20)
            : null;
        $reminderMessages = $this->normalizeReminderMessages($validated['reminder_messages'] ?? []);
        $reminderPrimaryButtonText = $reminderEnabled
            ? trim((string) ($validated['reminder_primary_button_text'] ?? 'Show me more'))
            : null;
        $reminderSecondaryButtonText = $reminderEnabled
            ? trim((string) ($validated['reminder_secondary_button_text'] ?? 'Not now'))
            : null;
        $reminderMoreMessage = $reminderEnabled
            ? trim((string) ($validated['reminder_more_message'] ?? 'Awesome. Tell me what you need next and I will help.'))
            : null;
        $reminderOfferUrl = $reminderEnabled
            ? trim((string) ($validated['reminder_offer_url'] ?? ''))
            : '';
        $reminderOfferButtonText = $reminderEnabled
            ? trim((string) ($validated['reminder_offer_button_text'] ?? 'Get Premium'))
            : null;

        if ($reminderEnabled && empty($reminderMessages)) {
            return back()->withErrors([
                'reminder_messages' => 'Add at least one reminder message when reminders are enabled.',
            ])->withInput();
        }

        $isCommentTriggerFlow = in_array((string) ($validated['trigger_type'] ?? ''), ['post', 'reel'], true);
        $matchAllComments = $isCommentTriggerFlow && (bool) ($validated['match_all_comments'] ?? false);
        $publicReplyEnabled = $isCommentTriggerFlow;
        $publicReplyMessages = collect($validated['public_comment_reply'] ?? [])
            ->map(fn ($message) => trim((string) $message))
            ->filter()
            ->values()
            ->all();
        $flowName = trim((string) ($validated['name'] ?? ''));
        $publicReplyMessages = $isCommentTriggerFlow
            ? $this->hydratePublicCommentReplies($publicReplyMessages, $flowName, $keywordArray)
            : [];
        $publicReplyLimitEnabled = $isCommentTriggerFlow && (bool) ($validated['public_reply_limit_enabled'] ?? false);
        $publicReplyLimitCount = $publicReplyLimitEnabled
            ? (int) ($validated['public_reply_limit_count'] ?? 200)
            : null;

        if ($isCommentTriggerFlow && empty($publicReplyMessages)) {
            return back()->withErrors([
                'public_comment_reply' => 'Add at least one public reply message for post/reel flows.',
            ])->withInput();
        }

        $createdFlow = null;

        $userId = (int) auth()->id();
        DB::transaction(function () use ($account, $userId, $leadFormId, $validated, $keywordArray, $matchAllComments, $openingMessageEnabled, $openingMessage, $openingButtonText, $publicReplyEnabled, $publicReplyMessages, $publicReplyLimitEnabled, $publicReplyLimitCount, $request, $askToFollowEnabled, $askToFollowStrict, $askToFollowMessage, $reminderEnabled, $reminderDelayHours, $reminderMessages, $reminderPrimaryButtonText, $reminderSecondaryButtonText, $reminderMoreMessage, $reminderOfferUrl, $reminderOfferButtonText, &$createdFlow): void {
            $lockedAccount = InstagramAccount::query()
                ->where('id', (int) $account->id)
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->lockForUpdate()
                ->first();

            if (! $lockedAccount) {
                throw ValidationException::withMessages([
                    'instagram_account_id' => 'Selected Instagram account is invalid.',
                ]);
            }

            if (
                $this->hasDuplicateTriggerContent(
                    $userId,
                    (int) $lockedAccount->id,
                    (string) ($validated['trigger_type'] ?? ''),
                    (string) ($validated['trigger_value'] ?? ''),
                    (string) ($validated['trigger_media_url'] ?? '')
                )
            ) {
                throw ValidationException::withMessages([
                    'trigger_value' => 'This content is already used in another flow.',
                ]);
            }

            $flow = AutomationFlow::create([
                'user_id' => $userId,
                'instagram_account_id' => $lockedAccount->id,
                'lead_form_id' => $leadFormId,
                'name' => trim((string) $validated['name']),
                'trigger_type' => $validated['trigger_type'],
                'trigger_value' => $validated['trigger_value'],
                'trigger_media_url' => $validated['trigger_media_url'] ?? null,
                'keywords' => $keywordArray,
                'match_all_comments' => $matchAllComments,
                'opening_message_enabled' => $openingMessageEnabled,
                'opening_message' => $openingMessage,
                'opening_button_text' => $openingButtonText !== '' ? $openingButtonText : null,
                'public_reply_enabled' => $publicReplyEnabled,
                'public_comment_reply' => $publicReplyMessages,
                'public_reply_limit_enabled' => $publicReplyLimitEnabled,
                'public_reply_limit_count' => $publicReplyLimitCount,
                'ask_to_follow_enabled' => $askToFollowEnabled,
                'ask_to_follow_strict' => $askToFollowStrict,
                'ask_to_follow_message' => $askToFollowMessage,
                'ask_to_follow_profile_button_text' => null,
                'ask_to_follow_confirm_button_text' => null,
                'reminder_enabled' => $reminderEnabled,
                'reminder_delay_hours' => $reminderEnabled ? $reminderDelayHours : null,
                'reminder_messages' => $reminderEnabled ? $reminderMessages : null,
                'reminder_primary_button_text' => $reminderEnabled
                    ? ($reminderPrimaryButtonText !== '' ? $reminderPrimaryButtonText : 'Show me more')
                    : null,
                'reminder_secondary_button_text' => $reminderEnabled
                    ? ($reminderSecondaryButtonText !== '' ? $reminderSecondaryButtonText : 'Not now')
                    : null,
                'reminder_more_message' => $reminderEnabled
                    ? ($reminderMoreMessage !== '' ? $reminderMoreMessage : 'Awesome. Tell me what you need next and I will help.')
                    : null,
                'reminder_offer_url' => $reminderEnabled && $reminderOfferUrl !== '' ? $reminderOfferUrl : null,
                'reminder_offer_button_text' => $reminderEnabled && $reminderOfferUrl !== ''
                    ? ($reminderOfferButtonText !== '' ? $reminderOfferButtonText : 'Get Premium')
                    : null,
                'status' => 'active',
            ]);

            $replyMessages = $this->buildReplyMessagesWithUploads(
                $validated['reply_messages'],
                $request->file('reply_images', []),
                $validated['reply_message_indexes'] ?? [],
                (int) $flow->id
            );

            if ($replyMessages->isEmpty()) {
                throw ValidationException::withMessages([
                    'reply_messages' => 'Add a reply message with text or an image URL.',
                ]);
            }

            $timestamp = now();
            $rows = $replyMessages->map(fn ($variant) => [
                'automation_flow_id' => $flow->id,
                'message_type' => 'reply',
                'message_text' => $variant['message_text'],
                'media_url' => $variant['media_url'] !== '' ? $variant['media_url'] : null,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ])->all();

            AutomationFlowMessage::insert($rows);
            $createdFlow = $flow;
        });

        // If the user opted in to re-trigger existing comments, dispatch jobs immediately.
        if (
            $createdFlow
            && (bool) ($validated['retrigger_existing'] ?? false)
            && in_array($createdFlow->trigger_type, ['post', 'reel'], true)
        ) {
            $freshAccount = InstagramAccount::query()
                ->where('id', (int) $createdFlow->instagram_account_id)
                ->where('status', 'active')
                ->first(['id', 'ig_account_id', 'access_token']);

            if ($freshAccount) {
                $this->dispatchRetriggerJobs(
                    $createdFlow,
                    $freshAccount,
                    trim((string) ($createdFlow->trigger_value ?? '')),
                    app(MetaApiService::class)
                );
            }
        }

        return redirect()->route('autodm.index')->with('success', 'Automation Flow deployed successfully!');
    }

    /**
     * Update an existing automation flow
     */
    public function update(AutoDmRequest $request, AutomationFlow $flow)
    {
        if ($flow->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validated();
        $selectedAccount = $this->resolveOwnedActiveInstagramAccount(
            (int) auth()->id(),
            (int) ($validated['instagram_account_id'] ?? 0)
        );
        if (! $selectedAccount) {
            return back()
                ->withErrors(['instagram_account_id' => 'Selected Instagram account is invalid.'])
                ->withInput();
        }

        $leadFormId = $this->resolveLeadFormId($validated, (int) auth()->id());

        $keywordArray = array_filter(array_map('trim', explode(',', (string) ($validated['keywords'] ?? ''))));
        if (
            $this->hasDuplicateTriggerContent(
                (int) auth()->id(),
                (int) $selectedAccount->id,
                (string) ($validated['trigger_type'] ?? ''),
                (string) ($validated['trigger_value'] ?? ''),
                (string) ($validated['trigger_media_url'] ?? ''),
                (int) $flow->id
            )
        ) {
            return back()->withErrors([
                'trigger_value' => 'This content is already used in another flow.',
            ])->withInput();
        }

        $replyMessages = $this->buildReplyMessagesWithUploads(
            $validated['reply_messages'],
            $request->file('reply_images', []),
            $validated['reply_message_indexes'] ?? [],
            (int) $flow->id
        );

        if ($replyMessages->isEmpty()) {
            return back()->withErrors([
                'reply_messages' => 'Add a reply message with text or an image URL.',
            ])->withInput();
        }

        $openingMessageEnabled = (bool) ($validated['opening_message_enabled'] ?? false);
        $openingMessage = $openingMessageEnabled
            ? trim((string) ($validated['opening_message'] ?? ''))
            : null;
        $openingButtonText = $openingMessageEnabled
            ? trim((string) ($validated['opening_button_text'] ?? ''))
            : null;

        if ($openingMessageEnabled && $openingMessage === '') {
            return back()->withErrors([
                'opening_message' => 'Opening message is required when enabled.',
            ])->withInput();
        }

        $askToFollowEnabled = (bool) ($validated['ask_to_follow_enabled'] ?? false);
        $askToFollowStrict = $askToFollowEnabled && (bool) ($validated['ask_to_follow_strict'] ?? false);
        $askToFollowMessage = $askToFollowEnabled
            ? trim((string) ($validated['ask_to_follow_message'] ?? ''))
            : null;

        if ($askToFollowEnabled && $askToFollowMessage === '') {
            return back()->withErrors([
                'ask_to_follow_message' => 'Ask to follow message is required when enabled.',
            ])->withInput();
        }

        $reminderEnabled = (bool) ($validated['reminder_enabled'] ?? false);
        $reminderDelayHours = $reminderEnabled
            ? (int) ($validated['reminder_delay_hours'] ?? 20)
            : null;
        $reminderMessages = $this->normalizeReminderMessages($validated['reminder_messages'] ?? []);
        $reminderPrimaryButtonText = $reminderEnabled
            ? trim((string) ($validated['reminder_primary_button_text'] ?? 'Show me more'))
            : null;
        $reminderSecondaryButtonText = $reminderEnabled
            ? trim((string) ($validated['reminder_secondary_button_text'] ?? 'Not now'))
            : null;
        $reminderMoreMessage = $reminderEnabled
            ? trim((string) ($validated['reminder_more_message'] ?? 'Awesome. Tell me what you need next and I will help.'))
            : null;
        $reminderOfferUrl = $reminderEnabled
            ? trim((string) ($validated['reminder_offer_url'] ?? ''))
            : '';
        $reminderOfferButtonText = $reminderEnabled
            ? trim((string) ($validated['reminder_offer_button_text'] ?? 'Get Premium'))
            : null;

        if ($reminderEnabled && empty($reminderMessages)) {
            return back()->withErrors([
                'reminder_messages' => 'Add at least one reminder message when reminders are enabled.',
            ])->withInput();
        }

        $isCommentTriggerFlow = in_array((string) ($validated['trigger_type'] ?? ''), ['post', 'reel'], true);
        $matchAllComments = $isCommentTriggerFlow && (bool) ($validated['match_all_comments'] ?? false);
        $publicReplyEnabled = $isCommentTriggerFlow;
        $publicReplyMessages = collect($validated['public_comment_reply'] ?? [])
            ->map(fn ($message) => trim((string) $message))
            ->filter()
            ->values()
            ->all();
        $flowName = trim((string) ($validated['name'] ?? ''));
        $publicReplyMessages = $isCommentTriggerFlow
            ? $this->hydratePublicCommentReplies($publicReplyMessages, $flowName, $keywordArray)
            : [];
        $publicReplyLimitEnabled = $isCommentTriggerFlow && (bool) ($validated['public_reply_limit_enabled'] ?? false);
        $publicReplyLimitCount = $publicReplyLimitEnabled
            ? (int) ($validated['public_reply_limit_count'] ?? 200)
            : null;

        if ($isCommentTriggerFlow && empty($publicReplyMessages)) {
            return back()->withErrors([
                'public_comment_reply' => 'Add at least one public reply message for post/reel flows.',
            ])->withInput();
        }

        $userId = (int) auth()->id();
        DB::transaction(function () use ($flow, $userId, $selectedAccount, $leadFormId, $validated, $keywordArray, $matchAllComments, $replyMessages, $openingMessageEnabled, $openingMessage, $openingButtonText, $publicReplyEnabled, $publicReplyMessages, $publicReplyLimitEnabled, $publicReplyLimitCount, $askToFollowEnabled, $askToFollowStrict, $askToFollowMessage, $reminderEnabled, $reminderDelayHours, $reminderMessages, $reminderPrimaryButtonText, $reminderSecondaryButtonText, $reminderMoreMessage, $reminderOfferUrl, $reminderOfferButtonText): void {
            $lockedFlow = AutomationFlow::query()
                ->where('id', (int) $flow->id)
                ->where('user_id', $userId)
                ->lockForUpdate()
                ->first();

            if (! $lockedFlow) {
                throw ValidationException::withMessages([
                    'flow' => 'Flow not found.',
                ]);
            }

            $lockedAccount = InstagramAccount::query()
                ->where('id', (int) $selectedAccount->id)
                ->where('user_id', $userId)
                ->where('status', 'active')
                ->lockForUpdate()
                ->first();

            if (! $lockedAccount) {
                throw ValidationException::withMessages([
                    'instagram_account_id' => 'Selected Instagram account is invalid.',
                ]);
            }

            if (
                $this->hasDuplicateTriggerContent(
                    $userId,
                    (int) $lockedAccount->id,
                    (string) ($validated['trigger_type'] ?? ''),
                    (string) ($validated['trigger_value'] ?? ''),
                    (string) ($validated['trigger_media_url'] ?? ''),
                    (int) $lockedFlow->id
                )
            ) {
                throw ValidationException::withMessages([
                    'trigger_value' => 'This content is already used in another flow.',
                ]);
            }

            $lockedFlow->update([
                'instagram_account_id' => (int) $lockedAccount->id,
                'name' => trim((string) $validated['name']),
                'lead_form_id' => $leadFormId,
                'trigger_type' => $validated['trigger_type'],
                'trigger_value' => $validated['trigger_value'],
                'trigger_media_url' => $validated['trigger_media_url'] ?? null,
                'keywords' => $keywordArray,
                'match_all_comments' => $matchAllComments,
                'opening_message_enabled' => $openingMessageEnabled,
                'opening_message' => $openingMessage,
                'opening_button_text' => $openingButtonText !== '' ? $openingButtonText : null,
                'public_reply_enabled' => $publicReplyEnabled,
                'public_comment_reply' => $publicReplyMessages,
                'public_reply_limit_enabled' => $publicReplyLimitEnabled,
                'public_reply_limit_count' => $publicReplyLimitCount,
                'ask_to_follow_enabled' => $askToFollowEnabled,
                'ask_to_follow_strict' => $askToFollowStrict,
                'ask_to_follow_message' => $askToFollowMessage,
                'ask_to_follow_profile_button_text' => null,
                'ask_to_follow_confirm_button_text' => null,
                'reminder_enabled' => $reminderEnabled,
                'reminder_delay_hours' => $reminderEnabled ? $reminderDelayHours : null,
                'reminder_messages' => $reminderEnabled ? $reminderMessages : null,
                'reminder_primary_button_text' => $reminderEnabled
                    ? ($reminderPrimaryButtonText !== '' ? $reminderPrimaryButtonText : 'Show me more')
                    : null,
                'reminder_secondary_button_text' => $reminderEnabled
                    ? ($reminderSecondaryButtonText !== '' ? $reminderSecondaryButtonText : 'Not now')
                    : null,
                'reminder_more_message' => $reminderEnabled
                    ? ($reminderMoreMessage !== '' ? $reminderMoreMessage : 'Awesome. Tell me what you need next and I will help.')
                    : null,
                'reminder_offer_url' => $reminderEnabled && $reminderOfferUrl !== '' ? $reminderOfferUrl : null,
                'reminder_offer_button_text' => $reminderEnabled && $reminderOfferUrl !== ''
                    ? ($reminderOfferButtonText !== '' ? $reminderOfferButtonText : 'Get Premium')
                    : null,
            ]);

            $lockedFlow->messageVariants()
                ->where('message_type', 'reply')
                ->delete();

            $timestamp = now();
            $rows = $replyMessages->map(fn ($variant) => [
                'automation_flow_id' => $lockedFlow->id,
                'message_type' => 'reply',
                'message_text' => $variant['message_text'],
                'media_url' => $variant['media_url'] !== '' ? $variant['media_url'] : null,
                'is_active' => true,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ])->all();

            AutomationFlowMessage::insert($rows);
        });

        return redirect()->route('autodm.index')->with('success', 'Automation Flow updated successfully!');
    }

    public function toggleStatus(AutomationFlow $flow)
    {
        if ($flow->user_id !== auth()->id()) {
            abort(403);
        }

        $nextStatus = $flow->status === 'active' ? 'paused' : 'active';
        $flow->update(['status' => $nextStatus]);

        return back()->with('success', $nextStatus === 'active'
            ? 'Automation resumed.'
            : 'Automation paused.');
    }

    /**
     * Re-trigger automation for existing comments that have not yet been processed.
     */
    public function retrigger(AutomationFlow $flow, MetaApiService $metaApiService)
    {
        if ($flow->user_id !== auth()->id()) {
            abort(403);
        }

        if ($flow->status !== 'active') {
            return response()->json([
                'message' => 'Flow must be active before re-triggering.',
            ], 422);
        }

        if (! in_array($flow->trigger_type, ['post', 'reel'], true)) {
            return response()->json([
                'message' => 'Re-trigger is only available for post and reel flows.',
            ], 422);
        }

        $mediaId = trim((string) ($flow->trigger_value ?? ''));
        if ($mediaId === '') {
            return response()->json([
                'message' => 'Flow has no media ID configured.',
            ], 422);
        }

        $account = InstagramAccount::query()
            ->where('id', (int) $flow->instagram_account_id)
            ->where('status', 'active')
            ->first(['id', 'ig_account_id', 'access_token']);

        if (! $account) {
            return response()->json([
                'message' => 'Connected Instagram account not found or disconnected.',
            ], 422);
        }

        $queued = $this->dispatchRetriggerJobs($flow, $account, $mediaId, $metaApiService);

        return response()->json([
            'message' => $queued > 0
                ? "Re-trigger queued for {$queued} comment(s). DMs will be sent shortly."
                : 'No new eligible comments found to re-trigger.',
            'queued' => $queued,
        ]);
    }

    /**
     * Paginate through ALL comments on a media object and dispatch retrigger jobs.
     *
     * Iterates up to $maxPages pages (50 comments/page) so every existing comment
     * is processed regardless of how many a post has received.
     */
    private function dispatchRetriggerJobs(
        AutomationFlow $flow,
        InstagramAccount $account,
        string $mediaId,
        MetaApiService $metaApiService,
        int $maxPages = 20
    ): int {
        $keywords = collect(is_array($flow->keywords) ? $flow->keywords : [])
            ->map(fn ($kw) => strtolower(trim((string) $kw)))
            ->filter()
            ->values();
        $matchAllComments = (bool) ($flow->match_all_comments ?? false);

        // Build a set of already-processed comment IDs so we never double-send.
        $alreadyProcessed = AutomationLog::where('automation_flow_id', $flow->id)
            ->whereNotIn('status', ['failed'])
            ->pluck('trigger_source_id')
            ->map(fn ($id) => (string) $id)
            ->flip();

        $queued = 0;
        $seenUserIds = [];
        $totalComments = 0;
        $cursor = null;
        $page = 0;

        do {
            $page++;
            $result = $metaApiService->fetchMediaComments(
                (string) $account->access_token,
                (string) $account->ig_account_id,
                $mediaId,
                50,
                $cursor
            );

            $comments = $result['data'] ?? [];
            $totalComments += count($comments);

            foreach ($comments as $comment) {
                $commentId = trim((string) ($comment['id'] ?? ''));
                $commentText = trim((string) ($comment['text'] ?? ''));
                $senderId = trim((string) ($comment['from']['id'] ?? ''));

                if ($commentId === '' || $senderId === '') {
                    continue;
                }

                if ($senderId === (string) $account->ig_account_id) {
                    continue;
                }

                if (isset($alreadyProcessed[$commentId])) {
                    continue;
                }

                if (isset($seenUserIds[$senderId])) {
                    continue;
                }

                if (! $matchAllComments && $keywords->isNotEmpty()) {
                    $matchesKeyword = $keywords->contains(
                        fn ($kw) => $this->retriggerKeywordMatches($commentText, (string) $kw)
                    );
                    if (! $matchesKeyword) {
                        continue;
                    }
                }

                ExecuteAutomationActionJob::dispatch(
                    (int) $flow->id,
                    $commentId,
                    $senderId,
                    (int) $account->id,
                    'full'
                );

                $seenUserIds[$senderId] = true;
                $queued++;
            }

            $cursor = $result['paging']['next_cursor'] ?? null;
            $hasMore = $result['paging']['has_next_page'] ?? false;

        } while ($hasMore && $cursor && $page < $maxPages);

        Log::info('AutoDM retrigger dispatched', [
            'flow_id' => $flow->id,
            'media_id' => $mediaId,
            'pages_fetched' => $page,
            'total_comments' => $totalComments,
            'queued' => $queued,
            'match_all_comments' => $matchAllComments,
        ]);

        return $queued;
    }

    private function retriggerKeywordMatches(string $commentText, string $keyword): bool
    {
        $normalizedText = trim(Str::lower($commentText));
        $needle = trim(Str::lower($keyword));

        if ($normalizedText === '' || $needle === '') {
            return false;
        }

        $pattern = '/(?<![\\p{L}\\p{N}_])'.preg_quote($needle, '/').'(?![\\p{L}\\p{N}_])/iu';

        return preg_match($pattern, $normalizedText) === 1;
    }

    public function duplicate(AutomationFlow $flow)
    {
        if ($flow->user_id !== auth()->id()) {
            abort(403);
        }

        DB::transaction(function () use ($flow): void {
            $sourceName = trim((string) ($flow->name ?? ''));
            $duplicateName = $sourceName !== ''
                ? 'Copy of '.$sourceName
                : 'Copy of Flow #'.$flow->id;
            $isCommentTriggerFlow = in_array((string) ($flow->trigger_type ?? ''), ['post', 'reel'], true);
            $duplicatePublicReplies = $this->hydratePublicCommentReplies(
                is_array($flow->public_comment_reply) ? $flow->public_comment_reply : [],
                $duplicateName,
                is_array($flow->keywords) ? $flow->keywords : []
            );

            $clone = AutomationFlow::create([
                'user_id' => $flow->user_id,
                'instagram_account_id' => $flow->instagram_account_id,
                'lead_form_id' => $flow->lead_form_id,
                'name' => $duplicateName,
                'trigger_type' => $flow->trigger_type,
                'trigger_value' => $flow->trigger_value,
                'trigger_media_url' => $flow->trigger_media_url,
                'keywords' => $flow->keywords,
                'match_all_comments' => $isCommentTriggerFlow ? (bool) $flow->match_all_comments : false,
                'opening_message_enabled' => $flow->opening_message_enabled,
                'opening_message' => $flow->opening_message,
                'opening_button_text' => $flow->opening_button_text,
                'public_reply_enabled' => $isCommentTriggerFlow,
                'public_comment_reply' => $isCommentTriggerFlow ? $duplicatePublicReplies : [],
                'public_reply_limit_enabled' => $isCommentTriggerFlow ? (bool) $flow->public_reply_limit_enabled : false,
                'public_reply_limit_count' => $isCommentTriggerFlow
                    ? (int) ($flow->public_reply_limit_count ?? 200)
                    : null,
                'ask_to_follow_enabled' => $flow->ask_to_follow_enabled,
                'ask_to_follow_strict' => $flow->ask_to_follow_strict,
                'ask_to_follow_message' => $flow->ask_to_follow_message,
                'ask_to_follow_profile_button_text' => null,
                'ask_to_follow_confirm_button_text' => null,
                'reminder_enabled' => $flow->reminder_enabled,
                'reminder_delay_hours' => $flow->reminder_delay_hours,
                'reminder_messages' => is_array($flow->reminder_messages) ? $flow->reminder_messages : [],
                'reminder_primary_button_text' => $flow->reminder_primary_button_text,
                'reminder_secondary_button_text' => $flow->reminder_secondary_button_text,
                'reminder_more_message' => $flow->reminder_more_message,
                'reminder_offer_url' => $flow->reminder_offer_url,
                'reminder_offer_button_text' => $flow->reminder_offer_button_text,
                // Duplicates start paused to prevent accidental double replies.
                'status' => 'paused',
            ]);

            $variants = $flow->messageVariants()
                ->where('message_type', 'reply')
                ->get(['message_text', 'media_url', 'is_active']);

            if ($variants->isNotEmpty()) {
                $timestamp = now();
                $rows = $variants->map(fn ($variant) => [
                    'automation_flow_id' => $clone->id,
                    'message_type' => 'reply',
                    'message_text' => $variant->message_text,
                    'media_url' => $variant->media_url,
                    'is_active' => (bool) $variant->is_active,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ])->all();

                AutomationFlowMessage::insert($rows);
            }
        });

        return back()->with('success', 'Automation duplicated as paused. Review and resume when ready.');
    }

    /**
     * Fetch media for the selected account (called via AJAX/Inertia)
     */
    public function fetchMedia(Request $request, InstagramAccount $instagramAccount, MetaApiService $metaApiService)
    {
        if ($instagramAccount->user_id !== auth()->id()) {
            abort(403);
        }

        $after = $request->query('after');
        $limit = (int) $request->query('limit', 20);
        $mediaId = trim((string) $request->query('media_id', ''));
        $source = trim(strtolower((string) $request->query('source', 'media')));
        if (! in_array($source, ['media', 'story'], true)) {
            $source = 'media';
        }

        if ($mediaId !== '') {
            try {
                $mediaItem = $metaApiService->fetchMediaById(
                    $instagramAccount->access_token,
                    $instagramAccount->ig_account_id,
                    $mediaId
                );

                if (! is_array($mediaItem)) {
                    $mediaItem = $this->resolveCachedMediaItem(
                        (int) auth()->id(),
                        (int) $instagramAccount->id,
                        $mediaId
                    );
                }
            } catch (\Throwable $e) {
                Log::warning('AutoDM fetch media by id failed', [
                    'instagram_account_id' => $instagramAccount->id,
                    'source' => $source,
                    'media_id' => $mediaId,
                    'message' => $e->getMessage(),
                ]);

                $mediaItem = $this->resolveCachedMediaItem(
                    (int) auth()->id(),
                    (int) $instagramAccount->id,
                    $mediaId
                );
            }

            return response()->json([
                'media' => $this->normalizeMediaItems($mediaItem ? [$mediaItem] : [], $source),
                'source' => $source,
                'paging' => [
                    'next_cursor' => null,
                    'has_next_page' => false,
                ],
            ]);
        }

        try {
            $cursor = is_string($after) ? trim($after) : null;
            if ($source === 'story') {
                $result = $metaApiService->fetchUserStories(
                    $instagramAccount->access_token,
                    $instagramAccount->ig_account_id,
                    $cursor,
                    $limit
                );
            } else {
                $result = $metaApiService->fetchUserMedia(
                    $instagramAccount->access_token,
                    $instagramAccount->ig_account_id,
                    $cursor,
                    $limit
                );
            }
        } catch (\Throwable $e) {
            Log::warning('AutoDM fetch media failed', [
                'instagram_account_id' => $instagramAccount->id,
                'source' => $source,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to fetch media.',
                'media' => [],
                'source' => $source,
                'paging' => [
                    'next_cursor' => null,
                    'has_next_page' => false,
                ],
            ], 502);
        }

        $mediaItems = $this->normalizeMediaItems($result['data'] ?? [], $source);

        return response()->json([
            'media' => $mediaItems,
            'source' => $source,
            'paging' => $result['paging'] ?? [
                'next_cursor' => null,
                'has_next_page' => false,
            ],
        ]);
    }

    /**
     * @param  array<int, mixed>  $mediaItems
     * @return array<int, array<string, mixed>>
     */
    private function normalizeMediaItems(array $mediaItems, string $source): array
    {
        return collect($mediaItems)
            ->map(function ($item) use ($source) {
                $normalizedItem = is_array($item) ? $item : [];
                $mediaType = strtoupper(trim((string) ($normalizedItem['media_type'] ?? '')));
                $mediaProductType = strtoupper(trim((string) ($normalizedItem['media_product_type'] ?? '')));
                $triggerType = match (true) {
                    $source === 'story' => 'story',
                    $mediaType === 'STORY', $mediaProductType === 'STORIES' => 'story',
                    $mediaType === 'VIDEO', $mediaProductType === 'REELS' => 'reel',
                    default => 'post',
                };
                $label = match ($triggerType) {
                    'story' => 'Story',
                    'reel' => 'Reel',
                    default => 'Post',
                };

                $normalizedItem['autodm_source'] = $source;
                $normalizedItem['autodm_trigger_type'] = $triggerType;
                $normalizedItem['autodm_media_label'] = $label;

                return $normalizedItem;
            })
            ->filter(fn ($item) => is_array($item) && filled($item['id'] ?? null))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function resolveCachedMediaItem(int $userId, int $instagramAccountId, string $mediaId): ?array
    {
        $row = InstagramAccountMediaAnalytics::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $instagramAccountId)
            ->where('instagram_media_id', trim($mediaId))
            ->first();

        if (! $row) {
            return null;
        }

        $fallbackMediaType = match (strtolower(trim((string) $row->format))) {
            'reel', 'video' => 'VIDEO',
            'story' => 'STORY',
            default => 'IMAGE',
        };
        $fallbackProductType = match (strtolower(trim((string) $row->format))) {
            'reel' => 'REELS',
            'story' => 'STORIES',
            default => null,
        };

        return [
            'id' => (string) $row->instagram_media_id,
            'caption' => $row->caption,
            'media_type' => $row->media_type ?: $fallbackMediaType,
            'media_product_type' => $fallbackProductType,
            'media_url' => $row->media_url,
            'permalink' => $row->permalink,
            'thumbnail_url' => $row->thumbnail_url,
            'timestamp' => optional($row->posted_at)->toIso8601String(),
        ];
    }

    /**
     * @return Builder<InstagramAccount>
     */
    private function activeInstagramAccountsQuery(int $userId)
    {
        return InstagramAccount::query()
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->latest('id');
    }

    /**
     * @param  Collection<int, InstagramAccount>  $accounts
     * @return Collection<int, InstagramAccount>
     */
    private function hydrateAccountsForAutodm(Collection $accounts, MetaApiService $metaApiService): Collection
    {
        return $accounts
            ->map(fn (InstagramAccount $account) => $this->hydrateAccountForAutodm($account, $metaApiService))
            ->filter(fn ($account) => $account instanceof InstagramAccount)
            ->values();
    }

    /**
     * @param  Collection<int, InstagramAccount>  $accounts
     */
    private function resolveSelectedInstagramAccountFromRequest(Collection $accounts, int $requestedAccountId): ?InstagramAccount
    {
        if ($requestedAccountId <= 0) {
            return null;
        }

        $selected = $accounts->first(fn (InstagramAccount $account) => (int) $account->id === $requestedAccountId);

        return $selected instanceof InstagramAccount ? $selected : null;
    }

    private function resolveOwnedActiveInstagramAccount(int $userId, int $instagramAccountId): ?InstagramAccount
    {
        if ($instagramAccountId <= 0) {
            return null;
        }

        return InstagramAccount::query()
            ->where('id', $instagramAccountId)
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->first();
    }

    private function buildInstagramProfileUrl(?string $username): ?string
    {
        if (! $username) {
            return null;
        }

        return 'https://www.instagram.com/'.ltrim((string) $username, '@').'/';
    }

    private function resolveProfileUrl(?string $profileUrl, ?string $username): ?string
    {
        $normalizedProfileUrl = trim((string) $profileUrl);

        if ($normalizedProfileUrl !== '') {
            return $normalizedProfileUrl;
        }

        return $this->buildInstagramProfileUrl($username);
    }

    private function normalizeInstagramUsername(?string $username): ?string
    {
        $normalizedUsername = trim((string) $username);

        if ($normalizedUsername === '') {
            return null;
        }

        if (strcasecmp($normalizedUsername, 'Instagram User') === 0) {
            return null;
        }

        return ltrim($normalizedUsername, '@');
    }

    private function normalizeOptionalUrl(?string $url): ?string
    {
        $normalizedUrl = trim((string) $url);

        return $normalizedUrl !== '' ? $normalizedUrl : null;
    }

    private function hydrateMissingProfileUrl(?InstagramAccount $account): ?InstagramAccount
    {
        if (! $account) {
            return null;
        }

        if (filled($account->profile_url)) {
            return $account;
        }

        $profileUrl = $this->buildInstagramProfileUrl($this->normalizeInstagramUsername($account->username));
        if (! $profileUrl) {
            return $account;
        }

        $account->profile_url = $profileUrl;
        $account->save();

        return $account;
    }

    private function hydrateAccountForAutodm(?InstagramAccount $account, MetaApiService $metaApiService): ?InstagramAccount
    {
        $account = $this->hydrateMissingProfileUrl($account);

        if (! $account) {
            return null;
        }

        $account->setAttribute(
            'profile_picture_url',
            $this->resolveLiveProfilePictureUrl($account, $metaApiService)
        );

        return $account;
    }

    private function resolveLiveProfilePictureUrl(InstagramAccount $account, MetaApiService $metaApiService): ?string
    {
        if ($account->status !== 'active') {
            return null;
        }

        return Cache::remember($this->liveProfilePictureCacheKey((int) $account->id), now()->addMinutes(15), function () use ($account, $metaApiService) {
            try {
                $accounts = $metaApiService->fetchInstagramAccountsFromToken(
                    (string) $account->access_token,
                    (int) $account->id
                );
            } catch (\Throwable $exception) {
                Log::warning('AutoDM live profile picture lookup failed', [
                    'instagram_account_id' => $account->id,
                    'ig_account_id' => $account->ig_account_id,
                    'error' => $exception->getMessage(),
                ]);

                return null;
            }

            if (empty($accounts)) {
                return null;
            }

            $selected = collect($accounts)->first(function ($item) use ($account) {
                return (string) ($item['ig_id'] ?? '') === (string) $account->ig_account_id;
            }) ?? $accounts[0];

            return $this->normalizeOptionalUrl($selected['profile_picture_url'] ?? null);
        });
    }

    private function liveProfilePictureCacheKey(int $instagramAccountId): string
    {
        return "autodm:live-profile-picture-url:{$instagramAccountId}";
    }

    private function buildReplyMessagesWithUploads(
        array $replyMessages,
        array $uploadedReplyImages = [],
        array $replyMessageIndexes = [],
        ?int $flowId = null
    ) {
        return collect($replyMessages)
            ->map(function ($variant, $index) use ($uploadedReplyImages, $replyMessageIndexes, $flowId) {
                $messageText = trim((string) ($variant['message_text'] ?? ''));
                $mediaUrl = $this->mediaUrlService->normalizeStoredValue($variant['media_url'] ?? '');

                $sourceIndex = $replyMessageIndexes[$index] ?? $index;
                $upload = $uploadedReplyImages[$sourceIndex]
                    ?? $uploadedReplyImages[(string) $sourceIndex]
                    ?? $uploadedReplyImages[$index]
                    ?? $uploadedReplyImages[(string) $index]
                    ?? null;
                if ($upload instanceof UploadedFile) {
                    $mediaUrl = $this->storeCompressedReplyImage(
                        $upload,
                        (int) ($flowId ?? 0),
                        (int) $index
                    );
                }

                return [
                    'message_text' => $messageText,
                    'media_url' => $mediaUrl,
                ];
            })
            ->filter(fn ($variant) => $variant['message_text'] !== '' || $variant['media_url'] !== '')
            ->values();
    }

    private function storeCompressedReplyImage(UploadedFile $upload, int $flowId, int $variantIndex): string
    {
        $result = $this->imageCompressionService->compressToAvifOrWebp($upload);
        $encoded = $result['bytes'];
        $extension = $result['extension'];

        $uploadDisk = (string) config('filesystems.upload_disk', 'public');
        $safeFlowId = $flowId > 0 ? $flowId : time();
        $filename = sprintf('autodm_%d_%d.%s', $safeFlowId, $variantIndex, $extension);
        $path = 'autodm/reply-images/'.auth()->id().'/'.$filename;

        \Storage::disk($uploadDisk)->put($path, $encoded);

        return ltrim($path, '/');
    }

    private function hydratePublicCommentReplies(array $providedReplies, string $flowName, array $keywords): array
    {
        $normalizedProvided = collect($providedReplies)
            ->map(fn ($reply) => trim((string) $reply))
            ->filter()
            ->values()
            ->all();

        if (count($normalizedProvided) >= 3) {
            return array_slice($normalizedProvided, 0, 4);
        }

        $primaryKeyword = trim((string) ($keywords[0] ?? ''));
        $topic = $primaryKeyword !== '' ? $primaryKeyword : ($flowName !== '' ? $flowName : 'details');

        $generated = [
            "Check your inbox, I just sent the {$topic}.",
            'Sent in DM. Take a look now.',
            'Done, it is in your messages.',
            'Just shared it in your inbox.',
        ];

        $merged = collect(array_merge($normalizedProvided, $generated))
            ->map(fn ($reply) => trim((string) $reply))
            ->filter()
            ->unique(fn ($reply) => strtolower($reply))
            ->values()
            ->all();

        return array_slice($merged, 0, 4);
    }

    private function normalizeReminderMessages(array $messages): array
    {
        return collect($messages)
            ->map(function ($message) {
                if (is_array($message)) {
                    return trim((string) ($message['message_text'] ?? ''));
                }

                return trim((string) $message);
            })
            ->filter()
            ->values()
            ->take(3)
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildLeadFormOptions(int $userId): array
    {
        return LeadForm::query()
            ->where('user_id', $userId)
            ->where('status', 'published')
            ->orderByDesc('updated_at')
            ->get(['id', 'title', 'public_id'])
            ->map(fn (LeadForm $leadForm) => [
                'id' => (int) $leadForm->id,
                'title' => (string) $leadForm->title,
                'public_url' => route('lead-forms.public.show', ['publicId' => $leadForm->public_id]),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolveLeadFormId(array $validated, int $userId): ?int
    {
        $rawLeadFormId = $validated['lead_form_id'] ?? null;
        if ($rawLeadFormId === null || $rawLeadFormId === '') {
            return null;
        }

        $leadFormId = (int) $rawLeadFormId;
        if ($leadFormId <= 0) {
            return null;
        }

        $exists = LeadForm::query()
            ->where('id', $leadFormId)
            ->where('user_id', $userId)
            ->where('status', 'published')
            ->exists();

        if (! $exists) {
            throw ValidationException::withMessages([
                'lead_form_id' => 'Selected lead form is invalid or not published.',
            ]);
        }

        return $leadFormId;
    }

    private function hasDuplicateTriggerContent(
        int $userId,
        int $instagramAccountId,
        string $triggerType,
        string $triggerValue,
        string $triggerMediaUrl,
        ?int $ignoreFlowId = null
    ): bool {
        $normalizedTriggerType = trim(strtolower($triggerType));
        $normalizedTriggerValue = trim($triggerValue);
        $normalizedMediaUrl = trim($triggerMediaUrl);
        if ($normalizedTriggerValue === '' && $normalizedMediaUrl === '') {
            return false;
        }

        $query = AutomationFlow::where('user_id', $userId)
            ->where('instagram_account_id', $instagramAccountId)
            ->select('id');

        if ($ignoreFlowId) {
            $query->where('id', '!=', $ignoreFlowId);
        }

        $query->where(function (Builder $duplicateQuery) use ($normalizedTriggerType, $normalizedTriggerValue, $normalizedMediaUrl): void {
            if ($normalizedTriggerType !== '' && $normalizedTriggerValue !== '') {
                $duplicateQuery->orWhere(function (Builder $flowQuery) use ($normalizedTriggerType, $normalizedTriggerValue): void {
                    $flowQuery
                        ->where('trigger_type', $normalizedTriggerType)
                        ->where('trigger_value', $normalizedTriggerValue);
                });
            }

            if ($normalizedMediaUrl !== '') {
                $duplicateQuery->orWhere('trigger_media_url', $normalizedMediaUrl);
            }
        });

        return $query->exists();
    }

    private function buildDuplicateTriggerMediaUrls(
        int $userId,
        ?int $instagramAccountId,
        ?int $ignoreFlowId = null
    ): array {
        if (! $instagramAccountId) {
            return [];
        }

        $cacheKey = implode(':', [
            'autodm',
            'duplicate-trigger-media',
            $userId,
            $instagramAccountId,
            $ignoreFlowId ?: 0,
        ]);

        return Cache::remember($cacheKey, now()->addMinutes(2), function () use ($userId, $instagramAccountId, $ignoreFlowId) {
            $query = AutomationFlow::where('user_id', $userId)
                ->where('instagram_account_id', $instagramAccountId)
                ->select('id', 'trigger_media_url');

            if ($ignoreFlowId) {
                $query->where('id', '!=', $ignoreFlowId);
            }

            return $query->pluck('trigger_media_url')
                ->map(fn ($value) => trim((string) $value))
                ->filter()
                ->unique()
                ->values()
                ->all();
        });
    }

    /**
     * @param  array<int, int>  $instagramAccountIds
     * @return array<int, array<int, string>>
     */
    private function buildDuplicateTriggerMediaUrlsByAccount(
        int $userId,
        array $instagramAccountIds,
        ?int $ignoreFlowId = null
    ): array {
        $normalizedAccountIds = collect($instagramAccountIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        if (empty($normalizedAccountIds)) {
            return [];
        }

        $query = AutomationFlow::query()
            ->where('user_id', $userId)
            ->whereIn('instagram_account_id', $normalizedAccountIds)
            ->select('instagram_account_id', 'trigger_media_url');

        if ($ignoreFlowId) {
            $query->where('id', '!=', $ignoreFlowId);
        }

        $grouped = $query->get()
            ->groupBy('instagram_account_id')
            ->map(function ($flows) {
                return $flows->pluck('trigger_media_url')
                    ->map(fn ($value) => trim((string) $value))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();
            });

        $result = [];
        foreach ($normalizedAccountIds as $accountId) {
            $result[$accountId] = $grouped->get($accountId, []);
        }

        return $result;
    }
}
