<?php

namespace Tests\Feature;

use App\Models\InstagramAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class MetaTestPermissionsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_calls_permission_endpoints_and_logs_meta_responses(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => '17841476393626062',
            'fb_page_id' => 'page-permission-test',
            'username' => 'scanmysocialtest',
            'access_token' => 'token-permission-test',
            'status' => 'active',
        ]);

        Log::spy();

        Http::fake(function (HttpRequest $request) {
            $url = $request->url();

            if ($request->method() === 'GET' && str_starts_with($url, 'https://graph.instagram.com/v25.0/me')) {
                return Http::response([
                    'user_id' => '17841476393626062',
                    'username' => 'scanmysocialtest',
                ], 200, ['x-fb-trace-id' => 'trace-business-basic']);
            }

            if ($request->method() === 'GET' && str_starts_with($url, 'https://graph.facebook.com/v25.0/me')) {
                return Http::response([
                    'id' => '123456789',
                    'name' => 'Scan My Social',
                ], 200, ['x-fb-trace-id' => 'trace-public-profile']);
            }

            if ($request->method() === 'GET' && str_starts_with($url, 'https://graph.instagram.com/v25.0/17841476393626062/media')) {
                return Http::response([
                    'data' => [
                        ['id' => '17990000000000001'],
                    ],
                ], 200, ['x-fb-trace-id' => 'trace-media']);
            }

            if ($request->method() === 'GET' && str_starts_with($url, 'https://graph.instagram.com/v25.0/17841476393626062/insights')) {
                return Http::response([
                    'data' => [
                        ['name' => 'impressions', 'values' => [['value' => 10]]],
                    ],
                ], 200, ['x-fb-trace-id' => 'trace-insights']);
            }

            if ($request->method() === 'GET' && str_starts_with($url, 'https://graph.instagram.com/v25.0/17990000000000001/comments')) {
                return Http::response([
                    'data' => [
                        ['id' => '18000000000000001', 'text' => 'price'],
                    ],
                ], 200, ['x-fb-trace-id' => 'trace-comments']);
            }

            if ($request->method() === 'POST' && str_starts_with($url, 'https://graph.instagram.com/v25.0/17841476393626062/messages')) {
                return Http::response([
                    'recipient_id' => '4426984597620829',
                    'message_id' => 'mid.123',
                ], 200, ['x-fb-trace-id' => 'trace-messages']);
            }

            return Http::response(['error' => ['message' => 'Unhandled test URL']], 404);
        });

        $this->artisan('meta:test-permissions', [
            '--account-id' => (string) $account->id,
            '--recipient-ig-id' => '4426984597620829',
        ])->assertExitCode(0);

        Http::assertSentCount(8);

        Http::assertSent(function (HttpRequest $request): bool {
            return $request->method() === 'GET'
                && str_starts_with($request->url(), 'https://graph.instagram.com/v25.0/me');
        });

        Http::assertSent(function (HttpRequest $request): bool {
            return $request->method() === 'GET'
                && str_starts_with($request->url(), 'https://graph.facebook.com/v25.0/me');
        });

        Http::assertSent(function (HttpRequest $request): bool {
            return $request->method() === 'GET'
                && str_starts_with($request->url(), 'https://graph.instagram.com/v25.0/17841476393626062/media');
        });

        Http::assertSent(function (HttpRequest $request): bool {
            return $request->method() === 'GET'
                && str_starts_with($request->url(), 'https://graph.instagram.com/v25.0/17841476393626062/insights');
        });

        Http::assertSent(function (HttpRequest $request): bool {
            return $request->method() === 'GET'
                && str_starts_with($request->url(), 'https://graph.instagram.com/v25.0/17990000000000001/comments');
        });

        Http::assertSent(function (HttpRequest $request): bool {
            return $request->method() === 'POST'
                && str_starts_with($request->url(), 'https://graph.instagram.com/v25.0/17841476393626062/messages');
        });

        Log::shouldHaveReceived('info')
            ->withArgs(function (string $message, array $context): bool {
                return $message === 'Meta permission API test response'
                    && ($context['permission'] ?? null) === 'instagram_business_basic'
                    && array_key_exists('response_body', $context);
            })
            ->once();

        Log::shouldHaveReceived('info')
            ->withArgs(function (string $message, array $context): bool {
                return $message === 'Meta permission API test response'
                    && ($context['permission'] ?? null) === 'instagram_business_manage_messages'
                    && ($context['method'] ?? null) === 'POST';
            })
            ->once();
    }
}
