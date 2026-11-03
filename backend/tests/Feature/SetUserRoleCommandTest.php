<?php

namespace Tests\Feature;

use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SetUserRoleCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_updates_user_role_via_command(): void
    {
        $user = User::factory()->create([
            'email' => 'member@example.com',
            'role' => UserRole::User->value,
        ]);

        $this->artisan('user:set-role', [
            'email' => $user->email,
            'role' => UserRole::SuperAdmin->value,
        ])->assertExitCode(0);

        $user->refresh();

        $this->assertSame(UserRole::SuperAdmin, $user->role);
        $this->assertTrue($user->isSuperAdmin());
    }
}
