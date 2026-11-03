<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\AppNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_fetch_notifications_with_unread_count(): void
    {
        $user = User::factory()->create();

        $this->createNotification($user, 'Oldest', true, now()->subMinutes(3));
        $this->createNotification($user, 'Middle', false, now()->subMinutes(2));
        $this->createNotification($user, 'Latest', false, now()->subMinutes(1));

        $this->actingAs($user)
            ->getJson(route('notifications.index'))
            ->assertOk()
            ->assertJsonPath('unread_count', 2)
            ->assertJsonCount(3, 'notifications.data')
            ->assertJsonPath('notifications.data.0.data.title', 'Latest');
    }

    public function test_user_can_mark_one_notification_as_read(): void
    {
        $user = User::factory()->create();
        $notification = $this->createNotification($user, 'Read me');

        $this->actingAs($user)
            ->postJson(route('notifications.read', $notification->id))
            ->assertOk()
            ->assertJsonPath('message', 'Notification marked as read');

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_user_cannot_mark_another_users_notification_as_read(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $notification = $this->createNotification($owner, 'Owner only');

        $this->actingAs($intruder)
            ->postJson(route('notifications.read', $notification->id))
            ->assertNotFound();
    }

    public function test_user_can_mark_all_notifications_as_read_with_updated_count(): void
    {
        $user = User::factory()->create();

        $this->createNotification($user, 'Unread 1');
        $this->createNotification($user, 'Unread 2');
        $this->createNotification($user, 'Already read', true);

        $this->actingAs($user)
            ->postJson(route('notifications.read-all'))
            ->assertOk()
            ->assertJsonPath('updated_count', 2)
            ->assertJsonPath('message', 'All notifications marked as read');

        $this->assertSame(0, $user->fresh()->unreadNotifications()->count());
    }

    public function test_user_can_delete_own_notification(): void
    {
        $user = User::factory()->create();
        $notification = $this->createNotification($user, 'Delete me');

        $this->actingAs($user)
            ->deleteJson(route('notifications.destroy', $notification->id))
            ->assertOk()
            ->assertJsonPath('message', 'Notification deleted');

        $this->assertDatabaseMissing('notifications', [
            'id' => $notification->id,
        ]);
    }

    private function createNotification(
        User $user,
        string $title,
        bool $read = false,
        ?\DateTimeInterface $createdAt = null
    ): DatabaseNotification {
        $createdAt ??= now();

        return $user->notifications()->create([
            'id' => (string) Str::uuid(),
            'type' => AppNotification::class,
            'data' => [
                'title' => $title,
                'message' => 'Test message',
                'type' => 'info',
                'action_url' => null,
                'extra_data' => [],
            ],
            'read_at' => $read ? now() : null,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }
}
