<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use App\Services\PlanService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResetMonthlyCreditsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_credit_allowance_includes_yearly_bonus_values(): void
    {
        $this->assertSame(0, PlanService::monthlyCreditAllowanceForPlan('starter'));
        $this->assertSame(0, PlanService::monthlyCreditAllowanceForPlan('starter_yearly'));
        $this->assertSame(20000, PlanService::monthlyCreditAllowanceForPlan('pro'));
        $this->assertSame(22000, PlanService::monthlyCreditAllowanceForPlan('pro_yearly'));
        $this->assertSame(50000, PlanService::monthlyCreditAllowanceForPlan('creator'));
        $this->assertSame(55000, PlanService::monthlyCreditAllowanceForPlan('creator_yearly'));
    }

    public function test_reset_monthly_credits_command_overwrites_due_balances_and_ignores_non_due_rows(): void
    {
        $dueUser = User::factory()->create(['credits' => 9876]);
        $dueSubscription = Subscription::query()->create([
            'user_id' => $dueUser->id,
            'name' => 'pro_yearly',
            'razorpay_id' => 'sub_due_'.uniqid(),
            'razorpay_plan_id' => 'plan_due',
            'status' => 'active',
            'ends_at' => null,
            'next_credit_reset_at' => now()->subDays(10),
        ]);

        $notDueUser = User::factory()->create(['credits' => 333]);
        Subscription::query()->create([
            'user_id' => $notDueUser->id,
            'name' => 'creator',
            'razorpay_id' => 'sub_not_due_'.uniqid(),
            'razorpay_plan_id' => 'plan_not_due',
            'status' => 'active',
            'ends_at' => null,
            'next_credit_reset_at' => now()->addDays(7),
        ]);

        $inactiveUser = User::factory()->create(['credits' => 444]);
        Subscription::query()->create([
            'user_id' => $inactiveUser->id,
            'name' => 'creator_yearly',
            'razorpay_id' => 'sub_inactive_'.uniqid(),
            'razorpay_plan_id' => 'plan_inactive',
            'status' => 'cancelled',
            'ends_at' => null,
            'next_credit_reset_at' => now()->subDays(3),
        ]);

        $this->artisan('app:reset-monthly-credits')
            ->assertExitCode(0);

        $dueUser->refresh();
        $dueSubscription->refresh();
        $notDueUser->refresh();
        $inactiveUser->refresh();

        $this->assertSame(22000, (int) $dueUser->credits);
        $this->assertNotNull($dueSubscription->next_credit_reset_at);
        $this->assertTrue($dueSubscription->next_credit_reset_at->isFuture());
        $this->assertSame(333, (int) $notDueUser->credits);
        $this->assertSame(444, (int) $inactiveUser->credits);
    }
}
