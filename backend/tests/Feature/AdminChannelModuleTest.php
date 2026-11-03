<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Post;
use App\Models\User;
use App\Services\InstagramScraperService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AdminChannelModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_view_channels_console(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $tracker = User::factory()->create();

        $channel = Channel::query()->create([
            'handle' => 'testcreator',
            'name' => 'Test Creator',
            'platform' => 'instagram',
            'followers_count' => 12000,
            'posts_count' => 300,
            'apify_profile_run_status' => 'SUCCEEDED',
            'apify_post_run_status' => 'FAILED',
        ]);

        $tracker->channels()->attach($channel->id);

        Post::query()->create([
            'channel_id' => $channel->id,
            'platform' => 'instagram',
            'post_id' => 'ig_1',
            'type' => 'Video',
        ]);

        $response = $this->actingAs($admin)->get(route('admin.channels.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Channels')
            ->has('channels.data', 1)
            ->where('channels.data.0.handle', 'testcreator')
            ->where('channels.data.0.profile_status', 'SUCCEEDED')
            ->where('channels.data.0.post_status', 'FAILED')
            ->where('channels.data.0.tracked_by_users_count', 1)
            ->where('channels.data.0.stored_posts_count', 1)
            ->where('stats.total_channels', 1)
        );
    }

    public function test_regular_user_cannot_access_channels_console(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('admin.channels.index'));

        $response->assertForbidden();
    }

    public function test_super_admin_can_retry_profile_scrape_for_channel(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $channel = Channel::query()->create([
            'handle' => 'retryprofile',
            'name' => 'Retry Profile',
            'platform' => 'instagram',
            'apify_profile_run_status' => 'FAILED',
        ]);

        $mock = Mockery::mock(InstagramScraperService::class);
        $mock->shouldReceive('initiateProfileScrape')
            ->once()
            ->with(Mockery::type(Channel::class))
            ->andReturn('run_profile_123');
        $this->app->instance(InstagramScraperService::class, $mock);

        $response = $this->actingAs($admin)
            ->post(route('admin.channels.retry-profile', $channel->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');
    }

    public function test_super_admin_can_retry_post_scrape_for_channel(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $channel = Channel::query()->create([
            'handle' => 'retrypost',
            'name' => 'Retry Post',
            'platform' => 'instagram',
            'is_private' => false,
            'apify_profile_run_status' => 'SUCCEEDED',
            'apify_post_run_status' => 'FAILED',
        ]);

        $mock = Mockery::mock(InstagramScraperService::class);
        $mock->shouldReceive('initiatePostScrape')
            ->once()
            ->with(Mockery::type(Channel::class))
            ->andReturn('run_post_123');
        $this->app->instance(InstagramScraperService::class, $mock);

        $response = $this->actingAs($admin)
            ->post(route('admin.channels.retry-post', $channel->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');
    }

    public function test_retry_post_requires_successful_profile_scrape(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $channel = Channel::query()->create([
            'handle' => 'notready',
            'name' => 'Not Ready',
            'platform' => 'instagram',
            'apify_profile_run_status' => 'FAILED',
        ]);

        $mock = Mockery::mock(InstagramScraperService::class);
        $mock->shouldNotReceive('initiatePostScrape');
        $this->app->instance(InstagramScraperService::class, $mock);

        $response = $this->actingAs($admin)
            ->post(route('admin.channels.retry-post', $channel->id));

        $response->assertRedirect();
        $response->assertSessionHas('error');
    }
}
