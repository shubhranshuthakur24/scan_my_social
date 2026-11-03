<?php

namespace Tests\Feature;

use App\Http\Middleware\CaptureReferralMiddleware;
use App\Models\PayoutRequest;
use App\Models\Referral;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\RazorpayXService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class ReferralTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_registration_uses_referral_cookie_when_referral_field_not_present(): void
    {
        $referrer = User::factory()->create([
            'referral_code' => 'SMS_REF12345',
        ]);

        $response = $this
            ->withCookie('sms_referral_code', 'sms_ref12345')
            ->post(route('register'), [
                'name' => 'Referral Cookie User',
                'email' => 'cookie.referral@example.com',
                'password' => 'Strong@Pass1',
                'password_confirmation' => 'Strong@Pass1',
                'referral_code_present' => false,
            ]);

        $response->assertRedirect(route('dashboard', absolute: false));

        $registeredUser = User::query()->where('email', 'cookie.referral@example.com')->firstOrFail();
        $this->assertSame($referrer->id, $registeredUser->referred_by_id);

        $this->assertDatabaseHas('referrals', [
            'referrer_id' => $referrer->id,
            'referee_id' => $registeredUser->id,
            'status' => 'captured',
        ]);
    }

    public function test_referral_capture_cookie_is_overwritten_by_latest_ref_query_value(): void
    {
        $request = Request::create('/?ref=aff_kamaao_2528', 'GET', [
            'ref' => 'aff_kamaao_2528',
        ]);
        $request->cookies->set('sms_referral_code', 'SMS_OLD123');

        $middleware = new CaptureReferralMiddleware;
        $response = $middleware->handle($request, fn () => response('ok', 200));

        $cookie = collect($response->headers->getCookies())
            ->first(fn ($item) => $item->getName() === 'sms_referral_code');

        $this->assertNotNull($cookie);
        $this->assertSame('AFF_KAMAAO_2528', $cookie->getValue());
    }

    public function test_registration_with_affiliate_code_sets_affiliate_type_immediately(): void
    {
        $affiliateReferrer = User::factory()->create([
            'affiliate_code' => 'AFF_KAMAAO_2528',
            'affiliate_status' => 'approved',
        ]);

        $response = $this
            ->withCookie('sms_referral_code', 'aff_kamaao_2528')
            ->post(route('register'), [
                'name' => 'Affiliate Cookie User',
                'email' => 'affiliate.cookie@example.com',
                'password' => 'Strong@Pass1',
                'password_confirmation' => 'Strong@Pass1',
                'referral_code_present' => false,
            ]);

        $response->assertRedirect(route('dashboard', absolute: false));

        $registeredUser = User::query()->where('email', 'affiliate.cookie@example.com')->firstOrFail();
        $this->assertSame($affiliateReferrer->id, $registeredUser->referred_by_id);

        $this->assertDatabaseHas('referrals', [
            'referrer_id' => $affiliateReferrer->id,
            'referee_id' => $registeredUser->id,
            'status' => 'captured',
            'type' => 'affiliate',
            'is_recurring' => true,
        ]);
    }

    public function test_registration_with_explicit_empty_referral_field_does_not_fallback_to_cookie(): void
    {
        User::factory()->create([
            'referral_code' => 'SMS_REF67890',
        ]);

        $response = $this
            ->withCookie('sms_referral_code', 'SMS_REF67890')
            ->post(route('register'), [
                'name' => 'No Referral User',
                'email' => 'no.referral@example.com',
                'password' => 'Strong@Pass1',
                'password_confirmation' => 'Strong@Pass1',
                'referral_code_present' => true,
                'referral_code' => '',
            ]);

        $response->assertRedirect(route('dashboard', absolute: false));

        $registeredUser = User::query()->where('email', 'no.referral@example.com')->firstOrFail();
        $this->assertNull($registeredUser->referred_by_id);
        $this->assertDatabaseMissing('referrals', [
            'referee_id' => $registeredUser->id,
        ]);
    }

    public function test_user_cannot_request_payout_above_available_balance_when_pending_requests_exist(): void
    {
        $user = User::factory()->create([
            'wallet_balance' => 100000,
        ]);

        PayoutRequest::query()->create([
            'user_id' => $user->id,
            'amount' => 80000,
            'status' => 'pending',
            'bank_details' => [
                'account_name' => 'Existing Pending',
                'account_number' => '1234567890',
                'ifsc' => 'HDFC0001234',
            ],
        ]);

        $response = $this->actingAs($user)->from(route('referrals'))->post(route('referrals.request_payout'), [
            'amount' => 30000,
            'bank_details' => [
                'account_name' => 'New Request',
                'account_number' => '0987654321',
                'ifsc' => 'SBIN0001234',
            ],
        ]);

        $response->assertRedirect(route('referrals'));
        $response->assertSessionHasErrors('amount');

        $this->assertSame(1, PayoutRequest::query()->where('user_id', $user->id)->count());
    }

    public function test_affiliate_dashboard_shows_referred_users_with_masked_emails(): void
    {
        $affiliate = User::factory()->create([
            'affiliate_status' => 'approved',
            'affiliate_code' => 'AFF_OWNER',
        ]);
        $referredUser = User::factory()->create([
            'name' => 'Ravi Buyer',
            'email' => 'ravi.buyer@example.com',
        ]);
        $otherAffiliate = User::factory()->create([
            'affiliate_status' => 'approved',
            'affiliate_code' => 'AFF_OTHER',
        ]);
        $otherReferredUser = User::factory()->create([
            'name' => 'Other Buyer',
            'email' => 'other.buyer@example.com',
        ]);

        Referral::query()->create([
            'referrer_id' => $affiliate->id,
            'referee_id' => $referredUser->id,
            'status' => 'captured',
            'type' => 'affiliate',
        ]);
        Referral::query()->create([
            'referrer_id' => $otherAffiliate->id,
            'referee_id' => $otherReferredUser->id,
            'status' => 'captured',
            'type' => 'affiliate',
        ]);

        $response = $this->actingAs($affiliate)->get(route('affiliate'));

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Affiliate/Dashboard')
                ->has('referredUsers', 1)
                ->where('referredUsers.0.name', 'Ravi Buyer')
                ->where('referredUsers.0.email', 'ra***@example.com')
                ->where('referredUsers.0.status', 'captured')
            );

        $response->assertDontSee('ravi.buyer@example.com');
        $response->assertDontSee('Other Buyer');
        $response->assertDontSee('other.buyer@example.com');
    }

    public function test_marking_payout_as_paid_debits_wallet_and_creates_ledger_entry(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $user = User::factory()->create([
            'wallet_balance' => 120000,
        ]);

        $payout = PayoutRequest::query()->create([
            'user_id' => $user->id,
            'amount' => 50000,
            'status' => 'pending',
            'bank_details' => [
                'account_name' => 'Payout User',
                'account_number' => '111122223333',
                'ifsc' => 'ICIC0001234',
            ],
        ]);

        $mock = Mockery::mock(RazorpayXService::class);
        $mock->shouldReceive('createPayout')
            ->once()
            ->andReturn([
                'payout_id' => 'pout_referral_test_123',
                'fund_account_id' => 'fa_referral_test_456',
            ]);
        $this->app->instance(RazorpayXService::class, $mock);
        $response = $this->actingAs($admin)->patch(route('admin.payouts.update-status', $payout), [
            'status' => 'approved',
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $payout->refresh();
        $user->refresh();

        $this->assertSame('processing', $payout->status);
        $this->assertSame(70000, (int) $user->wallet_balance);

        $this->assertDatabaseHas('wallet_transactions', [
            'user_id' => $user->id,
            'amount' => -50000,
            'type' => 'redeem_bank',
            'reference_type' => 'payout',
            'reference_id' => (string) $payout->id,
            'idempotency_key' => 'redeem_bank_'.$payout->id,
        ]);
    }

    public function test_cannot_mark_payout_as_paid_when_wallet_balance_is_insufficient(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $user = User::factory()->create([
            'wallet_balance' => 10000,
        ]);

        $payout = PayoutRequest::query()->create([
            'user_id' => $user->id,
            'amount' => 50000,
            'status' => 'pending',
            'bank_details' => [
                'account_name' => 'Low Balance User',
                'account_number' => '999900001111',
                'ifsc' => 'UTIB0001234',
            ],
        ]);

        $response = $this->actingAs($admin)->from(route('admin.payouts.index'))->patch(route('admin.payouts.update-status', $payout), [
            'status' => 'approved',
        ]);

        $response->assertRedirect(route('admin.payouts.index'));
        $response->assertSessionHasErrors('status');

        $payout->refresh();
        $user->refresh();

        $this->assertSame('pending', $payout->status);
        $this->assertSame(10000, (int) $user->wallet_balance);
        $this->assertSame(0, WalletTransaction::query()->where('idempotency_key', 'redeem_bank_'.$payout->id)->count());
    }
}
