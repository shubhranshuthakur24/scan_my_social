<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Post;
use App\Services\InstagramScraperService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InstagramRefreshPostSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_refreshes_audio_url_for_direct_post_runs_even_when_type_is_not_video(): void
    {
        config([
            'services.apify.token' => 'test-token',
            'services.apify.actor_id' => 'test-actor',
            'services.apify.actor_post_refresh' => 'test-refresh-actor',
        ]);

        $channel = Channel::create([
            'handle' => 'testuser',
            'platform' => 'instagram',
        ]);

        $post = Post::create([
            'channel_id' => $channel->id,
            'platform' => 'instagram',
            'post_id' => 'post_123',
            'short_code' => 'ABC123',
            'url' => 'https://www.instagram.com/p/ABC123/',
            'audio_url' => 'https://cdn.instagram.com/expired.mp3',
            'is_transcribed' => false,
        ]);

        Http::fake([
            'https://api.apify.com/v2/acts/test-refresh-actor/runs' => Http::response([
                'data' => [
                    'id' => 'run_1',
                    'status' => 'RUNNING',
                ],
            ], 201),
            'https://api.apify.com/v2/actor-runs/run_1' => Http::response([
                'data' => [
                    'status' => 'SUCCEEDED',
                ],
            ]),
            'https://api.apify.com/v2/actor-runs/run_1/dataset/items' => Http::response([
                [
                    'id' => 'different-id',
                    'shortCode' => 'ABC123',
                    'type' => 'Reel',
                    'url' => 'https://www.instagram.com/reel/ABC123/',
                    'audioUrl' => 'https://cdn.instagram.com/fresh.mp3',
                    'likesCount' => 123,
                    'commentsCount' => 9,
                    'videoViewCount' => 4567,
                ],
            ]),
        ]);

        $service = app(InstagramScraperService::class);

        $this->assertTrue($service->refreshPostSync($post, 30));

        $post->refresh();
        $this->assertSame('https://cdn.instagram.com/fresh.mp3', $post->audio_url);
        $this->assertSame('https://www.instagram.com/reel/ABC123/', $post->url);
        $this->assertSame(123, $post->likes_count);
        $this->assertSame(9, $post->comments_count);
        $this->assertSame(4567, $post->video_view_count);

        Http::assertSent(function (Request $request): bool {
            if ($request->url() !== 'https://api.apify.com/v2/acts/test-refresh-actor/runs') {
                return false;
            }

            $directUrls = $request['directUrls'];

            return is_array($directUrls)
                && in_array('https://www.instagram.com/p/ABC123/', $directUrls, true)
                && in_array('https://www.instagram.com/reel/ABC123/', $directUrls, true)
                && $request['resultsLimit'] === 5;
        });
    }
}
