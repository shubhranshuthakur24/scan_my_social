<?php

namespace Tests\Feature;

use App\Models\AutodmReminderEvent;
use App\Models\AutomationFlow;
use App\Models\InstagramAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AutoDmReminderAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_exposes_reminder_analytics_totals_and_per_flow_metrics(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-reminder-analytics-1',
            'fb_page_id' => 'page-reminder-analytics-1',
            'access_token' => 'token-reminder-analytics',
            'status' => 'active',
        ]);

        Cache::put("autodm:live-profile-picture-url:{$account->id}", null, now()->addMinutes(15));

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Reminder Analytics Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-reminder-analytics-1',
            'keywords' => ['price'],
            'status' => 'active',
        ]);

        AutodmReminderEvent::create([
            'automation_flow_id' => $flow->id,
            'status' => 'scheduled',
            'scheduled_for' => now()->addHours(20),
            'clicks_count' => 0,
        ]);
        AutodmReminderEvent::create([
            'automation_flow_id' => $flow->id,
            'status' => 'scheduled',
            'scheduled_for' => now()->addHours(21),
            'clicks_count' => 0,
        ]);
        AutodmReminderEvent::create([
            'automation_flow_id' => $flow->id,
            'status' => 'sent',
            'processed_at' => now()->subHour(),
            'clicks_count' => 4,
        ]);
        AutodmReminderEvent::create([
            'automation_flow_id' => $flow->id,
            'status' => 'skipped_window',
            'processed_at' => now()->subHours(2),
            'clicks_count' => 1,
        ]);

        $response = $this->actingAs($user)->get(route('autodm.index'));

        $response->assertInertia(fn (Assert $page) => $page
            ->component('AutoDM/Index')
            ->where('performance.reminder_scheduled', 2)
            ->where('performance.reminder_sent', 1)
            ->where('performance.reminder_skipped_window', 1)
            ->where('performance.reminder_clicked', 5)
            ->where('flows.0.id', $flow->id)
            ->where('flows.0.reminder_metrics.scheduled', 2)
            ->where('flows.0.reminder_metrics.sent', 1)
            ->where('flows.0.reminder_metrics.skipped_window', 1)
            ->where('flows.0.reminder_metrics.clicked', 5)
        );
    }

    public function test_index_defaults_reminder_metrics_to_zero_when_no_events_exist(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-reminder-analytics-2',
            'fb_page_id' => 'page-reminder-analytics-2',
            'access_token' => 'token-reminder-analytics-2',
            'status' => 'active',
        ]);

        Cache::put("autodm:live-profile-picture-url:{$account->id}", null, now()->addMinutes(15));

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'No Reminder Events Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-reminder-analytics-2',
            'keywords' => ['info'],
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->get(route('autodm.index'));

        $response->assertInertia(fn (Assert $page) => $page
            ->component('AutoDM/Index')
            ->where('performance.reminder_scheduled', 0)
            ->where('performance.reminder_sent', 0)
            ->where('performance.reminder_skipped_window', 0)
            ->where('performance.reminder_clicked', 0)
            ->where('flows.0.id', $flow->id)
            ->where('flows.0.reminder_metrics.scheduled', 0)
            ->where('flows.0.reminder_metrics.sent', 0)
            ->where('flows.0.reminder_metrics.skipped_window', 0)
            ->where('flows.0.reminder_metrics.clicked', 0)
        );
    }

    public function test_index_exposes_disconnect_toast_payload_for_invalid_token_disconnects(): void
    {
        $user = User::factory()->create();

        InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-disconnected-1',
            'fb_page_id' => 'page-disconnected-1',
            'username' => 'recoverme',
            'access_token' => 'token-disconnected-1',
            'status' => 'disconnected',
            'webhook_subscriptions_error' => 'invalid_token_190_0: session invalidated',
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($user)->get(route('autodm.index'));

        $response->assertInertia(fn (Assert $page) => $page
            ->component('AutoDM/Index')
            ->where('disconnectToast.account_id', fn ($value) => is_int($value) && $value > 0)
            ->where('disconnectToast.message', 'Instagram account @recoverme disconnected. Reconnect to resume AutoDM flows.')
        );
    }
}
