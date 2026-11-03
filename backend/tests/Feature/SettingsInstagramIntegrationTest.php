<?php

namespace Tests\Feature;

use App\Models\InstagramAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SettingsInstagramIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_integration_exposes_linked_account_count_and_profile_urls(): void
    {
        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'creator',
            'status' => 'active',
            'razorpay_id' => 'sub-settings-creator',
            'razorpay_plan_id' => 'plan_settings_creator',
        ]);

        $activeAccount = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-settings-active-1',
            'fb_page_id' => 'page-settings-active-1',
            'username' => 'activecreator',
            'profile_url' => 'https://www.instagram.com/activecreator/',
            'access_token' => 'token-settings-active-1',
            'status' => 'active',
        ]);

        InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-settings-disconnected-1',
            'fb_page_id' => 'page-settings-disconnected-1',
            'username' => 'backupcreator',
            'profile_url' => 'https://www.instagram.com/backupcreator/',
            'access_token' => 'token-settings-disconnected-1',
            'status' => 'disconnected',
        ]);

        Cache::put("autodm:live-profile-picture-url:{$activeAccount->id}", 'https://cdn.example.com/activecreator.jpg', now()->addMinutes(15));

        $response = $this->actingAs($user)->get(route('settings'));

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Settings/Index')
            ->where('instagramLimitMeta.connectedCount', 2)
            ->where('instagramLimitMeta.accountLimit', 5)
            ->has('instagramAccounts', 2)
            ->where('instagramAccounts.0.profile_url', 'https://www.instagram.com/activecreator/')
            ->where('instagramAccounts.0.profile_picture_url', 'https://cdn.example.com/activecreator.jpg')
            ->where('instagramAccounts.1.profile_url', 'https://www.instagram.com/backupcreator/')
        );
    }

    public function test_user_can_enable_welcome_dm_for_owned_instagram_account(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-settings-welcome-1',
            'fb_page_id' => 'page-settings-welcome-1',
            'username' => 'welcometest',
            'access_token' => 'token-settings-welcome-1',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->patch(route('settings.integrations.welcome-dm.update', $account), [
            'enabled' => true,
            'variants' => [
                'Welcome to our inbox!',
                'Hey there, thanks for messaging us.',
                'Hi! We got your DM and will help you shortly.',
            ],
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('instagram_accounts', [
            'id' => $account->id,
            'welcome_dm_enabled' => true,
        ]);
    }

    public function test_user_cannot_update_welcome_dm_for_foreign_instagram_account(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $foreignAccount = InstagramAccount::create([
            'user_id' => $owner->id,
            'ig_account_id' => 'ig-settings-foreign-1',
            'fb_page_id' => 'page-settings-foreign-1',
            'username' => 'foreignuser',
            'access_token' => 'token-settings-foreign-1',
            'status' => 'active',
        ]);

        $this->actingAs($intruder)->patch(route('settings.integrations.welcome-dm.update', $foreignAccount), [
            'enabled' => true,
            'variants' => [
                'A',
                'B',
                'C',
            ],
        ])->assertForbidden();

        $this->assertDatabaseHas('instagram_accounts', [
            'id' => $foreignAccount->id,
            'welcome_dm_enabled' => false,
        ]);
    }

    public function test_user_can_disconnect_owned_instagram_account(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-settings-disconnect-1',
            'fb_page_id' => 'page-settings-disconnect-1',
            'username' => 'disconnectme',
            'access_token' => 'token-settings-disconnect-1',
            'token_expires_at' => now()->addDays(30),
            'long_lived_exchange_failed_at' => now()->subDay(),
            'status' => 'active',
            'webhook_subscriptions_status' => 'synced',
            'webhook_subscriptions_last_synced_at' => now(),
            'webhook_subscriptions_error' => 'old error',
            'welcome_dm_enabled' => true,
            'welcome_dm_variants' => [
                'First welcome message.',
                'Second welcome message.',
                'Third welcome message.',
            ],
        ]);

        Cache::put("autodm:live-profile-picture-url:{$account->id}", 'https://cdn.example.com/disconnectme.jpg', now()->addMinutes(15));

        $response = $this->actingAs($user)->patch(route('social-integrations.instagram.disconnect', $account));

        $response->assertRedirect();

        $this->assertDatabaseHas('instagram_accounts', [
            'id' => $account->id,
            'status' => 'disconnected',
            'access_token' => null,
            'token_expires_at' => null,
            'long_lived_exchange_failed_at' => null,
            'webhook_subscriptions_status' => null,
            'webhook_subscriptions_last_synced_at' => null,
            'webhook_subscriptions_error' => null,
            'welcome_dm_enabled' => false,
        ]);
        $this->assertNull(DB::table('instagram_accounts')->where('id', $account->id)->value('access_token'));
        $this->assertFalse(Cache::has("autodm:live-profile-picture-url:{$account->id}"));
    }

    public function test_user_cannot_disconnect_foreign_instagram_account(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $foreignAccount = InstagramAccount::create([
            'user_id' => $owner->id,
            'ig_account_id' => 'ig-settings-foreign-disconnect-1',
            'fb_page_id' => 'page-settings-foreign-disconnect-1',
            'username' => 'foreign_disconnect',
            'access_token' => 'token-settings-foreign-disconnect-1',
            'status' => 'active',
        ]);

        $this->actingAs($intruder)
            ->patch(route('social-integrations.instagram.disconnect', $foreignAccount))
            ->assertForbidden();

        $this->assertDatabaseHas('instagram_accounts', [
            'id' => $foreignAccount->id,
            'status' => 'active',
        ]);
    }
}
