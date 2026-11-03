<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ChannelsCacheInvalidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_channels_cache_is_invalidated_when_channel_is_added(): void
    {
        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'starter',
            'razorpay_id' => 'sub_cache_test_'.$user->id,
            'razorpay_plan_id' => 'plan_starter_test',
            'status' => 'active',
            'ends_at' => now()->addDays(30),
        ]);

        $this->actingAs($user)
            ->getJson('/api/channels')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($user)
            ->postJson('/api/channels', [
                'channels' => [
                    ['platform' => 'instagram', 'channel' => '@cachecreator'],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('created_count', 1);

        $this->actingAs($user)
            ->getJson('/api/channels')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.handle', 'cachecreator');
    }

    public function test_channels_cache_is_invalidated_when_channel_status_changes(): void
    {
        $user = User::factory()->create();

        $channel = Channel::create([
            'handle' => 'statuscache',
            'platform' => 'instagram',
            'name' => 'statuscache',
        ]);

        $user->channels()->syncWithoutDetaching([$channel->id]);

        $channel->forceFill(['apify_profile_run_status' => 'RUNNING'])->save();

        $this->actingAs($user)
            ->getJson('/api/channels')
            ->assertOk()
            ->assertJsonPath('data.0.apify_profile_run_status', 'RUNNING');

        $channel->forceFill(['apify_profile_run_status' => 'SUCCEEDED'])->save();

        $this->actingAs($user)
            ->getJson('/api/channels')
            ->assertOk()
            ->assertJsonPath('data.0.apify_profile_run_status', 'SUCCEEDED');
    }

    public function test_channels_cache_is_invalidated_after_stale_run_timeout_command(): void
    {
        $user = User::factory()->create();

        $channel = Channel::create([
            'handle' => 'staleruncache',
            'platform' => 'instagram',
            'name' => 'staleruncache',
        ]);

        $user->channels()->syncWithoutDetaching([$channel->id]);

        $channel->forceFill(['apify_profile_run_status' => 'RUNNING'])->save();
        Channel::query()->whereKey($channel->id)->update([
            'updated_at' => now()->subHours(7),
        ]);

        $this->actingAs($user)
            ->getJson('/api/channels')
            ->assertOk()
            ->assertJsonPath('data.0.apify_profile_run_status', 'RUNNING');

        $this->artisan('app:poll-apify-runs')->assertExitCode(0);

        $this->actingAs($user)
            ->getJson('/api/channels')
            ->assertOk()
            ->assertJsonPath('data.0.apify_profile_run_status', 'TIMED-OUT');
    }
}
