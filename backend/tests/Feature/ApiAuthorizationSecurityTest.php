<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Post;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiAuthorizationSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_cannot_view_or_modify_foreign_project(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();

        $project = Project::create([
            'user_id' => $owner->id,
            'name' => 'Owner Project',
            'description' => 'Sensitive project',
            'color' => 'slate',
        ]);

        $this->actingAs($attacker)->getJson("/api/projects/{$project->id}")
            ->assertForbidden();

        $this->actingAs($attacker)->putJson("/api/projects/{$project->id}", [
            'name' => 'Pwned',
            'description' => 'tampered',
            'color' => 'red',
        ])->assertForbidden();

        $this->actingAs($attacker)->deleteJson("/api/projects/{$project->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'name' => 'Owner Project',
        ]);
    }

    public function test_user_cannot_attach_foreign_or_inaccessible_posts_to_project(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();

        $project = Project::create([
            'user_id' => $attacker->id,
            'name' => 'Attacker Project',
            'description' => null,
            'color' => 'slate',
        ]);

        $channel = Channel::create([
            'handle' => 'owner-channel-1',
            'name' => 'Owner Channel',
            'platform' => 'instagram',
        ]);
        $owner->channels()->syncWithoutDetaching([$channel->id]);

        $post = Post::create([
            'channel_id' => $channel->id,
            'platform' => 'instagram',
            'post_id' => 'owner-post-1',
        ]);

        $this->actingAs($attacker)->postJson("/api/projects/{$project->id}/posts", [
            'post_id' => $post->id,
        ])->assertForbidden();
    }

    public function test_user_cannot_trigger_post_actions_for_inaccessible_post(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();

        $this->attachStarterPlan($owner);
        $this->attachStarterPlan($attacker);

        $channel = Channel::create([
            'handle' => 'owner-channel-2',
            'name' => 'Owner Channel 2',
            'platform' => 'instagram',
        ]);
        $owner->channels()->syncWithoutDetaching([$channel->id]);

        $post = Post::create([
            'channel_id' => $channel->id,
            'platform' => 'instagram',
            'post_id' => 'owner-post-2',
            'audio_url' => 'https://cdn.example.com/audio.mp3',
        ]);

        $this->actingAs($attacker)->postJson("/api/posts/{$post->id}/transcribe")
            ->assertForbidden();

        $this->actingAs($attacker)->postJson("/api/posts/{$post->id}/analyze")
            ->assertForbidden();
    }

    public function test_unverified_user_cannot_access_project_api_routes(): void
    {
        $user = User::factory()->unverified()->create();

        $project = Project::create([
            'user_id' => $user->id,
            'name' => 'Locked Project',
            'description' => null,
            'color' => 'slate',
        ]);

        $this->actingAs($user)->getJson('/api/projects')->assertForbidden();
        $this->actingAs($user)->postJson('/api/projects', [
            'name' => 'New Project',
            'color' => 'slate',
        ])->assertForbidden();
        $this->actingAs($user)->getJson("/api/projects/{$project->id}")->assertForbidden();
        $this->actingAs($user)->putJson("/api/projects/{$project->id}", [
            'name' => 'Updated Name',
            'description' => 'Desc',
            'color' => 'blue',
        ])->assertForbidden();
        $this->actingAs($user)->deleteJson("/api/projects/{$project->id}")->assertForbidden();
    }

    public function test_project_show_returns_paginated_posts_payload(): void
    {
        $user = User::factory()->create();
        $project = Project::create([
            'user_id' => $user->id,
            'name' => 'Pagination Project',
            'description' => null,
            'color' => 'slate',
        ]);

        $channel = Channel::create([
            'handle' => 'owner-channel-pagination',
            'name' => 'Owner Channel Pagination',
            'platform' => 'instagram',
        ]);
        $user->channels()->syncWithoutDetaching([$channel->id]);

        $postIds = [];
        foreach (range(1, 30) as $index) {
            $post = Post::create([
                'channel_id' => $channel->id,
                'platform' => 'instagram',
                'post_id' => "owner-post-pagination-{$index}",
                'caption' => "Post {$index}",
                'owner_username' => 'owner',
            ]);
            $postIds[] = $post->id;
        }
        $project->posts()->syncWithoutDetaching($postIds);

        $response = $this->actingAs($user)->getJson("/api/projects/{$project->id}?per_page=10");

        $response->assertOk()
            ->assertJsonPath('posts_pagination.per_page', 10)
            ->assertJsonPath('posts_pagination.current_page', 1)
            ->assertJsonPath('posts_pagination.total', 30)
            ->assertJsonPath('posts_pagination.has_more_pages', true)
            ->assertJsonCount(10, 'posts');
    }

    private function attachStarterPlan(User $user): void
    {
        $user->subscriptions()->create([
            'name' => 'starter',
            'razorpay_id' => 'sub_test_'.$user->id.'_'.uniqid(),
            'razorpay_plan_id' => 'plan_starter_test',
            'status' => 'active',
            'ends_at' => now()->addMonth(),
        ]);
    }
}
