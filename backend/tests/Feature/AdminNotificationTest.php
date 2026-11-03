<?php

namespace Tests\Feature;

use App\Models\AdminNotificationLog;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\AppNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminNotificationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->superAdmin()->create();
        $this->regularUser = User::factory()->create();
    }

    public function test_super_admin_can_view_notification_page(): void
    {
        $response = $this->actingAs($this->admin)->get(route('admin.notifications.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Notifications')
            ->has('users')
            ->has('plans')
            ->has('logs')
        );
    }

    public function test_regular_user_cannot_access_notification_page(): void
    {
        $response = $this->actingAs($this->regularUser)->get(route('admin.notifications.index'));

        $response->assertForbidden();
    }

    public function test_super_admin_can_send_to_individual_user(): void
    {
        Notification::fake();

        $target = User::factory()->create();

        $response = $this->actingAs($this->admin)->post(route('admin.notifications.send'), [
            'target_type' => 'individual',
            'user_ids' => [$target->id],
            'title' => 'Test Individual',
            'message' => 'Hello individual user!',
            'type' => 'info',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        Notification::assertSentTo($target, AppNotification::class);
        Notification::assertNotSentTo($this->regularUser, AppNotification::class);

        $this->assertDatabaseHas('admin_notifications_log', [
            'admin_id' => $this->admin->id,
            'target_type' => 'individual',
            'recipient_count' => 1,
            'title' => 'Test Individual',
        ]);
    }

    public function test_super_admin_can_send_to_plan_segment(): void
    {
        Notification::fake();

        $proUser = User::factory()->create();
        Subscription::create([
            'user_id' => $proUser->id,
            'name' => 'pro',
            'razorpay_id' => 'sub_test_pro_'.uniqid(),
            'razorpay_plan_id' => 'plan_test_pro',
            'status' => 'active',
        ]);

        $freeUser = User::factory()->create();
        Subscription::create([
            'user_id' => $freeUser->id,
            'name' => 'free',
            'razorpay_id' => 'sub_test_free_'.uniqid(),
            'razorpay_plan_id' => 'plan_test_free',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->admin)->post(route('admin.notifications.send'), [
            'target_type' => 'plan',
            'plan_name' => 'pro',
            'title' => 'Pro Plan Update',
            'message' => 'Exclusive update for Pro users!',
            'type' => 'success',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        Notification::assertSentTo($proUser, AppNotification::class);
        Notification::assertNotSentTo($freeUser, AppNotification::class);

        $this->assertDatabaseHas('admin_notifications_log', [
            'target_type' => 'plan',
            'target_filter' => 'pro',
            'recipient_count' => 1,
        ]);
    }

    public function test_super_admin_can_send_to_all_users(): void
    {
        Notification::fake();

        $users = User::factory()->count(3)->create();

        $response = $this->actingAs($this->admin)->post(route('admin.notifications.send'), [
            'target_type' => 'all',
            'title' => 'System Announcement',
            'message' => 'Important update for all users!',
            'type' => 'warning',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Total = 3 new + admin + regularUser = 5
        $this->assertDatabaseHas('admin_notifications_log', [
            'target_type' => 'all',
            'recipient_count' => 5,
        ]);
    }

    public function test_super_admin_can_send_to_all_users_when_user_ids_is_empty_array(): void
    {
        Notification::fake();

        User::factory()->count(2)->create();

        $response = $this->actingAs($this->admin)->post(route('admin.notifications.send'), [
            'target_type' => 'all',
            'user_ids' => [],
            'title' => 'All Users Update',
            'message' => 'Still valid when UI sends empty user_ids array.',
            'type' => 'info',
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('admin_notifications_log', [
            'target_type' => 'all',
            'title' => 'All Users Update',
        ]);
    }

    public function test_validation_errors_on_invalid_input(): void
    {
        $response = $this->actingAs($this->admin)->post(route('admin.notifications.send'), [
            'target_type' => 'individual',
            'user_ids' => [],
            'title' => '',
            'message' => '',
            'type' => 'invalid',
        ]);

        $response->assertSessionHasErrors(['user_ids', 'title', 'message', 'type']);
    }

    public function test_regular_user_cannot_send_notifications(): void
    {
        $response = $this->actingAs($this->regularUser)->post(route('admin.notifications.send'), [
            'target_type' => 'all',
            'title' => 'Hacker Attempt',
            'message' => 'Should not work',
            'type' => 'info',
        ]);

        $response->assertForbidden();
        $this->assertDatabaseCount('admin_notifications_log', 0);
    }

    public function test_notification_log_is_created_after_send(): void
    {
        Notification::fake();

        $response = $this->actingAs($this->admin)->post(route('admin.notifications.send'), [
            'target_type' => 'all',
            'title' => 'Log Test',
            'message' => 'Checking the log entry.',
            'type' => 'error',
            'action_url' => '/dashboard',
        ]);

        $response->assertRedirect();

        $log = AdminNotificationLog::latest()->first();

        $this->assertNotNull($log);
        $this->assertEquals($this->admin->id, $log->admin_id);
        $this->assertEquals('all', $log->target_type);
        $this->assertEquals('Log Test', $log->title);
        $this->assertEquals('error', $log->type);
        $this->assertEquals('/dashboard', $log->action_url);
    }
}
