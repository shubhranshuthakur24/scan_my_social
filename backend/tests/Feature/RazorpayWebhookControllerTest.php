<?php

namespace Tests\Feature;

use App\Http\Controllers\WebhookController;
use App\Models\Referral;
use App\Models\Subscription;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Razorpay\Api\Api;
use Tests\TestCase;

class RazorpayWebhookControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_subscription_charged_event_processes_without_undefined_event_id_error(): void
    {
        config([
            'services.razorpay.key' => 'rzp_test_key',
            'services.razorpay.secret' => 'rzp_test_secret',
            'services.razorpay.webhook_secret' => 'whsec_test',
            'services.razorpay.starter_plan_id' => 'plan_starter_test',
        ]);

        $user = User::factory()->create([
            'referred_by_id' => null,
        ]);

        $subscription = Subscription::query()->create([
            'user_id' => $user->id,
            'name' => 'starter',
            'razorpay_id' => 'sub_webhook_test_123',
            'razorpay_plan_id' => 'plan_starter_test',
            'status' => 'created',
            'ends_at' => null,
        ]);

        $expectedEnd = now()->addDays(30)->timestamp;

        $payload = [
            'event' => 'subscription.charged',
            'event_id' => 'evt_webhook_123',
            'payload' => [
                'subscription' => [
                    'entity' => [
                        'id' => 'sub_webhook_test_123',
                        'current_end' => $expectedEnd,
                    ],
                ],
                'payment' => [
                    'entity' => [
                        'id' => 'pay_test_123',
                    ],
                ],
            ],
        ];

        $request = Request::create(
            '/api/webhooks/razorpay',
            'POST',
            [],
            [],
            [],
            [
                'HTTP_X_RAZORPAY_SIGNATURE' => 'valid_signature_for_test',
                'CONTENT_TYPE' => 'application/json',
            ],
            json_encode($payload, JSON_THROW_ON_ERROR)
        );

        $controller = new class extends WebhookController
        {
            protected function verifyWebhookSignature(Api $api, string $eventPayload, string $signature, string $webhookSecret): void
            {
                // Bypass external SDK verification for deterministic unit-level coverage.
            }
        };

        $response = $controller->handle($request);

        $this->assertSame(200, $response->status());
        $this->assertSame('success', $response->getData(true)['status'] ?? null);

        $subscription->refresh();
        $user->refresh();

        $this->assertSame('active', $subscription->status);
        $this->assertNotNull($subscription->ends_at);
        $this->assertTrue($subscription->ends_at->isFuture());
        $this->assertNotNull($subscription->next_credit_reset_at);
        $this->assertTrue($subscription->next_credit_reset_at->isFuture());
        $this->assertSame(0, (int) $user->credits);
    }

    public function test_subscription_charged_event_recovers_local_subscription_from_checkout_cache(): void
    {
        config([
            'services.razorpay.key' => 'rzp_test_key',
            'services.razorpay.secret' => 'rzp_test_secret',
            'services.razorpay.webhook_secret' => 'whsec_test',
            'services.razorpay.pro_yearly_plan_id' => 'plan_pro_yearly_test',
        ]);

        $user = User::factory()->create([
            'referred_by_id' => null,
        ]);

        Cache::put('billing:checkout:sub_webhook_recovery_456', [
            'user_id' => $user->id,
            'plan' => 'pro_yearly',
            'created_at' => now()->toIso8601String(),
        ], now()->addMinutes(10));

        $expectedEnd = now()->addDays(30)->timestamp;

        $payload = [
            'event' => 'subscription.charged',
            'event_id' => 'evt_webhook_456',
            'payload' => [
                'subscription' => [
                    'entity' => [
                        'id' => 'sub_webhook_recovery_456',
                        'plan_id' => 'plan_pro_yearly_test',
                        'current_end' => $expectedEnd,
                    ],
                ],
                'payment' => [
                    'entity' => [
                        'id' => 'pay_test_456',
                    ],
                ],
            ],
        ];

        $request = Request::create(
            '/api/webhooks/razorpay',
            'POST',
            [],
            [],
            [],
            [
                'HTTP_X_RAZORPAY_SIGNATURE' => 'valid_signature_for_test',
                'CONTENT_TYPE' => 'application/json',
            ],
            json_encode($payload, JSON_THROW_ON_ERROR)
        );

        $controller = new class extends WebhookController
        {
            protected function verifyWebhookSignature(Api $api, string $eventPayload, string $signature, string $webhookSecret): void
            {
                // Bypass external SDK verification for deterministic unit-level coverage.
            }
        };

        $response = $controller->handle($request);

        $this->assertSame(200, $response->status());
        $this->assertSame('success', $response->getData(true)['status'] ?? null);

        $subscription = Subscription::query()
            ->where('razorpay_id', 'sub_webhook_recovery_456')
            ->first();

        $this->assertNotNull($subscription);
        $this->assertSame($user->id, $subscription->user_id);
        $this->assertSame('pro_yearly', $subscription->name);
        $this->assertSame('active', $subscription->status);
        $this->assertNotNull($subscription->ends_at);
        $this->assertTrue($subscription->ends_at->isFuture());
        $this->assertNotNull($subscription->next_credit_reset_at);
        $this->assertTrue($subscription->next_credit_reset_at->isFuture());
        $this->assertNull(Cache::get('billing:checkout:sub_webhook_recovery_456'));

        $user->refresh();
        $this->assertSame(22000, (int) $user->credits);
    }

    public function test_subscription_charged_event_recovers_starter_yearly_subscription_and_sets_yearly_credits(): void
    {
        config([
            'services.razorpay.key' => 'rzp_test_key',
            'services.razorpay.secret' => 'rzp_test_secret',
            'services.razorpay.webhook_secret' => 'whsec_test',
            'services.razorpay.starter_yearly_plan_id' => 'plan_starter_yearly_test',
        ]);

        $user = User::factory()->create([
            'referred_by_id' => null,
        ]);

        Cache::put('billing:checkout:sub_webhook_starter_yearly_789', [
            'user_id' => $user->id,
            'plan' => 'starter_yearly',
            'created_at' => now()->toIso8601String(),
        ], now()->addMinutes(10));

        $expectedEnd = now()->addDays(30)->timestamp;

        $payload = [
            'event' => 'subscription.charged',
            'event_id' => 'evt_webhook_starter_yearly_789',
            'payload' => [
                'subscription' => [
                    'entity' => [
                        'id' => 'sub_webhook_starter_yearly_789',
                        'plan_id' => 'plan_starter_yearly_test',
                        'current_end' => $expectedEnd,
                    ],
                ],
                'payment' => [
                    'entity' => [
                        'id' => 'pay_test_starter_yearly_789',
                    ],
                ],
            ],
        ];

        $request = Request::create(
            '/api/webhooks/razorpay',
            'POST',
            [],
            [],
            [],
            [
                'HTTP_X_RAZORPAY_SIGNATURE' => 'valid_signature_for_test',
                'CONTENT_TYPE' => 'application/json',
            ],
            json_encode($payload, JSON_THROW_ON_ERROR)
        );

        $controller = new class extends WebhookController
        {
            protected function verifyWebhookSignature(Api $api, string $eventPayload, string $signature, string $webhookSecret): void
            {
                // Bypass external SDK verification for deterministic unit-level coverage.
            }
        };

        $response = $controller->handle($request);

        $this->assertSame(200, $response->status());
        $this->assertSame('success', $response->getData(true)['status'] ?? null);

        $subscription = Subscription::query()
            ->where('razorpay_id', 'sub_webhook_starter_yearly_789')
            ->first();

        $this->assertNotNull($subscription);
        $this->assertSame($user->id, $subscription->user_id);
        $this->assertSame('starter_yearly', $subscription->name);
        $this->assertSame('active', $subscription->status);
        $this->assertNotNull($subscription->next_credit_reset_at);
        $this->assertTrue($subscription->next_credit_reset_at->isFuture());

        $user->refresh();
        $this->assertSame(0, (int) $user->credits);
    }

    public function test_subscription_charged_event_rewards_referrer_and_marks_referral_as_rewarded(): void
    {
        config([
            'services.razorpay.key' => 'rzp_test_key',
            'services.razorpay.secret' => 'rzp_test_secret',
            'services.razorpay.webhook_secret' => 'whsec_test',
            'services.razorpay.referral_reward_monthly_percent' => 20,
        ]);

        $referrer = User::factory()->create([
            'wallet_balance' => 10000,
            'referral_code' => 'SMS_REWARD123',
        ]);

        $referee = User::factory()->create([
            'referred_by_id' => $referrer->id,
        ]);

        $referral = Referral::query()->create([
            'referrer_id' => $referrer->id,
            'referee_id' => $referee->id,
            'status' => 'captured',
        ]);

        Subscription::query()->create([
            'user_id' => $referee->id,
            'name' => 'creator',
            'razorpay_id' => 'sub_ref_reward_001',
            'razorpay_plan_id' => 'plan_creator_test',
            'status' => 'created',
            'ends_at' => null,
        ]);

        $payload = [
            'event' => 'subscription.charged',
            'event_id' => 'evt_ref_reward_001',
            'payload' => [
                'subscription' => [
                    'entity' => [
                        'id' => 'sub_ref_reward_001',
                        'current_end' => now()->addDays(30)->timestamp,
                    ],
                ],
                'payment' => [
                    'entity' => [
                        'id' => 'pay_ref_reward_001',
                        'amount' => 99900,
                    ],
                ],
            ],
        ];

        $request = Request::create(
            '/api/webhooks/razorpay',
            'POST',
            [],
            [],
            [],
            [
                'HTTP_X_RAZORPAY_SIGNATURE' => 'valid_signature_for_test',
                'CONTENT_TYPE' => 'application/json',
            ],
            json_encode($payload, JSON_THROW_ON_ERROR)
        );

        $controller = new class extends WebhookController
        {
            protected function verifyWebhookSignature(Api $api, string $eventPayload, string $signature, string $webhookSecret): void
            {
                // Bypass external SDK verification for deterministic unit-level coverage.
            }
        };

        $response = $controller->handle($request);

        $this->assertSame(200, $response->status());
        $this->assertSame('success', $response->getData(true)['status'] ?? null);

        $referrer->refresh();
        $referral->refresh();

        $this->assertSame('rewarded', $referral->status);
        $this->assertSame('pay_ref_reward_001', $referral->qualification_payment_id);
        $this->assertSame(29980, (int) $referrer->wallet_balance);

        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $referrer->id,
            'amount' => 19980,
            'type' => 'reward',
            'reference_type' => 'referral_reward',
            'reference_id' => (string) $referral->id,
            'idempotency_key' => 'ref_reward_'.$referral->id.'_pay_ref_reward_001',
        ]);
    }

    public function test_subscription_charged_event_marks_referral_as_qualified_when_reward_is_zero(): void
    {
        config([
            'services.razorpay.key' => 'rzp_test_key',
            'services.razorpay.secret' => 'rzp_test_secret',
            'services.razorpay.webhook_secret' => 'whsec_test',
            'services.razorpay.referral_reward_monthly_percent' => 20,
        ]);

        $referrer = User::factory()->create([
            'wallet_balance' => 5000,
            'referral_code' => 'SMS_QUAL1234',
        ]);

        $referee = User::factory()->create([
            'referred_by_id' => $referrer->id,
        ]);

        $referral = Referral::query()->create([
            'referrer_id' => $referrer->id,
            'referee_id' => $referee->id,
            'status' => 'captured',
        ]);

        Subscription::query()->create([
            'user_id' => $referee->id,
            'name' => 'creator',
            'razorpay_id' => 'sub_ref_qual_001',
            'razorpay_plan_id' => 'plan_creator_test',
            'status' => 'created',
            'ends_at' => null,
        ]);

        $payload = [
            'event' => 'subscription.charged',
            'event_id' => 'evt_ref_qual_001',
            'payload' => [
                'subscription' => [
                    'entity' => [
                        'id' => 'sub_ref_qual_001',
                        'current_end' => now()->addDays(30)->timestamp,
                    ],
                ],
                'payment' => [
                    'entity' => [
                        'id' => 'pay_ref_qual_001',
                        'amount' => 0,
                    ],
                ],
            ],
        ];

        $request = Request::create(
            '/api/webhooks/razorpay',
            'POST',
            [],
            [],
            [],
            [
                'HTTP_X_RAZORPAY_SIGNATURE' => 'valid_signature_for_test',
                'CONTENT_TYPE' => 'application/json',
            ],
            json_encode($payload, JSON_THROW_ON_ERROR)
        );

        $controller = new class extends WebhookController
        {
            protected function verifyWebhookSignature(Api $api, string $eventPayload, string $signature, string $webhookSecret): void
            {
                // Bypass external SDK verification for deterministic unit-level coverage.
            }
        };

        $response = $controller->handle($request);

        $this->assertSame(200, $response->status());
        $this->assertSame('success', $response->getData(true)['status'] ?? null);

        $referrer->refresh();
        $referral->refresh();

        $this->assertSame('qualified', $referral->status);
        $this->assertSame('pay_ref_qual_001', $referral->qualification_payment_id);
        $this->assertSame(5000, (int) $referrer->wallet_balance);
        $this->assertFalse(
            WalletTransaction::query()
                ->where('idempotency_key', 'ref_reward_'.$referral->id.'_pay_ref_qual_001')
                ->exists()
        );
    }
}
