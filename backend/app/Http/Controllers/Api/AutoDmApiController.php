<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AutodmLinkClick;
use App\Models\AutodmReminderEvent;
use App\Models\AutomationFlow;
use App\Models\AutomationFlowMessage;
use App\Models\AutomationLog;
use App\Models\InstagramAccount;
use App\Models\InstagramAccountMediaAnalytics;
use App\Models\User;
use App\Services\MetaApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoDmApiController extends Controller
{
    /**
     * Resolve the current authenticated user with strict production guards.
     */
    private function resolveUser(Request $request): ?User
    {
        $user = Auth::user() ?: $request->user();
        if (!$user && app()->environment('local')) {
            $user = User::first();
        }
        return $user;
    }

    /**
     * Resolve the best displayable image thumbnail URL for a flow or trigger.
     */
    private function resolveDisplayThumbnail(?string $storedUrl, ?string $dbThumbnail = null, ?string $variantUrl = null): ?string
    {
        $isVideo = is_string($storedUrl) && (
            str_contains($storedUrl, '.mp4') ||
            str_contains($storedUrl, 'video_dashinit') ||
            str_contains($storedUrl, '/o1/v/')
        );

        if (!$isVideo && filled($storedUrl)) {
            return $storedUrl;
        }

        if (filled($dbThumbnail)) {
            return $dbThumbnail;
        }

        if (filled($storedUrl)) {
            return $storedUrl;
        }

        return filled($variantUrl) ? $variantUrl : null;
    }

    /**
     * List AutoDM campaigns & conversion statistics.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (int) $user->id;

        $accounts = InstagramAccount::where('user_id', $userId)
            ->where('status', 'active')
            ->get(['id', 'username', 'profile_picture_url', 'status']);

        $selectedAccountId = $request->query('instagram_account_id') ?: $request->query('account_id');
        if (!$selectedAccountId) {
            return response()->json([
                'code' => 'INSTAGRAM_ACCOUNT_REQUIRED',
                'message' => 'Instagram account selection is required.',
            ], 422);
        }

        if ($selectedAccountId !== 'all') {
            $account = $accounts->firstWhere('id', (int) $selectedAccountId)
                ?: $accounts->firstWhere('id', (string) $selectedAccountId);

            if (!$account) {
                return response()->json([
                    'code' => 'INSTAGRAM_ACCOUNT_INVALID',
                    'message' => 'The requested Instagram account is invalid or unauthorized.',
                ], 403);
            }
        }

        $flowsQuery = AutomationFlow::where('user_id', $userId);
        if ($selectedAccountId !== 'all') {
            $flowsQuery->where('instagram_account_id', $selectedAccountId);
        }

        $flows = $flowsQuery
            ->with([
                'instagramAccount:id,username,profile_picture_url',
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
        $reminderMetricsByFlow = collect();

        if ($flowIds->isNotEmpty()) {
            $clickCountsByFlow = AutodmLinkClick::whereIn('automation_flow_id', $flowIds)
                ->selectRaw('automation_flow_id, COUNT(*) as clicks_count')
                ->groupBy('automation_flow_id')
                ->pluck('clicks_count', 'automation_flow_id');

            $reminderMetricsByFlow = AutodmReminderEvent::whereIn('automation_flow_id', $flowIds)
                ->selectRaw('automation_flow_id')
                ->selectRaw("SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count")
                ->selectRaw("SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count")
                ->selectRaw('SUM(clicks_count) as clicks_count')
                ->groupBy('automation_flow_id')
                ->get()
                ->keyBy('automation_flow_id');
        }

        $triggerValues = $flows->pluck('trigger_value')->filter(fn ($val) => !empty($val) && $val !== 'all' && $val !== 'all-media')->values();
        $mediaThumbnailsByTrigger = collect();
        if ($triggerValues->isNotEmpty()) {
            $mediaRows = InstagramAccountMediaAnalytics::whereIn('instagram_media_id', $triggerValues)
                ->orWhereIn('id', $triggerValues)
                ->get();
            foreach ($mediaRows as $row) {
                $img = $row->thumbnail_url ?: ($row->media_url ?: ($row->original_url ?? null));
                if ($img) {
                    if ($row->instagram_media_id) {
                        $mediaThumbnailsByTrigger->put((string) $row->instagram_media_id, $img);
                    }
                    if ($row->id) {
                        $mediaThumbnailsByTrigger->put((string) $row->id, $img);
                    }
                }
            }

            $scheduledRows = \App\Models\ScheduledPost::whereIn('id', $triggerValues)
                ->orWhereIn('meta_media_id', $triggerValues)
                ->get();
            foreach ($scheduledRows as $sp) {
                if ($sp->media_url) {
                    $mediaThumbnailsByTrigger->put((string) $sp->id, $sp->media_url);
                    if ($sp->meta_media_id) {
                        $mediaThumbnailsByTrigger->put((string) $sp->meta_media_id, $sp->media_url);
                    }
                }
            }
        }

        $campaigns = $flows->map(function ($flow) use ($clickCountsByFlow, $reminderMetricsByFlow, $mediaThumbnailsByTrigger) {
            $sentCount = (int) ($flow->sent_runs_count ?? 0);
            $clicksCount = (int) ($clickCountsByFlow[$flow->id] ?? 0);
            $conversionRate = $sentCount > 0 ? round(($clicksCount / $sentCount) * 100, 1) : 0.0;

            $rawKeywords = $flow->keywords;
            if (is_string($rawKeywords)) {
                $decoded = json_decode($rawKeywords, true);
                $keywords = is_array($decoded) ? $decoded : [$rawKeywords];
            } elseif (is_array($rawKeywords)) {
                $keywords = $rawKeywords;
            } else {
                $keywords = [];
            }

            $primaryKeyword = !empty($keywords) ? (string) $keywords[0] : '';
            $secondaryKeywords = count($keywords) > 1 ? array_slice($keywords, 1) : [];

            $firstVariant = $flow->messageVariants->first();
            $replyMessage = $firstVariant?->message_text ?? $flow->opening_message ?? '';

            // Format human-friendly trigger type
            $triggerType = match (strtolower((string) $flow->trigger_type)) {
                'reel' => 'Reel',
                'story' => 'Story',
                'post' => 'Post',
                'all_posts' => 'All Posts',
                default => ucfirst((string) ($flow->trigger_type ?: 'Post')),
            };

            $triggerValue = (string) ($flow->trigger_value ?? '');
            $dbThumbnail = $mediaThumbnailsByTrigger->get($triggerValue);
            $thumbnailUrl = $this->resolveDisplayThumbnail(
                $flow->trigger_media_url,
                $dbThumbnail,
                $firstVariant?->media_url
            );
            $accountAvatar = $flow->instagramAccount?->profile_picture_url
                ?: (Cache::get("autodm:live-profile-picture-url:{$flow->instagram_account_id}") ?? null);

            return [
                'id' => (string) $flow->id,
                'accountId' => (string) ($flow->instagram_account_id ?? ''),
                'accountUsername' => $flow->instagramAccount?->username ?? '',
                'accountAvatar' => $accountAvatar,
                'name' => $flow->name ?: ($primaryKeyword ? "Campaign {$primaryKeyword}" : "Campaign #{$flow->id}"),
                'keyword' => $primaryKeyword,
                'secondaryKeywords' => $secondaryKeywords,
                'triggerType' => $triggerType,
                'triggerValue' => $triggerValue,
                'thumbnailUrl' => $thumbnailUrl,
                'primaryDmMessage' => $replyMessage,
                'openingButtonText' => $flow->opening_button_text ?? '',
                'followGateRequired' => (bool) ($flow->ask_to_follow_enabled ?? false),
                'hasReminders' => (bool) ($flow->reminder_enabled ?? false),
                'reminderDelayHours' => (int) ($flow->reminder_delay_hours ?? 2),
                'autoCommentReply' => (bool) ($flow->public_reply_enabled ?? false),
                'commentReplies' => is_array($flow->public_comment_reply) ? $flow->public_comment_reply : [],
                'dmsSent' => $sentCount,
                'clicks' => $clicksCount,
                'conversionRate' => $conversionRate,
                'status' => strtolower((string) ($flow->status ?: 'active')),
                'createdAt' => optional($flow->created_at)->toIso8601String() ?? '',
            ];
        });

        // Compute aggregate performance metrics
        $totalSent = (int) $flows->sum('sent_runs_count');
        $totalClicks = (int) $clickCountsByFlow->sum();
        $avgCtr = $totalSent > 0 ? round(($totalClicks / $totalSent) * 100, 1) . '%' : '0%';
        $activeCount = $flows->where('status', 'active')->count();

        $sentLast7Days = 0;
        if ($flowIds->isNotEmpty()) {
            $sentLast7Days = AutomationLog::whereIn('automation_flow_id', $flowIds)
                ->where('status', 'sent')
                ->where('created_at', '>=', now()->subDays(7))
                ->count();
        }

        $performance = [
            'totalSent' => $totalSent,
            'totalClicks' => $totalClicks,
            'avgCtr' => $avgCtr,
            'activeCount' => $activeCount,
            'totalCount' => $flows->count(),
            'sentLast7Days' => $sentLast7Days,
        ];

        return response()->json([
            'campaigns' => $campaigns,
            'performance' => $performance,
            'accounts' => $accounts->map(fn ($acc) => [
                'id' => (string) $acc->id,
                'username' => $acc->username,
                'avatar' => $acc->profile_picture_url,
            ]),
        ]);
    }

    /**
     * Create a new AutoDM trigger campaign funnel.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $request->validate([
            'keyword' => ['nullable', 'string'],
            'triggerKeyword' => ['nullable', 'string'],
            'name' => ['nullable', 'string'],
            'title' => ['nullable', 'string'],
            'primaryDmMessage' => ['nullable', 'string'],
            'dmMessage' => ['nullable', 'string'],
        ]);

        $primaryKeyword = strtoupper(trim($request->input('keyword') ?: $request->input('triggerKeyword', '')));
        $aliases = $request->input('aliases', $request->input('secondaryKeywords', []));
        if (is_string($aliases)) {
            $aliases = array_filter(array_map('trim', explode(',', $aliases)));
        }
        $keywords = array_values(array_unique(array_filter(array_merge([$primaryKeyword], (array) $aliases))));

        $name = trim($request->input('name') ?: $request->input('title', ''));
        if ($name === '') {
            $name = $primaryKeyword ? "Campaign {$primaryKeyword}" : 'AutoDM Campaign';
        }

        $accountId = $request->input('instagram_account_id') ?: $request->input('accountId');
        if (!$accountId) {
            $firstAccount = InstagramAccount::where('user_id', $user->id)->where('status', 'active')->first();
            $accountId = $firstAccount?->id;
        }

        $dmMessage = trim($request->input('primaryDmMessage') ?: $request->input('dmMessage', ''));
        $dmGreeting = trim($request->input('dmGreeting', ''));
        $fullMessage = $dmGreeting ? "{$dmGreeting}\n\n{$dmMessage}" : $dmMessage;

        $rawTrigger = strtolower(trim($request->input('triggerType', 'post')));
        $triggerType = in_array($rawTrigger, ['post', 'reel', 'story']) ? $rawTrigger : 'post';

        $rawStatus = strtolower(trim($request->input('status', 'active')));
        $status = in_array($rawStatus, ['active', 'paused']) ? $rawStatus : 'active';

        $triggerVal = (string) $request->input('triggerValue', $request->input('selectedPostId', 'all-media'));
        $inputTriggerMedia = $request->input('triggerMediaUrl', $request->input('thumbnailUrl', $request->input('trigger_media_url')));
        if ((empty($inputTriggerMedia) || str_contains((string) $inputTriggerMedia, '.mp4')) && !empty($triggerVal) && $triggerVal !== 'all-media') {
            $matchedMedia = InstagramAccountMediaAnalytics::where('instagram_media_id', $triggerVal)->orWhere('id', $triggerVal)->first();
            if ($matchedMedia && filled($matchedMedia->thumbnail_url)) {
                $inputTriggerMedia = $matchedMedia->thumbnail_url;
            }
        }

        $flow = DB::transaction(function () use ($user, $accountId, $name, $triggerType, $triggerVal, $inputTriggerMedia, $request, $keywords, $fullMessage, $status) {
            $createdFlow = AutomationFlow::create([
                'user_id' => $user->id,
                'instagram_account_id' => $accountId,
                'name' => $name,
                'trigger_type' => $triggerType,
                'trigger_value' => $triggerVal,
                'trigger_media_url' => $inputTriggerMedia,
                'keywords' => $keywords,
                'match_all_comments' => (bool) $request->input('matchAllComments', false),
                'opening_message_enabled' => true,
                'opening_message' => $fullMessage,
                'opening_button_text' => $request->input('openingButtonText', $request->input('buttonLabel')),
                'public_reply_enabled' => (bool) $request->input('autoCommentReply', $request->input('public_reply_enabled', false)),
                'public_comment_reply' => (array) $request->input('commentReplies', $request->input('public_comment_reply', [])),
                'ask_to_follow_enabled' => (bool) $request->input('requireFollow', $request->input('ask_to_follow_enabled', false)),
                'reminder_enabled' => (bool) $request->input('enableReminder', $request->input('reminder_enabled', false)),
                'reminder_delay_hours' => (int) $request->input('reminderDelayHours', 2),
                'reminder_messages' => $request->input('reminderMessage') ? [$request->input('reminderMessage')] : [],
                'status' => $status,
            ]);

            if ($fullMessage !== '') {
                AutomationFlowMessage::create([
                    'automation_flow_id' => $createdFlow->id,
                    'message_type' => 'reply',
                    'message_text' => $fullMessage,
                    'media_url' => $createdFlow->trigger_media_url,
                    'is_active' => true,
                ]);
            }

            return $createdFlow;
        });

        return response()->json([
            'id' => (string) $flow->id,
            'name' => $flow->name,
            'keyword' => $primaryKeyword,
            'triggerType' => ucfirst($flow->trigger_type),
            'dmsSent' => 0,
            'conversionRate' => 0.0,
            'status' => $flow->status,
            'createdAt' => optional($flow->created_at)->toIso8601String() ?? now()->toIso8601String(),
            'primaryDmMessage' => $flow->opening_message,
            'followGateRequired' => (bool) $flow->ask_to_follow_enabled,
            'hasReminders' => (bool) $flow->reminder_enabled,
        ], 201);
    }

    /**
     * List system and custom AutoDM templates.
     */
    public function templates(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        $userId = (int) ($user?->id ?? 0);

        $templates = \App\Models\AutoDmTemplate::query()
            ->with('useCase')
            ->where(function ($q) use ($userId) {
                $q->where('is_system', true);
                if ($userId > 0) {
                    $q->orWhere('created_by', $userId);
                }
            })
            ->latest('is_default')
            ->oldest('id')
            ->get();

        $formatted = $templates->map(function ($template) {
            $payload = is_array($template->template_payload) ? $template->template_payload : [];
            $keywords = is_array($template->keywords) ? $template->keywords : [];
            $primaryKeyword = !empty($keywords) ? (string) $keywords[0] : '';
            $aliases = count($keywords) > 1 ? array_slice($keywords, 1) : [];

            $replyMessages = is_array($payload['reply_messages'] ?? null) ? $payload['reply_messages'] : [];
            $firstReply = !empty($replyMessages) ? ($replyMessages[0]['message_text'] ?? '') : '';

            $commentReplies = is_array($payload['public_comment_reply'] ?? null) ? array_values(array_filter($payload['public_comment_reply'])) : [];

            $reminderMessages = is_array($payload['reminder_messages'] ?? null) ? $payload['reminder_messages'] : [];
            $firstReminder = !empty($reminderMessages) ? (string) $reminderMessages[0] : '';

            return [
                'id' => (string) $template->id,
                'slug' => (string) $template->slug,
                'title' => (string) ($template->title ?: $template->name),
                'name' => (string) ($template->title ?: $template->name),
                'description' => (string) ($template->description ?? ''),
                'badge' => (string) ($template->badge ?? 'Template'),
                'category' => (string) ($template->useCase?->name ?? 'Growth'),
                'triggerKeyword' => $primaryKeyword,
                'keyword' => $primaryKeyword,
                'aliases' => $aliases,
                'aliasesInput' => implode(', ', $aliases),
                'dmMessage' => $firstReply ?: (string) ($payload['opening_message'] ?? ''),
                'buttonLabel' => (string) ($payload['opening_button_text'] ?? 'Get Access'),
                'buttonUrl' => (string) ($payload['reminder_offer_url'] ?? ''),
                'autoCommentReply' => (bool) ($payload['public_reply_enabled'] ?? true),
                'commentReplies' => !empty($commentReplies) ? $commentReplies : ['Check your DMs! 🚀 Just sent you the link.'],
                'requireFollow' => (bool) ($payload['ask_to_follow_enabled'] ?? false),
                'enableReminder' => (bool) ($payload['reminder_enabled'] ?? false),
                'reminderDelayHours' => (int) ($payload['reminder_delay_hours'] ?? 2),
                'reminderMessage' => $firstReminder,
            ];
        });

        return response()->json($formatted);
    }

    /**
     * Get a single AutoDM campaign for editing.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $flow = AutomationFlow::where('user_id', $user->id)
            ->with([
                'instagramAccount:id,username,profile_picture_url',
                'messageVariants' => fn ($q) => $q->where('message_type', 'reply')->where('is_active', true)->oldest('id'),
            ])
            ->where('id', $id)
            ->first();

        if (!$flow) {
            return response()->json(['message' => 'Campaign not found'], 404);
        }

        $rawKeywords = $flow->keywords;
        if (is_string($rawKeywords)) {
            $decoded = json_decode($rawKeywords, true);
            $keywords = is_array($decoded) ? $decoded : [$rawKeywords];
        } elseif (is_array($rawKeywords)) {
            $keywords = $rawKeywords;
        } else {
            $keywords = [];
        }

        $primaryKeyword = !empty($keywords) ? (string) $keywords[0] : '';
        $secondaryKeywords = count($keywords) > 1 ? array_slice($keywords, 1) : [];

        $firstVariant = $flow->messageVariants->first();
        $replyMessage = $firstVariant?->message_text ?? $flow->opening_message ?? '';

        $reminderMessages = is_array($flow->reminder_messages) ? $flow->reminder_messages : [];
        $reminderMessage = !empty($reminderMessages) ? (string) $reminderMessages[0] : '';

        $triggerValue = (string) ($flow->trigger_value ?? '');
        $dbThumbnail = null;
        if (!empty($triggerValue) && $triggerValue !== 'all' && $triggerValue !== 'all-media') {
            $mediaRow = InstagramAccountMediaAnalytics::where('instagram_media_id', $triggerValue)
                ->orWhere('id', $triggerValue)
                ->first();
            if ($mediaRow) {
                $dbThumbnail = $mediaRow->thumbnail_url ?: ($mediaRow->media_url ?: ($mediaRow->original_url ?? null));
            }
        }
        $resolvedThumbnail = $this->resolveDisplayThumbnail(
            $flow->trigger_media_url,
            $dbThumbnail,
            $firstVariant?->media_url
        );

        return response()->json([
            'id' => (string) $flow->id,
            'accountId' => (string) ($flow->instagram_account_id ?? ''),
            'accountUsername' => $flow->instagramAccount?->username ?? '',
            'title' => $flow->name ?: ($primaryKeyword ? "Campaign {$primaryKeyword}" : "Campaign #{$flow->id}"),
            'name' => $flow->name ?: '',
            'triggerKeyword' => $primaryKeyword,
            'keyword' => $primaryKeyword,
            'aliases' => $secondaryKeywords,
            'secondaryKeywords' => $secondaryKeywords,
            'sourceType' => $flow->trigger_type === 'story' ? 'story' : 'media',
            'triggerType' => $flow->trigger_type ?: 'post',
            'selectedPostId' => (string) ($flow->trigger_value ?? 'all-media'),
            'triggerValue' => $triggerValue,
            'triggerMediaUrl' => $resolvedThumbnail ?: ($flow->trigger_media_url ?: ($firstVariant?->media_url ?? null)),
            'thumbnailUrl' => $resolvedThumbnail ?: ($flow->trigger_media_url ?: ($firstVariant?->media_url ?? null)),
            'dmGreeting' => '',
            'dmMessage' => $replyMessage,
            'primaryDmMessage' => $replyMessage,
            'buttonLabel' => $flow->opening_button_text ?? '',
            'openingButtonText' => $flow->opening_button_text ?? '',
            'buttonUrl' => '',
            'requireFollow' => (bool) ($flow->ask_to_follow_enabled ?? false),
            'ask_to_follow_enabled' => (bool) ($flow->ask_to_follow_enabled ?? false),
            'enableReminder' => (bool) ($flow->reminder_enabled ?? false),
            'reminder_enabled' => (bool) ($flow->reminder_enabled ?? false),
            'reminderDelayHours' => (int) ($flow->reminder_delay_hours ?? 2),
            'reminderMessage' => $reminderMessage,
            'autoCommentReply' => (bool) ($flow->public_reply_enabled ?? false),
            'public_reply_enabled' => (bool) ($flow->public_reply_enabled ?? false),
            'commentReplies' => is_array($flow->public_comment_reply) ? $flow->public_comment_reply : [],
            'status' => strtolower((string) ($flow->status ?: 'active')),
            'createdAt' => optional($flow->created_at)->toIso8601String() ?? '',
        ]);
    }

    /**
     * Update campaign details / toggle status or full update.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $flow = AutomationFlow::where('user_id', $user->id)->where('id', $id)->first();
        if (!$flow) {
            return response()->json(['message' => 'Campaign not found'], 404);
        }

        // 1. Simple status toggle
        if ($request->has('status') && !$request->has('triggerKeyword') && !$request->has('keyword') && !$request->has('primaryDmMessage') && !$request->has('dmMessage')) {
            $newStatus = strtolower($request->input('status')) === 'active' ? 'active' : 'paused';
            $flow->update(['status' => $newStatus]);

            if ($request->has('name')) {
                $flow->update(['name' => trim($request->input('name'))]);
            }

            return response()->json([
                'id' => (string) $flow->id,
                'success' => true,
                'status' => $flow->status,
                'updatedAt' => now()->toIso8601String(),
            ]);
        }

        // 2. Full campaign update
        $primaryKeyword = strtoupper(trim($request->input('keyword') ?: $request->input('triggerKeyword', '')));
        $aliases = $request->input('aliases', $request->input('secondaryKeywords', []));
        if (is_string($aliases)) {
            $aliases = array_filter(array_map('trim', explode(',', $aliases)));
        }
        $keywords = array_values(array_unique(array_filter(array_merge([$primaryKeyword], (array) $aliases))));

        $name = trim($request->input('name') ?: $request->input('title', ''));
        if ($name === '') {
            $name = $primaryKeyword ? "Campaign {$primaryKeyword}" : $flow->name;
        }

        $dmMessage = trim($request->input('primaryDmMessage') ?: $request->input('dmMessage', ''));
        $dmGreeting = trim($request->input('dmGreeting', ''));
        $fullMessage = $dmGreeting ? "{$dmGreeting}\n\n{$dmMessage}" : $dmMessage;

        $rawTrigger = strtolower(trim($request->input('triggerType', (string) $flow->trigger_type)));
        $triggerType = in_array($rawTrigger, ['post', 'reel', 'story']) ? $rawTrigger : $flow->trigger_type;

        $rawStatus = strtolower(trim($request->input('status', (string) $flow->status)));
        $status = in_array($rawStatus, ['active', 'paused']) ? $rawStatus : $flow->status;

        $triggerVal = (string) $request->input('triggerValue', $request->input('selectedPostId', $flow->trigger_value));
        $inputTriggerMedia = $request->input('triggerMediaUrl', $request->input('thumbnailUrl', $request->input('trigger_media_url', $flow->trigger_media_url)));
        if ((empty($inputTriggerMedia) || str_contains((string) $inputTriggerMedia, '.mp4')) && !empty($triggerVal) && $triggerVal !== 'all-media') {
            $matchedMedia = InstagramAccountMediaAnalytics::where('instagram_media_id', $triggerVal)->orWhere('id', $triggerVal)->first();
            if ($matchedMedia && filled($matchedMedia->thumbnail_url)) {
                $inputTriggerMedia = $matchedMedia->thumbnail_url;
            }
        }

        DB::transaction(function () use ($flow, $name, $triggerType, $triggerVal, $inputTriggerMedia, $request, $keywords, $fullMessage, $status) {
            $flow->update([
                'name' => $name,
                'trigger_type' => $triggerType,
                'trigger_value' => $triggerVal,
                'trigger_media_url' => $inputTriggerMedia,
                'keywords' => !empty($keywords) ? $keywords : $flow->keywords,
                'opening_message' => $fullMessage ?: $flow->opening_message,
                'opening_button_text' => $request->input('openingButtonText', $request->input('buttonLabel', $flow->opening_button_text)),
                'public_reply_enabled' => (bool) $request->input('autoCommentReply', $request->input('public_reply_enabled', $flow->public_reply_enabled)),
                'public_comment_reply' => (array) $request->input('commentReplies', $request->input('public_comment_reply', $flow->public_comment_reply)),
                'ask_to_follow_enabled' => (bool) $request->input('requireFollow', $request->input('ask_to_follow_enabled', $flow->ask_to_follow_enabled)),
                'reminder_enabled' => (bool) $request->input('enableReminder', $request->input('reminder_enabled', $flow->reminder_enabled)),
                'reminder_delay_hours' => (int) $request->input('reminderDelayHours', $flow->reminder_delay_hours ?? 2),
                'reminder_messages' => $request->input('reminderMessage') ? [$request->input('reminderMessage')] : $flow->reminder_messages,
                'status' => $status,
            ]);

            if ($fullMessage !== '') {
                $variant = $flow->messageVariants()->where('message_type', 'reply')->first();
                if ($variant) {
                    $variant->update([
                        'message_text' => $fullMessage,
                        'media_url' => $flow->trigger_media_url,
                    ]);
                } else {
                    AutomationFlowMessage::create([
                        'automation_flow_id' => $flow->id,
                        'message_type' => 'reply',
                        'message_text' => $fullMessage,
                        'media_url' => $flow->trigger_media_url,
                        'is_active' => true,
                    ]);
                }
            }
        });

        return response()->json([
            'id' => (string) $flow->id,
            'name' => $flow->name,
            'success' => true,
            'status' => $flow->status,
            'message' => 'Campaign updated successfully',
        ]);
    }

    /**
     * Duplicate a campaign.
     */
    public function duplicate(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $flow = AutomationFlow::where('user_id', $user->id)
            ->with('messageVariants')
            ->where('id', $id)
            ->first();

        if (!$flow) {
            return response()->json(['message' => 'Campaign not found'], 404);
        }

        $clone = DB::transaction(function () use ($flow) {
            $duplicateName = $flow->name ? 'Copy of ' . $flow->name : 'Copy of Flow #' . $flow->id;

            $newFlow = AutomationFlow::create([
                'user_id' => $flow->user_id,
                'instagram_account_id' => $flow->instagram_account_id,
                'lead_form_id' => $flow->lead_form_id,
                'name' => $duplicateName,
                'trigger_type' => $flow->trigger_type,
                'trigger_value' => $flow->trigger_value,
                'trigger_media_url' => $flow->trigger_media_url,
                'keywords' => $flow->keywords,
                'match_all_comments' => (bool) $flow->match_all_comments,
                'opening_message_enabled' => (bool) $flow->opening_message_enabled,
                'opening_message' => $flow->opening_message,
                'opening_button_text' => $flow->opening_button_text,
                'public_reply_enabled' => (bool) $flow->public_reply_enabled,
                'public_comment_reply' => $flow->public_comment_reply,
                'ask_to_follow_enabled' => (bool) $flow->ask_to_follow_enabled,
                'reminder_enabled' => (bool) $flow->reminder_enabled,
                'reminder_delay_hours' => $flow->reminder_delay_hours,
                'reminder_messages' => $flow->reminder_messages,
                'status' => 'paused',
            ]);

            foreach ($flow->messageVariants as $variant) {
                AutomationFlowMessage::create([
                    'automation_flow_id' => $newFlow->id,
                    'message_type' => $variant->message_type,
                    'message_text' => $variant->message_text,
                    'media_url' => $variant->media_url,
                    'is_active' => $variant->is_active,
                ]);
            }

            return $newFlow;
        });

        return response()->json([
            'id' => (string) $clone->id,
            'name' => $clone->name,
            'success' => true,
            'message' => 'Campaign duplicated successfully',
        ], 201);
    }

    /**
     * Delete campaign.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $flow = AutomationFlow::where('user_id', $user->id)->where('id', $id)->first();
        if (!$flow) {
            return response()->json(['message' => 'Campaign not found'], 404);
        }

        $flow->delete();

        return response()->json([
            'id' => $id,
            'deleted' => true,
            'message' => 'AutoDM Campaign deleted successfully',
        ]);
    }

    /**
     * Fetch media or stories for AutoDM trigger selection (Hybrid approach).
     */
    public function fetchMedia(Request $request, string $accountId, MetaApiService $metaApiService): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $account = InstagramAccount::where('user_id', $user->id)
            ->where(function ($q) use ($accountId) {
                $q->where('id', $accountId)
                  ->orWhere('ig_account_id', $accountId)
                  ->orWhere('username', $accountId);
            })->first();

        if (!$account) {
            return response()->json(['message' => 'Instagram account not found'], 404);
        }

        $source = strtolower(trim((string) $request->query('source', 'media')));
        if (!in_array($source, ['media', 'story'], true)) {
            $source = 'media';
        }

        $refresh = filter_var($request->query('refresh', false), FILTER_VALIDATE_BOOLEAN);
        $after = $request->query('after');
        $cursor = is_string($after) && trim($after) !== '' ? trim($after) : null;
        $limit = max(1, min(50, (int) $request->query('limit', 20)));
        $mediaId = trim((string) $request->query('media_id', ''));

        // Case A: Fetch single media item by ID
        if ($mediaId !== '') {
            $singleItem = null;
            if ($account->access_token && $account->ig_account_id) {
                try {
                    $singleItem = $metaApiService->fetchMediaById(
                        $account->access_token,
                        $account->ig_account_id,
                        $mediaId
                    );
                } catch (\Throwable $e) {
                    Log::warning('AutoDM fetch media by ID from Meta failed', [
                        'account_id' => $account->id,
                        'media_id' => $mediaId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            if (!is_array($singleItem)) {
                $singleItem = $this->resolveCachedMediaItem((int) $user->id, (int) $account->id, $mediaId);
            }

            $normalized = $this->normalizeMediaItems($singleItem ? [$singleItem] : [], $source);

            return response()->json([
                'media' => $normalized,
                'source' => $source,
                'paging' => [
                    'next_cursor' => null,
                    'has_next_page' => false,
                ],
            ]);
        }

        // Case B: Stories (Always live from Meta Graph API with DB fallback)
        if ($source === 'story') {
            if ($refresh && $account->ig_account_id) {
                Cache::forget(implode(':', ['autodm', 'stories', $account->ig_account_id, $limit, $cursor ?: 'first']));
            }

            $metaStories = [];
            $paging = ['next_cursor' => null, 'has_next_page' => false];
            $fetchSucceeded = false;

            if ($account->access_token && $account->ig_account_id) {
                try {
                    $res = $metaApiService->fetchUserStories(
                        $account->access_token,
                        $account->ig_account_id,
                        $cursor,
                        $limit
                    );
                    $metaStories = $res['data'] ?? [];
                    $paging = $res['paging'] ?? $paging;
                    $fetchSucceeded = true;
                } catch (\Throwable $e) {
                    Log::warning('AutoDM live stories fetch failed; using DB fallback', [
                        'account_id' => $account->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            if (!$fetchSucceeded || empty($metaStories)) {
                // Fallback to cached stories in database from last 24h
                $cachedStories = InstagramAccountMediaAnalytics::where('user_id', $user->id)
                    ->where('instagram_account_id', $account->id)
                    ->where(function ($q) {
                        $q->whereIn('format', ['story', 'STORY'])
                          ->orWhere('media_type', 'STORY')
                          ->orWhere('permalink', 'like', '%/stories/%');
                    })
                    ->where('posted_at', '>=', now()->subDay())
                    ->latest('posted_at')
                    ->take($limit)
                    ->get();

                if ($cachedStories->isNotEmpty()) {
                    $metaStories = $cachedStories->map(fn ($row) => $this->mapAnalyticsRowToMediaItem($row))->all();
                }
            }

            return response()->json([
                'media' => $this->normalizeMediaItems($metaStories, 'story'),
                'source' => 'story',
                'paging' => $paging,
                'refreshed' => $refresh,
            ]);
        }

        // Case C: Posts & Reels (Hybrid: Cache-First + Live Refresh On Demand)
        // If not forced refresh and no pagination cursor requested, serve from local DB cache
        if (!$refresh && !$cursor) {
            $cachedRows = InstagramAccountMediaAnalytics::where('user_id', $user->id)
                ->where('instagram_account_id', $account->id)
                ->where(function ($q) {
                    $q->whereNull('format')->orWhereNotIn('format', ['story', 'STORY']);
                })
                ->where(function ($q) {
                    $q->whereNull('media_type')->orWhere('media_type', '!=', 'STORY');
                })
                ->latest('posted_at')
                ->take($limit)
                ->get();

            if ($cachedRows->isNotEmpty()) {
                $items = $cachedRows->map(fn ($row) => $this->mapAnalyticsRowToMediaItem($row))->all();

                return response()->json([
                    'media' => $this->normalizeMediaItems($items, 'media'),
                    'source' => 'media',
                    'cached' => true,
                    'paging' => [
                        'next_cursor' => null,
                        'has_next_page' => false,
                    ],
                ]);
            }
        }

        // Live fetch from Meta Graph API (either refresh=true, cursor pagination, or DB was empty)
        if ($refresh && $account->ig_account_id) {
            Cache::forget(implode(':', ['autodm', 'media', $account->ig_account_id, $limit, $cursor ?: 'first']));
        }

        $liveMedia = [];
        $paging = ['next_cursor' => null, 'has_next_page' => false];

        if ($account->access_token && $account->ig_account_id) {
            try {
                $res = $metaApiService->fetchUserMedia(
                    $account->access_token,
                    $account->ig_account_id,
                    $cursor,
                    $limit
                );
                $liveMedia = $res['data'] ?? [];
                $paging = $res['paging'] ?? $paging;

                // Upsert returned media into database cache
                foreach ($liveMedia as $item) {
                    if (empty($item['id'])) continue;

                    $rawType = strtoupper(trim((string) ($item['media_type'] ?? 'IMAGE')));
                    $prodType = strtoupper(trim((string) ($item['media_product_type'] ?? '')));
                    $format = match (true) {
                        $prodType === 'REELS' || $rawType === 'VIDEO' => 'reel',
                        $prodType === 'CAROUSEL' || $rawType === 'CAROUSEL_ALBUM' => 'carousel',
                        default => 'post',
                    };

                    InstagramAccountMediaAnalytics::updateOrCreate(
                        [
                            'instagram_account_id' => $account->id,
                            'instagram_media_id' => (string) $item['id'],
                        ],
                        [
                            'user_id' => $user->id,
                            'media_type' => $rawType,
                            'format' => $format,
                            'caption' => $item['caption'] ?? null,
                            'permalink' => $item['permalink'] ?? null,
                            'media_url' => $item['media_url'] ?? null,
                            'thumbnail_url' => $item['thumbnail_url'] ?? ($item['media_url'] ?? null),
                            'posted_at' => isset($item['timestamp']) ? \Illuminate\Support\Carbon::parse($item['timestamp']) : now(),
                            'synced_at' => now(),
                            'raw_media' => $item,
                        ]
                    );
                }
            } catch (\Throwable $e) {
                Log::warning('AutoDM live media fetch failed', [
                    'account_id' => $account->id,
                    'error' => $e->getMessage(),
                ]);

                // Fallback to whatever is cached in DB
                $cachedRows = InstagramAccountMediaAnalytics::where('user_id', $user->id)
                    ->where('instagram_account_id', $account->id)
                    ->where(function ($q) {
                        $q->whereNull('format')->orWhereNotIn('format', ['story', 'STORY']);
                    })
                    ->latest('posted_at')
                    ->take($limit)
                    ->get();

                $liveMedia = $cachedRows->map(fn ($row) => $this->mapAnalyticsRowToMediaItem($row))->all();
            }
        } else {
            // No access token configured, fallback to DB
            $cachedRows = InstagramAccountMediaAnalytics::where('user_id', $user->id)
                ->where('instagram_account_id', $account->id)
                ->where(function ($q) {
                    $q->whereNull('format')->orWhereNotIn('format', ['story', 'STORY']);
                })
                ->latest('posted_at')
                ->take($limit)
                ->get();

            $liveMedia = $cachedRows->map(fn ($row) => $this->mapAnalyticsRowToMediaItem($row))->all();
        }

        return response()->json([
            'media' => $this->normalizeMediaItems($liveMedia, 'media'),
            'source' => 'media',
            'cached' => false,
            'paging' => $paging,
            'refreshed' => $refresh,
        ]);
    }

    /**
     * Normalize media items for AutoDM consumption.
     */
    private function normalizeMediaItems(array $mediaItems, string $source): array
    {
        return collect($mediaItems)
            ->map(function ($item) use ($source) {
                $normalized = is_array($item) ? $item : [];
                $mediaType = strtoupper(trim((string) ($normalized['media_type'] ?? '')));
                $mediaProductType = strtoupper(trim((string) ($normalized['media_product_type'] ?? '')));

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

                $thumbnail = $normalized['thumbnail_url'] ?? ($normalized['media_url'] ?? '');
                $caption = $normalized['caption'] ?? '';
                $permalink = $normalized['permalink'] ?? '';
                $id = (string) ($normalized['id'] ?? '');

                return array_merge($normalized, [
                    'id' => $id,
                    'title' => $caption,
                    'thumbnail' => $thumbnail,
                    'thumbnail_url' => $thumbnail,
                    'media_url' => $normalized['media_url'] ?? '',
                    'permalink' => $permalink,
                    'instagramUrl' => $permalink,
                    'autodm_source' => $source,
                    'autodm_trigger_type' => $triggerType,
                    'autodm_media_label' => $label,
                ]);
            })
            ->filter(fn ($item) => is_array($item) && filled($item['id'] ?? null))
            ->values()
            ->all();
    }

    /**
     * Map a database InstagramAccountMediaAnalytics row to media item array.
     */
    private function mapAnalyticsRowToMediaItem(InstagramAccountMediaAnalytics $row): array
    {
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
            'caption' => $row->caption ?? '',
            'media_type' => $row->media_type ?: $fallbackMediaType,
            'media_product_type' => $fallbackProductType,
            'media_url' => $row->media_url ?? '',
            'thumbnail_url' => $row->thumbnail_url ?: ($row->media_url ?? ''),
            'permalink' => $row->permalink ?? '',
            'timestamp' => optional($row->posted_at)->toIso8601String(),
        ];
    }

    /**
     * Resolve single cached media item from database.
     */
    private function resolveCachedMediaItem(int $userId, int $instagramAccountId, string $mediaId): ?array
    {
        $row = InstagramAccountMediaAnalytics::where('user_id', $userId)
            ->where('instagram_account_id', $instagramAccountId)
            ->where('instagram_media_id', trim($mediaId))
            ->first();

        if (!$row) {
            return null;
        }

        return $this->mapAnalyticsRowToMediaItem($row);
    }
}
