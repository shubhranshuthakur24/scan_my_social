<?php

namespace Tests\Feature;

use App\Jobs\SyncScheduledPostAnalyticsJob;
use App\Models\InstagramAccount;
use App\Models\ScheduledPost;
use App\Models\ScheduledPostAnalyticsSnapshot;
use App\Models\User;
use App\Services\MetaApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class SyncScheduledPostAnalyticsJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_requests_format_aware_metrics_and_saves_snapshot(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'status' => 'active',
            'access_token' => 'mock-access-token',
        ]);

        $post = ScheduledPost::factory()->for($user)->create([
            'instagram_account_id' => $account->id,
            'status' => ScheduledPost::STATUS_PUBLISHED,
            'meta_media_id' => 'meta-media-12345',
            'format' => 'image',
            'published_at' => now(),
        ]);

        $metaApiService = Mockery::mock(MetaApiService::class);
        $metaApiService->shouldReceive('fetchMediaInsights')
            ->once()
            ->with(
                'mock-access-token',
                'meta-media-12345',
                ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'total_interactions']
            )
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => [
                    'data' => [
                        ['name' => 'reach', 'values' => [['value' => 120]]],
                        ['name' => 'views', 'values' => [['value' => 350]]],
                        ['name' => 'likes', 'values' => [['value' => 45]]],
                        ['name' => 'comments', 'values' => [['value' => 5]]],
                        ['name' => 'shares', 'values' => [['value' => 3]]],
                        ['name' => 'saved', 'values' => [['value' => 8]]],
                        ['name' => 'total_interactions', 'values' => [['value' => 61]]],
                    ],
                ],
            ]);

        $job = new SyncScheduledPostAnalyticsJob($user->id);
        $job->handle($metaApiService);

        $snapshot = ScheduledPostAnalyticsSnapshot::where('scheduled_post_id', $post->id)->first();
        $this->assertNotNull($snapshot);
        $this->assertEquals(120, $snapshot->reach);
        $this->assertEquals(350, $snapshot->impressions);
        $this->assertEquals(45, $snapshot->likes);
        $this->assertEquals(5, $snapshot->comments);
        $this->assertEquals(3, $snapshot->shares);
        $this->assertEquals(8, $snapshot->saves);
        $this->assertEquals(61, $snapshot->engagement);
    }

    public function test_job_retries_without_unsupported_metric_on_fallback(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'status' => 'active',
            'access_token' => 'mock-access-token',
        ]);

        $post = ScheduledPost::factory()->for($user)->create([
            'instagram_account_id' => $account->id,
            'status' => ScheduledPost::STATUS_PUBLISHED,
            'meta_media_id' => 'meta-media-fallback',
            'format' => 'image',
            'published_at' => now(),
        ]);

        $metaApiService = Mockery::mock(MetaApiService::class);

        // First attempt fails with unsupported metric error
        $metaApiService->shouldReceive('fetchMediaInsights')
            ->once()
            ->with(
                'mock-access-token',
                'meta-media-fallback',
                ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'total_interactions']
            )
            ->andReturn([
                'success' => false,
                'status' => 400,
                'payload' => [
                    'error' => [
                        'message' => 'The Media Insights API does not support the views metric for this media product type.',
                        'code' => 100,
                    ],
                ],
            ]);

        // Second attempt without 'views' succeeds
        $metaApiService->shouldReceive('fetchMediaInsights')
            ->once()
            ->with(
                'mock-access-token',
                'meta-media-fallback',
                ['reach', 'likes', 'comments', 'shares', 'saved', 'total_interactions']
            )
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => [
                    'data' => [
                        ['name' => 'reach', 'values' => [['value' => 50]]],
                        ['name' => 'likes', 'values' => [['value' => 10]]],
                        ['name' => 'comments', 'values' => [['value' => 1]]],
                        ['name' => 'shares', 'values' => [['value' => 0]]],
                        ['name' => 'saved', 'values' => [['value' => 2]]],
                        ['name' => 'total_interactions', 'values' => [['value' => 13]]],
                    ],
                ],
            ]);

        $job = new SyncScheduledPostAnalyticsJob($user->id);
        $job->handle($metaApiService);

        $snapshot = ScheduledPostAnalyticsSnapshot::where('scheduled_post_id', $post->id)->first();
        $this->assertNotNull($snapshot);
        $this->assertEquals(50, $snapshot->reach);
        $this->assertEquals(10, $snapshot->likes);
        $this->assertEquals(13, $snapshot->engagement);
    }
}
