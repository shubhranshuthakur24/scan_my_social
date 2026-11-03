<?php

namespace Tests\Feature;

use App\Models\PayoutRequest;
use App\Models\User;
use App\Services\RazorpayXService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AdminPayoutTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->superAdmin()->create();
        $this->user = User::factory()->create([
            'wallet_balance' => 100000, // ₹1000 in paisa
        ]);
    }

    public function test_admin_can_reject_pending_payout(): void
    {
        $payout = PayoutRequest::create([
            'user_id' => $this->user->id,
            'amount' => 50000,
            'status' => 'pending',
            'bank_details' => [
                'account_name' => 'Test User',
                'account_number' => '1234567890',
                'ifsc' => 'HDFC0000001',
            ],
        ]);

        $response = $this->actingAs($this->admin)
            ->patch(route('admin.payouts.update-status', $payout->id), [
                'status' => 'rejected',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('payout_requests', [
            'id' => $payout->id,
            'status' => 'rejected',
        ]);

        // Wallet should remain unchanged
        $this->user->refresh();
        $this->assertEquals(100000, $this->user->wallet_balance);
    }

    public function test_admin_can_approve_and_initiate_payout(): void
    {
        $payout = PayoutRequest::create([
            'user_id' => $this->user->id,
            'amount' => 50000,
            'status' => 'pending',
            'bank_details' => [
                'account_name' => 'Test User',
                'account_number' => '1234567890',
                'ifsc' => 'HDFC0000001',
            ],
        ]);

        // Mock the RazorpayX service
        $mock = Mockery::mock(RazorpayXService::class);
        $mock->shouldReceive('createPayout')
            ->once()
            ->andReturn([
                'payout_id' => 'pout_test_123',
                'fund_account_id' => 'fa_test_456',
            ]);
        $this->app->instance(RazorpayXService::class, $mock);

        $response = $this->actingAs($this->admin)
            ->patch(route('admin.payouts.update-status', $payout->id), [
                'status' => 'approved',
            ]);

        $response->assertRedirect();

        // Payout should be marked as PROCESSING with razorpay details
        $this->assertDatabaseHas('payout_requests', [
            'id' => $payout->id,
            'status' => 'processing',
            'razorpay_payout_id' => 'pout_test_123',
            'razorpay_fund_account_id' => 'fa_test_456',
            'razorpay_status' => 'initiated',
        ]);

        // Wallet should be deducted
        $this->user->refresh();
        $this->assertEquals(50000, $this->user->wallet_balance);
    }

    public function test_webhook_progresses_status_to_paid(): void
    {
        config(['services.razorpay.webhook_secret' => 'test_secret']);

        $payout = PayoutRequest::create([
            'user_id' => $this->user->id,
            'amount' => 50000,
            'status' => 'processing',
            'razorpay_payout_id' => 'pout_test_123',
            'bank_details' => [
                'account_name' => 'Test User',
                'account_number' => '1234567890',
                'ifsc' => 'HDFC0000001',
            ],
        ]);

        $payload = [
            'event' => 'payout.processed',
            'payload' => [
                'payout' => [
                    'entity' => [
                        'id' => 'pout_test_123',
                        'status' => 'processed',
                    ],
                ],
            ],
        ];

        $signature = hash_hmac('sha256', json_encode($payload), 'test_secret');

        $response = $this->postJson('api/webhooks/razorpay/payouts', $payload, [
            'X-Razorpay-Signature' => $signature,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('payout_requests', [
            'id' => $payout->id,
            'status' => 'paid',
            'razorpay_status' => 'processed',
        ]);
    }

    public function test_webhook_handles_failure_and_refunds_wallet(): void
    {
        config(['services.razorpay.webhook_secret' => 'test_secret']);

        // Set initial wallet balance
        $this->user->update(['wallet_balance' => 50000]); // Deducted already

        $payout = PayoutRequest::create([
            'user_id' => $this->user->id,
            'amount' => 50000,
            'status' => 'processing',
            'razorpay_payout_id' => 'pout_test_123',
            'bank_details' => [
                'account_name' => 'Test User',
                'account_number' => '1234567890',
                'ifsc' => 'HDFC0000001',
            ],
        ]);

        $payload = [
            'event' => 'payout.failed',
            'payload' => [
                'payout' => [
                    'entity' => [
                        'id' => 'pout_test_123',
                        'status' => 'failed',
                        'failure_reason' => 'Invalid account number',
                    ],
                ],
            ],
        ];

        $signature = hash_hmac('sha256', json_encode($payload), 'test_secret');

        $response = $this->postJson('api/webhooks/razorpay/payouts', $payload, [
            'X-Razorpay-Signature' => $signature,
        ]);

        $response->assertStatus(200);

        // Status should be failed
        $this->assertDatabaseHas('payout_requests', [
            'id' => $payout->id,
            'status' => 'failed',
            'razorpay_status' => 'failed',
        ]);

        // Wallet should be refunded
        $this->user->refresh();
        $this->assertEquals(100000, $this->user->wallet_balance);

        // Transaction should exist
        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $this->user->id,
            'amount' => 50000,
            'type' => 'refund',
        ]);
    }

    public function test_admin_payout_initiation_failure_rolls_back_wallet_and_marks_failed(): void
    {
        $payout = PayoutRequest::create([
            'user_id' => $this->user->id,
            'amount' => 50000,
            'status' => 'pending',
            'bank_details' => [
                'account_name' => 'Test User',
                'account_number' => '1234567890',
                'ifsc' => 'HDFC0000001',
            ],
        ]);

        $mock = Mockery::mock(RazorpayXService::class);
        $mock->shouldReceive('createPayout')
            ->once()
            ->andThrow(new \Exception('RazorpayX API unavailable'));
        $this->app->instance(RazorpayXService::class, $mock);

        $response = $this->actingAs($this->admin)
            ->patch(route('admin.payouts.update-status', $payout->id), [
                'status' => 'approved',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');

        $payout->refresh();
        $this->user->refresh();

        $this->assertSame('failed', $payout->status);
        $this->assertSame('initiation_failed', $payout->razorpay_status);
        $this->assertStringContainsString('RazorpayX API unavailable', (string) $payout->razorpay_error);
        $this->assertEquals(100000, $this->user->wallet_balance);

        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $this->user->id,
            'amount' => 50000,
            'type' => 'refund',
            'idempotency_key' => 'redeem_bank_rollback_'.$payout->id,
        ]);
    }
}
