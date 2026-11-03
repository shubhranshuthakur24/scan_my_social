<?php

namespace App\Jobs;

use App\Models\AutodmReminderEvent;
use App\Models\AutomationFlow;
use App\Models\AutomationLog;
use App\Models\InstagramAccount;
use App\Services\AutodmDeeplinkService;
use App\Services\MediaUrlService;
use App\Services\MetaApiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class ExecuteAutomationActionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private const ASK_TO_FOLLOW_PROFILE_BUTTON = 'Visit Profile';

    private const ASK_TO_FOLLOW_CONFIRM_BUTTON = 'Yes, I follow';

    // Retry policy for transient Meta API failures.
    public $tries = 3;

    public $backoff = [30, 60, 120];

    // Queue payload carries only IDs so fresh DB state is loaded at runtime.
    public function __construct(
        public int $flowId,
        public string $triggerSourceId,
        public string $recipientIgId,
        public int $accountId,
        public string $sequenceMode = 'full'
    ) {
        $this->onQueue('autodm');
    }

    public function handle(
        MetaApiService $metaApiService,
        MediaUrlService $mediaUrlService,
        AutodmDeeplinkService $deeplinkService
    ): void {
        // Trace each job execution with key identifiers for support/debugging.
        Log::info('ExecuteAutomationActionJob started', [
            'flow_id' => $this->flowId,
            'recipient' => $this->recipientIgId,
            'sequence_mode' => $this->sequenceMode,
        ]);

        $sequenceMode = in_array($this->sequenceMode, ['full', 'reply_only', 'post_follow'], true)
            ? $this->sequenceMode
            : 'full';

        /*
        |--------------------------------------------------------------------------
        | Fetch Flow + Account
        |--------------------------------------------------------------------------
        */

        $flow = AutomationFlow::with([
            'messageVariants' => fn ($query) => $query
                ->where('is_active', true)
                ->where('message_type', 'reply')
                ->select('id', 'automation_flow_id', 'message_type', 'message_text', 'media_url'),
        ])
            ->select(
                'id',
                'trigger_type',
                'opening_message_enabled',
                'opening_message',
                'opening_button_text',
                'public_reply_enabled',
                'public_comment_reply',
                'public_reply_limit_enabled',
                'public_reply_limit_count',
                'ask_to_follow_enabled',
                'ask_to_follow_strict',
                'ask_to_follow_message',
                'reminder_enabled',
                'reminder_delay_hours',
                'reminder_messages',
                'reminder_primary_button_text',
                'reminder_secondary_button_text',
                'reminder_more_message',
                'reminder_offer_url',
                'reminder_offer_button_text',
                'instagram_account_id',
                'status'
            )
            ->find($this->flowId);

        $account = InstagramAccount::select('id', 'ig_account_id', 'access_token', 'status', 'profile_url', 'username')
            ->find($this->accountId);

        if (! $flow || ! $account || $account->status !== 'active' || $flow->status !== 'active') {
            // Hard stop when flow/account is missing or disconnected.
            Log::info('Flow/account missing or inactive');

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | HARD DUPLICATE PROTECTION (DB)
        |--------------------------------------------------------------------------
        */

        $existingLog = AutomationLog::where('automation_flow_id', $flow->id)
            ->where('trigger_source_id', $this->triggerSourceId)
            ->latest('id')
            ->first();

        if ($existingLog && ($existingLog->status ?? '') !== 'failed') {
            // Idempotency guard: do not process the same trigger twice.
            Log::info('Duplicate trigger ignored', [
                'trigger_id' => $this->triggerSourceId,
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | DAILY LIMIT PROTECTION
        |--------------------------------------------------------------------------
        */

        $dailyRecipientLimitEnabled = filter_var(
            config('services.autodm.daily_recipient_limit_enabled', true),
            FILTER_VALIDATE_BOOLEAN,
            FILTER_NULL_ON_FAILURE
        );
        $dailyRecipientLimitEnabled = $dailyRecipientLimitEnabled ?? true;

        if (! in_array($sequenceMode, ['reply_only', 'post_follow'], true) && $dailyRecipientLimitEnabled) {
            $recentDm = AutomationLog::whereHas(
                'automationFlow',
                fn ($q) => $q->where('instagram_account_id', $account->id)
            )
                ->where('recipient_ig_id', $this->recipientIgId)
                ->whereDate('created_at', today())
                ->whereIn('status', ['sent', 'awaiting_click', 'awaiting_follow', 'awaiting_user_dm'])
                ->exists();

            if ($recentDm) {
                // Conversation-level throttling: one outbound sequence per recipient per day.
                Log::info('Already DM today', ['recipient' => $this->recipientIgId]);

                return;
            }
        }

        // Start with queued status so retries/failures always have a persisted trail.
        if ($existingLog && $this->attempts() > 1) {
            $log = $existingLog;
            $log->update([
                'status' => 'queued',
                'error_code' => null,
                'error_message' => null,
                'response_payload' => null,
            ]);
        } else {
            $log = AutomationLog::create([
                'automation_flow_id' => $flow->id,
                'trigger_source_id' => $this->triggerSourceId,
                'recipient_ig_id' => $this->recipientIgId,
                'status' => 'queued',
            ]);
        }

        // Normalize the configured reply message into send-ready format.
        $replyCandidates = $flow->messageVariants
            ->where('message_type', 'reply')
            ->map(function ($variant) {
                return [
                    'id' => (int) $variant->id,
                    'message_text' => trim((string) ($variant->message_text ?? '')),
                    'media_url' => trim((string) ($variant->media_url ?? '')),
                ];
            })
            ->filter(fn ($variant) => $variant['message_text'] !== '' || $variant['media_url'] !== '')
            ->values();

        if ($replyCandidates->isEmpty()) {
            Log::warning('Flow has no active reply message with text or image', ['flow_id' => $flow->id]);
            $log->update([
                'status' => 'failed',
                'error_message' => 'No active reply message (text/image) configured.',
            ]);

            return;
        }

        $responses = $existingLog && is_array($existingLog->response_payload)
            ? $existingLog->response_payload
            : [];
        $isCommentTriggerFlow = in_array((string) ($flow->trigger_type ?? ''), ['post', 'reel'], true);
        $sequenceContext = [
            'flow_id' => (int) $flow->id,
            'trigger_source_id' => (string) $this->triggerSourceId,
            'recipient_ig_id' => (string) $this->recipientIgId,
            'sequence_mode' => (string) $sequenceMode,
            'trigger_type' => (string) ($flow->trigger_type ?? ''),
        ];

        $askToFollowEnabled = (bool) ($flow->ask_to_follow_enabled ?? false);
        $askToFollowMessage = trim((string) ($flow->ask_to_follow_message ?? ''));
        $profileUrl = trim((string) ($account->profile_url ?? ''));
        if ($profileUrl === '') {
            $username = trim((string) ($account->username ?? ''));
            if ($username !== '') {
                $profileUrl = 'https://www.instagram.com/'.ltrim($username, '@').'/';
            }
        }

        if ($sequenceMode === 'full' && $isCommentTriggerFlow && ! ctype_digit((string) $this->triggerSourceId)) {
            $log->update([
                'status' => 'failed',
                'error_message' => 'Comment trigger ID is invalid for required public reply step.',
                'response_payload' => $responses,
            ]);

            Log::warning('Public reply required but trigger ID is non-numeric; stopping before DM', array_merge($sequenceContext, [
                'step' => 'public_reply',
                'outcome' => 'failed_invalid_trigger_id',
            ]));

            return;
        }

        // Required first action for post/reel full flows: public reply under the triggering comment.
        if (
            $sequenceMode === 'full'
            && $isCommentTriggerFlow
            && ctype_digit((string) $this->triggerSourceId)
        ) {
            if (! (bool) $flow->public_reply_enabled) {
                Log::warning('Comment flow has public reply disabled; enforcing strict order', array_merge($sequenceContext, [
                    'step' => 'public_reply',
                    'outcome' => 'forced_enabled',
                ]));
            }

            $publicReplyCandidates = collect($flow->public_comment_reply ?? [])
                ->map(fn ($message) => trim((string) $message))
                ->filter()
                ->values();

            if ($publicReplyCandidates->isEmpty()) {
                $log->update([
                    'status' => 'failed',
                    'error_message' => 'Public reply is required for post/reel flows.',
                    'response_payload' => $responses,
                ]);

                Log::warning('Public reply required but missing; stopping before DM', array_merge($sequenceContext, [
                    'step' => 'public_reply',
                    'outcome' => 'failed_missing_message',
                ]));

                return;
            }

            $publicReplyAttemptKey = $this->publicReplyAttemptCacheKey((int) $flow->id, (string) $this->triggerSourceId);
            $hasPublicReplyAttempt = Cache::has($publicReplyAttemptKey);
            if ($hasPublicReplyAttempt) {
                Log::info('Public reply skipped: already attempted for trigger', [
                    'flow_id' => $flow->id,
                    'trigger_source_id' => (string) $this->triggerSourceId,
                    'recipient_ig_id' => (string) $this->recipientIgId,
                    'window_error_policy' => 'single_public_reply_per_trigger',
                ]);
            }

            if (! $hasPublicReplyAttempt) {
                $hasPublicReplyLimit = (bool) $flow->public_reply_limit_enabled;
                $dailyPublicReplyLimit = max(1, (int) ($flow->public_reply_limit_count ?? 200));
                $publicReplyCounterKey = "autodm:public_reply_count:{$flow->id}:".now()->format('Ymd');
                $todayPublicReplyCount = (int) Cache::get($publicReplyCounterKey, 0);

                if (! $hasPublicReplyLimit || $todayPublicReplyCount < $dailyPublicReplyLimit) {
                    Cache::put($publicReplyAttemptKey, true, now()->addDays(7));
                    $selectedPublicReply = $publicReplyCandidates->random();

                    Log::info('AutoDM sequence step', array_merge($sequenceContext, [
                        'step' => 'public_reply_attempted',
                        'outcome' => 'started',
                    ]));

                    $publicReplyResponse = $metaApiService->sendPublicCommentReply(
                        $account->access_token,
                        $this->triggerSourceId,
                        $selectedPublicReply
                    );

                    $responses[] = [
                        'type' => 'public_reply',
                        'status' => $publicReplyResponse['status'],
                        'payload' => $publicReplyResponse['payload'],
                    ];

                    if ($publicReplyResponse['success']) {
                        Cache::put($publicReplyCounterKey, $todayPublicReplyCount + 1, now()->endOfDay());
                        Log::info('AutoDM sequence step', array_merge($sequenceContext, [
                            'step' => 'public_reply_sent',
                            'outcome' => 'success',
                        ]));
                    } else {
                        $publicReplyError = (string) data_get($publicReplyResponse, 'payload.error.message', 'Public reply failed.');
                        $log->update([
                            'status' => 'failed',
                            'error_code' => $publicReplyResponse['status'] ?? null,
                            'error_message' => $publicReplyError,
                            'response_payload' => $responses,
                        ]);

                        Log::warning('Public reply failed; stopping before DM flow', [
                            'flow_id' => $flow->id,
                            'trigger_source_id' => $this->triggerSourceId,
                            'status' => $publicReplyResponse['status'],
                        ]);

                        Log::warning('AutoDM sequence step', array_merge($sequenceContext, [
                            'step' => 'public_reply_failed',
                            'outcome' => 'stopped_before_dm',
                        ]));

                        return;
                    }
                } else {
                    Log::info('Public reply skipped due to daily limit', [
                        'flow_id' => $flow->id,
                        'limit' => $dailyPublicReplyLimit,
                        'count' => $todayPublicReplyCount,
                    ]);

                    $log->update([
                        'status' => 'failed',
                        'error_message' => 'Public reply limit reached for today; DM sequence skipped.',
                        'response_payload' => $responses,
                    ]);

                    Log::info('AutoDM sequence step', array_merge($sequenceContext, [
                        'step' => 'public_reply_skipped',
                        'outcome' => 'limit_reached_stopped_before_dm',
                    ]));

                    return;
                }
            }
        }

        $followPromptPayload = null;
        $openingMessage = trim((string) ($flow->opening_message ?? ''));
        if ($openingMessage !== '') {
            $openingMessage = $deeplinkService->rewriteLinksInText($openingMessage, (int) $flow->id, null);
        }
        $openingButtonText = trim((string) ($flow->opening_button_text ?? ''));
        $hasOpeningMessage = in_array($sequenceMode, ['full', 'post_follow'], true)
            && (bool) $flow->opening_message_enabled
            && $openingMessage !== '';

        if ($sequenceMode === 'full' && $askToFollowEnabled && $askToFollowMessage !== '') {
            $followPromptPayload = [
                'text' => $askToFollowMessage,
                'profile_button' => self::ASK_TO_FOLLOW_PROFILE_BUTTON,
                'confirm_button' => self::ASK_TO_FOLLOW_CONFIRM_BUTTON,
                'confirm_payload' => "AUTODM_FOLLOW_CONFIRM_{$flow->id}",
                'profile_payload' => "AUTODM_FOLLOW_PROFILE_{$flow->id}",
                'profile_url' => $profileUrl !== '' ? $profileUrl : 'https://www.instagram.com/',
            ];
            Log::info('Ask-to-follow payload built', [
                'flow_id' => $flow->id,
                'recipient' => $this->recipientIgId,
                'confirm_payload' => $followPromptPayload['confirm_payload'],
                'profile_payload' => $followPromptPayload['profile_payload'],
                'profile_url' => $followPromptPayload['profile_url'],
            ]);
        }

        // Use the configured reply message and build outbound sequence in send order.
        // Order: opening/CTA -> ask-to-follow (if enabled) -> optional image -> optional reply text.
        $selectedVariant = $replyCandidates->first();
        $selectedVariantMessageId = (int) ($selectedVariant['id'] ?? 0);
        $useOpeningButtonGate = in_array($sequenceMode, ['full', 'post_follow'], true)
            && (bool) $flow->opening_message_enabled
            && $openingMessage !== ''
            && $openingButtonText !== '';
        $messagesToSend = [];

        if (in_array($sequenceMode, ['full', 'post_follow'], true) && $useOpeningButtonGate) {
            $messagesToSend[] = [
                'type' => 'opening_with_button',
                'text' => $openingMessage,
                'button_text' => $openingButtonText,
                'button_type' => 'postback',
                'button_payload' => "AUTODM_FLOW_{$flow->id}_CTA",
            ];
        } elseif (in_array($sequenceMode, ['full', 'post_follow'], true) && (bool) $flow->opening_message_enabled && $openingMessage !== '') {
            $messagesToSend[] = [
                'type' => 'opening',
                'text' => $openingMessage,
            ];
        }

        if ($sequenceMode === 'full' && $followPromptPayload) {
            $messagesToSend[] = [
                'type' => 'ask_to_follow',
                'text' => $followPromptPayload['text'],
                'profile_button' => $followPromptPayload['profile_button'],
                'confirm_button' => $followPromptPayload['confirm_button'],
                'confirm_payload' => $followPromptPayload['confirm_payload'],
                'profile_payload' => $followPromptPayload['profile_payload'],
                'profile_url' => $followPromptPayload['profile_url'],
            ];
        }

        if ($sequenceMode === 'reply_only' || ! $useOpeningButtonGate) {
            if (! empty($selectedVariant['media_url'])) {
                $messagesToSend[] = [
                    'type' => 'reply_image',
                    'media_url' => $selectedVariant['media_url'],
                ];
            }

            if (! empty($selectedVariant['message_text'])) {
                $replyLinkCta = $this->extractReplyLinkCta((string) $selectedVariant['message_text']);
                $replyTextSource = trim((string) ($replyLinkCta['body'] ?? (string) $selectedVariant['message_text']));
                $replyLinkUrl = trim((string) ($replyLinkCta['url'] ?? ''));

                $buttonText = trim((string) ($replyLinkCta['label'] ?? ''));
                $buttonUrl = '';
                if ($replyLinkUrl !== '') {
                    $buttonUrl = trim((string) $deeplinkService->rewriteLinksInText(
                        $replyLinkUrl,
                        (int) $flow->id,
                        $selectedVariantMessageId > 0 ? $selectedVariantMessageId : null
                    ));
                }

                if ($replyLinkUrl !== '' && $buttonText === '') {
                    $replyTextSource = $replyTextSource !== ''
                        ? ($replyTextSource."\n".$replyLinkUrl)
                        : $replyLinkUrl;
                }

                $replyText = $deeplinkService->rewriteLinksInText(
                    $replyTextSource,
                    (int) $flow->id,
                    $selectedVariantMessageId > 0 ? $selectedVariantMessageId : null
                );

                if ($buttonText !== '') {
                    $messagesToSend[] = [
                        'type' => 'reply_with_button',
                        'text' => $replyText,
                        'button_text' => Str::limit($buttonText, 20, ''),
                        'button_type' => 'web_url',
                        'button_url' => $buttonUrl !== '' ? $buttonUrl : 'https://www.instagram.com/',
                    ];
                } else {
                    $messagesToSend[] = [
                        'type' => 'reply_text',
                        'text' => $replyText,
                    ];
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | SEND MESSAGE
        |--------------------------------------------------------------------------
        */

        // Comment IDs are numeric, required for comment private-reply fallback.
        $canUseCommentFallback = ctype_digit((string) $this->triggerSourceId);
        $shouldUsePrivateReplyFirst = $isCommentTriggerFlow
            && $sequenceMode === 'full'
            && $canUseCommentFallback;
        $privateReplyFirstSent = collect($responses)->contains(function ($res) {
            return in_array($res['type'] ?? '', ['opening_with_button', 'opening', 'ask_to_follow', 'reply_image', 'reply_text', 'reply_with_button'], true)
                && ((int) ($res['status'] ?? 0)) === 200;
        });
        // Reuse final reply text during fallback when normal DM window is closed.
        $fallbackReplyText = collect($messagesToSend)
            ->firstWhere('type', 'reply_text')['text'] ?? null;
        $usedPrivateReplyFallback = false;

        foreach ($messagesToSend as $payload) {
            // Check if this step has already been successfully sent in a previous attempt.
            $alreadySent = collect($responses)->first(function ($res) use ($payload) {
                return ($res['type'] ?? '') === $payload['type'] && ((int) ($res['status'] ?? 0)) === 200;
            });

            if ($alreadySent) {
                Log::info('AutoDM sequence step already sent; skipping to avoid duplicates', [
                    'flow_id' => $flow->id,
                    'recipient' => $this->recipientIgId,
                    'step_type' => $payload['type'],
                ]);

                if (in_array($payload['type'], ['opening_with_button', 'opening', 'ask_to_follow'], true)) {
                    if ($shouldUsePrivateReplyFirst) {
                        $privateReplyFirstSent = true;
                    }
                }

                continue;
            }

            // Per-account send throttling to avoid burst limits on Meta.
            if (
                ! RateLimiter::attempt(
                    "dm:rate:{$account->ig_account_id}",
                    3,
                    fn () => true
                )
            ) {
                $log->update([
                    'status' => 'queued',
                    'error_message' => 'Rate limited, retrying',
                    'response_payload' => $responses,
                ]);
                $this->release(60);

                return;
            }

            if ($shouldUsePrivateReplyFirst && ! $privateReplyFirstSent) {
                $response = $this->sendCommentPrivateReplyForPayload(
                    $metaApiService,
                    $account,
                    $payload,
                    $profileUrl,
                    $fallbackReplyText
                );
                $privateReplyFirstSent = true;
            } elseif ($payload['type'] === 'opening_with_button' || $payload['type'] === 'reply_with_button') {
                $buttonType = (string) ($payload['button_type'] ?? 'postback');
                $templateButtons = [];
                if ($buttonType === 'web_url') {
                    $templateButtons[] = [
                        'type' => 'web_url',
                        'title' => (string) $payload['button_text'],
                        'url' => (string) ($payload['button_url'] ?? 'https://www.instagram.com/'),
                    ];
                } else {
                    $templateButtons[] = [
                        'type' => 'postback',
                        'title' => (string) $payload['button_text'],
                        'payload' => (string) ($payload['button_payload'] ?? ('AUTODM_BTN_'.md5((string) $payload['button_text']))),
                    ];
                }

                $response = $metaApiService->sendButtonTemplateMessage(
                    $account->access_token,
                    $account->ig_account_id,
                    $this->recipientIgId,
                    $payload['text'],
                    $templateButtons
                );
            } elseif ($payload['type'] === 'ask_to_follow') {
                $response = $metaApiService->sendButtonTemplateMessage(
                    $account->access_token,
                    $account->ig_account_id,
                    $this->recipientIgId,
                    $payload['text'],
                    [
                        [
                            'type' => 'web_url',
                            'title' => $payload['profile_button'],
                            'url' => $payload['profile_url'] ?? $profileUrl,
                        ],
                        [
                            'type' => 'postback',
                            'title' => $payload['confirm_button'],
                            'payload' => $payload['confirm_payload'],
                        ],
                    ]
                );
            } elseif ($payload['type'] === 'reply_image') {
                $deliveryMediaUrl = $mediaUrlService->deliveryUrl((string) ($payload['media_url'] ?? ''));
                $response = $metaApiService->sendImageMessage(
                    $account->access_token,
                    $account->ig_account_id,
                    $this->recipientIgId,
                    $deliveryMediaUrl
                );
            } else {
                $response = $metaApiService->sendMessage(
                    $account->access_token,
                    $account->ig_account_id,
                    $this->recipientIgId,
                    $payload['text']
                );
            }

            $responses[] = [
                'type' => $payload['type'],
                'status' => $response['status'],
                'payload' => $response['payload'],
            ];

            // Save progress incrementally so retries do not repeat this step.
            $log->update([
                'response_payload' => $responses,
            ]);

            Log::info('AutoDM sequence step', array_merge($sequenceContext, [
                'step' => 'dm_step_sent',
                'outcome' => $response['success'] ? 'success' : 'failed',
                'dm_step_type' => (string) $payload['type'],
            ]));

            if ($shouldUsePrivateReplyFirst && $privateReplyFirstSent && $response['success']) {
                $hasActiveDmWindow = $this->hasActiveDmWindow((int) $account->id, $this->recipientIgId);
                if (! $hasActiveDmWindow) {
                    $this->putPendingBootstrapState(
                        (int) $account->id,
                        $this->recipientIgId,
                        (int) $flow->id,
                        (string) $this->triggerSourceId,
                        'private_reply_first'
                    );

                    $log->update([
                        'status' => 'awaiting_user_dm',
                        'response_payload' => $responses,
                    ]);

                    Log::info('AutoDM sequence step', array_merge($sequenceContext, [
                        'step' => 'awaiting_user_dm',
                        'outcome' => 'private_reply_first_waiting_for_user_dm',
                    ]));

                    return;
                }
            }

            if (! $response['success']) {
                // Detect 24-hour window violations and try one private comment reply fallback.
                $errorMessage = strtolower((string) data_get($response, 'payload.error.message', ''));
                $errorCode = (int) data_get($response, 'payload.error.code', 0);
                $errorSubcode = (int) data_get($response, 'payload.error.error_subcode', 0);
                $isOutsideAllowedWindow = $errorSubcode === 2534022
                    || str_contains($errorMessage, 'outside the allowed window');
                $isUnsupportedAttachment = $errorSubcode === 2534080
                    || str_contains($errorMessage, 'format')
                    || str_contains($errorMessage, 'attachment');

                if ($errorSubcode === 2534022) {
                    $windowErrorMessage = 'Meta send blocked: outside allowed window (error_subcode=2534022).';
                    Log::warning('Meta window error; failing without retry', [
                        'flow_id' => $flow->id,
                        'trigger_source_id' => (string) $this->triggerSourceId,
                        'recipient_ig_id' => (string) $this->recipientIgId,
                        'sequence_mode' => (string) $sequenceMode,
                        'trigger_type' => (string) ($flow->trigger_type ?? ''),
                        'step' => 'dm_step_failed',
                        'outcome' => 'window_error_fail_fast',
                        'window_error' => true,
                        'error_code' => $errorCode,
                        'error_subcode' => $errorSubcode,
                    ]);

                    $log->update([
                        'status' => 'failed',
                        'error_code' => $response['status'],
                        'error_message' => $windowErrorMessage,
                        'response_payload' => $responses,
                    ]);

                    return;
                }

                if ($isUnsupportedAttachment && $payload['type'] === 'reply_image') {
                    Log::warning('Unsupported image attachment skipped', [
                        'flow_id' => $flow->id,
                        'recipient' => $this->recipientIgId,
                        'error_code' => $errorCode,
                        'error_subcode' => $errorSubcode,
                    ]);

                    // Skip the failed image and continue the sequence.
                    $responses[] = [
                        'type' => 'reply_image_skipped',
                        'status' => $response['status'],
                        'payload' => $response['payload'],
                    ];

                    continue;
                }

                if ($isOutsideAllowedWindow && $canUseCommentFallback && ! $usedPrivateReplyFallback) {
                    $currentText = isset($payload['text']) ? trim((string) $payload['text']) : '';
                    $privateReplyText = trim((string) ($fallbackReplyText ?: $currentText));

                    if ($privateReplyText !== '') {
                        if (in_array($sequenceMode, ['full', 'post_follow'], true)) {
                            $privateReplyText = trim($privateReplyText."\n\nReply to this DM and I will continue.");
                        }

                        Log::info('Attempting comment private-reply fallback', [
                            'flow_id' => $flow->id,
                            'trigger_source_id' => $this->triggerSourceId,
                            'error_code' => $errorCode,
                            'error_subcode' => $errorSubcode,
                        ]);

                        $fallbackResponse = $metaApiService->sendCommentPrivateReply(
                            $account->access_token,
                            $account->ig_account_id,
                            $this->triggerSourceId,
                            $privateReplyText
                        );

                        $responses[] = [
                            'type' => 'private_reply_fallback',
                            'status' => $fallbackResponse['status'],
                            'payload' => $fallbackResponse['payload'],
                        ];

                        if ($fallbackResponse['success']) {
                            $usedPrivateReplyFallback = true;
                            Log::info('Comment private-reply fallback sent', [
                                'flow_id' => $flow->id,
                                'trigger_source_id' => $this->triggerSourceId,
                            ]);

                            if (in_array($sequenceMode, ['full', 'post_follow'], true)) {
                                $this->putPendingBootstrapState(
                                    (int) $account->id,
                                    $this->recipientIgId,
                                    (int) $flow->id,
                                    (string) $this->triggerSourceId,
                                    'sequence_blocked'
                                );

                                $log->update([
                                    'status' => 'awaiting_user_dm',
                                    'response_payload' => $responses,
                                ]);

                                Log::info('Sequence blocked by window; bootstrap wait state created', [
                                    'flow_id' => $flow->id,
                                    'recipient' => $this->recipientIgId,
                                ]);

                                Log::info('AutoDM sequence step', array_merge($sequenceContext, [
                                    'step' => 'awaiting_user_dm',
                                    'outcome' => 'waiting_for_window_reopen',
                                ]));

                                return;
                            }

                            // Fallback is one-time only; skip remaining normal DM steps.
                            break;
                        }
                    }
                }

                // Persist API error details so failed attempts are diagnosable.
                $log->update([
                    'status' => 'failed',
                    'error_code' => $response['status'],
                    'error_message' => $response['payload']['error']['message'] ?? 'Unknown',
                    'response_payload' => $responses,
                ]);
                Log::warning('AutoDM sequence step', array_merge($sequenceContext, [
                    'step' => 'dm_step_failed',
                    'outcome' => 'retryable_failure',
                    'dm_step_type' => (string) $payload['type'],
                ]));

                throw new \Exception('Meta send failed');
            }
        }

        if (in_array($sequenceMode, ['full', 'post_follow'], true) && $useOpeningButtonGate) {
            Cache::put(
                "autodm:pending_button:{$account->id}:{$this->recipientIgId}",
                $this->mergePendingState(
                    "autodm:pending_button:{$account->id}:{$this->recipientIgId}",
                    [
                        'flow_id' => $flow->id,
                        'button_text' => $openingButtonText,
                        'button_payload' => "AUTODM_FLOW_{$flow->id}_CTA",
                        'created_at' => now()->toIso8601String(),
                    ]
                ),
                now()->addHours(24)
            );

            $log->update([
                'status' => 'awaiting_click',
                'response_payload' => $responses,
            ]);

            Log::info('Opening message with CTA sent; waiting for user click/message', [
                'flow_id' => $flow->id,
                'recipient' => $this->recipientIgId,
            ]);

            Log::info('AutoDM sequence step', array_merge($sequenceContext, [
                'step' => 'awaiting_click',
                'outcome' => 'waiting_for_user_cta',
            ]));

            return;
        }

        // Mark success with full response trail for analytics/troubleshooting.
        $log->update([
            'status' => 'sent',
            'response_payload' => $responses,
        ]);

        Log::info('AutoDM sequence step', array_merge($sequenceContext, [
            'step' => 'sent',
            'outcome' => 'completed',
        ]));

        $this->scheduleReminderIfEnabled($flow, $log);

        Log::info('DM sequence sent successfully', [
            'recipient' => $this->recipientIgId,
            'messages_sent' => count($messagesToSend),
        ]);
    }

    private function sendCommentPrivateReplyForPayload(
        MetaApiService $metaApiService,
        InstagramAccount $account,
        array $payload,
        string $profileUrl,
        ?string $fallbackReplyText
    ): array {
        $payloadType = (string) ($payload['type'] ?? '');

        if ($payloadType === 'opening_with_button' || $payloadType === 'reply_with_button') {
            $buttonType = (string) ($payload['button_type'] ?? 'postback');
            $templateButtons = [];

            if ($buttonType === 'web_url') {
                $templateButtons[] = [
                    'type' => 'web_url',
                    'title' => (string) ($payload['button_text'] ?? 'Open'),
                    'url' => (string) ($payload['button_url'] ?? 'https://www.instagram.com/'),
                ];
            } else {
                $buttonTitle = (string) ($payload['button_text'] ?? 'Continue');
                $templateButtons[] = [
                    'type' => 'postback',
                    'title' => $buttonTitle,
                    'payload' => (string) ($payload['button_payload'] ?? ('AUTODM_BTN_'.md5($buttonTitle))),
                ];
            }

            return $metaApiService->sendCommentPrivateReplyWithButtons(
                $account->access_token,
                $account->ig_account_id,
                (string) $this->triggerSourceId,
                (string) ($payload['text'] ?? ''),
                $templateButtons
            );
        }

        if ($payloadType === 'ask_to_follow') {
            return $metaApiService->sendCommentPrivateReplyWithButtons(
                $account->access_token,
                $account->ig_account_id,
                (string) $this->triggerSourceId,
                (string) ($payload['text'] ?? ''),
                [
                    [
                        'type' => 'web_url',
                        'title' => (string) ($payload['profile_button'] ?? self::ASK_TO_FOLLOW_PROFILE_BUTTON),
                        'url' => (string) ($payload['profile_url'] ?? $profileUrl),
                    ],
                    [
                        'type' => 'postback',
                        'title' => (string) ($payload['confirm_button'] ?? self::ASK_TO_FOLLOW_CONFIRM_BUTTON),
                        'payload' => (string) ($payload['confirm_payload'] ?? 'AUTODM_FOLLOW_CONFIRM'),
                    ],
                ]
            );
        }

        $bootstrapText = trim((string) ($payload['text'] ?? ''));
        if ($bootstrapText === '') {
            $bootstrapText = trim((string) ($fallbackReplyText ?? ''));
        }
        if ($bootstrapText === '') {
            $bootstrapText = 'Thanks for your comment. Reply to this message and I will continue.';
        }

        return $metaApiService->sendCommentPrivateReply(
            $account->access_token,
            $account->ig_account_id,
            (string) $this->triggerSourceId,
            $bootstrapText
        );
    }

    public function failed(\Throwable $exception): void
    {
        Log::critical('AutoDM job permanently failed', [
            'job' => static::class,
            'flow_id' => $this->flowId,
            'account_id' => $this->accountId,
            'recipient_ig_id' => $this->recipientIgId,
            'trigger_source_id' => $this->triggerSourceId,
            'exception' => $exception->getMessage(),
        ]);
    }

    private function extractReplyLinkCta(string $messageText): array
    {
        $text = trim($messageText);
        if ($text === '') {
            return [
                'body' => '',
                'label' => '',
                'url' => '',
            ];
        }

        if (preg_match('/^(?<label>[^:\n]{1,80})\s*:\s*(?<url>https?:\/\/\S+)$/mi', $text, $matches)) {
            $label = trim((string) ($matches['label'] ?? ''));
            $url = trim((string) ($matches['url'] ?? ''));
            $body = trim(preg_replace('/^'.preg_quote((string) $matches[0], '/').'$/mi', '', $text, 1) ?? $text);

            return [
                'body' => $body,
                'label' => $label !== '' ? $label : 'Open Link',
                'url' => $url,
            ];
        }

        if (preg_match('/^(?<url>https?:\/\/\S+)$/mi', $text, $matches)) {
            $url = trim((string) ($matches['url'] ?? ''));
            $body = trim(preg_replace('/^'.preg_quote((string) $matches[0], '/').'$/mi', '', $text, 1) ?? $text);

            return [
                'body' => $body,
                'label' => 'Open Link',
                'url' => $url,
            ];
        }

        return [
            'body' => $text,
            'label' => '',
            'url' => '',
        ];
    }

    private function mergePendingState(string $cacheKey, array $payload): array
    {
        $existing = Cache::get($cacheKey, []);
        if (! is_array($existing)) {
            $existing = [];
        }

        if (array_key_exists('flow_id', $existing)) {
            $existing = [
                (int) ($existing['flow_id'] ?? 0) => $existing,
            ];
        }

        $flowId = (int) ($payload['flow_id'] ?? 0);
        if ($flowId > 0) {
            $existing[$flowId] = $payload;
        }

        return $existing;
    }

    private function putPendingBootstrapState(
        int $accountId,
        string $recipientIgId,
        int $flowId,
        string $commentTriggerId,
        string $source
    ): void {
        Cache::put(
            "autodm:pending_bootstrap:{$accountId}:{$recipientIgId}",
            [
                'flow_id' => $flowId,
                'comment_trigger_id' => $commentTriggerId,
                'stage' => 'awaiting_user_dm',
                'source' => $source,
                'created_at' => now()->toIso8601String(),
            ],
            now()->addHours(24)
        );

        Log::info('Bootstrap state created for blocked user', [
            'flow_id' => $flowId,
            'recipient' => $recipientIgId,
            'source' => $source,
        ]);
    }

    private function hasActiveDmWindow(int $accountId, string $recipientIgId): bool
    {
        if ($accountId <= 0 || trim($recipientIgId) === '') {
            return false;
        }

        $rawLastInboundAt = Cache::get($this->dmWindowCacheKey($accountId, $recipientIgId));
        if (! is_string($rawLastInboundAt) || trim($rawLastInboundAt) === '') {
            return false;
        }

        $lastInboundTimestamp = strtotime($rawLastInboundAt);
        if ($lastInboundTimestamp === false) {
            return false;
        }

        return $lastInboundTimestamp >= now()->subHours(24)->getTimestamp();
    }

    private function dmWindowCacheKey(int $accountId, string $recipientIgId): string
    {
        return "autodm:window_last_inbound:{$accountId}:{$recipientIgId}";
    }

    private function publicReplyAttemptCacheKey(int $flowId, string $triggerSourceId): string
    {
        return "autodm:public_reply_attempted:{$flowId}:{$triggerSourceId}";
    }

    private function scheduleReminderIfEnabled(AutomationFlow $flow, AutomationLog $log): void
    {
        if (! (bool) ($flow->reminder_enabled ?? false)) {
            return;
        }

        $messages = collect($flow->reminder_messages ?? [])
            ->map(fn ($message) => trim((string) $message))
            ->filter()
            ->values();

        if ($messages->isEmpty()) {
            Log::warning('Reminder scheduling skipped: no reminder messages configured', [
                'flow_id' => $flow->id,
            ]);

            return;
        }

        $existing = AutodmReminderEvent::query()
            ->where('automation_flow_id', $flow->id)
            ->where('recipient_ig_id', $this->recipientIgId)
            ->where('trigger_source_id', $this->triggerSourceId)
            ->exists();

        if ($existing) {
            return;
        }

        $delayHours = (int) ($flow->reminder_delay_hours ?? 20);
        if ($delayHours < 20 || $delayHours > 23) {
            $delayHours = 20;
        }

        $scheduledFor = now()->addHours($delayHours);
        $event = AutodmReminderEvent::query()->create([
            'automation_flow_id' => $flow->id,
            'recipient_ig_id' => $this->recipientIgId,
            'trigger_source_id' => $this->triggerSourceId,
            'status' => 'scheduled',
            'scheduled_for' => $scheduledFor,
            'response_payload' => [
                'scheduled_from_log_id' => $log->id,
                'delay_hours' => $delayHours,
            ],
        ]);

        SendAutodmReminderJob::dispatch((int) $event->id)
            ->delay($scheduledFor);
    }
}
