<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostAnalyzeRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_analyze_rate_limit_allows_twenty_attempts_per_user(): void
    {
        $user = $this->createUserWithActivePlan();
        $post = $this->createAccessiblePost($user);

        for ($attempt = 1; $attempt <= 20; $attempt++) {
            $this->actingAs($user)
                ->postJson("/api/posts/{$post->id}/analyze")
                ->assertStatus(422);
        }

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/analyze")
            ->assertStatus(429);
    }

    public function test_analyze_rate_limit_is_scoped_per_authenticated_user(): void
    {
        $userOne = $this->createUserWithActivePlan();
        $post = $this->createAccessiblePost($userOne);

        $userTwo = $this->createUserWithActivePlan();
        $userTwo->channels()->syncWithoutDetaching([$post->channel_id]);

        for ($attempt = 1; $attempt <= 20; $attempt++) {
            $this->actingAs($userOne)
                ->postJson("/api/posts/{$post->id}/analyze")
                ->assertStatus(422);
        }

        $this->actingAs($userOne)
            ->postJson("/api/posts/{$post->id}/analyze")
            ->assertStatus(429);

        $this->actingAs($userTwo)
            ->postJson("/api/posts/{$post->id}/analyze")
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

    private function createAccessiblePost(User $user): Post
    {
        $channel = Channel::create([
            'handle' => 'channel_'.uniqid(),
            'name' => 'Analyze Rate Limit Channel',
            'platform' => 'instagram',
        ]);
        $user->channels()->syncWithoutDetaching([$channel->id]);

        return Post::create([
            'channel_id' => $channel->id,
            'platform' => 'instagram',
            'post_id' => 'post_'.uniqid(),
            'audio_url' => null,
        ]);
    }
}
