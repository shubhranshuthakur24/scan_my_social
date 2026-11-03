<?php

namespace App\Console\Commands;

use App\Models\InstagramAccount;
use Illuminate\Console\Command;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaTestPermissionsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'meta:test-permissions
                            {--account-id= : Local instagram_accounts.id to use}
                            {--ig-account-id= : Instagram account id to use}
                            {--recipient-ig-id= : Instagram scoped recipient id used for messaging permission checks}
                            {--message=Meta permission API test from Scan My Social : Message text for messaging checks}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Call one Meta API endpoint per Instagram/Facebook permission and log full responses.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $recipientIgId = trim((string) $this->option('recipient-ig-id'));
        if ($recipientIgId === '') {
            $this->error('Missing --recipient-ig-id. Example: --recipient-ig-id=4426984597620829');

            return self::FAILURE;
        }

        $account = $this->resolveInstagramAccount();
        if (! $account) {
            $this->error('No eligible Instagram account found. Pass --account-id or --ig-account-id.');

            return self::FAILURE;
        }

        $accessToken = (string) $account->access_token;
        $igAccountId = (string) $account->ig_account_id;
        $messageText = trim((string) $this->option('message'));

        $this->info("Using IG account {$igAccountId} (local id {$account->id})");

        $results = [];

        $results[] = $this->testInstagramBusinessBasic($accessToken);
        $results[] = $this->testPublicProfile($accessToken);

        $mediaDiscoveryResponse = $this->requestMeta(
            permission: 'media_discovery',
            method: 'GET',
            url: "https://graph.instagram.com/v25.0/{$igAccountId}/media",
            query: [
                'fields' => 'id,caption,media_type,timestamp',
                'limit' => 1,
                'access_token' => $accessToken,
            ],
        );

        $mediaId = (string) data_get($mediaDiscoveryResponse->json(), 'data.0.id', '');
        $mediaId = trim($mediaId);

        $results[] = [
            'permission' => 'instagram_business_manage_insights',
            'method' => 'GET',
            'endpoint' => "https://graph.instagram.com/v25.0/{$igAccountId}/insights",
            'status' => null,
            'success' => false,
            'note' => '',
        ];

        $results[] = [
            'permission' => 'instagram_business_manage_comments',
            'method' => 'GET',
            'endpoint' => $mediaId !== '' ? "https://graph.instagram.com/v25.0/{$mediaId}/comments" : 'n/a',
            'status' => null,
            'success' => false,
            'note' => '',
        ];

        $results[] = [
            'permission' => 'instagram_manage_comments',
            'method' => 'GET',
            'endpoint' => $mediaId !== '' ? "https://graph.instagram.com/v25.0/{$mediaId}/comments" : 'n/a',
            'status' => null,
            'success' => false,
            'note' => '',
        ];

        if ($mediaId === '') {
            $skipReason = 'Skipped because media discovery returned no media.';
            $this->logSkippedPermission('instagram_business_manage_insights', $skipReason, $igAccountId);
            $this->logSkippedPermission('instagram_business_manage_comments', $skipReason, $igAccountId);
            $this->logSkippedPermission('instagram_manage_comments', $skipReason, $igAccountId);

            $results[2]['note'] = $skipReason;
            $results[3]['note'] = $skipReason;
            $results[4]['note'] = $skipReason;
        } else {
            $insightsResponse = $this->requestMeta(
                permission: 'instagram_business_manage_insights',
                method: 'GET',
                url: "https://graph.instagram.com/v25.0/{$igAccountId}/insights",
                query: [
                    'metric' => 'views',
                    'period' => 'day',
                    'access_token' => $accessToken,
                ],
            );

            $results[2]['status'] = $insightsResponse->status();
            $results[2]['success'] = $insightsResponse->successful();
            $results[2]['note'] = $insightsResponse->successful() ? 'ok' : 'Meta returned non-success status.';

            $businessCommentsResponse = $this->requestMeta(
                permission: 'instagram_business_manage_comments',
                method: 'GET',
                url: "https://graph.instagram.com/v25.0/{$mediaId}/comments",
                query: [
                    'fields' => 'id,text,username,timestamp',
                    'limit' => 1,
                    'access_token' => $accessToken,
                ],
            );

            $results[3]['status'] = $businessCommentsResponse->status();
            $results[3]['success'] = $businessCommentsResponse->successful();
            $results[3]['note'] = $businessCommentsResponse->successful() ? 'ok' : 'Meta returned non-success status.';

            $manageCommentsResponse = $this->requestMeta(
                permission: 'instagram_manage_comments',
                method: 'GET',
                url: "https://graph.instagram.com/v25.0/{$mediaId}/comments",
                query: [
                    'fields' => 'id,text,username,timestamp',
                    'limit' => 1,
                    'access_token' => $accessToken,
                ],
            );

            $results[4]['status'] = $manageCommentsResponse->status();
            $results[4]['success'] = $manageCommentsResponse->successful();
            $results[4]['note'] = $manageCommentsResponse->successful() ? 'ok' : 'Meta returned non-success status.';
        }

        $results[] = $this->testMessagePermission(
            permission: 'instagram_business_manage_messages',
            accessToken: $accessToken,
            igAccountId: $igAccountId,
            recipientIgId: $recipientIgId,
            messageText: "{$messageText} [instagram_business_manage_messages]",
        );

        $results[] = $this->testMessagePermission(
            permission: 'instagram_manage_messages',
            accessToken: $accessToken,
            igAccountId: $igAccountId,
            recipientIgId: $recipientIgId,
            messageText: "{$messageText} [instagram_manage_messages]",
        );

        $this->newLine();
        $this->table(
            ['Permission', 'Method', 'Endpoint', 'Status', 'Success', 'Note'],
            array_map(static function (array $result): array {
                return [
                    $result['permission'],
                    $result['method'],
                    $result['endpoint'],
                    $result['status'] === null ? '-' : (string) $result['status'],
                    $result['success'] ? 'yes' : 'no',
                    $result['note'],
                ];
            }, $results)
        );

        $failedCount = collect($results)->where('success', false)->count();
        $this->info("Completed permission checks. Failed or skipped: {$failedCount}");

        return self::SUCCESS;
    }

    private function resolveInstagramAccount(): ?InstagramAccount
    {
        $accountId = trim((string) $this->option('account-id'));
        if ($accountId !== '') {
            return InstagramAccount::query()->whereKey((int) $accountId)->first();
        }

        $igAccountId = trim((string) $this->option('ig-account-id'));
        if ($igAccountId !== '') {
            return InstagramAccount::query()->where('ig_account_id', $igAccountId)->first();
        }

        return InstagramAccount::query()
            ->where('status', 'active')
            ->orderByDesc('id')
            ->first();
    }

    private function httpClient(): PendingRequest
    {
        $verifySsl = config('services.meta.verify_ssl');

        if ($verifySsl === null || $verifySsl === '') {
            $verifySsl = ! app()->environment('local');
        }

        $client = Http::timeout(20);

        if (! $verifySsl) {
            $client = $client->withoutVerifying();
        }

        return $client;
    }

    private function testInstagramBusinessBasic(string $accessToken): array
    {
        $response = $this->requestMeta(
            permission: 'instagram_business_basic',
            method: 'GET',
            url: 'https://graph.instagram.com/v25.0/me',
            query: [
                'fields' => 'user_id,username,profile_picture_url',
                'access_token' => $accessToken,
            ],
        );

        return [
            'permission' => 'instagram_business_basic',
            'method' => 'GET',
            'endpoint' => 'https://graph.instagram.com/v25.0/me',
            'status' => $response->status(),
            'success' => $response->successful(),
            'note' => $response->successful() ? 'ok' : 'Meta returned non-success status.',
        ];
    }

    private function testPublicProfile(string $accessToken): array
    {
        $response = $this->requestMeta(
            permission: 'public_profile',
            method: 'GET',
            url: 'https://graph.facebook.com/v25.0/me',
            query: [
                'fields' => 'id,name',
                'access_token' => $accessToken,
            ],
        );

        return [
            'permission' => 'public_profile',
            'method' => 'GET',
            'endpoint' => 'https://graph.facebook.com/v25.0/me',
            'status' => $response->status(),
            'success' => $response->successful(),
            'note' => $response->successful() ? 'ok' : 'Meta returned non-success status.',
        ];
    }

    private function testMessagePermission(
        string $permission,
        string $accessToken,
        string $igAccountId,
        string $recipientIgId,
        string $messageText
    ): array {
        $response = $this->requestMeta(
            permission: $permission,
            method: 'POST',
            url: "https://graph.instagram.com/v25.0/{$igAccountId}/messages",
            query: [],
            body: [
                'recipient' => ['id' => $recipientIgId],
                'message' => ['text' => $messageText],
            ],
            bearerToken: $accessToken,
        );

        return [
            'permission' => $permission,
            'method' => 'POST',
            'endpoint' => "https://graph.instagram.com/v25.0/{$igAccountId}/messages",
            'status' => $response->status(),
            'success' => $response->successful(),
            'note' => $response->successful() ? 'ok' : 'Meta returned non-success status.',
        ];
    }

    private function requestMeta(
        string $permission,
        string $method,
        string $url,
        array $query = [],
        array $body = [],
        ?string $bearerToken = null
    ): Response {
        $client = $this->httpClient();
        if ($bearerToken !== null && $bearerToken !== '') {
            $client = $client->withToken($bearerToken);
        }

        $response = strtoupper($method) === 'POST'
            ? $client->post($url, $body)
            : $client->get($url, $query);

        $this->logMetaResponse(
            permission: $permission,
            method: strtoupper($method),
            url: $url,
            response: $response,
            requestQuery: $query,
            requestBody: $body,
        );

        return $response;
    }

    private function logMetaResponse(
        string $permission,
        string $method,
        string $url,
        Response $response,
        array $requestQuery = [],
        array $requestBody = []
    ): void {
        Log::info('Meta permission API test response', [
            'permission' => $permission,
            'method' => $method,
            'url' => $url,
            'status' => $response->status(),
            'successful' => $response->successful(),
            'headers' => $response->headers(),
            'request_query' => $requestQuery,
            'request_body' => $requestBody,
            'response_json' => $response->json(),
            'response_body' => $response->body(),
        ]);
    }

    private function logSkippedPermission(string $permission, string $reason, string $igAccountId): void
    {
        Log::warning('Meta permission API test skipped', [
            'permission' => $permission,
            'ig_account_id' => $igAccountId,
            'reason' => $reason,
        ]);
    }
}
