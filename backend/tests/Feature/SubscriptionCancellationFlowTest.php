<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\PlanService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class SubscriptionCancellationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_cancelling_subscription_keeps_local_status_active_until_cycle_end(): void
    {
        $user = User::factory()->create();
        $subscription = $user->subscriptions()->create([
            'name' => 'pro',
            'razorpay_id' => 'sub_free_test_'.uniqid(),
            'razorpay_plan_id' => 'plan_test_pro',
            'status' => 'active',
            'ends_at' => now()->addDays(10),
        ]);

        $response = $this->actingAs($user)
            ->from('/settings/billing')
            ->post('/api/subscriptions/cancel');

        $response
            ->assertRedirect('/settings/billing')
            ->assertSessionHas('message', 'Subscription will be cancelled at the end of your billing cycle.');

        $this->assertDatabaseHas('subscriptions', [
            'id' => $subscription->id,
            'status' => 'active',
        ]);

        $this->assertTrue(PlanService::hasActivePlan($user->fresh()));
    }

    public function test_active_plan_middleware_still_allows_access_after_cancel_request(): void
    {
        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'pro',
            'razorpay_id' => 'sub_free_test_'.uniqid(),
            'razorpay_plan_id' => 'plan_test_pro',
            'status' => 'active',
            'ends_at' => now()->addDays(10),
        ]);

        Route::middleware(['auth', 'active.plan'])->get('/__test-active-plan', function () {
            return response()->json(['ok' => true]);
        });

        $this->actingAs($user)->from('/settings/billing')->post('/api/subscriptions/cancel');

        $this->actingAs($user)
            ->getJson('/__test-active-plan')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }

    public function test_settings_billing_route_name_is_registered_once(): void
    {
        $billingRoutes = collect(app('router')->getRoutes()->getRoutes())
            ->filter(fn ($route) => $route->getName() === 'settings.billing');

        $this->assertCount(1, $billingRoutes);
    }
}
