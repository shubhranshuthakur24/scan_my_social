<?php

namespace App\Http\Controllers;

use App\Models\PayoutRequest;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\WebhookEvent;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Razorpay\Api\Api;

class PayoutWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $webhookSecret = (string) config('services.razorpay.webhook_secret', '');
        $signature = $request->header('X-Razorpay-Signature');
        $eventPayload = $request->getContent();

        if ($webhookSecret === '') {
            \Log::error('RazorpayX Payout Webhook rejected: missing webhook secret');

            return response()->json(['error' => 'Server misconfigured'], 500);
        }

        if (! $signature) {
            return response()->json(['error' => 'Missing signature'], 400);
        }

        $api = new Api(config('services.razorpay.key'), config('services.razorpay.secret'));

        try {
            $api->utility->verifyWebhookSignature($eventPayload, (string) $signature, $webhookSecret);
        } catch (\Exception $e) {
            \Log::warning('RazorpayX Payout Webhook Signature Verification Failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'Invalid signature'], 400);
        }

        $payload = json_decode($eventPayload, true);

        if (! is_array($payload)) {
            return response()->json(['error' => 'Invalid payload'], 400);
        }

        $razorpayEventId = $payload['event_id'] ?? $request->header('X-Razorpay-Event-Id');

        // Idempotency: Use WebhookEvent model to prevent duplicate processing.
        if ($razorpayEventId) {
            try {
                WebhookEvent::create([
                    'event_id' => $razorpayEventId,
                    'event_type' => (string) ($payload['event'] ?? 'unknown'),
                    'payload' => $payload,
                ]);
            } catch (QueryException $e) {
                if ((string) $e->getCode() === '23000') {
                    \Log::info('RazorpayX Payout Webhook Ignored (Duplicate): '.$razorpayEventId);

                    return response()->json(['status' => 'duplicate']);
                }

                throw $e;
            }
        }

        $event = (string) ($payload['event'] ?? '');
        if ($event === '') {
            return response()->json(['error' => 'Invalid payload'], 400);
        }

        \Log::info('RazorpayX Payout Webhook Received: '.$event, ['event_id' => $razorpayEventId]);

        $payoutEntity = $payload['payload']['payout']['entity'] ?? null;

        if (! is_array($payoutEntity)) {
            return response()->json(['status' => 'ignored']);
        }

        DB::transaction(function () use ($event, $payoutEntity) {
            match ($event) {
                'payout.processed' => $this->handlePayoutProcessed($payoutEntity),
                'payout.failed' => $this->handlePayoutFailed($payoutEntity),
                'payout.reversed' => $this->handlePayoutReversed($payoutEntity),
                default => null,
            };
        });

        return response()->json(['status' => 'success']);
    }

    private function handlePayoutProcessed(array $payoutEntity): void
    {
        $payoutId = trim((string) ($payoutEntity['id'] ?? ''));
        if ($payoutId === '') {
            return;
        }

        $payoutRequest = PayoutRequest::query()->where('razorpay_payout_id', $payoutId)->lockForUpdate()->first();
        if (! $payoutRequest) {
            \Log::warning('RazorpayX payout.processed: no matching PayoutRequest', ['razorpay_payout_id' => $payoutId]);

            return;
        }

        // Finalize status
        $payoutRequest->update([
            'status' => 'paid',
            'razorpay_status' => 'processed',
        ]);

        \Log::info('RazorpayX payout.processed: PayoutRequest marked as PAID.', ['id' => $payoutRequest->id]);
    }

    private function handlePayoutFailed(array $payoutEntity): void
    {
        $payoutId = trim((string) ($payoutEntity['id'] ?? ''));
        if ($payoutId === '') {
            return;
        }

        $payoutRequest = PayoutRequest::query()->where('razorpay_payout_id', $payoutId)->lockForUpdate()->first();
        if (! $payoutRequest) {
            \Log::warning('RazorpayX payout.failed: no matching PayoutRequest', ['razorpay_payout_id' => $payoutId]);

            return;
        }

        $failureReason = (string) ($payoutEntity['failure_reason'] ?? 'Unknown failure reason');

        // Refund user's wallet balance
        $this->refundWalletBalance($payoutRequest, 'payout_failed');

        $payoutRequest->update([
            'status' => 'failed', // Final failed state
            'razorpay_status' => 'failed',
            'razorpay_error' => $failureReason,
        ]);

        \Log::warning('RazorpayX payout.failed: wallet refunded, payout marked as FAILED.', [
            'id' => $payoutRequest->id,
            'reason' => $failureReason,
        ]);
    }

    private function handlePayoutReversed(array $payoutEntity): void
    {
        $payoutId = trim((string) ($payoutEntity['id'] ?? ''));
        if ($payoutId === '') {
            return;
        }

        $payoutRequest = PayoutRequest::query()->where('razorpay_payout_id', $payoutId)->lockForUpdate()->first();
        if (! $payoutRequest) {
            \Log::warning('RazorpayX payout.reversed: no matching PayoutRequest', ['razorpay_payout_id' => $payoutId]);

            return;
        }

        $this->refundWalletBalance($payoutRequest, 'payout_reversed');

        $payoutRequest->update([
            'status' => 'reversed',
            'razorpay_status' => 'reversed',
            'razorpay_error' => 'Payout was reversed by the bank.',
        ]);

        \Log::warning('RazorpayX payout.reversed: wallet refunded, payout marked as REVERSED.', [
            'id' => $payoutRequest->id,
        ]);
    }

    /**
     * Refund the user's wallet balance for a failed/reversed payout.
     */
    private function refundWalletBalance(PayoutRequest $payoutRequest, string $reason): void
    {
        $idempotencyKey = $reason.'_'.$payoutRequest->id;

        if (WalletTransaction::query()->where('idempotency_key', $idempotencyKey)->exists()) {
            return;
        }

        $user = User::query()->whereKey($payoutRequest->user_id)->lockForUpdate()->firstOrFail();
        $newBalance = $user->wallet_balance + $payoutRequest->amount;

        WalletTransaction::query()->create([
            'user_id' => $user->id,
            'amount' => $payoutRequest->amount,
            'balance_after' => $newBalance,
            'type' => 'refund',
            'reference_type' => 'payout',
            'reference_id' => (string) $payoutRequest->id,
            'idempotency_key' => $idempotencyKey,
        ]);

        $user->update(['wallet_balance' => $newBalance]);
    }
}
