<?php

namespace Tests\Feature;

use App\Models\AutomationFlow;
use App\Models\InstagramAccount;
use App\Models\User;
use App\Services\MetaApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InstagramAccountSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_access_token_is_encrypted_at_rest_and_hidden_from_serialization(): void
    {
        $user = User::factory()->create();
        $plainToken = 'ig-long-lived-token';

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-123',
            'fb_page_id' => 'page-123',
            'username' => 'creator',
            'access_token' => $plainToken,
            'status' => 'active',
        ]);

        $storedToken = DB::table('instagram_accounts')
            ->where('id', $account->id)
            ->value('access_token');

        $this->assertIsString($storedToken);
        $this->assertNotSame($plainToken, $storedToken);

        $fresh = InstagramAccount::findOrFail($account->id);

        $this->assertSame($plainToken, $fresh->access_token);
        $this->assertArrayNotHasKey('access_token', $fresh->toArray());
    }

    public function test_invalid_token_disconnects_account_and_pauses_active_flows(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-777',
            'fb_page_id' => 'page-777',
            'username' => 'creator777',
            'access_token' => 'token-777',
            'status' => 'active',
        ]);

        $activeFlow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Active Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media_1',
            'status' => 'active',
        ]);

        $pausedFlow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Paused Flow',
            'trigger_type' => 'reel',
            'trigger_value' => 'media_2',
            'status' => 'paused',
        ]);

        Http::fake([
            'https://graph.instagram.com/*' => Http::response([
                'error' => [
                    'message' => 'Error validating access token: session invalidated.',
                    'type' => 'OAuthException',
                    'code' => 190,
                    'error_subcode' => 0,
                ],
            ], 400),
        ]);

        $service = app(MetaApiService::class);
        $accounts = $service->fetchInstagramAccountsFromToken('token-777', (int) $account->id);

        $this->assertSame([], $accounts);

        $account->refresh();
        $this->assertSame('disconnected', $account->status);
        $this->assertSame('failed', $account->webhook_subscriptions_status);
        $this->assertStringContainsString('invalid_token_190_0', (string) $account->webhook_subscriptions_error);

        $this->assertDatabaseHas('automation_flows', [
            'id' => $activeFlow->id,
            'status' => 'paused',
        ]);

        $this->assertDatabaseHas('automation_flows', [
            'id' => $pausedFlow->id,
            'status' => 'paused',
        ]);
    }
}
