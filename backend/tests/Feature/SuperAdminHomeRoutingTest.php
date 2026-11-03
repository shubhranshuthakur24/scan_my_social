<?php

namespace Tests\Feature;

use App\Models\AdminNotificationLog;
use App\Models\Channel;
use App\Models\PayoutRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminHomeRoutingTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_access_standard_dashboard(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Dashboard'));
    }

    public function test_super_admin_can_view_admin_home_with_stats(): void
    {
        $admin = User::factory()->superAdmin()->create();

        Channel::query()->create([
            'handle' => 'failed_creator',
            'name' => 'Failed Creator',
            'platform' => 'instagram',
            'apify_profile_run_status' => 'FAILED',
            'apify_post_run_status' => 'SUCCEEDED',
        ]);
        Channel::query()->create([
            'handle' => 'healthy_creator',
            'name' => 'Healthy Creator',
            'platform' => 'instagram',
            'apify_profile_run_status' => 'SUCCEEDED',
            'apify_post_run_status' => 'SUCCEEDED',
        ]);

        PayoutRequest::query()->create([
            'user_id' => $admin->id,
            'amount' => 10000,
            'status' => 'pending',
        ]);
        PayoutRequest::query()->create([
            'user_id' => $admin->id,
            'amount' => 5000,
            'status' => 'paid',
        ]);

        AdminNotificationLog::query()->create([
            'admin_id' => $admin->id,
            'target_type' => 'all',
            'target_filter' => null,
            'recipient_count' => 12,
            'title' => 'System update',
            'message' => 'We shipped a new version.',
            'type' => 'info',
        ]);

        $response = $this->actingAs($admin)->get(route('admin.home'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Home')
            ->where('adminStats.channels_monitored', 2)
            ->where('adminStats.failed_scrapes', 1)
            ->where('adminStats.pending_payouts', 1)
            ->where('adminStats.notifications_sent', 1)
        );
    }

    public function test_regular_user_cannot_access_admin_home(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('admin.home'));

        $response->assertForbidden();
    }

    public function test_regular_user_still_sees_standard_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Dashboard'));
    }
}
