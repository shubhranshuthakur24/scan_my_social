<?php

namespace Tests\Feature;

use App\Jobs\DownloadPostMediaJob;
use App\Models\Channel;
use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DownloadPostMediaJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_reuses_existing_localized_media_without_http_download(): void
    {
        config(['filesystems.upload_disk' => 'public']);
        Storage::fake('public');
        Http::fake();

        $channel = Channel::create([
            'handle' => 'test_channel_'.uniqid(),
            'platform' => 'instagram',
        ]);

        $post = Post::create([
            'channel_id' => $channel->id,
            'platform' => 'instagram',
            'post_id' => 'test_post_'.uniqid(),
            'display_url' => 'https://cdn.example.com/original.jpg',
        ]);

        $sourceUrl = 'https://cdn.example.com/media/reused.png?cache=1';
        $existingPath = 'viral/images/media_'.md5($sourceUrl).'.png';
        Storage::disk('public')->put($existingPath, 'cached-image');

        $job = new DownloadPostMediaJob($post->id, 'post', $sourceUrl, 'display_url');
        $job->handle();

        $this->assertSame($existingPath, $post->fresh()->getRawOriginal('display_url'));
        Http::assertNotSent(fn (Request $request): bool => $request->url() === $sourceUrl);
    }

    public function test_unique_id_is_stable_for_same_payload_and_differs_for_different_payloads(): void
    {
        $jobOne = new DownloadPostMediaJob(11, 'post', 'https://cdn.example.com/a.jpg', 'profile_picture_url');
        $jobTwo = new DownloadPostMediaJob(11, 'post', 'https://cdn.example.com/a.jpg', 'profile_image_url');
        $jobThree = new DownloadPostMediaJob(12, 'post', 'https://cdn.example.com/a.jpg', 'profile_image_url');

        $this->assertSame($jobOne->uniqueId(), $jobTwo->uniqueId());
        $this->assertNotSame($jobOne->uniqueId(), $jobThree->uniqueId());
    }
}
