<?php

namespace App\Http\Controllers;

use App\Http\Requests\VerifyPaymentRequest;
use App\Mail\InvoiceMail;
use App\Models\Invoice;
use App\Models\Subscription;
use App\Models\User;
use App\Services\PlanService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;

class SubscriptionController extends Controller
{
    private $api;

    public function __construct()
    {
        $this->api = new Api(config('services.razorpay.key'), config('services.razorpay.secret'));
    }

    /**
     * Create a Razorpay Subscription Session
     */
    public function createSession(Request $request)
    {
        $request->validate([
            'plan' => 'required|in:starter,starter_yearly,pro,creator,pro_yearly,creator_yearly',
        ]);

        $user = auth()->user();
        $planType = $request->plan;

        $planId = $this->resolveCheckoutPlanId($planType);
        if ($planId === null || $planId === '') {
            return response()->json([
                'success' => false,
                'message' => 'Invalid plan configuration. Please contact support.',
            ], 422);
        }

        try {
            $razorpayCustomerId = $this->resolveOrCreateRazorpayCustomerId($user);
            $subscriptionData = $this->buildSubscriptionPayload($planId, $planType, $user, $razorpayCustomerId);

            // Ultra-Hardened Task: Dynamic Offer Routing
            if ($user->referred_by_id) {
                $isYearly = str_ends_with($planType, '_yearly');
                $offerId = $isYearly
                    ? config('services.razorpay.offers.referral_yearly')
                    : config('services.razorpay.offers.referral_monthly');

                if (! empty($offerId)) {
                    $subscriptionData['offer_id'] = $offerId;
                }
            }

            $subscription = $this->api->subscription->create($subscriptionData);

            Cache::put(
                $this->checkoutCacheKey((string) $subscription->id),
                [
                    'user_id' => (int) $user->id,
                    'plan' => $planType,
                    'created_at' => now()->toIso8601String(),
                ],
                now()->addHours(6)
            );

            return response()->json([
                'success' => true,
                'subscription_id' => $subscription->id,
            ]);

        } catch (\Exception $e) {
            \Log::error('Razorpay Subscription Error: '.$e->getMessage(), ['exception' => $e]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to initialize subscription session.',
            ], 500);
        }
    }

    /**
     * Verify payment signature after checkout
     */
    public function verifyPayment(VerifyPaymentRequest $request)
    {
        try {
            $attributes = [
                'razorpay_payment_id' => $request->razorpay_payment_id,
                'razorpay_subscription_id' => $request->razorpay_subscription_id,
                'razorpay_signature' => $request->razorpay_signature,
            ];

            // Verify the signature
            $this->api->utility->verifyPaymentSignature($attributes);

            $user = auth()->user();
            $checkoutState = Cache::get($this->checkoutCacheKey((string) $request->razorpay_subscription_id));

            // Resolve trusted payment/subscription details from Razorpay.
            $payment = $this->api->payment->fetch($request->razorpay_payment_id);
            $subscriptionDetails = $this->api->subscription->fetch($request->razorpay_subscription_id);

            // Relaxed: verifyPaymentSignature() already cryptographically links the payment and subscription.
            // Manual check of $payment->subscription_id is removed to avoid false negatives when Razorpay
            // hasn't populated the field yet (common for initial authorization payments).
            if (empty($payment->subscription_id)) {
                \Log::info('Payment verification: subscription_id missing from payment object but signature is valid. Proceeding.', [
                    'user_id' => $user->id,
                    'subscription_id' => (string) $request->razorpay_subscription_id,
                    'payment_id' => (string) $request->razorpay_payment_id,
                ]);
            }

            $planId = (string) ($subscriptionDetails->plan_id ?? '');
            $resolvedPlanName = $this->resolvePlanNameFromPlanId($planId);
            if ($planId === '' || $resolvedPlanName === null) {
                \Log::warning('Payment verification failed: unknown plan.', [
                    'user_id' => $user->id,
                    'subscription_id' => (string) $request->razorpay_subscription_id,
                    'plan_id' => $planId,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Payment verification failed: unknown plan.',
                ], 400);
            }

            $localSubscriptionOwnerId = Subscription::query()
                ->where('razorpay_id', (string) $request->razorpay_subscription_id)
                ->value('user_id');

            $verificationContext = $this->resolveVerificationContext(
                is_array($checkoutState) ? $checkoutState : null,
                $subscriptionDetails,
                $localSubscriptionOwnerId !== null ? (int) $localSubscriptionOwnerId : null
            );

            if ($verificationContext['user_id'] <= 0) {
                // Hardened: Check if the subscription was already created/activated by a webhook (race condition).
                $existingSubscription = Subscription::where('razorpay_id', (string) $request->razorpay_subscription_id)
                    ->where('user_id', $user->id)
                    ->where('status', 'active')
                    ->exists();

                if ($existingSubscription) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Subscription activated successfully!',
                    ]);
                }

                \Log::warning('Payment verification failed: unable to prove checkout ownership.', [
                    'user_id' => $user->id,
                    'subscription_id' => (string) $request->razorpay_subscription_id,
                    'payment_id' => (string) $request->razorpay_payment_id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Payment verification failed: checkout session expired or invalid.',
                ], 400);
            }

            if ($verificationContext['user_id'] !== (int) $user->id) {
                \Log::warning('Payment verification failed: checkout owner mismatch.', [
                    'user_id' => $user->id,
                    'checkout_user_id' => $verificationContext['user_id'],
                    'subscription_id' => (string) $request->razorpay_subscription_id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Payment verification failed: checkout owner mismatch.',
                ], 403);
            }

            $expectedPlan = $verificationContext['plan'];
            if ($expectedPlan !== '' && $expectedPlan !== $resolvedPlanName) {
                \Log::warning('Payment verification failed: plan mismatch.', [
                    'user_id' => $user->id,
                    'subscription_id' => (string) $request->razorpay_subscription_id,
                    'expected_plan' => $expectedPlan,
                    'resolved_plan' => $resolvedPlanName,
                    'plan_id' => $planId,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Payment verification failed: plan mismatch.',
                ], 400);
            }

            $belongsToAnotherUser = Subscription::query()
                ->where('razorpay_id', (string) $request->razorpay_subscription_id)
                ->where('user_id', '!=', $user->id)
                ->exists();

            if ($belongsToAnotherUser) {
                \Log::warning('Payment verification failed: subscription owner mismatch.', [
                    'user_id' => $user->id,
                    'subscription_id' => (string) $request->razorpay_subscription_id,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Payment verification failed: subscription owner mismatch.',
                ], 403);
            }

            // Fetch current active subscriptions to cancel - BEFORE transaction for API calls
            $activeSubs = $user->subscriptions()->where('status', 'active')->get();
            $alreadyProcessed = false;

            // DB Transaction
            DB::transaction(function () use ($user, $request, $planId, $payment, $activeSubs, $resolvedPlanName, &$alreadyProcessed) {
                /** @var User $lockedUser */
                $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

                if (
                    Invoice::query()->where('razorpay_payment_id', (string) $request->razorpay_payment_id)->exists()
                ) {
                    $alreadyProcessed = true;

                    return;
                }

                // 1. Cancel existing active subscriptions locally
                // Note: We'll attempt Razorpay cancellation outside/before if needed,
                // but since they were fetched already, we'll mark them cancelled here.
                foreach ($activeSubs as $oldSub) {
                    try {
                        // Guard: Only cancel on Razorpay if it's a real Razorpay subscription (not a local 'free' sub)
                        if ($oldSub->razorpay_id && ! str_starts_with($oldSub->razorpay_id, 'sub_free_')) {
                            if ($oldSub->razorpay_id !== $request->razorpay_subscription_id) {
                                $this->api->subscription->fetch($oldSub->razorpay_id)->cancel(['cancel_at_cycle_end' => 0]);
                            }
                        }
                    } catch (\Exception $e) {
                        \Log::warning('Failed to cancel Razorpay for old sub: '.$oldSub->razorpay_id.' Error: '.$e->getMessage());
                    }
                    $oldSub->update(['status' => 'cancelled']);
                }

                // 2. Overwrite monthly credits and start monthly reset cycle.
                $monthlyAllowance = PlanService::monthlyCreditAllowanceForPlan($resolvedPlanName);
                $nextCreditResetAt = now()->addMonthNoOverflow();

                $lockedUser->credits = $monthlyAllowance;

                if (in_array($resolvedPlanName, ['starter', 'starter_yearly'], true)) {
                    $lockedUser->has_claimed_free = true;
                }

                $lockedUser->save();

                // 3. Create/Update New Subscription Record
                $subscription = $lockedUser->subscriptions()->updateOrCreate(
                    ['razorpay_id' => $request->razorpay_subscription_id],
                    [
                        'name' => $resolvedPlanName,
                        'razorpay_plan_id' => $planId,
                        'status' => 'active',
                        'ends_at' => null,
                        'next_credit_reset_at' => $nextCreditResetAt,
                    ]
                );

                // 4. Create Invoice Record linked to Subscription
                $invoice = $lockedUser->invoices()->create([
                    'subscription_id' => $subscription->id,
                    'razorpay_payment_id' => $request->razorpay_payment_id,
                    'amount' => $payment->amount,
                    'status' => 'paid',
                ]);

                // Send Email Notification
                Mail::to($lockedUser->email)->queue(new InvoiceMail($invoice, $lockedUser));
            });

            if ($alreadyProcessed) {
                return response()->json([
                    'success' => true,
                    'message' => 'Payment was already verified.',
                ]);
            }

            Cache::forget($this->checkoutCacheKey((string) $request->razorpay_subscription_id));

            return response()->json([
                'success' => true,
                'message' => 'Subscription activated successfully!',
            ]);

        } catch (SignatureVerificationError $e) {
            \Log::warning('Razorpay Signature Verification Failed', [
                'error' => $e->getMessage(),
                'payment_id' => $request->razorpay_payment_id,
                'subscription_id' => $request->razorpay_subscription_id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Payment verification failed: Invalid signature.',
            ], 400);
        } catch (\Exception $e) {
            \Log::error('Subscription Verification Error: '.$e->getMessage(), ['exception' => $e]);

            return response()->json([
                'success' => false,
                'message' => 'Payment verification failed due to an unexpected error.',
            ], 500);
        }
    }

    public function cancel(Request $request)
    {
        $user = auth()->user();

        // Find the active subscription
        /** @var Subscription|null $subscription */
        $subscription = $user->subscriptions()->where('status', 'active')->first();

        if (! $subscription) {
            return back()->with('error', 'No active subscription found.');
        }
        try {
            // Cancel on Razorpay (cancel_at_cycle_end => 1 means it cancels at the end of the current billing cycle)
            $razorpayId = (string) ($subscription->razorpay_id ?? '');
            if ($razorpayId !== '' && ! str_starts_with($razorpayId, 'sub_free_')) {
                $api = new Api(config('services.razorpay.key'), config('services.razorpay.secret'));
                $remoteSubscription = $api->subscription->fetch($razorpayId)->cancel(['cancel_at_cycle_end' => 1]);

                $currentEnd = (int) ($remoteSubscription->current_end ?? 0);
                if ($currentEnd > 0) {
                    $subscription->update([
                        'ends_at' => Carbon::createFromTimestamp($currentEnd),
                    ]);
                }
            }

            // Keep local status active so feature access remains available until the billing cycle ends.
            // Razorpay webhook events will finalize the terminal status at cycle end.

            return back()->with('message', 'Subscription will be cancelled at the end of your billing cycle.');

        } catch (\Exception $e) {
            \Log::error('Subscription Cancellation Error: '.$e->getMessage(), ['exception' => $e]);

            return back()->with('error', 'Failed to cancel subscription.');
        }
    }

    private function checkoutCacheKey(string $subscriptionId): string
    {
        return 'billing:checkout:'.trim($subscriptionId);
    }

    /**
     * @param  array{user_id?: int|string, plan?: string}|null  $checkoutState
     * @return array{user_id: int, plan: string}
     */
    private function resolveVerificationContext(?array $checkoutState, mixed $subscriptionDetails, ?int $localSubscriptionOwnerId): array
    {
        $resolvedCheckoutState = is_array($checkoutState) ? $checkoutState : [];
        $checkoutUserId = (int) ($resolvedCheckoutState['user_id'] ?? 0);
        $noteUserId = (int) $this->extractSubscriptionNote($subscriptionDetails, 'user_id');
        $localOwnerId = (int) ($localSubscriptionOwnerId ?? 0);

        $resolvedUserId = 0;
        if ($checkoutUserId > 0) {
            $resolvedUserId = $checkoutUserId;
        } elseif ($noteUserId > 0) {
            $resolvedUserId = $noteUserId;
        } elseif ($localOwnerId > 0) {
            $resolvedUserId = $localOwnerId;
        }

        $checkoutPlan = trim((string) ($resolvedCheckoutState['plan'] ?? ''));
        $notePlan = $this->extractSubscriptionNote($subscriptionDetails, 'plan');
        $resolvedPlan = $checkoutPlan !== '' ? $checkoutPlan : $notePlan;

        return [
            'user_id' => $resolvedUserId,
            'plan' => $resolvedPlan,
        ];
    }

    private function extractSubscriptionNote(mixed $subscriptionDetails, string $key): string
    {
        $notes = null;

        if (is_object($subscriptionDetails) && isset($subscriptionDetails->notes)) {
            $notes = $subscriptionDetails->notes;
        } elseif (is_array($subscriptionDetails) && array_key_exists('notes', $subscriptionDetails)) {
            $notes = $subscriptionDetails['notes'];
        }

        if (is_array($notes)) {
            return trim((string) ($notes[$key] ?? ''));
        }

        if (is_object($notes)) {
            return trim((string) ($notes->{$key} ?? ''));
        }

        return '';
    }

    private function resolvePlanNameFromPlanId(?string $planId): ?string
    {
        $normalizedPlanId = trim((string) $planId);

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

        foreach ($planMap as $name => $configuredPlanId) {
            if ($configuredPlanId !== '' && hash_equals($configuredPlanId, $normalizedPlanId)) {
                return $name;
            }
        }

        return null;
    }

    private function resolveCheckoutPlanId(string $planType): ?string
    {
        return match ($planType) {
            'starter' => (string) config('services.razorpay.starter_plan_id'),
            'starter_yearly' => (string) (config('services.razorpay.starter_yearly_plan_id') ?? config('services.razorpay.starter_plan_id')),
            'creator_yearly' => (string) (config('services.razorpay.creator_yearly_plan_id') ?? config('services.razorpay.creator_plan_id')),
            'pro_yearly' => (string) (config('services.razorpay.pro_yearly_plan_id') ?? config('services.razorpay.pro_plan_id')),
            'creator' => (string) config('services.razorpay.creator_plan_id'),
            'pro' => (string) config('services.razorpay.pro_plan_id'),
            default => null,
        };
    }

    /**
     * @return array{
     *     plan_id: string,
     *     customer_notify: int,
     *     total_count: int,
     *     notes: array{user_id: string, plan: string, customer_id?: string},
     *     start_at?: int
     * }
     */
    private function buildSubscriptionPayload(string $planId, string $planType, User $user, ?string $razorpayCustomerId = null): array
    {
        $notes = [
            'user_id' => (string) $user->id,
            'plan' => $planType,
        ];

        if ($razorpayCustomerId !== null && $razorpayCustomerId !== '') {
            $notes['customer_id'] = $razorpayCustomerId;
        }

        $payload = [
            'plan_id' => $planId,
            'customer_notify' => 1,
            'total_count' => str_ends_with($planType, '_yearly') ? 10 : 120, // 10-year duration for both
            'notes' => $notes,
        ];

        $trialStartAt = $this->resolveTrialStartAt($planType, $user);
        if ($trialStartAt !== null) {
            $payload['start_at'] = $trialStartAt;
        }

        return $payload;
    }

    private function resolveTrialStartAt(string $planType, User $user): ?int
    {
        if ($planType !== 'starter' || $user->has_claimed_free) {
            return null;
        }

        return now()->addDays(14)->timestamp;
    }

    private function resolveOrCreateRazorpayCustomerId(User $user): ?string
    {
        $existingCustomerId = trim((string) ($user->razorpay_customer_id ?? ''));
        if ($existingCustomerId !== '') {
            return $existingCustomerId;
        }

        $customerPayload = [
            'name' => $user->name,
            'fail_existing' => '0',
        ];

        $email = trim((string) $user->email);
        if ($email !== '') {
            $customerPayload['email'] = $email;
        }

        $normalizedContact = $this->normalizeRazorpayCustomerContact($user->affiliate_contact ?? null);
        if ($normalizedContact !== null) {
            $customerPayload['contact'] = $normalizedContact;
        }

        try {
            $customer = $this->api->customer->create($customerPayload);
            $customerId = trim((string) ($customer->id ?? ''));

            if ($customerId === '') {
                return null;
            }

            User::query()->whereKey($user->id)->update([
                'razorpay_customer_id' => $customerId,
            ]);

            $user->forceFill([
                'razorpay_customer_id' => $customerId,
            ]);

            return $customerId;
        } catch (\Throwable $exception) {
            \Log::warning('Razorpay customer creation failed; continuing subscription without pre-created customer.', [
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    private function normalizeRazorpayCustomerContact(mixed $rawContact): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) ($rawContact ?? ''));
        $normalized = trim((string) $digits);

        if ($normalized === '') {
            return null;
        }

        $length = strlen($normalized);

        if ($length < 7 || $length > 15) {
            return null;
        }

        return $normalized;
    }
}
