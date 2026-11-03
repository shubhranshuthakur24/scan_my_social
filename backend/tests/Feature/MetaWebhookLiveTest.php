<?php

namespace Tests\Feature;

use App\Jobs\ProcessMetaWebhookJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MetaWebhookLiveTest extends TestCase
{
    use RefreshDatabase;
    public function test_meta_webhook_get_verification(): void
    {
        config(['services.meta.verify_token' => 'test_meta_verify_token']);

        $response = $this->get('/api/webhooks/meta?hub_mode=subscribe&hub_verify_token=test_meta_verify_token&hub_challenge=99887766');

        $response->assertStatus(200);
        $this->assertSame('99887766', $response->getContent());
    }

    public function test_meta_webhook_post_event_handling(): void
    {
        Queue::fake([ProcessMetaWebhookJob::class]);

        $appSecret = 'test_meta_app_secret_key_123';
        config(['services.meta.app_secret' => $appSecret]);

        $payload = [
            'object' => 'instagram',
            'entry' => [
                [
                    'id' => '1784140000000',
                    'time' => time(),
                    'changes' => [
                        [
                            'field' => 'comments',
                            'value' => [
                                'id' => 'comment_live_test_101',
                                'comment_id' => 'comment_live_test_101',
                                'text' => 'VIP',
                                'from' => ['id' => '555444333'],
                                'media' => ['id' => 'media_777888'],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $jsonPayload = (string) json_encode($payload);
        $signature = 'sha256=' . hash_hmac('sha256', $jsonPayload, $appSecret);

        $response = $this->call(
            method: 'POST',
            uri: '/api/webhooks/meta',
            parameters: [],
            cookies: [],
            files: [],
            server: [
                'HTTP_X_HUB_SIGNATURE_256' => $signature,
                'CONTENT_TYPE' => 'application/json',
            ],
            content: $jsonPayload
        );

        $response->assertStatus(200);
        $this->assertSame('EVENT_RECEIVED', $response->getContent());

        Queue::assertPushed(ProcessMetaWebhookJob::class);
    }
}
