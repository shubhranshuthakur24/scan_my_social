<?php

namespace Database\Seeders;

use App\Models\User;
use App\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    /**
     * Seed a super admin account from environment values.
     */
    public function run(): void
    {
        $email = strtolower(trim((string) env('SUPER_ADMIN_EMAIL', '')));
        $password = trim((string) env('SUPER_ADMIN_PASSWORD', ''));
        $name = trim((string) env('SUPER_ADMIN_NAME', 'Super Admin'));

        if ($email === '' || $password === '') {
            if ($this->command) {
                $this->command->warn('SuperAdminSeeder skipped: set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD.');
            }

            return;
        }

        $user = User::query()->firstOrNew(['email' => $email]);
        $user->forceFill([
            'name' => $name !== '' ? $name : 'Super Admin',
            'password' => Hash::make($password),
            'role' => UserRole::SuperAdmin->value,
            'email_verified_at' => now(),
        ])->save();

        if ($this->command) {
            $this->command->info("Super admin seeded/updated for {$email}.");
        }
    }
}
