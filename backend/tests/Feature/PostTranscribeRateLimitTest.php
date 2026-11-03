<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostTranscribeRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_transcribe_rate_limit_is_scoped_per_user_and_post(): void
    {
        $user = $this->createUserWithActivePlan();
        [$postOne, $postTwo] = $this->createAccessiblePosts($user);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->actingAs($user)
                ->postJson("/api/posts/{$postOne->id}/transcribe")
                ->assertStatus(400);
        }

        $this->actingAs($user)
            ->postJson("/api/posts/{$postOne->id}/transcribe")
            ->assertStatus(429);

        $this->actingAs($user)
            ->postJson("/api/posts/{$postTwo->id}/transcribe")
            ->assertStatus(400);
    }

    public function test_transcribe_rate_limit_is_scoped_per_user_for_same_post(): void
    {
        $userOne = $this->createUserWithActivePlan();
        [$post] = $this->createAccessiblePosts($userOne);

        $userTwo = $this->createUserWithActivePlan();
        $userTwo->channels()->syncWithoutDetaching([$post->channel_id]);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->actingAs($userOne)
                ->postJson("/api/posts/{$post->id}/transcribe")
                ->assertStatus(400);
        }

        $this->actingAs($userOne)
            ->postJson("/api/posts/{$post->id}/transcribe")
            ->assertStatus(429);

        $this->actingAs($userTwo)
            ->postJson("/api/posts/{$post->id}/transcribe")
            ->assertStatus(400);
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

    /**
     * @return array{0: Post, 1: Post}
     */
    private function createAccessiblePosts(User $user): array
    {
        $channel = Channel::create([
            'handle' => 'channel_'.uniqid(),
            'name' => 'Rate Limit Channel',
            'platform' => 'instagram',
        ]);
        $user->channels()->syncWithoutDetaching([$channel->id]);

        $postOne = Post::create([
            'channel_id' => $channel->id,
            'platform' => 'instagram',
            'post_id' => 'post_'.uniqid(),
            'audio_url' => null,
        ]);

        $postTwo = Post::create([
            'channel_id' => $channel->id,
            'platform' => 'instagram',
            'post_id' => 'post_'.uniqid(),
            'audio_url' => null,
        ]);

        return [$postOne, $postTwo];
    }
}
