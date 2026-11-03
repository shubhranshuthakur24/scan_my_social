<?php

namespace Tests\Feature;

use App\Services\MetaApiService;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class MetaApiServiceContentPublishingTest extends TestCase
{
    public function test_create_media_container_logs_request_payload_on_failure(): void
    {
        Log::spy();

        Http::fake(fn (HttpRequest $request) => Http::response([
            'error' => [
                'message' => 'Invalid parameter',
                'type' => 'OAuthException',
                'code' => 100,
            ],
        ], 400));

        $payload = [
            'media_type' => 'REELS',
            'video_url' => 'https://cdn.example.com/r2-video.mp4',
            'share_to_feed' => true,
            'caption' => "R2 payload\n\n#viral",
        ];

        $response = app(MetaApiService::class)->createMediaContainer(
            'test-access-token',
            '17841476393626062',
            $payload
        );

        $this->assertFalse($response['success']);
        $this->assertSame(400, $response['status']);

        Log::shouldHaveReceived('error')
            ->once()
            ->with(
                'Meta content scheduler container creation failed',
                \Mockery::on(fn (array $context): bool => $context['ig_account_id'] === '17841476393626062'
                    && $context['status'] === 400
                    && ($context['request_payload']['video_url'] ?? null) === 'https://cdn.example.com/r2-video.mp4'
                    && ($context['request_payload']['media_type'] ?? null) === 'REELS')
            );
    }
}
