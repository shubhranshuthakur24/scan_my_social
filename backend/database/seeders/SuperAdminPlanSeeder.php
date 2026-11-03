<?php

namespace Database\Seeders;

use App\Models\Subscription;
use App\Models\User;
use App\Services\PlanService;
use App\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SuperAdminPlanSeeder extends Seeder
{
    /**
     * Seed a local fake paid plan for the configured super admin account.
     */
    public function run(): void
    {
        $email = strtolower(trim((string) env('SUPER_ADMIN_EMAIL', '')));
        $plan = trim((string) env('SUPER_ADMIN_PLAN', 'creator_yearly'));

        if ($email === '') {
            if ($this->command) {
                $this->command->warn('SuperAdminPlanSeeder skipped: set SUPER_ADMIN_EMAIL.');
            }

            return;
        }

        $user = User::query()
            ->where('email', $email)
            ->where('role', UserRole::SuperAdmin->value)
            ->first();

        if (! $user) {
            if ($this->command) {
                $this->command->warn("SuperAdminPlanSeeder skipped: no super admin found for {$email}.");
            }

            return;
        }

        if ($plan === '') {
            $plan = 'creator_yearly';
        }

        DB::transaction(function () use ($user, $plan): void {
            $subscriptionId = 'seeded_super_admin_'.$user->id;
            $planId = 'seeded_'.preg_replace('/[^a-z0-9_]+/', '_', strtolower($plan));
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
            $this->command->info("Super admin fake {$plan} plan seeded for {$email}.");
        }
    }
}
