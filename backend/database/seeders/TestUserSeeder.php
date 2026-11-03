<?php

namespace Database\Seeders;

use App\Models\Subscription;
use App\Models\User;
use App\Services\PlanService;
use App\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TestUserSeeder extends Seeder
{
    /**
     * Seed a reusable local test user with an active creator yearly plan.
     */
    public function run(): void
    {
        $email = 'test@scanmysocial.com';
        $password = '@Test1on1';
        $plan = 'creator_yearly';

        DB::transaction(function () use ($email, $password, $plan): void {
            $user = User::query()->firstOrNew(['email' => $email]);

            $user->forceFill([
                'name' => 'Test User',
                'password' => Hash::make($password),
                'role' => UserRole::User->value,
                'email_verified_at' => now(),
            ])->save();

            $subscriptionId = 'seeded_test_user_'.$user->id;
            $planId = 'seeded_test_user_creator_yearly';
            $creditAllowance = PlanService::monthlyCreditAllowanceForPlan($plan);

            Subscription::query()->updateOrCreate(
                ['razorpay_id' => $subscriptionId],
                [
                    'user_id' => $user->id,
                    'name' => $plan,
                    'razorpay_plan_id' => $planId,
                    'status' => 'active',
                    'ends_at' => null,
                    'next_credit_reset_at' => now()->addMonthNoOverflow(),
                    'created_at' => now(),
                ]
            );

            $user->forceFill([
                'credits' => max((int) $user->credits, $creditAllowance),
            ])->save();
        });

        if ($this->command) {
            $this->command->info("Test user seeded/updated for {$email} with creator yearly plan.");
        }
    }
}
