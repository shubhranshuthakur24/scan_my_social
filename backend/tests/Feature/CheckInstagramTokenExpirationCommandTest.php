<?php

namespace Tests\Feature;

use App\Models\InstagramAccount;
use App\Models\User;
use App\Notifications\AppNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CheckInstagramTokenExpirationCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_alerts_users_whose_tokens_are_expiring_soon(): void
    {
        Notification::fake();
        Cache::clear();

        // 1. Create a user and an account expiring in 3 days
        $user1 = User::factory()->create();
        $account1 = InstagramAccount::create([
            'user_id' => $user1->id,
            'ig_account_id' => '111111',
            'fb_page_id' => 'fb_111111',
            'username' => 'user_one',
            'status' => 'active',
            'token_expires_at' => now()->addDays(3),
            'access_token' => 'token_one',
        ]);

        // 2. Create an account expiring in 10 days (should not alert)
        $user2 = User::factory()->create();
        $account2 = InstagramAccount::create([
            'user_id' => $user2->id,
            'ig_account_id' => '222222',
            'fb_page_id' => 'fb_222222',
            'username' => 'user_two',
            'status' => 'active',
            'token_expires_at' => now()->addDays(10),
            'access_token' => 'token_two',
        ]);

        // 3. Create an account expiring in 2 days but status is inactive/disconnected
        $user3 = User::factory()->create();
        $account3 = InstagramAccount::create([
            'user_id' => $user3->id,
            'ig_account_id' => '333333',
            'fb_page_id' => 'fb_333333',
            'username' => 'user_three',
            'status' => 'disconnected',
            'token_expires_at' => now()->addDays(2),
            'access_token' => 'token_three',
        ]);

        // Run the command
        $this->artisan('instagram:check-tokens')->assertExitCode(0);

        // Assert notification sent to $user1
        Notification::assertSentTo(
            $user1,
            AppNotification::class,
            function (AppNotification $notification) use ($account1) {
                $data = $notification->toArray($account1->user);

                return $data['type'] === 'warning' &&
                       str_contains($data['message'], 'user_one') &&
                       str_contains($data['message'], 'days');
            }
        );

        // Assert no notification sent to $user2 or $user3
        Notification::assertNotSentTo($user2, AppNotification::class);
        Notification::assertNotSentTo($user3, AppNotification::class);
    }

    public function test_command_does_not_spam_alert_frequently(): void
    {
        Notification::fake();
        Cache::clear();

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => '111111',
            'fb_page_id' => 'fb_111111',
            'username' => 'user_one',
            'status' => 'active',
            'token_expires_at' => now()->addDays(5),
            'access_token' => 'token_one',
        ]);

        // Run first time - alerts and caches
        $this->artisan('instagram:check-tokens')->assertExitCode(0);
        Notification::assertSentTo($user, AppNotification::class);

        // Reset fake notification tracking
        Notification::fake();

        // Run second time - should skip because of cache throttle
        $this->artisan('instagram:check-tokens')->assertExitCode(0);
        Notification::assertNotSentTo($user, AppNotification::class);
    }
}
