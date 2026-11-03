<?php

namespace App\Http\Controllers;

use App\Models\Referral;
use App\Models\Subscription;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\WebhookEvent;
use App\Services\PlanService;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Razorpay\Api\Api;

class WebhookController extends Controller
{
    public function handle(Request $request)
    {
        $webhookSecret = (string) config('services.razorpay.webhook_secret', '');
        $signature = $request->header('X-Razorpay-Signature');
        $eventPayload = $request->getContent();

        if ($webhookSecret === '') {
            \Log::error('Razorpay Webhook rejected: missing webhook secret');

            return response()->json(['error' => 'Server misconfigured'], 500);
        }

        if (! $signature) {
            return response()->json(['error' => 'Missing signature'], 400);
        }

        $api = $this->makeRazorpayApi();

        try {
            $this->verifyWebhookSignature($api, $eventPayload, (string) $signature, $webhookSecret);
        } catch (\Exception $e) {
            \Log::warning('Razorpay Webhook Signature Verification Failed', ['error' => $e->getMessage()]);

            return response()->json(['error' => 'Invalid signature'], 400);
        }

        $payload = json_decode($eventPayload, true);

        if (! is_array($payload)) {
            return response()->json(['error' => 'Invalid payload'], 400);
        }

        $razorpayEventId = $payload['event_id'] ?? null;
        if (! $razorpayEventId) {
            $razorpayEventId = $request->header('X-Razorpay-Event-Id');
        }

        if ($razorpayEventId) {
            try {
                WebhookEvent::create([
                    'event_id' => $razorpayEventId,
                    'event_type' => (string) ($payload['event'] ?? 'unknown'),
                    'payload' => $payload,
                ]);
            } catch (QueryException $e) {
                if ((string) $e->getCode() === '23000') {
                    \Log::info('Razorpay Webhook Ignored (Duplicate): '.$razorpayEventId);

                    return response()->json(['status' => 'duplicate']);
                }

                throw $e;
            }
        }

        $event = (string) ($payload['event'] ?? '');
        if ($event === '') {
            return response()->json(['error' => 'Invalid payload'], 400);
        }

        \Log::info('Razorpay Webhook Received: '.$event, ['event_id' => $razorpayEventId]);

        DB::transaction(function () use ($event, $payload, $razorpayEventId) {
            if ($event === 'subscription.charged' && isset($payload['payload']['subscription']['entity'])) {
                $this->handleSubscriptionCharged($payload['payload']['subscription']['entity'], $razorpayEventId, $payload);
            } elseif (($event === 'subscription.cancelled' || $event === 'subscription.halted') && isset($payload['payload']['subscription']['entity'])) {
                $this->handleSubscriptionEnded($payload['payload']['subscription']['entity']);
            }
        });

        return response()->json(['status' => 'success']);
    }

    private function handleSubscriptionCharged(array $subscriptionData, ?string $razorpayEventId, array $payload): void
    {
        $subscriptionId = trim((string) ($subscriptionData['id'] ?? ''));
        if ($subscriptionId === '') {
            \Log::warning('Razorpay subscription.charged ignored: missing subscription id in payload.', [
                'event_id' => $razorpayEventId,
            ]);

            return;
        }

        $subscription = Subscription::query()->where('razorpay_id', $subscriptionId)->first();
        if (! $subscription) {
            $subscription = $this->recoverSubscriptionFromWebhook($subscriptionData);
        }

        if (! $subscription) {
            \Log::warning('Razorpay subscription.charged ignored: local subscription not found and could not be recovered.', [
                'event_id' => $razorpayEventId,
                'razorpay_subscription_id' => $subscriptionId,
            ]);

            return;
        }

        $currentEnd = (int) ($subscriptionData['current_end'] ?? 0);
        $subscription->update([
            'status' => 'active',
            'ends_at' => $currentEnd > 0 ? Carbon::createFromTimestamp($currentEnd) : null,
        ]);
        $this->initializeMonthlyCreditsForSubscription($subscription);

        $this->processReferralReward($subscription, $payload);
    }

