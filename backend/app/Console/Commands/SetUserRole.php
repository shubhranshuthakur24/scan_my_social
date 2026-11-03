<?php

namespace App\Console\Commands;

use App\Models\User;
use App\UserRole;
use Illuminate\Console\Command;

class SetUserRole extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:set-role
                            {email : Email address of the user}
                            {role : Target role (user or super_admin)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign a database role to a user account';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $roleValue = strtolower(trim((string) $this->argument('role')));
        $role = UserRole::tryFrom($roleValue);

        if (! $role) {
            $this->error('Invalid role. Allowed roles: user, super_admin.');

            return self::FAILURE;
        }

        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $this->error("User not found for email: {$email}");

            return self::FAILURE;
        }

        $user->forceFill(['role' => $role->value])->save();

        $this->info("Updated {$user->email} role to {$role->value}.");

        return self::SUCCESS;
    }
}
