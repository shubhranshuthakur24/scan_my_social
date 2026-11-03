<?php

namespace Tests\Feature;

use App\Models\InstagramAccount;
use App\Models\MetaDataDeletionRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MetaPlatformCallbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_deauthorize_callback_disconnects_matching_instagram_account(): void
    {
        config()->set('services.meta.app_secret', 'test-meta-secret');

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-meta-user-1',
            'fb_page_id' => 'page-meta-user-1',
            'username' => 'metadisconnect',
            'access_token' => 'token-meta-disconnect',
            'token_expires_at' => now()->addDays(20),
            'long_lived_exchange_failed_at' => now()->subDay(),
            'status' => 'active',
            'webhook_subscriptions_status' => 'synced',
            'webhook_subscriptions_last_synced_at' => now(),
            'webhook_subscriptions_error' => 'old error',
            'welcome_dm_enabled' => true,
        ]);

        $response = $this->postJson(route('meta.deauthorize'), [
            'signed_request' => $this->signedRequest([
                'algorithm' => 'HMAC-SHA256',
                'user_id' => 'ig-meta-user-1',
            ]),
        ]);

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('instagram_accounts', [
            'id' => $account->id,
            'access_token' => null,
            'status' => 'disconnected',
            'token_expires_at' => null,
            'long_lived_exchange_failed_at' => null,
            'webhook_subscriptions_status' => null,
            'webhook_subscriptions_last_synced_at' => null,
            'webhook_subscriptions_error' => null,
            'welcome_dm_enabled' => false,
        ]);
        $this->assertNull(DB::table('instagram_accounts')->where('id', $account->id)->value('access_token'));
    }

    public function test_data_deletion_callback_returns_confirmation_and_records_status(): void
    {
        config()->set('services.meta.app_secret', 'test-meta-secret');

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-meta-delete-1',
            'fb_page_id' => 'page-meta-delete-1',
            'username' => 'metadelete',
            'access_token' => 'token-meta-delete',
            'status' => 'active',
            'welcome_dm_enabled' => true,
        ]);

        $response = $this->postJson(route('meta.data-deletion'), [
            'signed_request' => $this->signedRequest([
                'algorithm' => 'HMAC-SHA256',
                'user_id' => 'ig-meta-delete-1',
            ]),
        ]);

        $response->assertOk()
            ->assertJsonStructure(['url', 'confirmation_code']);

        $confirmationCode = (string) $response->json('confirmation_code');

        $this->assertDatabaseHas('instagram_accounts', [
            'id' => $account->id,
            'access_token' => null,
            'status' => 'disconnected',
            'welcome_dm_enabled' => false,
        ]);
        $this->assertDatabaseHas('meta_data_deletion_requests', [
            'confirmation_code' => $confirmationCode,
            'provider' => 'meta',
            'provider_user_id' => 'ig-meta-delete-1',
            'status' => 'processed',
        ]);

        $statusResponse = $this->getJson(route('meta.data-deletion.status', $confirmationCode));

        $statusResponse->assertOk()
            ->assertJson([
                'confirmation_code' => $confirmationCode,
                'status' => 'processed',
            ]);
    }

    public function test_meta_callbacks_reject_invalid_signed_request(): void
    {
        config()->set('services.meta.app_secret', 'test-meta-secret');

        $response = $this->postJson(route('meta.deauthorize'), [
            'signed_request' => 'bad.signature',
        ]);

        $response->assertBadRequest();
        $this->assertSame(0, MetaDataDeletionRequest::query()->count());
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function signedRequest(array $payload): string
    {
        $encodedPayload = $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', $encodedPayload, 'test-meta-secret', true);

        return $this->base64UrlEncode($signature).'.'.$encodedPayload;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
