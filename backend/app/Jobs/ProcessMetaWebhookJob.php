<?php

namespace App\Jobs;

use App\Models\AutodmReminderEvent;
use App\Models\AutomationFlow;
use App\Models\InstagramAccount;
use App\Models\InstagramWelcomeDmDelivery;
use App\Services\AutodmDeeplinkService;
use App\Services\MetaApiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ProcessMetaWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private const ASK_TO_FOLLOW_PROFILE_BUTTON = 'Visit Profile';

    private const ASK_TO_FOLLOW_CONFIRM_BUTTON = 'Yes, I follow';

    // Retry transient queue/DB/API failures before permanently failing the webhook event.
    public $tries = 3;

    public $backoff = [10, 30, 60];

    public $payload;

    public $accountId;

    public function __construct(array $payload, string $accountId)
    {
        $this->onQueue('autodm');
        $this->payload = $payload;
        $this->accountId = $accountId;
    }

    public function handle(MetaApiService $metaApiService, AutodmDeeplinkService $deeplinkService): void
    {
        Log::info('ProcessMetaWebhookJob: Started', [
            'account_id' => $this->accountId,
            'field' => $this->payload['field'] ?? null,
            'payload' => $this->payload,
        ]);

        $mediaId = null;
        $text = null;
        $userId = null;
        $triggerId = null;
        $isStoryReply = false;
        $quickReplyPayload = null;
        $isInboundMessagingEvent = false;

        $field = $this->payload['field'] ?? null;
        $value = $this->payload['value'] ?? [];

        /*
        |--------------------------------------------------------------------------
        | 1. Detect Event Type (Comments, Messages, Messaging)
        |--------------------------------------------------------------------------
        */

        // 1.A COMMENT FIELD
        if ($field === 'comments') {
            $hasVerb = array_key_exists('verb', $value);
            if ($hasVerb && ($value['verb'] ?? '') !== 'add') {
                Log::info('ProcessMetaWebhookJob: Ignored non-add comment verb', ['verb' => $value['verb'] ?? 'none']);

                return;
            }
            $mediaId = $value['media']['id'] ?? null;
            $text = $value['text'] ?? '';
            $userId = $value['from']['id'] ?? null;
            $commentId = $this->extractCommentId($value);
            $triggerId = $commentId;
            Log::info('Comment detected', [
                'mediaId' => $mediaId,
                'text' => $text,
                'userId' => $userId,
                'triggerId' => $triggerId,
                'webhook_comment_id' => $value['comment_id'] ?? null,
                'webhook_value_id' => $value['id'] ?? null,
            ]);
        }

        // 1.B MESSAGE FIELD (Alternative Webhook Structure)
        elseif ($field === 'messages') {
            $isInboundMessagingEvent = true;
            $postback = $value['postback'] ?? null;
            if (is_array($postback)) {
                $text = (string) ($postback['title'] ?? '');
                $quickReplyPayload = $postback['payload'] ?? null;
                $userId = $value['sender']['id'] ?? null;
                $triggerId = $postback['mid']
                    ?? (($value['timestamp'] ?? '').'_'.$userId.'_'.md5((string) $quickReplyPayload));
                Log::info('Message field postback detected', [
                    'text' => $text,
                    'userId' => $userId,
                    'triggerId' => $triggerId,
                    'postback_payload' => $quickReplyPayload,
                ]);
            } else {
                $message = $value['message'] ?? [];
                $mediaId = $message['reply_to']['story']['id'] ?? null;
                $isStoryReply = ! empty($mediaId);
                $text = (string) ($message['text'] ?? '');
                $quickReplyPayload = $message['quick_reply']['payload'] ?? null;
                $userId = $value['sender']['id'] ?? null;
                $triggerId = $message['mid'] ?? null;
                if (trim($text) === '' && ! is_string($quickReplyPayload)) {
                    Log::info('Message field detected without text payload', compact('userId', 'triggerId'));
                } else {
                    Log::info('Message field detected', compact('text', 'userId', 'triggerId'));
                }
            }
        }

        // 1.C MESSAGING ARRAY (Standard Story Reply / DM)
        elseif ($field === 'messaging_postbacks') {
            $isInboundMessagingEvent = true;
            $postback = $value['postback'] ?? [];
            $text = (string) ($postback['title'] ?? '');
            $quickReplyPayload = $postback['payload'] ?? null;
            $userId = $value['sender']['id'] ?? $value['sender']['user_ref'] ?? null;
            $triggerId = $postback['mid']
                ?? (($value['timestamp'] ?? '').'_'.$userId.'_'.md5((string) $quickReplyPayload));

            Log::info('Messaging_postbacks field detected', [
                'text' => $text,
                'userId' => $userId,
                'triggerId' => $triggerId,
                'postback_payload' => $quickReplyPayload,
            ]);
        }

        // 1.C MESSAGING ARRAY (Standard Story Reply / DM)
        elseif (isset($this->payload['messaging'])) {
            $isInboundMessagingEvent = true;
            $event = $this->payload['messaging'];
            $postback = $event['postback'] ?? null;

            if (is_array($postback)) {
                $text = (string) ($postback['title'] ?? '');
                $quickReplyPayload = $postback['payload'] ?? null;
                $userId = $event['sender']['id'] ?? null;
                $triggerId = $postback['mid']
                    ?? (($event['timestamp'] ?? '').'_'.$userId.'_'.md5((string) $quickReplyPayload));
                Log::info('Postback detected', [
                    'text' => $text,
                    'userId' => $userId,
                    'triggerId' => $triggerId,
                    'postback_payload' => $quickReplyPayload,
                ]);
            } else {
                $message = $event['message'] ?? $event['message_edit'] ?? [];
                $mediaId = $message['reply_to']['story']['id'] ?? null;
                $isStoryReply = ! empty($mediaId);
                $text = (string) ($message['text'] ?? '');
                $quickReplyPayload = $message['quick_reply']['payload'] ?? null;
                $userId = $event['sender']['id'] ?? null;
                $triggerId = $message['mid'] ?? null;
                if (trim($text) === '' && ! is_string($quickReplyPayload)) {
                    Log::info('Messaging detected without text payload', compact('mediaId', 'userId', 'triggerId'));
                } else {
                    Log::info('Messaging detected', compact('mediaId', 'text', 'userId', 'triggerId'));
                }
            }
        } else {
            Log::info('ProcessMetaWebhookJob: Unknown webhook type or ignored field', [
                'field' => $field,
                'keys' => array_keys($this->payload),
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | 2. Validate extracted variables
        |--------------------------------------------------------------------------
        */

        if (! $userId || ! $triggerId) {
            Log::info('ProcessMetaWebhookJob: Incomplete payload', ['userId' => $userId, 'triggerId' => $triggerId]);

            return;
        }

        // Duplicate protection is applied only on the first attempt.
        // Retries must bypass this gate, otherwise transient failures get dropped.
        $eventCacheKey = "ig_event_{$this->accountId}_{$triggerId}";
        if ($this->attempts() <= 1) {
            if (! Cache::add($eventCacheKey, true, now()->addMinute())) {
                Log::info('ProcessMetaWebhookJob: Duplicate event ignored', ['triggerId' => $triggerId]);

                return;
            }
        } else {
            Log::info('ProcessMetaWebhookJob: Retry attempt bypassing duplicate gate', [
                'triggerId' => $triggerId,
                'attempt' => $this->attempts(),
            ]);
        }

        // Prevent self-trigger
        if ((string) $userId === (string) $this->accountId) {
            Log::info('ProcessMetaWebhookJob: Self-trigger ignored', ['userId' => $userId]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Account Check
        |--------------------------------------------------------------------------
        */

        $account = InstagramAccount::where('ig_account_id', $this->accountId)
            ->where('status', 'active')
            ->first();

        if (! $account) {
            Log::info('ProcessMetaWebhookJob: No active account found', ['ig_account_id' => $this->accountId]);

            return;
        }

        $text = trim((string) $text);
        $normalizedText = Str::lower($text);
        Log::info('ProcessMetaWebhookJob: Normalized event', [
            'field' => $field,
            'user_id' => $userId,
            'trigger_id' => $triggerId,
            'is_inbound_messaging_event' => $isInboundMessagingEvent,
            'text' => $text,
            'quick_reply_payload' => $quickReplyPayload,
        ]);

        if ($isInboundMessagingEvent) {
            $this->touchWindowActivity((int) $account->id, (string) $userId);
        }

        $normalizedPayload = trim((string) $quickReplyPayload);
        if ($normalizedPayload !== '' && $this->isReminderMorePayload($normalizedPayload)) {
            $this->handleReminderMorePayload(
                $normalizedPayload,
                $account,
                (string) $userId,
                $metaApiService,
                $deeplinkService
            );

            return;
        }

        if ($normalizedPayload !== '' && $this->isReminderStopPayload($normalizedPayload)) {
            $this->handleReminderStopPayload(
                $normalizedPayload,
                $account,
                (string) $userId,
                $metaApiService
            );

            return;
        }

        // Handle ask-to-follow confirmation before other logic.
        $pendingFollowKey = "autodm:pending_follow:{$account->id}:{$userId}";
        $pendingFollowState = Cache::get($pendingFollowKey);
        if (is_array($pendingFollowState)) {
            Log::info('Ask-to-follow pending state found', [
                'pending_key' => $pendingFollowKey,
                'single_state' => array_key_exists('flow_id', $pendingFollowState),
            ]);
            $pendingFollowItems = array_key_exists('flow_id', $pendingFollowState)
                ? [$pendingFollowState]
                : array_values($pendingFollowState);

            foreach ($pendingFollowItems as $pendingFollowItem) {
                if (! is_array($pendingFollowItem)) {
                    continue;
                }

                $pendingFlowId = (int) ($pendingFollowItem['flow_id'] ?? 0);
                $deliveryMode = trim((string) ($pendingFollowItem['delivery_mode'] ?? 'button_gate'));
                $followMessage = trim((string) ($pendingFollowItem['follow_message'] ?? ''));
                $expectedConfirmText = Str::lower(self::ASK_TO_FOLLOW_CONFIRM_BUTTON);
                $expectedConfirmPayload = trim((string) ($pendingFollowItem['confirm_payload'] ?? ''));
                $expectedProfilePayload = trim((string) ($pendingFollowItem['profile_payload'] ?? ''));
                $expectedProfileText = Str::lower(self::ASK_TO_FOLLOW_PROFILE_BUTTON);
                $pendingProfileUrl = trim((string) ($pendingFollowItem['profile_url'] ?? ''));
                if ($followMessage === '') {
                    $followMessage = 'Please follow us to unlock the reply. Tap the profile button below and then confirm.';
                }
                if ($expectedConfirmPayload === '') {
                    $expectedConfirmPayload = "AUTODM_FOLLOW_CONFIRM_{$pendingFlowId}";
                }
                if ($expectedProfilePayload === '') {
                    $expectedProfilePayload = "AUTODM_FOLLOW_PROFILE_{$pendingFlowId}";
                }
                if ($pendingProfileUrl === '') {
                    $pendingProfileUrl = trim((string) ($account->profile_url ?? ''));
                    if ($pendingProfileUrl === '') {
                        $username = trim((string) ($account->username ?? ''));
                        if ($username !== '') {
                            $pendingProfileUrl = 'https://www.instagram.com/'.ltrim($username, '@').'/';
                        }
                    }
                }
                $isConfirmTextMatch = $expectedConfirmText !== '' && $normalizedText === $expectedConfirmText;
                $isConfirmPayloadMatch = $expectedConfirmPayload !== '' && trim((string) $quickReplyPayload) === $expectedConfirmPayload;
                $isProfilePayloadMatch = $expectedProfilePayload !== '' && trim((string) $quickReplyPayload) === $expectedProfilePayload;
                $isProfileTextMatch = $expectedProfileText !== '' && $normalizedText === $expectedProfileText;
                $isImplicitConfirmEvent = $isInboundMessagingEvent
                    && $normalizedText === ''
                    && trim((string) $quickReplyPayload) === '';
                Log::info('Ask-to-follow match evaluation', [
                    'flow_id' => $pendingFlowId,
                    'delivery_mode' => $deliveryMode,
                    'incoming_text' => $normalizedText,
                    'incoming_payload' => trim((string) $quickReplyPayload),
                    'expected_confirm_text' => $expectedConfirmText,
                    'expected_confirm_payload' => $expectedConfirmPayload,
                    'expected_profile_text' => $expectedProfileText,
                    'expected_profile_payload' => $expectedProfilePayload,
                    'is_confirm_text_match' => $isConfirmTextMatch,
                    'is_confirm_payload_match' => $isConfirmPayloadMatch,
                    'is_profile_text_match' => $isProfileTextMatch,
                    'is_profile_payload_match' => $isProfilePayloadMatch,
                    'is_implicit_confirm_event' => $isImplicitConfirmEvent,
                ]);

                if ($deliveryMode === 'deferred_button_gate') {
                    if (! $isInboundMessagingEvent) {
                        continue;
                    }

                    $deferredResponse = $metaApiService->sendButtonTemplateMessage(
                        $account->access_token,
                        $account->ig_account_id,
                        $userId,
                        $followMessage,
                        [
                            [
                                'type' => 'web_url',
                                'title' => self::ASK_TO_FOLLOW_PROFILE_BUTTON,
                                'url' => $pendingProfileUrl !== '' ? $pendingProfileUrl : 'https://www.instagram.com/',
                            ],
                            [
                                'type' => 'postback',
                                'title' => self::ASK_TO_FOLLOW_CONFIRM_BUTTON,
                                'payload' => $expectedConfirmPayload,
                            ],
                        ]
                    );

                    if ($deferredResponse['success']) {
                        $pendingFollowState = $this->mergePendingState(
                            $pendingFollowState,
                            [
                                'flow_id' => $pendingFlowId,
                                'delivery_mode' => 'button_gate',
                                'follow_message' => $followMessage,
                                'confirm_button_text' => self::ASK_TO_FOLLOW_CONFIRM_BUTTON,
                                'confirm_payload' => $expectedConfirmPayload,
                                'profile_payload' => $expectedProfilePayload,
                                'profile_button_text' => self::ASK_TO_FOLLOW_PROFILE_BUTTON,
                                'profile_url' => $pendingProfileUrl,
                                'created_at' => (string) ($pendingFollowItem['created_at'] ?? now()->toIso8601String()),
                                'promoted_at' => now()->toIso8601String(),
                            ]
                        );
                        Cache::put($pendingFollowKey, $pendingFollowState, now()->addHours(24));

                        Log::info('Ask-to-follow deferred gate promoted to DM buttons', [
                            'flow_id' => $pendingFlowId,
                            'user_id' => $userId,
                        ]);
                    } else {
                        $pendingFollowState = $this->mergePendingState(
                            $pendingFollowState,
                            [
                                'flow_id' => $pendingFlowId,
                                'delivery_mode' => 'deferred_button_gate',
                                'follow_message' => $followMessage,
                                'confirm_button_text' => self::ASK_TO_FOLLOW_CONFIRM_BUTTON,
                                'confirm_payload' => $expectedConfirmPayload,
                                'profile_payload' => $expectedProfilePayload,
                                'profile_button_text' => self::ASK_TO_FOLLOW_PROFILE_BUTTON,
                                'profile_url' => $pendingProfileUrl,
                                'created_at' => (string) ($pendingFollowItem['created_at'] ?? now()->toIso8601String()),
                                'last_delivery_attempt_at' => now()->toIso8601String(),
                            ]
                        );
                        Cache::put($pendingFollowKey, $pendingFollowState, now()->addHours(24));

                        Log::warning('Ask-to-follow deferred gate promotion failed; keeping deferred mode', [
                            'flow_id' => $pendingFlowId,
                            'user_id' => $userId,
                            'status' => $deferredResponse['status'],
                        ]);
                    }

                    return;
                }

                if ($isProfilePayloadMatch || $isProfileTextMatch) {
                    $profileUrl = trim((string) ($account->profile_url ?? ''));
                    if ($profileUrl === '') {
                        $username = trim((string) ($account->username ?? ''));
                        if ($username !== '') {
                            $profileUrl = 'https://www.instagram.com/'.ltrim($username, '@').'/';
                        }
                    }

                    if ($profileUrl !== '') {
                        $profileResponse = $metaApiService->sendMessage(
                            $account->access_token,
                            $account->ig_account_id,
                            $userId,
                            'Open profile: '.$profileUrl
                        );

                        if (! $profileResponse['success']) {
                            Log::warning('Ask-to-follow profile link send failed', [
                                'flow_id' => $pendingFlowId,
                                'user_id' => $userId,
                                'status' => $profileResponse['status'],
                            ]);
                        }
                    } else {
                        Log::warning('Ask-to-follow profile URL missing', [
                            'flow_id' => $pendingFlowId,
                            'user_id' => $userId,
                        ]);
                    }

                    Log::info('Ask-to-follow profile button payload received; ignoring', [
                        'flow_id' => $pendingFlowId,
                        'user_id' => $userId,
                    ]);

                    return;
                }

                if (! $isConfirmTextMatch && ! $isConfirmPayloadMatch) {
                    if ($isImplicitConfirmEvent) {
                        Log::info('Ask-to-follow implicit confirm event detected (no text/payload)', [
                            'flow_id' => $pendingFlowId,
                            'user_id' => $userId,
                        ]);
                    } else {
                        Log::info('Ask-to-follow confirmation did not match pending gate', [
                            'flow_id' => $pendingFlowId,
                            'user_id' => $userId,
                        ]);

                        continue;
                    }
                }

                if ($isImplicitConfirmEvent) {
                    Log::info('Proceeding with follow verification after implicit confirm event', [
                        'flow_id' => $pendingFlowId,
                        'user_id' => $userId,
                    ]);
                }

                $matchedFlow = AutomationFlow::where('id', $pendingFlowId)
                    ->where('instagram_account_id', $account->id)
                    ->where('status', 'active')
                    ->first([
                        'id',
                        'ask_to_follow_enabled',
                        'ask_to_follow_strict',
                        'ask_to_follow_message',
                    ]);

                if ($matchedFlow) {
                    $askToFollowEnabled = (bool) ($matchedFlow->ask_to_follow_enabled ?? false);
                    $askToFollowStrict = $askToFollowEnabled && (bool) ($matchedFlow->ask_to_follow_strict ?? false);

                    if ($askToFollowStrict) {
                        $profileLookup = $metaApiService->getUserProfileInfo(
                            $account->access_token,
                            $userId,
                            ['is_user_follow_business']
                        );

                        $followStatus = null;
                        if ($profileLookup['success']) {
                            $followStatus = data_get($profileLookup, 'payload.is_user_follow_business', null);
                            if (is_string($followStatus)) {
                                $followStatus = filter_var($followStatus, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                            }
                        }

                        if ($followStatus !== true) {
                            Log::info('Ask-to-follow confirmation rejected; recipient not verified as follower', [
                                'flow_id' => $matchedFlow->id,
                                'user_id' => $userId,
                            ]);

                            $followMessage = trim((string) ($matchedFlow->ask_to_follow_message ?? ''));
                            if ($followMessage === '') {
                                $followMessage = 'Please follow us to unlock the reply. Tap the profile button below and then confirm.';
                            }

                            $profileButtonText = self::ASK_TO_FOLLOW_PROFILE_BUTTON;
                            $confirmButtonText = self::ASK_TO_FOLLOW_CONFIRM_BUTTON;

                            $confirmPayload = $expectedConfirmPayload !== ''
                                ? $expectedConfirmPayload
                                : "AUTODM_FOLLOW_CONFIRM_{$matchedFlow->id}";
                            $profilePayload = $expectedProfilePayload !== ''
                                ? $expectedProfilePayload
                                : "AUTODM_FOLLOW_PROFILE_{$matchedFlow->id}";

                            $profileUrl = trim((string) ($account->profile_url ?? ''));
                            if ($profileUrl === '') {
                                $username = trim((string) ($account->username ?? ''));
                                if ($username !== '') {
                                    $profileUrl = 'https://www.instagram.com/'.ltrim($username, '@').'/';
                                }
                            }

                            $response = $metaApiService->sendButtonTemplateMessage(
                                $account->access_token,
                                $account->ig_account_id,
                                $userId,
                                $followMessage,
                                [
                                    [
                                        'type' => 'web_url',
                                        'title' => $profileButtonText,
                                        'url' => $profileUrl !== '' ? $profileUrl : 'https://www.instagram.com/',
                                    ],
                                    [
                                        'type' => 'postback',
                                        'title' => $confirmButtonText,
                                        'payload' => $confirmPayload,
                                    ],
                                ]
                            );

                            $updatedDeliveryMode = 'button_gate';
                            if (! $response['success']) {
                                $errorMessage = strtolower((string) data_get($response, 'payload.error.message', ''));
                                $errorSubcode = (int) data_get($response, 'payload.error.error_subcode', 0);
                                $isOutsideAllowedWindow = $errorSubcode === 2534022
                                    || str_contains($errorMessage, 'outside the allowed window');
                                if ($isOutsideAllowedWindow) {
                                    $updatedDeliveryMode = 'deferred_button_gate';
                                }

                                Log::warning('Ask-to-follow recheck prompt failed', [
                                    'flow_id' => $matchedFlow->id,
                                    'user_id' => $userId,
                                    'status' => $response['status'],
                                    'delivery_mode' => $updatedDeliveryMode,
                                ]);
                            }

                            $pendingFollowState = $this->mergePendingState(
                                $pendingFollowState,
                                [
                                    'flow_id' => $matchedFlow->id,
                                    'delivery_mode' => $updatedDeliveryMode,
                                    'follow_message' => $followMessage,
                                    'confirm_button_text' => $confirmButtonText,
                                    'confirm_payload' => $confirmPayload,
                                    'profile_payload' => $profilePayload,
                                    'profile_button_text' => $profileButtonText,
                                    'profile_url' => $profileUrl,
                                    'created_at' => now()->toIso8601String(),
                                ]
                            );

                            Cache::put($pendingFollowKey, $pendingFollowState, now()->addHours(24));

                            Log::info('Ask-to-follow recheck failed; prompting again', [
                                'flow_id' => $matchedFlow->id,
                                'user_id' => $userId,
                            ]);

                            return;
                        }
                    }

                    Log::info('Ask-to-follow confirmation accepted; dispatching post-follow sequence', [
                        'flow_id' => $matchedFlow->id,
                        'user_id' => $userId,
                    ]);

                    Log::info('Ask-to-follow confirmed, dispatching opening/cta then reply sequence', [
                        'flow_id' => $matchedFlow->id,
                        'trigger_id' => $triggerId,
                    ]);

                    $this->removePendingEntry($pendingFollowKey, $pendingFollowState, $pendingFlowId);

                    ExecuteAutomationActionJob::dispatch(
                        $matchedFlow->id,
                        $triggerId,
                        $userId,
                        $account->id,
                        'post_follow'
                    );

                    return;
                }

                $this->removePendingEntry($pendingFollowKey, $pendingFollowState, $pendingFlowId);
            }
        }

        // Handle opening CTA click/message before normal keyword matching.
        $pendingButtonKey = "autodm:pending_button:{$account->id}:{$userId}";
        $pendingButtonState = Cache::get($pendingButtonKey);
        if (is_array($pendingButtonState)) {
            $pendingButtonItems = array_key_exists('flow_id', $pendingButtonState)
                ? [$pendingButtonState]
                : array_values($pendingButtonState);

            foreach ($pendingButtonItems as $pendingButtonItem) {
                if (! is_array($pendingButtonItem)) {
                    continue;
                }

                $pendingFlowId = (int) ($pendingButtonItem['flow_id'] ?? 0);
                $expectedButtonText = trim(Str::lower((string) ($pendingButtonItem['button_text'] ?? '')));
                $expectedPayload = trim((string) ($pendingButtonItem['button_payload'] ?? $pendingButtonItem['quick_reply_payload'] ?? ''));
                $isButtonTextMatch = $expectedButtonText !== '' && $normalizedText === $expectedButtonText;
                $isButtonPayloadMatch = $expectedPayload !== '' && trim((string) $quickReplyPayload) === $expectedPayload;

                if (! $isButtonTextMatch && ! $isButtonPayloadMatch) {
                    continue;
                }

                $matchedFlow = AutomationFlow::where('id', $pendingFlowId)
                    ->where('instagram_account_id', $account->id)
                    ->where('status', 'active')
                    ->first(['id']);

                if ($matchedFlow) {
                    Log::info('Opening CTA matched, dispatching reply-only sequence', [
                        'flow_id' => $matchedFlow->id,
                        'trigger_id' => $triggerId,
                    ]);

                    $this->removePendingEntry($pendingButtonKey, $pendingButtonState, $pendingFlowId);

                    ExecuteAutomationActionJob::dispatch(
                        $matchedFlow->id,
                        $triggerId,
                        $userId,
                        $account->id,
                        'reply_only'
                    );

                    return;
                }

                $this->removePendingEntry($pendingButtonKey, $pendingButtonState, $pendingFlowId);
            }
        }

        // Blocked-comment bootstrap: wait for any inbound DM, then restart full automation.
        $pendingBootstrapKey = "autodm:pending_bootstrap:{$account->id}:{$userId}";
        $pendingBootstrap = Cache::get($pendingBootstrapKey);
        if (is_array($pendingBootstrap)) {
            $bootstrapFlowId = (int) ($pendingBootstrap['flow_id'] ?? 0);
            $bootstrapStage = trim((string) ($pendingBootstrap['stage'] ?? ''));
            $bootstrapCreatedAt = trim((string) ($pendingBootstrap['created_at'] ?? ''));

            if ($bootstrapFlowId <= 0 || $bootstrapStage !== 'awaiting_user_dm') {
                Cache::forget($pendingBootstrapKey);
                Log::info('Bootstrap state cleared due to invalid payload', [
                    'user_id' => $userId,
                    'account_id' => $account->id,
                ]);

                return;
            }

            if ($bootstrapCreatedAt !== '') {
                $createdAtTs = strtotime($bootstrapCreatedAt);
                if ($createdAtTs !== false && $createdAtTs < now()->subHours(24)->getTimestamp()) {
                    Cache::forget($pendingBootstrapKey);
                    Log::info('Bootstrap state expired/cleared', [
                        'flow_id' => $bootstrapFlowId,
                        'user_id' => $userId,
                    ]);

                    return;
                }
            }

            if (! $isInboundMessagingEvent) {
                Log::info('Bootstrap awaiting user DM; ignoring non-messaging event', [
                    'flow_id' => $bootstrapFlowId,
                    'user_id' => $userId,
                ]);

                return;
            }

            $bootstrapFlow = AutomationFlow::where('id', $bootstrapFlowId)
                ->where('instagram_account_id', $account->id)
                ->where('status', 'active')
                ->first(['id']);

            if (! $bootstrapFlow) {
                Cache::forget($pendingBootstrapKey);
                Log::info('Bootstrap state cleared because flow is missing/inactive', [
                    'flow_id' => $bootstrapFlowId,
                    'user_id' => $userId,
                ]);

                return;
            }

            Cache::forget($pendingBootstrapKey);
            Log::info('Bootstrap promoted by inbound user DM; dispatching reply-only automation', [
                'flow_id' => $bootstrapFlow->id,
                'user_id' => $userId,
                'trigger_id' => $triggerId,
                'comment_trigger_id' => $pendingBootstrap['comment_trigger_id'] ?? null,
            ]);

            ExecuteAutomationActionJob::dispatch(
                $bootstrapFlow->id,
                $triggerId,
                $userId,
                $account->id,
                'reply_only'
            );

            return;
        }

        if ($this->shouldSendWelcomeDm($account, $isInboundMessagingEvent, $text, $quickReplyPayload)) {
            $welcomeDmSent = $this->sendWelcomeDmIfEligible($account, (string) $userId, $metaApiService);
            if ($welcomeDmSent) {
                return;
            }
        }

        if (is_string($quickReplyPayload) && str_starts_with($quickReplyPayload, 'AUTODM_REPLY_LINK_')) {
            Log::info('ProcessMetaWebhookJob: Reply link quick-reply payload consumed', [
                'payload' => $quickReplyPayload,
                'user_id' => $userId,
            ]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | 4. Fetch Active Flows (Optimized)
        |--------------------------------------------------------------------------
        */

        $flows = AutomationFlow::where('instagram_account_id', $account->id)
            ->where('status', 'active')
            ->get(['id', 'trigger_type', 'trigger_value', 'keywords', 'match_all_comments']);

        if ($flows->isEmpty()) {
            Log::info('ProcessMetaWebhookJob: No active flows found for account', ['account_id' => $account->id]);

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | 5. Match Flow
        |--------------------------------------------------------------------------
        */

        foreach ($flows as $flow) {
            if ($flow->trigger_type === 'story') {
                if (! $isStoryReply || ! $mediaId || $flow->trigger_value != $mediaId) {
                    continue;
                }
            } elseif (in_array($flow->trigger_type, ['post', 'reel'], true)) {
                // Ignore plain DM and story reply events for post/reel flows.
                if ($isStoryReply || ! $mediaId || $flow->trigger_value != $mediaId) {
                    continue;
                }
            } else {
                continue;
            }

            $matchAllComments = in_array($flow->trigger_type, ['post', 'reel'], true)
                && (bool) ($flow->match_all_comments ?? false);
            if ($matchAllComments) {
                Log::info('Flow matched with any-comment mode', [
                    'flow_id' => $flow->id,
                ]);

                ExecuteAutomationActionJob::dispatch(
                    $flow->id,
                    $triggerId,
                    $userId,
                    $account->id
                );

                return; // stop after first match
            }

            $keywords = $flow->keywords ?? [];

            if (! is_array($keywords)) {
                continue;
            }

            foreach ($keywords as $keyword) {

                if (! $keyword) {
                    continue;
                }

                if ($this->keywordMatches($normalizedText, (string) $keyword)) {

                    Log::info('Flow matched', [
                        'flow_id' => $flow->id,
                        'keyword' => $keyword,
                    ]);

                    ExecuteAutomationActionJob::dispatch(
                        $flow->id,
                        $triggerId,
                        $userId,
                        $account->id
                    );

                    return; // stop after first match
                }
            }
        }

        Log::info('No keyword matched');
    }

    public function failed(\Throwable $exception): void
    {
        Log::critical('AutoDM job permanently failed', [
            'job' => static::class,
            'account_id' => $this->accountId,
            'payload_field' => $this->payload['field'] ?? null,
            'exception' => $exception->getMessage(),
        ]);
    }

    private function removePendingEntry(string $cacheKey, array $pendingState, int $flowId): void
    {
        if (array_key_exists('flow_id', $pendingState)) {
            Cache::forget($cacheKey);

            return;
        }

        if (array_key_exists($flowId, $pendingState)) {
            unset($pendingState[$flowId]);
        }

        if (empty($pendingState)) {
            Cache::forget($cacheKey);

            return;
        }

        Cache::put($cacheKey, $pendingState, now()->addHours(24));
    }

    private function mergePendingState(array $pendingState, array $payload): array
    {
        if (array_key_exists('flow_id', $pendingState)) {
            $pendingState = [
                (int) ($pendingState['flow_id'] ?? 0) => $pendingState,
            ];
        }

        $flowId = (int) ($payload['flow_id'] ?? 0);
        if ($flowId > 0) {
            $pendingState[$flowId] = $payload;
        }

        return $pendingState;
    }

    private function extractCommentId(array $value): ?string
    {
        $candidates = [
            $value['comment_id'] ?? null,
            data_get($value, 'comment.id'),
            $value['id'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (is_scalar($candidate)) {
                $normalized = trim((string) $candidate);
                if ($normalized !== '') {
                    return $normalized;
                }
            }
        }

        return null;
    }

    private function keywordMatches(string $normalizedText, string $keyword): bool
    {
        $needle = trim(Str::lower($keyword));
        if ($needle === '') {
            return false;
        }

        $pattern = '/(?<![\\p{L}\\p{N}_])'.preg_quote($needle, '/').'(?![\\p{L}\\p{N}_])/iu';

        return preg_match($pattern, $normalizedText) === 1;
    }

    private function isReminderMorePayload(string $payload): bool
    {
        return preg_match('/^AUTODM_REMINDER_MORE_\d+$/', $payload) === 1;
    }

    private function isReminderStopPayload(string $payload): bool
    {
        return preg_match('/^AUTODM_REMINDER_STOP_\d+$/', $payload) === 1;
    }

    private function extractReminderEventId(string $payload): ?int
    {
        if (preg_match('/_(\d+)$/', $payload, $matches) !== 1) {
            return null;
        }

        $eventId = (int) ($matches[1] ?? 0);

        return $eventId > 0 ? $eventId : null;
    }

    private function shouldSendWelcomeDm(
        InstagramAccount $account,
        bool $isInboundMessagingEvent,
        string $text,
        mixed $quickReplyPayload
    ): bool {
        if (($account->status ?? 'active') !== 'active' || ! $isInboundMessagingEvent || ! (bool) ($account->welcome_dm_enabled ?? false)) {
            return false;
        }

        if (trim((string) $text) === '') {
            return false;
        }

        return trim((string) $quickReplyPayload) === '';
    }

    private function sendWelcomeDmIfEligible(
        InstagramAccount $account,
        string $recipientIgId,
        MetaApiService $metaApiService
    ): bool {
        $variants = collect($account->welcome_dm_variants ?? [])
            ->map(fn ($variant) => trim((string) $variant))
            ->filter(fn ($variant) => $variant !== '')
            ->values()
            ->all();

        if (empty($variants)) {
            Log::info('Welcome DM skipped: no configured variants', [
                'instagram_account_id' => $account->id,
                'recipient_ig_id' => $recipientIgId,
            ]);

            return false;
        }

        $delivery = InstagramWelcomeDmDelivery::firstOrCreate(
            [
                'instagram_account_id' => (int) $account->id,
                'recipient_ig_id' => $recipientIgId,
            ],
            [
                'delivered_at' => now(),
            ]
        );

        if (! $delivery->wasRecentlyCreated) {
            Log::info('Welcome DM skipped: already delivered', [
                'instagram_account_id' => $account->id,
                'recipient_ig_id' => $recipientIgId,
            ]);

            return false;
        }

        $messageText = (string) $variants[array_rand($variants)];
        $delivery->message_text = $messageText;
        $delivery->save();

        $response = $metaApiService->sendMessage(
            (string) $account->access_token,
            (string) $account->ig_account_id,
            $recipientIgId,
            $messageText
        );

        if (! ($response['success'] ?? false)) {
            $delivery->delete();
            Log::warning('Welcome DM delivery failed; reservation released', [
                'instagram_account_id' => $account->id,
                'recipient_ig_id' => $recipientIgId,
                'status' => $response['status'] ?? null,
            ]);

            return false;
        }

        Log::info('Welcome DM delivered', [
            'instagram_account_id' => $account->id,
            'recipient_ig_id' => $recipientIgId,
        ]);

        return true;
    }

    private function handleReminderMorePayload(
        string $payload,
        InstagramAccount $account,
        string $userId,
        MetaApiService $metaApiService,
        AutodmDeeplinkService $deeplinkService
    ): void {
        $eventId = $this->extractReminderEventId($payload);
        if (! $eventId) {
            return;
        }

        $event = AutodmReminderEvent::query()->find($eventId);
        if (! $event) {
            return;
        }

        if ((string) ($event->recipient_ig_id ?? '') !== '' && (string) $event->recipient_ig_id !== $userId) {
            return;
        }

        $flow = AutomationFlow::query()
            ->where('id', (int) $event->automation_flow_id)
            ->where('instagram_account_id', (int) $account->id)
            ->first([
                'id',
                'reminder_more_message',
                'reminder_offer_url',
                'reminder_offer_button_text',
            ]);

        if (! $flow) {
            return;
        }

        $moreMessage = trim((string) ($flow->reminder_more_message ?? ''));
        if ($moreMessage === '') {
            $moreMessage = 'Awesome. Tell me what topic you want next and I will send more.';
        }

        $offerUrl = trim((string) ($flow->reminder_offer_url ?? ''));
        if ($offerUrl !== '') {
            $offerButtonText = trim((string) ($flow->reminder_offer_button_text ?? ''));
            if ($offerButtonText === '') {
                $offerButtonText = 'Get Premium';
            }

            $moreMessage = trim($moreMessage."\n\n".$offerButtonText.': '.$offerUrl);
        }

        $moreMessage = $deeplinkService->rewriteLinksInText(
            $moreMessage,
            (int) $flow->id,
            null,
            $eventId
        );

        $response = $metaApiService->sendMessage(
            (string) $account->access_token,
            (string) $account->ig_account_id,
            $userId,
            $moreMessage
        );

        if (! $response['success']) {
            Log::warning('Reminder MORE payload reply failed', [
                'event_id' => $eventId,
                'status' => $response['status'],
            ]);
        }
    }

    private function handleReminderStopPayload(
        string $payload,
        InstagramAccount $account,
        string $userId,
        MetaApiService $metaApiService
    ): void {
        $eventId = $this->extractReminderEventId($payload);
        if (! $eventId) {
            return;
        }

        $event = AutodmReminderEvent::query()->find($eventId);
        if (! $event) {
            return;
        }

        if ((string) ($event->recipient_ig_id ?? '') !== '' && (string) $event->recipient_ig_id !== $userId) {
            return;
        }

        $response = $metaApiService->sendMessage(
            (string) $account->access_token,
            (string) $account->ig_account_id,
            $userId,
            'No problem. If you want more resources later, reply anytime and I will help.'
        );

        if (! $response['success']) {
            Log::warning('Reminder STOP payload ack failed', [
                'event_id' => $eventId,
                'status' => $response['status'],
            ]);
        }
    }

    private function touchWindowActivity(int $accountId, string $userId): void
    {
        if ($accountId <= 0 || trim($userId) === '') {
            return;
        }

        Cache::put(
            $this->windowActivityCacheKey($accountId, $userId),
            now()->toIso8601String(),
            now()->addHours(25)
        );
    }

    private function windowActivityCacheKey(int $accountId, string $userId): string
    {
        return "autodm:window_last_inbound:{$accountId}:{$userId}";
    }
}
