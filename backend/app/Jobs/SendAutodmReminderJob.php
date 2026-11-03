<?php

namespace App\Jobs;

use App\Models\AutodmReminderEvent;
use App\Services\AutodmDeeplinkService;
use App\Services\MetaApiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SendAutodmReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    public $backoff = [60, 180, 300];

    public function __construct(public int $reminderEventId)
    {
        $this->onQueue('autodm');
    }

    public function handle(MetaApiService $metaApiService, AutodmDeeplinkService $deeplinkService): void
    {
        $event = AutodmReminderEvent::query()
            ->with(['automationFlow.instagramAccount'])
            ->find($this->reminderEventId);

        if (! $event || $event->status !== 'scheduled') {
            return;
        }

        $flow = $event->automationFlow;
        $account = $flow?->instagramAccount;
        if (! $flow || ! $account || $account->status !== 'active' || $flow->status !== 'active') {
            $event->update([
                'status' => 'failed',
                'processed_at' => now(),
                'skip_reason' => 'flow_or_account_inactive',
            ]);

            return;
        }

        $recipientIgId = trim((string) ($event->recipient_ig_id ?? ''));
        if ($recipientIgId === '') {
            $event->update([
                'status' => 'failed',
                'processed_at' => now(),
                'skip_reason' => 'missing_recipient',
            ]);

            return;
        }

        if (! $this->hasActiveDmWindow((int) $account->id, $recipientIgId)) {
            $event->update([
                'status' => 'skipped_window',
                'processed_at' => now(),
                'skip_reason' => 'window_closed',
            ]);

            return;
        }

        $messages = collect($flow->reminder_messages ?? [])
            ->map(fn ($message) => trim((string) $message))
            ->filter()
            ->values();

        if ($messages->isEmpty()) {
            $event->update([
                'status' => 'failed',
                'processed_at' => now(),
                'skip_reason' => 'missing_reminder_message',
            ]);

            return;
        }

        $variantIndex = ((int) $event->id - 1) % $messages->count();
        $selectedMessage = (string) $messages->get($variantIndex, $messages->first());
        $reminderText = $deeplinkService->rewriteLinksInText(
            $selectedMessage,
            (int) $flow->id,
            null,
            (int) $event->id
        );

        $primaryButtonText = trim((string) ($flow->reminder_primary_button_text ?? 'Show me more'));
        $secondaryButtonText = trim((string) ($flow->reminder_secondary_button_text ?? 'Not now'));
        $buttons = [];

        if ($primaryButtonText !== '') {
            $buttons[] = [
                'title' => $primaryButtonText,
                'payload' => "AUTODM_REMINDER_MORE_{$event->id}",
            ];
        }

        if ($secondaryButtonText !== '') {
            $buttons[] = [
                'title' => $secondaryButtonText,
                'payload' => "AUTODM_REMINDER_STOP_{$event->id}",
            ];
        }

        if (! empty($buttons)) {
            $response = $metaApiService->sendQuickReplyMessageWithButtons(
                (string) $account->access_token,
                (string) $account->ig_account_id,
                $recipientIgId,
                $reminderText,
                $buttons
            );
        } else {
            $response = $metaApiService->sendMessage(
                (string) $account->access_token,
                (string) $account->ig_account_id,
                $recipientIgId,
                $reminderText
            );
        }

        if ($response['success']) {
            $event->update([
                'status' => 'sent',
                'processed_at' => now(),
                'response_payload' => [
                    'response' => $response['payload'] ?? [],
                    'variant_index' => $variantIndex,
                ],
            ]);

            return;
        }

        $errorMessage = strtolower((string) data_get($response, 'payload.error.message', ''));
        $errorSubcode = (int) data_get($response, 'payload.error.error_subcode', 0);
        $isOutsideAllowedWindow = $errorSubcode === 2534022
            || str_contains($errorMessage, 'outside the allowed window');

        if ($isOutsideAllowedWindow) {
            $event->update([
                'status' => 'skipped_window',
                'processed_at' => now(),
                'skip_reason' => 'window_closed',
                'response_payload' => $response['payload'] ?? null,
            ]);

            return;
        }

        $event->update([
            'status' => 'failed',
            'processed_at' => now(),
            'skip_reason' => 'send_failed',
            'response_payload' => $response['payload'] ?? null,
        ]);

        Log::warning('Reminder send failed', [
            'event_id' => $event->id,
            'flow_id' => $flow->id,
            'status' => $response['status'] ?? null,
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
}
