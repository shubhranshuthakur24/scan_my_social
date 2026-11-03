<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingEventType;
use App\Models\InstagramAccount;
use App\Models\InstagramAccountInsightSnapshot;
use App\Models\InstagramAccountMediaAnalytics;
use App\Models\Lead;
use App\Models\ScheduledPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_page_exposes_balanced_section_payloads_with_owned_metrics_only(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $other = User::factory()->create();

        $userInstagramAccount = InstagramAccount::factory()->for($user)->create(['status' => 'active', 'username' => 'owner.dashboard']);
        $otherInstagramAccount = InstagramAccount::factory()->for($other)->create(['status' => 'active', 'username' => 'other.dashboard']);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($userInstagramAccount, 'instagramAccount')
            ->create([
                'reach' => 320,
                'impressions' => 500,
                'engagement' => 41,
                'posted_at' => now()->subDay(),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($other, 'user')
            ->for($otherInstagramAccount, 'instagramAccount')
            ->create([
                'reach' => 9000,
                'impressions' => 9000,
                'engagement' => 900,
                'posted_at' => now()->subDay(),
            ]);

        InstagramAccountInsightSnapshot::factory()
            ->for($user, 'user')
            ->for($userInstagramAccount, 'instagramAccount')
            ->create([
                'snapshot_date' => now()->subDay()->toDateString(),
                'reach' => 600,
                'impressions' => 900,
                'follower_count' => 1500,
            ]);

        ScheduledPost::factory()
            ->for($user)
            ->for($userInstagramAccount)
            ->create([
                'status' => ScheduledPost::STATUS_SCHEDULED,
                'scheduled_at' => now()->addHours(3),
            ]);

        ScheduledPost::factory()
            ->for($user)
            ->for($userInstagramAccount)
            ->create([
                'status' => ScheduledPost::STATUS_SCHEDULED,
                'scheduled_at' => now()->subHour(),
            ]);

        ScheduledPost::factory()
            ->for($user)
            ->for($userInstagramAccount)
            ->create([
                'status' => ScheduledPost::STATUS_FAILED,
            ]);

        ScheduledPost::factory()
            ->for($other)
            ->for($otherInstagramAccount)
            ->create([
                'status' => ScheduledPost::STATUS_SCHEDULED,
                'scheduled_at' => now()->addHours(1),
            ]);

        Lead::query()->create([
            'user_id' => $user->id,
            'source_type' => Lead::SOURCE_FORM_SUBMISSION,
            'source_id' => 101,
            'source_label' => 'Demo Form',
            'name' => 'New Lead',
            'email' => 'new@example.com',
            'status' => Lead::STATUS_NEW,
            'captured_at' => now()->subHours(8),
        ]);

        Lead::query()->create([
            'user_id' => $user->id,
            'source_type' => Lead::SOURCE_APPOINTMENT_BOOKING,
            'source_id' => 102,
            'source_label' => 'Consulting Call',
            'name' => 'Booked Lead',
            'email' => 'booked@example.com',
            'status' => Lead::STATUS_BOOKED,
            'captured_at' => now()->subHours(5),
        ]);

        Lead::query()->create([
            'user_id' => $other->id,
            'source_type' => Lead::SOURCE_FORM_SUBMISSION,
            'source_id' => 103,
            'source_label' => 'Other Form',
            'name' => 'Other Lead',
            'email' => 'other@example.com',
            'status' => Lead::STATUS_NEW,
            'captured_at' => now()->subHours(2),
        ]);

        $eventType = BookingEventType::factory()->for($user, 'host')->create([
            'name' => 'Strategy Call',
            'is_active' => true,
        ]);

        Booking::factory()
            ->for($eventType, 'eventType')
            ->for($user, 'host')
            ->create([
                'guest_name' => 'Upcoming Guest',
                'status' => Booking::STATUS_CONFIRMED,
                'starts_at' => now()->addDay(),
                'ends_at' => now()->addDay()->addMinutes(30),
            ]);

        Booking::factory()
            ->for($eventType, 'eventType')
            ->for($user, 'host')
            ->create([
                'guest_name' => 'Cancelled Guest',
                'status' => Booking::STATUS_CANCELLED,
                'starts_at' => now()->addDays(2),
                'ends_at' => now()->addDays(2)->addMinutes(30),
                'cancelled_at' => now()->subDay(),
            ]);

        Booking::factory()
            ->for($other, 'host')
            ->create([
                'status' => Booking::STATUS_CONFIRMED,
                'starts_at' => now()->addHours(12),
                'ends_at' => now()->addHours(13),
            ]);

        $user->activities()->create([
            'type' => 'script_generated',
            'description' => 'Created script for launch video',
            'url' => '/scripts',
        ]);

        $other->activities()->create([
            'type' => 'project_created',
            'description' => 'Other user activity',
            'url' => '/projects',
        ]);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('kpi_summary', 6)
                ->where('instagram_overview.has_account', true)
                ->where('instagram_overview.account.username', 'owner.dashboard')
                ->where('instagram_overview.posts', 1)
                ->where('instagram_overview.reach', 600)
                ->where('instagram_overview.impressions', 900)
                ->where('instagram_overview.engagement', 41)
                ->where('scheduler_overview.scheduled', 2)
                ->where('scheduler_overview.failed', 1)
                ->where('scheduler_overview.due_now', 1)
                ->where('crm_funnel.total', 2)
                ->where('crm_funnel.new', 1)
                ->where('crm_funnel.booked', 1)
                ->where('appointments_overview.active_event_types', 1)
                ->where('appointments_overview.upcoming_bookings_count', 1)
                ->has('appointments_overview.next_bookings', 1)
                ->where('recent_activity_overview.last_7_days', 1)
                ->has('recent_activity_overview.items', 1)
            );
    }

    public function test_dashboard_page_falls_back_to_media_impressions_for_legacy_snapshot_rows(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'status' => 'active',
            'username' => 'legacy.dashboard',
        ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'reach' => 320,
                'impressions' => 500,
                'engagement' => 41,
                'posted_at' => now()->subDay(),
            ]);

        InstagramAccountInsightSnapshot::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'snapshot_date' => now()->subDay()->toDateString(),
                'reach' => 600,
                'impressions' => 0,
                'follower_count' => 1500,
                'raw_metrics' => [
                    'data' => [
                        ['name' => 'reach', 'values' => [['value' => 600]]],
                        ['name' => 'profile_views', 'values' => [['value' => 90]]],
                        ['name' => 'follower_count', 'values' => [['value' => 1500]]],
                    ],
                ],
            ]);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('instagram_overview.account.username', 'legacy.dashboard')
                ->where('instagram_overview.reach', 600)
                ->where('instagram_overview.impressions', 500)
                ->where('instagram_overview.engagement', 41)
            );
    }
}