    private function processReferralReward(Subscription $subscription, array $payload): void
    {
        $referee = $subscription->user;
        if (! $referee || ! $referee->referred_by_id) {
            return;
        }

        $referral = Referral::query()
            ->where('referee_id', $referee->id)
            ->lockForUpdate()
            ->first();

        if (! $referral) {
            return;
        }

        $referrer = User::query()->whereKey($referral->referrer_id)->lockForUpdate()->first();
        if (! $referrer) {
            return;
        }

        $paymentId = trim((string) ($payload['payload']['payment']['entity']['id'] ?? ''));
        if ($paymentId === '') {
            return;
        }

        // Idempotency check: Have we already rewarded this specific payment?
        $idempotencyKey = 'ref_reward_'.$referral->id.'_'.$paymentId;
        if (WalletTransaction::query()->where('idempotency_key', $idempotencyKey)->exists()) {
            return;
        }

        // Determine if this is the first reward or a recurring one
        $isFirstReward = ($referral->status === 'captured');
        $isRecurringReward = ($referral->status === 'rewarded' && $referral->is_recurring);

        if (! $isFirstReward && ! $isRecurringReward) {
            return;
        }

        // If it's the first reward, we initialize the referral type and recurring status
        if ($isFirstReward) {
            $isAffiliate = ($referrer->affiliate_status === 'approved');
            $referral->update([
                'type' => $isAffiliate ? 'affiliate' : 'referral',
                'is_recurring' => $isAffiliate, // Affiliates get recurring commissions
            ]);
        }

        // Determine percentage based on type and plan duration
        $isYearly = str_ends_with($subscription->name, '_yearly');

        if ($referral->type === 'affiliate') {
            $percentage = $isYearly
                ? config('services.razorpay.affiliate_reward_yearly_percent', 15)
                : config('services.razorpay.affiliate_reward_monthly_percent', 20);
        } else {
            $percentage = $isYearly
                ? config('services.razorpay.referral_reward_yearly_percent', 10)
                : config('services.razorpay.referral_reward_monthly_percent', 15);
        }

        $paymentAmount = (int) ($payload['payload']['payment']['entity']['amount'] ?? 0);
        $rewardPaisa = (int) ($paymentAmount * ($percentage / 100));

        if ($rewardPaisa <= 0) {
            if ($referral->status === 'captured') {
                $referral->update([
                    'status' => 'qualified',
                    'qualification_payment_id' => $paymentId,
                ]);
            }

            return;
        }

        $newBalance = $referrer->wallet_balance + $rewardPaisa;

        WalletTransaction::query()->create([
            'user_id' => $referrer->id,
            'amount' => $rewardPaisa,
            'balance_after' => $newBalance,
            'type' => 'reward',
            'reference_type' => 'referral_reward',
            'reference_id' => (string) $referral->id,
            'idempotency_key' => $idempotencyKey,
        ]);

        $referrer->update(['wallet_balance' => $newBalance]);

        if ($referral->status !== 'rewarded') {
            $referral->update([
                'status' => 'rewarded',
                'qualification_payment_id' => $paymentId,
            ]);
        }
    }

    private function recoverSubscriptionFromWebhook(array $subscriptionData): ?Subscription
    {
        $subscriptionId = trim((string) ($subscriptionData['id'] ?? ''));
        if ($subscriptionId === '') {
            return null;
        }

        $checkoutState = Cache::get($this->checkoutCacheKey($subscriptionId));
        $cachedUserId = (int) (is_array($checkoutState) ? ($checkoutState['user_id'] ?? 0) : 0);
        $notedUserId = (int) ($subscriptionData['notes']['user_id'] ?? 0);
        $userId = $cachedUserId > 0 ? $cachedUserId : $notedUserId;

        if ($userId <= 0) {
            return null;
        }

        $user = User::query()->find($userId);
        if (! $user) {
            return null;
        }

        $planId = trim((string) ($subscriptionData['plan_id'] ?? ''));
        $resolvedPlan = $this->resolvePlanNameFromPlanId($planId);
        $cachedPlan = trim((string) (is_array($checkoutState) ? ($checkoutState['plan'] ?? '') : ''));
        $planName = $resolvedPlan ?? ($cachedPlan !== '' ? $cachedPlan : null);

        if ($planName === null) {
            return null;
        }

        if ($planId === '') {
            $planId = $this->resolvePlanIdFromPlanName($planName);
        }

        if ($planId === '') {
            return null;
        }

        $currentEnd = (int) ($subscriptionData['current_end'] ?? 0);
        $subscription = Subscription::query()->updateOrCreate(
            ['razorpay_id' => $subscriptionId],
            [
                'user_id' => $user->id,
                'name' => $planName,
                'razorpay_plan_id' => $planId,
                'status' => 'active',
                'ends_at' => $currentEnd > 0 ? Carbon::createFromTimestamp($currentEnd) : null,
            ]
        );

        Cache::forget($this->checkoutCacheKey($subscriptionId));

        \Log::info('Recovered local subscription from Razorpay webhook.', [
            'user_id' => $user->id,
            'razorpay_subscription_id' => $subscriptionId,
            'plan_name' => $planName,
            'plan_id' => $planId,
        ]);

        return $subscription;
    }

