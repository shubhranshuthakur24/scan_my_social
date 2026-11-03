<?php

namespace Tests\Feature;

use App\Services\MetaApiService;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MetaApiServiceTokenExchangeTest extends TestCase
{
    public function test_long_lived_token_exchange_uses_fallback_candidates_when_primary_endpoint_fails(): void
    {
        config(['services.meta.client_id' => 'test-client']);
        config(['services.meta.client_secret' => 'test-secret']);

        Http::fake(function (HttpRequest $request) {
            if ($request->method() === 'GET' && str_starts_with($request->url(), 'https://graph.instagram.com/access_token')) {
                return Http::response([
                    'error' => [
                        'message' => 'Unsupported request - method type: get',
                        'type' => 'IGApiException',
                        'code' => 100,
                    ],
                ], 400);
            }

            if ($request->method() === 'GET' && str_starts_with($request->url(), 'https://graph.instagram.com/v25.0/access_token')) {
                return Http::response([
                    'access_token' => 'long-lived-token-123',
                    'token_type' => 'bearer',
                    'expires_in' => 5183944,
                ], 200);
            }

            return Http::response([], 500);
        });

        $service = app(MetaApiService::class);
        $token = $service->getLongLivedToken('short-lived-token-123');

        $this->assertSame('long-lived-token-123', $token);
    }

    public function test_long_lived_token_exchange_returns_null_when_all_candidates_fail(): void
    {
        config(['services.meta.client_id' => 'test-client']);
        config(['services.meta.client_secret' => 'test-secret']);

        Http::fake(fn () => Http::response([
            'error' => [
                'message' => 'Unsupported request - method type',
                'type' => 'IGApiException',
                'code' => 100,
            ],
        ], 400));

        $service = app(MetaApiService::class);
        $token = $service->getLongLivedToken('short-lived-token-abc');

        $this->assertNull($token);
    }

    public function test_long_lived_token_exchange_does_not_call_facebook_graph_for_instagram_login_tokens(): void
    {
        config([
            'services.meta.client_id' => 'test-client',
            'services.meta.client_secret' => 'test-secret',
        ]);

        Http::fake(function (HttpRequest $request) {
            if (str_contains($request->url(), 'graph.facebook.com')) {
                $this->fail('Instagram Login token exchange should not call Facebook Graph token endpoints.');
            }

            return Http::response([
                'error' => [
                    'message' => 'Unsupported request - method type',
                    'type' => 'IGApiException',
                    'code' => 100,
                ],
            ], 400);
        });

        $service = app(MetaApiService::class);
        $token = $service->getLongLivedToken('short-lived-token-fallback');

        $this->assertNull($token);
    }
}
