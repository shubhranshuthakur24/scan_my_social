<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScriptGenerateRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_script_generation_rate_limit_allows_sixty_attempts_per_user(): void
    {
        $user = $this->createUserWithActivePlan();

        for ($attempt = 1; $attempt <= 60; $attempt++) {
            $this->actingAs($user)
                ->postJson('/api/scripts/generate', [])
                ->assertStatus(422);
        }

        $this->actingAs($user)
            ->postJson('/api/scripts/generate', [])
            ->assertStatus(429);
    }

    public function test_script_generation_rate_limit_is_scoped_per_authenticated_user(): void
    {
        $userOne = $this->createUserWithActivePlan();
        $userTwo = $this->createUserWithActivePlan();

        for ($attempt = 1; $attempt <= 60; $attempt++) {
            $this->actingAs($userOne)
                ->postJson('/api/scripts/generate', [])
                ->assertStatus(422);
        }

        $this->actingAs($userOne)
            ->postJson('/api/scripts/generate', [])
            ->assertStatus(429);

        // User two should still be allowed to make requests (since scoped by user id)
        $this->actingAs($userTwo)
            ->postJson('/api/scripts/generate', [])
            ->assertStatus(422);
    }

    private function createUserWithActivePlan(): User
    {
        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'pro',
            'razorpay_id' => 'sub_test_'.uniqid(),
            'razorpay_plan_id' => 'plan_test_pro',
            'status' => 'active',
            'ends_at' => null,
        ]);

        return $user->fresh();
    }
}
