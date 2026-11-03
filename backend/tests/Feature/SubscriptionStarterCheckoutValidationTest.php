<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionStarterCheckoutValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_plan_checkout_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/subscriptions/create', [
                'plan' => 'free',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['plan']);
    }
}
