<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfilePreferencesUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_updating_notification_preferences_preserves_other_notification_preferences(): void
    {
        $user = User::factory()->create([
            'preferences' => [
                'notif_product' => true,
                'notif_digest' => true,
                'notif_inapp' => true,
            ],
        ]);

        $response = $this->actingAs($user)->patch(route('profile.preferences.update'), [
            'notif_product' => false,
        ]);

        $response->assertRedirect();

        $user->refresh();
        $this->assertSame(false, (bool) data_get($user->preferences, 'notif_product'));
        $this->assertSame(true, (bool) data_get($user->preferences, 'notif_digest'));
        $this->assertSame(true, (bool) data_get($user->preferences, 'notif_inapp'));
    }

    public function test_notification_preferences_can_be_toggled_together(): void
    {
        $user = User::factory()->create([
            'preferences' => [
                'notif_product' => true,
                'notif_digest' => true,
                'notif_inapp' => true,
            ],
        ]);

        $response = $this->actingAs($user)->patch(route('profile.preferences.update'), [
            'notif_product' => false,
            'notif_digest' => false,
            'notif_inapp' => false,
        ]);

        $response->assertRedirect();

        $user->refresh();
        $this->assertSame(false, (bool) data_get($user->preferences, 'notif_product'));
        $this->assertSame(false, (bool) data_get($user->preferences, 'notif_digest'));
        $this->assertSame(false, (bool) data_get($user->preferences, 'notif_inapp'));
    }
}
