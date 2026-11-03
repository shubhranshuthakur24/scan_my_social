<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'StrongPass1!',
            'password_confirmation' => 'StrongPass1!',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_last_touch_attribution_is_stored_when_user_registers(): void
    {
        $this->get('/register?utm_source=meta&utm_medium=paid_social&utm_campaign=first_campaign&fbclid=first-click');
        $this->get('/register?utm_source=meta&utm_medium=paid_social&utm_campaign=second_campaign&utm_content=second_ad&fbclid=second-click');

        $this->post('/register', [
            'name' => 'Tracked User',
            'email' => 'tracked@example.com',
            'password' => 'StrongPass1!',
            'password_confirmation' => 'StrongPass1!',
        ]);

        $user = User::query()->where('email', 'tracked@example.com')->firstOrFail();

        $this->assertDatabaseHas('user_attributions', [
            'user_id' => $user->id,
            'utm_source' => 'meta',
            'utm_medium' => 'paid_social',
            'utm_campaign' => 'second_campaign',
            'utm_content' => 'second_ad',
            'fbclid' => 'second-click',
        ]);

        $this->assertDatabaseMissing('user_attributions', [
            'user_id' => $user->id,
            'utm_campaign' => 'first_campaign',
            'fbclid' => 'first-click',
        ]);
    }

    public function test_registration_without_tracking_does_not_create_attribution(): void
    {
        $this->post('/register', [
            'name' => 'Organic User',
            'email' => 'organic@example.com',
            'password' => 'StrongPass1!',
            'password_confirmation' => 'StrongPass1!',
        ]);

        $user = User::query()->where('email', 'organic@example.com')->firstOrFail();

        $this->assertDatabaseMissing('user_attributions', [
            'user_id' => $user->id,
        ]);
    }
}