    private function checkoutCacheKey(string $subscriptionId): string
    {
        return 'billing:checkout:'.trim($subscriptionId);
    }

    private function resolvePlanNameFromPlanId(string $planId): ?string
    {
        $normalizedPlanId = trim($planId);
        if ($normalizedPlanId === '') {
            return null;
        }

        $planMap = [
            'starter_yearly' => (string) config('services.razorpay.starter_yearly_plan_id'),
            'starter' => (string) config('services.razorpay.starter_plan_id'),
            'pro' => (string) config('services.razorpay.pro_plan_id'),
            'creator' => (string) config('services.razorpay.creator_plan_id'),
            'pro_yearly' => (string) config('services.razorpay.pro_yearly_plan_id'),
            'creator_yearly' => (string) config('services.razorpay.creator_yearly_plan_id'),
        ];

        foreach ($planMap as $planName => $configuredPlanId) {
            if ($configuredPlanId !== '' && hash_equals($configuredPlanId, $normalizedPlanId)) {
                return $planName;
            }
        }

        return null;
    }

    private function resolvePlanIdFromPlanName(string $planName): string
    {
        return match ($planName) {
            'starter_yearly' => trim((string) (config('services.razorpay.starter_yearly_plan_id') ?? config('services.razorpay.starter_plan_id'))),
            'starter' => trim((string) config('services.razorpay.starter_plan_id')),
            'pro' => trim((string) config('services.razorpay.pro_plan_id')),
            'creator' => trim((string) config('services.razorpay.creator_plan_id')),
            'pro_yearly' => trim((string) config('services.razorpay.pro_yearly_plan_id')),
            'creator_yearly' => trim((string) config('services.razorpay.creator_yearly_plan_id')),
            default => '',
        };
    }

    private function initializeMonthlyCreditsForSubscription(Subscription $subscription): void
    {
        $lockedSubscription = Subscription::query()
            ->whereKey($subscription->id)
            ->lockForUpdate()
            ->first();

        if (
            ! $lockedSubscription ||
            $lockedSubscription->status !== 'active' ||
            $lockedSubscription->next_credit_reset_at !== null
        ) {
            return;
        }

        $lockedUser = User::query()
            ->whereKey($lockedSubscription->user_id)
            ->lockForUpdate()
            ->first();

        if (! $lockedUser) {
            return;
        }

        $lockedUser->credits = PlanService::monthlyCreditAllowanceForPlan($lockedSubscription->name);
        $lockedUser->save();

        $lockedSubscription->next_credit_reset_at = now()->addMonthNoOverflow();
        $lockedSubscription->save();
    }

    private function handleSubscriptionEnded($subscriptionData)
    {
        $subscription = Subscription::where('razorpay_id', $subscriptionData['id'])->first();

        if ($subscription) {
            $subscription->update([
                'status' => $subscriptionData['status'],
            ]);
        }
    }

    protected function makeRazorpayApi(): Api
    {
        return new Api(config('services.razorpay.key'), config('services.razorpay.secret'));
    }

    protected function verifyWebhookSignature(Api $api, string $eventPayload, string $signature, string $webhookSecret): void
    {
        $api->utility->verifyWebhookSignature($eventPayload, $signature, $webhookSecret);
    }
}
