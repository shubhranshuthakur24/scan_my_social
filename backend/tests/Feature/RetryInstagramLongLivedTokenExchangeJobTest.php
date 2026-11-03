<?php

namespace Tests\Feature;

use App\Jobs\RetryInstagramLongLivedTokenExchangeJob;
use App\Models\AutomationFlow;
use App\Models\InstagramAccount;
use App\Models\User;
use App\Services\MetaApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class RetryInstagramLongLivedTokenExchangeJobTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_retry_job_upgrades_short_lived_token_to_long_lived_token(): void
    {
        $this->travelTo(now()->setTime(4, 0));

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-retry-upgrade',
            'fb_page_id' => 'page-retry-upgrade',
            'username' => 'retryupgrade',
            'access_token' => 'short-token',
            'token_type' => InstagramAccount::TOKEN_TYPE_SHORT_LIVED,
            'token_expires_at' => now()->addMinutes(45),
            'long_lived_exchange_failed_at' => now()->subMinute(),
            'status' => 'active',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('getLongLivedToken')
            ->once()
            ->with('short-token')
            ->andReturn('long-token');

        (new RetryInstagramLongLivedTokenExchangeJob((int) $account->id))->handle($service);

        $account->refresh();
        $this->assertSame('long-token', $account->access_token);
        $this->assertSame(InstagramAccount::TOKEN_TYPE_LONG_LIVED, $account->token_type);
        $this->assertTrue($account->token_expires_at->equalTo(now()->addDays(60)));
        $this->assertNull($account->long_lived_exchange_failed_at);
        $this->assertSame('active', $account->status);

        $this->travelBack();
    }

    public function test_retry_job_disconnects_account_and_pauses_flows_when_short_token_is_expired(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-retry-expired',
            'fb_page_id' => 'page-retry-expired',
            'username' => 'retryexpired',
            'access_token' => 'expired-short-token',
            'token_type' => InstagramAccount::TOKEN_TYPE_SHORT_LIVED,
            'token_expires_at' => now()->subMinute(),
            'long_lived_exchange_failed_at' => now()->subHour(),
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Expired short token flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-expired',
            'keywords' => ['price'],
            'status' => 'active',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldNotReceive('getLongLivedToken');

        (new RetryInstagramLongLivedTokenExchangeJob((int) $account->id))->handle($service);

        $account->refresh();
        $flow->refresh();

        $this->assertSame('disconnected', $account->status);
        $this->assertSame('failed', $account->webhook_subscriptions_status);
        $this->assertStringStartsWith('short_lived_token_expired:', (string) $account->webhook_subscriptions_error);
        $this->assertSame('paused', $flow->status);
    }
}
