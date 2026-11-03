<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/settings');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'username' => 'Test User Profile',
                'bio' => 'Creator focused on short-form growth.',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test-user-profile', $user->username);
        $this->assertSame('Creator focused on short-form growth.', $user->bio);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'username' => $user->username,
                'bio' => '',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_reserved_and_duplicate_usernames_are_rejected(): void
    {
        $user = User::factory()->create(['username' => 'creator']);
        User::factory()->create(['username' => 'taken-name']);

        $payload = [
            'name' => 'Creator',
            'bio' => '',
            'email' => $user->email,
        ];

        $this->actingAs($user)
            ->patch('/profile', ['username' => 'dashboard', ...$payload])
            ->assertSessionHasErrors(['username']);

        $this->actingAs($user)
            ->patch('/profile', ['username' => 'taken-name', ...$payload])
            ->assertSessionHasErrors(['username']);
    }

    public function test_owner_can_upload_and_remove_profile_avatar(): void
    {
        config(['filesystems.upload_disk' => 'public']);
        $this->useWritablePublicDisk();

        $user = User::factory()->create(['avatar_url' => null]);

        $this->actingAs($user)
            ->post(route('profile.avatar.store'), [
                'avatar' => UploadedFile::fake()->create('avatar.png', 128, 'image/png'),
            ])
            ->assertRedirect();

        $user->refresh();

        $this->assertStringStartsWith('/storage/profile-avatars/', (string) $user->avatar_url);
        $storedPath = str_replace('/storage/', '', (string) $user->avatar_url);
        $this->assertTrue(Storage::disk('public')->exists($storedPath));

        $this->actingAs($user)
            ->delete(route('profile.avatar.destroy'))
            ->assertRedirect();

        $user->refresh();

        $this->assertNull($user->avatar_url);
        $this->assertFalse(Storage::disk('public')->exists($storedPath));
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/login');

        $this->assertGuest();
        $this->assertSoftDeleted($user);
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/settings')
            ->delete('/profile', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/settings');

        $this->assertNotNull($user->fresh());
    }

    public function test_google_only_user_can_delete_account_with_confirm_keyword(): void
    {
        $user = User::factory()->create([
            'google_id' => 'google-user-123',
            'google_token' => 'token-abc',
            'password' => null,
        ]);

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'confirm_text' => 'CONFIRM',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/login');

        $this->assertGuest();
        $this->assertSoftDeleted($user);
    }

    public function test_google_only_user_must_provide_exact_confirm_keyword_to_delete_account(): void
    {
        $user = User::factory()->create([
            'google_id' => 'google-user-456',
            'google_token' => 'token-def',
            'password' => null,
        ]);

        $response = $this
            ->actingAs($user)
            ->from('/settings')
            ->delete('/profile', [
                'confirm_text' => 'confirm',
            ]);

        $response
            ->assertSessionHasErrors('confirm_text')
            ->assertRedirect('/settings');

        $this->assertNotNull($user->fresh());
    }

    private function useWritablePublicDisk(): void
    {
        $root = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'viralyzer-profile-test-'.Str::uuid();

        config([
            'filesystems.disks.public.root' => $root,
            'filesystems.disks.public.url' => '/storage',
            'filesystems.disks.public.throw' => true,
        ]);

        $this->beforeApplicationDestroyed(function () use ($root): void {
            if (str_starts_with($root, rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR))) {
                (new Filesystem)->deleteDirectory($root);
            }
        });
    }
}
