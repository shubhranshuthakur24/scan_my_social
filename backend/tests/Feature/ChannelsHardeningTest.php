<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\User;
use App\Models\Watchlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ChannelsHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_same_handle_on_different_platforms_can_be_added(): void
    {
        $user = User::factory()->create();
        $this->attachStarterPlan($user);

        $response = $this->actingAs($user)->postJson('/api/channels', [
            'channels' => [
                ['platform' => 'instagram', 'channel' => '@creator_handle'],
                ['platform' => 'youtube', 'channel' => '@creator_handle'],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('created_count', 2)
            ->assertJsonPath('rejected_count', 0);

        $this->assertDatabaseHas('channels', [
            'handle' => 'creator_handle',
            'platform' => 'instagram',
        ]);

        $this->assertDatabaseHas('channels', [
            'handle' => 'creator_handle',
            'platform' => 'youtube',
        ]);

        $this->assertDatabaseCount('channel_users', 2);
    }

    public function test_newly_created_channel_starts_in_queued_status(): void
    {
        $user = User::factory()->create();
        $this->attachStarterPlan($user);

        $this->actingAs($user)->postJson('/api/channels', [
            'channels' => [
                ['platform' => 'instagram', 'channel' => '@queue_me'],
            ],
        ])->assertCreated();

        $this->assertDatabaseHas('channels', [
            'handle' => 'queue_me',
            'platform' => 'instagram',
            'apify_profile_run_status' => 'QUEUED',
        ]);
    }

    public function test_invalid_root_urls_and_spoofed_hosts_are_rejected(): void
    {
        $user = User::factory()->create();
        $this->attachStarterPlan($user);

        $response = $this->actingAs($user)->postJson('/api/channels', [
            'channels' => [
                ['platform' => 'instagram', 'channel' => 'https://instagram.com/'],
                ['platform' => 'instagram', 'channel' => 'https://instagram.com.evil.tld/attacker'],
            ],
        ]);

        $response->assertStatus(207)
            ->assertJsonPath('created_count', 0)
            ->assertJsonPath('rejected_count', 2)
            ->assertJsonPath('errors.channels.0.reason', 'invalid_format')
            ->assertJsonPath('errors.channels.1.reason', 'invalid_host');
    }

    public function test_bulk_add_partially_accepts_until_quota_is_reached(): void
    {
        $user = User::factory()->create();
        $this->attachStarterPlan($user);

        for ($i = 1; $i <= 4; $i++) {
            $channel = Channel::create([
                'handle' => "existing_{$i}",
                'platform' => 'instagram',
                'name' => "existing_{$i}",
            ]);
            $user->channels()->syncWithoutDetaching([$channel->id]);
        }

        $response = $this->actingAs($user)->postJson('/api/channels', [
            'channels' => [
                ['platform' => 'instagram', 'channel' => '@new_one'],
                ['platform' => 'instagram', 'channel' => '@new_two'],
                ['platform' => 'instagram', 'channel' => '@new_three'],
            ],
        ]);

        $response->assertStatus(207)
            ->assertJsonPath('created_count', 1)
            ->assertJsonPath('rejected_count', 2)
            ->assertJsonPath('errors.channels.1.reason', 'quota_exceeded')
            ->assertJsonPath('errors.channels.2.reason', 'quota_exceeded');

        $this->assertDatabaseCount('channel_users', 5);
    }

    public function test_store_returns_forbidden_when_no_quota_remains_at_start(): void
    {
        $user = User::factory()->create();
        $this->attachStarterPlan($user);

        for ($i = 1; $i <= 5; $i++) {
            $channel = Channel::create([
                'handle' => "full_{$i}",
                'platform' => 'instagram',
                'name' => "full_{$i}",
            ]);
            $user->channels()->syncWithoutDetaching([$channel->id]);
        }

        $response = $this->actingAs($user)->postJson('/api/channels', [
            'channels' => [
                ['platform' => 'instagram', 'channel' => '@overflow'],
            ],
        ]);

        $response->assertForbidden()
            ->assertJsonPath('error', 'channel_limit_reached');

        $this->assertDatabaseCount('channel_users', 5);
    }

    public function test_super_admin_can_add_channels_beyond_normal_plan_limit(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        for ($i = 1; $i <= 8; $i++) {
            $channel = Channel::create([
                'handle' => "admin_existing_{$i}",
                'platform' => 'instagram',
                'name' => "admin_existing_{$i}",
            ]);
            $superAdmin->channels()->syncWithoutDetaching([$channel->id]);
        }

        $response = $this->actingAs($superAdmin)->postJson('/api/channels', [
            'channels' => [
                ['platform' => 'instagram', 'channel' => '@admin_new_one'],
                ['platform' => 'instagram', 'channel' => '@admin_new_two'],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('created_count', 2)
            ->assertJsonPath('rejected_count', 0);

        $this->assertDatabaseHas('channels', [
            'handle' => 'admin_new_one',
            'platform' => 'instagram',
        ]);
        $this->assertDatabaseHas('channels', [
            'handle' => 'admin_new_two',
            'platform' => 'instagram',
        ]);
        $this->assertDatabaseCount('channel_users', 10);
    }

    public function test_api_rejects_tiktok_platform(): void
    {
        $user = User::factory()->create();
        $this->attachStarterPlan($user);

        $this->actingAs($user)->postJson('/api/channels', [
            'channels' => [
                ['platform' => 'tiktok', 'channel' => '@nope'],
            ],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['channels.0.platform']);
    }

    public function test_user_cannot_attach_untracked_channel_to_watchlist(): void
    {
        $user = User::factory()->create();
        $this->attachStarterPlan($user);

        $watchlist = Watchlist::create([
            'user_id' => $user->id,
            'name' => 'Primary',
            'description' => null,
        ]);

        $foreignChannel = Channel::create([
            'handle' => 'not_tracked',
            'platform' => 'instagram',
            'name' => 'not_tracked',
        ]);

        $this->actingAs($user)->postJson("/api/watchlists/{$watchlist->id}/channels", [
            'channel_id' => $foreignChannel->id,
        ])->assertForbidden()
            ->assertJsonPath('error', 'forbidden_channel_attach');

        $user->channels()->syncWithoutDetaching([$foreignChannel->id]);

        $this->actingAs($user)->postJson("/api/watchlists/{$watchlist->id}/channels", [
            'channel_id' => $foreignChannel->id,
        ])->assertOk();
    }

    public function test_channels_index_omits_watchlists_relationship_for_lighter_payload(): void
    {
        $user = User::factory()->create();
        $this->attachStarterPlan($user);

        $channel = Channel::create([
            'handle' => 'creator_fast',
            'platform' => 'instagram',
            'name' => 'creator_fast',
        ]);

        $user->channels()->syncWithoutDetaching([$channel->id]);

        $watchlist = Watchlist::create([
            'user_id' => $user->id,
            'name' => 'Performance',
            'description' => null,
        ]);

        $watchlist->channels()->syncWithoutDetaching([$channel->id]);

        $response = $this->actingAs($user)->getJson('/api/channels');

        $response->assertOk()
            ->assertJsonPath('data.0.id', $channel->id)
            ->assertJsonMissingPath('data.0.watchlists');
    }

    public function test_user_can_untrack_single_channel_and_receive_remaining_untracks(): void
    {
        $user = User::factory()->create();
        $this->attachStarterPlan($user);

        $channel = Channel::create([
            'handle' => 'remove_me',
            'platform' => 'instagram',
            'name' => 'remove_me',
        ]);

        $user->channels()->syncWithoutDetaching([$channel->id]);

        $watchlist = Watchlist::create([
            'user_id' => $user->id,
            'name' => 'Temporary',
            'description' => null,
        ]);

        $watchlist->channels()->syncWithoutDetaching([$channel->id]);

        $response = $this->actingAs($user)->deleteJson("/api/channels/{$channel->id}");

        $response->assertOk()
            ->assertJsonPath('untrack_limit', 5)
            ->assertJsonPath('untrack_used', 1)
            ->assertJsonPath('untrack_remaining', 4);

        $this->assertDatabaseMissing('channel_users', [
            'user_id' => $user->id,
            'channel_id' => $channel->id,
        ]);

        $this->assertDatabaseMissing('watchlist_channels', [
            'watchlist_id' => $watchlist->id,
            'channel_id' => $channel->id,
        ]);
    }

    public function test_user_cannot_untrack_after_reaching_untrack_limit(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['channel_untrack_count' => 5])->save();
        $this->attachStarterPlan($user);

        $channel = Channel::create([
            'handle' => 'limit_test',
            'platform' => 'instagram',
            'name' => 'limit_test',
        ]);

        $user->channels()->syncWithoutDetaching([$channel->id]);

        $response = $this->actingAs($user)->deleteJson("/api/channels/{$channel->id}");

        $response->assertForbidden()
            ->assertJsonPath('error', 'untrack_limit_reached')
            ->assertJsonPath('untrack_limit', 5)
            ->assertJsonPath('untrack_used', 5)
            ->assertJsonPath('untrack_remaining', 0);

        $this->assertDatabaseHas('channel_users', [
            'user_id' => $user->id,
            'channel_id' => $channel->id,
        ]);
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
