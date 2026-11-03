<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use App\Services\PlanService;
use Database\Seeders\TestUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TestUserSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_or_updates_the_test_user_with_creator_yearly_plan(): void
    {
        app(TestUserSeeder::class)->run();
        app(TestUserSeeder::class)->run();

        $this->assertSame(1, User::query()->where('email', 'test@scanmysocial.com')->count());

        $user = User::query()->where('email', 'test@scanmysocial.com')->firstOrFail();
        $subscriptionId = 'seeded_test_user_'.$user->id;

        $this->assertSame('Test User', $user->name);
        $this->assertTrue(Hash::check('@Test1on1', (string) $user->password));
        $this->assertNotNull($user->email_verified_at);

        $this->assertSame(1, Subscription::query()->where('razorpay_id', $subscriptionId)->count());
        $this->assertSame('creator_yearly', PlanService::activePlan($user));
        $this->assertSame('creator', PlanService::activePlanTier($user));
        $this->assertTrue(PlanService::hasActivePaidPlan($user));
        $this->assertSame(PlanService::monthlyCreditAllowanceForPlan('creator_yearly'), (int) $user->fresh()->credits);

        $subscription = Subscription::query()->where('razorpay_id', $subscriptionId)->firstOrFail();

        $this->assertSame($user->id, $subscription->user_id);
        $this->assertSame('creator_yearly', $subscription->name);
        $this->assertSame('seeded_test_user_creator_yearly', $subscription->razorpay_plan_id);
        $this->assertSame('active', $subscription->status);
        $this->assertNull($subscription->ends_at);
        $this->assertNotNull($subscription->next_credit_reset_at);
        $this->assertTrue($subscription->next_credit_reset_at->isFuture());
    }
}
