<?php

namespace Tests\Feature\Auth;

use App\Mail\PasswordChangedMail;
use App\Mail\PasswordSetupFromGoogleMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_can_be_updated(): void
    {
        Mail::fake();

        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put('/password', [
                'current_password' => 'password',
                'password' => 'NewStrong1!',
                'password_confirmation' => 'NewStrong1!',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertTrue(Hash::check('NewStrong1!', $user->refresh()->password));
        Mail::assertQueued(PasswordChangedMail::class, function (PasswordChangedMail $mail) use ($user) {
            return $mail->user->is($user);
        });
    }

    public function test_correct_password_must_be_provided_to_update_password(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put('/password', [
                'current_password' => 'wrong-password',
                'password' => 'NewStrong1!',
                'password_confirmation' => 'NewStrong1!',
            ]);

        $response
            ->assertSessionHasErrors('current_password')
            ->assertRedirect('/profile');
    }

    public function test_google_only_user_can_set_password_without_current_password(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'google_id' => 'google-only-user-123',
            'google_token' => 'token-123',
            'password' => null,
        ]);

        $response = $this
            ->actingAs($user)
            ->from('/settings')
            ->put('/password', [
                'password' => 'NewStrong1!',
                'password_confirmation' => 'NewStrong1!',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings');

        $this->assertTrue(Hash::check('NewStrong1!', $user->refresh()->password));
        Mail::assertQueued(PasswordSetupFromGoogleMail::class, function (PasswordSetupFromGoogleMail $mail) use ($user) {
            return $mail->user->is($user);
        });
        Mail::assertNotQueued(PasswordChangedMail::class);
    }
}
