<?php

namespace App\Services;

use App\Models\AutomationFlow;
use App\Models\InstagramAccount;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MetaApiService
{
    protected string $graphUrl = 'https://graph.instagram.com/v25.0/';

    protected function httpClient(): PendingRequest
    {
        $verifySsl = config('services.meta.verify_ssl');

        if ($verifySsl === null || $verifySsl === '') {
            $verifySsl = ! app()->environment('local');
        }

        $client = Http::timeout(15);

        if (! $verifySsl) {
            $client = $client->withoutVerifying();
        }

        return $client;
    }

    /**
     * Send DM via Instagram Messaging API (Instagram Login)
     */
    public function sendMessage(string $accessToken, string $igAccountId, string $recipientId, string $messageText): array
    {
        $messageText = $this->truncateMessage($messageText);
        $payload = [
            'recipient' => ['id' => $recipientId],
            'message' => ['text' => $messageText],
        ];

        $response = $this->httpClient()
            ->withToken($accessToken)
            ->post($this->graphUrl.$igAccountId.'/messages', $payload);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Meta DM failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Non-core helper: send message with one quick-reply CTA.
     * AutoDM production flow uses button templates instead.
     */
    public function sendQuickReplyMessage(
        string $accessToken,
        string $igAccountId,
        string $recipientId,
        string $messageText,
        string $buttonTitle,
        ?string $buttonPayload = null
    ): array {
        $normalizedButtonTitle = trim($buttonTitle);
        if ($normalizedButtonTitle === '') {
            return $this->sendMessage($accessToken, $igAccountId, $recipientId, $messageText);
        }

        $messageText = $this->truncateMessage($messageText);
        $payload = [
            'recipient' => ['id' => $recipientId],
            'message' => [
                'text' => $messageText,
                'quick_replies' => [[
                    'content_type' => 'text',
                    'title' => $normalizedButtonTitle,
                    'payload' => $buttonPayload ?: ('AUTODM_BTN_'.md5($normalizedButtonTitle)),
                ]],
            ],
        ];

        $response = $this->httpClient()
            ->withToken($accessToken)
            ->post($this->graphUrl.$igAccountId.'/messages', $payload);

        if ($response->successful()) {
            return [
                'success' => true,
                'status' => $response->status(),
                'payload' => $response->json() ?? [],
            ];
        }

        $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
        Log::warning('Meta quick reply message failed; falling back to plain text', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        $fallbackText = trim($messageText."\n\nTap \"".$normalizedButtonTitle.'" to continue.');
        $fallback = $this->sendMessage($accessToken, $igAccountId, $recipientId, $fallbackText);

        return [
            'success' => $fallback['success'],
            'status' => $fallback['status'],
            'payload' => [
                'quick_reply_supported' => false,
                'quick_reply_error' => $response->json() ?? ['body' => $response->body()],
                'fallback' => $fallback['payload'],
            ],
        ];
    }

    /**
     * Non-core helper: send message with multiple quick-reply CTAs.
     * AutoDM production flow uses button templates instead.
     *
     * @param  array<int, array{title:string, payload?:string|null}>  $buttons
     */
    public function sendQuickReplyMessageWithButtons(
        string $accessToken,
        string $igAccountId,
        string $recipientId,
        string $messageText,
        array $buttons
    ): array {
        $normalizedButtons = collect($buttons)
            ->map(function ($button) {
                $title = trim((string) ($button['title'] ?? ''));
                if ($title === '') {
                    return null;
                }

                return [
                    'content_type' => 'text',
                    'title' => $title,
                    'payload' => $button['payload'] ?? ('AUTODM_BTN_'.md5($title)),
                ];
            })
            ->filter()
            ->values()
            ->all();

        if (empty($normalizedButtons)) {
            return $this->sendMessage($accessToken, $igAccountId, $recipientId, $messageText);
        }

        $messageText = $this->truncateMessage($messageText);
        $payload = [
            'recipient' => ['id' => $recipientId],
            'message' => [
                'text' => $messageText,
                'quick_replies' => $normalizedButtons,
            ],
        ];

        $response = $this->httpClient()
            ->withToken($accessToken)
            ->post($this->graphUrl.$igAccountId.'/messages', $payload);

        if ($response->successful()) {
            return [
                'success' => true,
                'status' => $response->status(),
                'payload' => $response->json() ?? [],
            ];
        }

        $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
        Log::warning('Meta quick reply message failed; falling back to plain text', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        $buttonLabels = collect($normalizedButtons)
            ->pluck('title')
            ->map(fn ($label) => '"'.$label.'"')
            ->values();

        $fallbackText = $messageText;
        if ($buttonLabels->isNotEmpty()) {
            $fallbackText = trim($messageText."\n\nChoose: ".$buttonLabels->implode(' / '));
        }

        $fallback = $this->sendMessage($accessToken, $igAccountId, $recipientId, $fallbackText);

        return [
            'success' => $fallback['success'],
            'status' => $fallback['status'],
            'payload' => [
                'quick_reply_supported' => false,
                'quick_reply_error' => $response->json() ?? ['body' => $response->body()],
                'fallback' => $fallback['payload'],
            ],
        ];
    }

    /**
     * Send button template message (web_url/postback buttons).
     *
     * @param  array<int, array{type:string,title:string,url?:string|null,payload?:string|null}>  $buttons
     */
    public function sendButtonTemplateMessage(
        string $accessToken,
        string $igAccountId,
        string $recipientId,
        string $messageText,
        array $buttons
    ): array {
        $normalizedButtons = $this->normalizeTemplateButtons($buttons);

        if (empty($normalizedButtons)) {
            return $this->sendMessage($accessToken, $igAccountId, $recipientId, $messageText);
        }

        Log::info('Meta button template send request', [
            'ig_account_id' => $igAccountId,
            'recipient_id' => $recipientId,
            'message_length' => mb_strlen($messageText),
            'buttons' => $normalizedButtons,
        ]);

        $messageText = $this->truncateMessage($messageText);
        $payload = [
            'recipient' => ['id' => $recipientId],
            'message' => [
                'attachment' => [
                    'type' => 'template',
                    'payload' => [
                        'template_type' => 'button',
                        'text' => $messageText,
                        'buttons' => $normalizedButtons,
                    ],
                ],
            ],
        ];

        $response = $this->httpClient()
            ->withToken($accessToken)
            ->post($this->graphUrl.$igAccountId.'/messages', $payload);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Meta button template message failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        } else {
            Log::info('Meta button template message sent', [
                'ig_account_id' => $igAccountId,
                'recipient_id' => $recipientId,
                'status' => $response->status(),
                'payload' => $response->json() ?? [],
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Send a comment private reply with button template via /{comment-id}/private_replies.
     *
     * @param  array<int, array{type:string,title:string,url?:string|null,payload?:string|null}>  $buttons
     */
    public function sendCommentPrivateReplyWithButtons(
        string $accessToken,
        string $igAccountId,
        string $commentId,
        string $messageText,
        array $buttons
    ): array {
        $normalizedButtons = $this->normalizeTemplateButtons($buttons);

        if (empty($normalizedButtons)) {
            return $this->sendCommentPrivateReply($accessToken, $igAccountId, $commentId, $messageText);
        }

        Log::info('Meta comment private reply template send request', [
            'comment_id' => $commentId,
            'message_length' => mb_strlen($messageText),
            'buttons' => $normalizedButtons,
        ]);

        $messageText = $this->truncateMessage($messageText);
        $payload = [
            'message' => [
                'attachment' => [
                    'type' => 'template',
                    'payload' => [
                        'template_type' => 'button',
                        'text' => $messageText,
                        'buttons' => $normalizedButtons,
                    ],
                ],
            ],
        ];

        $response = $this->httpClient()
            ->withToken($accessToken)
            ->post($this->graphUrl.$commentId.'/private_replies', $payload);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Meta comment private reply template failed', [
                'comment_id' => $commentId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            if ($this->shouldFallbackToLegacyCommentRecipient($response)) {
                Log::warning('Meta comment private reply template unsupported; falling back to legacy messages endpoint', [
                    'comment_id' => $commentId,
                    'status' => $response->status(),
                ]);

                return $this->sendLegacyCommentPrivateReplyWithButtons(
                    $accessToken,
                    $igAccountId,
                    $commentId,
                    $messageText,
                    $normalizedButtons
                );
            }
        } else {
            Log::info('Meta comment private reply template sent', [
                'comment_id' => $commentId,
                'status' => $response->status(),
                'payload' => $response->json() ?? [],
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Send image message via Instagram Messaging API using media URL.
     */
    public function sendImageMessage(string $accessToken, string $igAccountId, string $recipientId, string $mediaUrl): array
    {
        $payload = [
            'recipient' => ['id' => $recipientId],
            'message' => [
                'attachment' => [
                    'type' => 'image',
                    'payload' => [
                        'url' => $mediaUrl,
                    ],
                ],
            ],
        ];

        $response = $this->httpClient()
            ->withToken($accessToken)
            ->post($this->graphUrl.$igAccountId.'/messages', $payload);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Meta image DM failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Send a public reply directly under an Instagram comment.
     */
    public function sendPublicCommentReply(string $accessToken, string $commentId, string $messageText): array
    {
        $messageText = $this->truncateMessage($messageText);
        $payload = [
            'message' => $messageText,
            'access_token' => $accessToken,
        ];

        $response = $this->httpClient()
            ->asForm()
            ->post($this->graphUrl.$commentId.'/replies', $payload);

        if (! $response->successful()) {
            Log::error('Meta public comment reply failed', [
                'comment_id' => $commentId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Send one-time private reply to an Instagram comment via comment_id.
     */
    public function sendCommentPrivateReply(string $accessToken, string $igAccountId, string $commentId, string $messageText): array
    {
        $messageText = $this->truncateMessage($messageText);
        $payload = [
            'message' => $messageText,
        ];

        $response = $this->httpClient()
            ->withToken($accessToken)
            ->post($this->graphUrl.$commentId.'/private_replies', $payload);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Meta comment private reply failed', [
                'comment_id' => $commentId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            if ($this->shouldFallbackToLegacyCommentRecipient($response)) {
                Log::warning('Meta comment private reply unsupported; falling back to legacy messages endpoint', [
                    'comment_id' => $commentId,
                    'status' => $response->status(),
                ]);

                return $this->sendLegacyCommentPrivateReplyText(
                    $accessToken,
                    $igAccountId,
                    $commentId,
                    $messageText
                );
            }
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Fetch Instagram account (Instagram Login flow)
     */
    public function fetchInstagramAccountsFromToken(string $accessToken, ?int $instagramAccountId = null): array
    {
        $response = $this->httpClient()->get($this->graphUrl.'me', [
            'fields' => 'user_id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count',
            'access_token' => $accessToken,
        ]);

        if (! $response->successful()) {
            $errorMessage = strtolower((string) $response->json('error.message', ''));
            $shouldFallback = str_contains($errorMessage, 'profile_picture_url')
                || str_contains($errorMessage, 'field');

            if ($shouldFallback) {
                $response = $this->httpClient()->get($this->graphUrl.'me', [
                    'fields' => 'user_id,username,name,biography,followers_count,follows_count,media_count',
                    'access_token' => $accessToken,
                ]);
            }
        }

        if ($response->successful()) {
            $data = $response->json();

            // Handle standard object or 'data' array mentioned in user docs
            $accountData = $data['data'][0] ?? $data;
            $username = trim((string) ($accountData['username'] ?? ''));
            $username = $username !== '' ? ltrim($username, '@') : null;
            $profilePictureUrl = trim((string) ($accountData['profile_picture_url'] ?? ''));

            return [
                [
                    'ig_id' => $accountData['user_id'] ?? $accountData['id'] ?? null,
                    'username' => $username,
                    'name' => trim((string) ($accountData['name'] ?? '')),
                    'biography' => (string) ($accountData['biography'] ?? ''),
                    'profile_url' => $this->buildInstagramProfileUrl($username),
                    'profile_picture_url' => $profilePictureUrl !== '' ? $profilePictureUrl : null,
                    'followers_count' => (int) ($accountData['followers_count'] ?? 0),
                    'following_count' => (int) ($accountData['follows_count'] ?? 0),
                    'follows_count' => (int) ($accountData['follows_count'] ?? 0),
                    'media_count' => (int) ($accountData['media_count'] ?? 0),
                ],
            ];
        }

        $this->disconnectOnInvalidAccessToken($response, $instagramAccountId);
        Log::error('Failed fetching IG account', ['body' => $response->body()]);

        return [];
    }

    /**
     * Exchange short-lived access token for a long-lived access token (60 days)
     */
    public function getLongLivedToken(string $shortLivedToken): ?string
    {
        $params = [
            'grant_type' => 'ig_exchange_token',
            'client_secret' => config('services.meta.client_secret'),
            'access_token' => $shortLivedToken,
        ];

        $exchangeAttempts = [];

        // For the new Instagram Business Login flow (instagram_business_* scopes),
        // the exchange endpoint supports GET with query-string parameters.
        // We keep a POST fallback for any edge-case / legacy flow.
        $candidates = [
            ['method' => 'GET', 'url' => 'https://graph.instagram.com/access_token', 'params' => $params],
            ['method' => 'GET', 'url' => rtrim($this->graphUrl, '/').'/access_token', 'params' => $params],
            ['method' => 'POST', 'url' => 'https://graph.instagram.com/access_token', 'params' => $params],
            ['method' => 'POST', 'url' => rtrim($this->graphUrl, '/').'/access_token', 'params' => $params],
        ];

        foreach ($candidates as $candidate) {
            $method = $candidate['method'];
            $url = $candidate['url'];
            $candidateParams = $candidate['params'];

            $response = $method === 'POST'
                ? $this->httpClient()->asForm()->post($url, $candidateParams)
                : $this->httpClient()->get($url, $candidateParams);

            if ($response->successful()) {
                return $response->json('access_token');
            }

            $body = $response->body();
            $errorCode = $response->json('error.code');

            // Token is already invalid/expired — no point retrying further candidates.
            if (in_array($errorCode, [190, 102, 104], true)) {
                Log::warning('AutoDM long-lived token exchange: short-lived token is already invalid', [
                    'error_code' => $errorCode,
                    'body' => $body,
                ]);

                return null;
            }

            $exchangeAttempts[] = [
                'method' => $method,
                'url' => $url,
                'status' => $response->status(),
                'body' => $body,
            ];
        }

        Log::warning('Failed to exchange for long-lived token', ['attempts' => $exchangeAttempts]);

        return null;
    }

    /**
     * Exchange short-lived code for token
     */
    public function exchangeCodeForToken(string $code, ?string $redirectUri = null): ?string
    {
        $redirect = $redirectUri ?: config('services.meta.redirect');

        $response = $this->httpClient()->asForm()->post('https://api.instagram.com/oauth/access_token', [
            'client_id' => config('services.meta.client_id'),
            'client_secret' => config('services.meta.client_secret'),
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirect,
            'code' => $code,
        ]);

        if (! $response->successful() || ! $response->json('access_token')) {
            Log::warning('AutoDM code exchange failed', [
                'status' => $response->status(),
                'redirect_uri' => $redirect,
                'body' => $response->body(),
            ]);
        }

        return $response->json('access_token');
    }

    /**
     * Fetch media for UI selection
     */
    public function fetchUserMedia(string $accessToken, string $igAccountId, ?string $after = null, int $limit = 20): array
    {
        $safeLimit = max(1, min($limit, 50));
        $cacheKey = implode(':', [
            'autodm',
            'media',
            $igAccountId,
            $safeLimit,
            $after ?: 'first',
        ]);

        return Cache::remember($cacheKey, now()->addMinutes(2), function () use ($accessToken, $igAccountId, $after, $safeLimit) {
            $params = [
                'fields' => 'id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp',
                'access_token' => $accessToken,
                'limit' => $safeLimit,
            ];

            if ($after) {
                $params['after'] = $after;
            }

            $response = $this->httpClient()->get($this->graphUrl.$igAccountId.'/media', $params);

            if (! $response->successful()) {
                $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
                Log::error('Failed fetching media', [
                    'ig_account_id' => $igAccountId,
                    'status' => $response->status(),
                    'after' => $after,
                    'body' => $response->body(),
                ]);

                return [
                    'data' => [],
                    'paging' => [
                        'next_cursor' => null,
                        'has_next_page' => false,
                    ],
                ];
            }

            $payload = $response->json() ?? [];
            $nextCursor = data_get($payload, 'paging.cursors.after');
            $hasNextPage = filled(data_get($payload, 'paging.next')) && filled($nextCursor);

            return [
                'data' => $payload['data'] ?? [],
                'paging' => [
                    'next_cursor' => $nextCursor,
                    'has_next_page' => $hasNextPage,
                ],
            ];
        });
    }

    /**
     * Fetch active Instagram stories for UI selection.
     */
    public function fetchUserStories(string $accessToken, string $igAccountId, ?string $after = null, int $limit = 20): array
    {
        $safeLimit = max(1, min($limit, 50));
        $cacheKey = implode(':', [
            'autodm',
            'stories',
            $igAccountId,
            $safeLimit,
            $after ?: 'first',
        ]);

        return Cache::remember($cacheKey, now()->addMinutes(2), function () use ($accessToken, $igAccountId, $after, $safeLimit) {
            $params = [
                'fields' => 'id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp',
                'access_token' => $accessToken,
                'limit' => $safeLimit,
            ];

            if ($after) {
                $params['after'] = $after;
            }

            $response = $this->httpClient()->get($this->graphUrl.$igAccountId.'/stories', $params);

            if (! $response->successful()) {
                $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
                Log::error('Failed fetching stories', [
                    'ig_account_id' => $igAccountId,
                    'status' => $response->status(),
                    'after' => $after,
                    'body' => $response->body(),
                ]);

                return [
                    'data' => [],
                    'paging' => [
                        'next_cursor' => null,
                        'has_next_page' => false,
                    ],
                ];
            }

            $payload = $response->json() ?? [];
            $nextCursor = data_get($payload, 'paging.cursors.after');
            $hasNextPage = filled(data_get($payload, 'paging.next')) && filled($nextCursor);

            return [
                'data' => $payload['data'] ?? [],
                'paging' => [
                    'next_cursor' => $nextCursor,
                    'has_next_page' => $hasNextPage,
                ],
            ];
        });
    }

    /**
     * Fetch one media object by Instagram media ID.
     *
     * @return array<string, mixed>|null
     */
    public function fetchMediaById(string $accessToken, string $igAccountId, string $mediaId): ?array
    {
        $normalizedMediaId = trim($mediaId);
        if ($normalizedMediaId === '') {
            return null;
        }

        $cacheKey = implode(':', [
            'autodm',
            'media-item',
            $igAccountId,
            $normalizedMediaId,
        ]);

        return Cache::remember($cacheKey, now()->addMinutes(2), function () use ($accessToken, $igAccountId, $normalizedMediaId) {
            $response = $this->httpClient()->get($this->graphUrl.$normalizedMediaId, [
                'fields' => 'id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp',
                'access_token' => $accessToken,
            ]);

            if (! $response->successful()) {
                $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
                Log::warning('Failed fetching media by id', [
                    'ig_account_id' => $igAccountId,
                    'media_id' => $normalizedMediaId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return null;
            }

            $payload = $response->json() ?? [];
            $resolvedMediaId = trim((string) ($payload['id'] ?? ''));
            if ($resolvedMediaId === '') {
                return null;
            }

            return $payload;
        });
    }

    /**
     * Fetch existing comments for a media object (post/reel) from the Instagram Graph API.
     *
     * Returns up to $limit comments with id, text, from (sender ig_id), and timestamp.
     *
     * @return array{data: array<int, array{id: string, text?: string, from?: array{id: string}, timestamp?: string}>, paging: array{next_cursor: string|null, has_next_page: bool}}
     */
    public function fetchMediaComments(string $accessToken, string $igAccountId, string $mediaId, int $limit = 50, ?string $cursor = null): array
    {
        $safeLimit = max(1, min($limit, 50));

        $params = [
            'fields' => 'id,text,from,timestamp',
            'access_token' => $accessToken,
            'limit' => $safeLimit,
        ];

        if ($cursor) {
            $params['after'] = $cursor;
        }

        $response = $this->httpClient()->get($this->graphUrl.$mediaId.'/comments', $params);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Failed fetching media comments for retrigger', [
                'media_id' => $mediaId,
                'ig_account_id' => $igAccountId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'data' => [],
                'paging' => [
                    'next_cursor' => null,
                    'has_next_page' => false,
                ],
            ];
        }

        $payload = $response->json() ?? [];
        $nextCursor = data_get($payload, 'paging.cursors.after');
        $hasNextPage = filled(data_get($payload, 'paging.next')) && filled($nextCursor);

        return [
            'data' => $payload['data'] ?? [],
            'paging' => [
                'next_cursor' => $nextCursor,
                'has_next_page' => $hasNextPage,
            ],
        ];
    }

    /**
     * Create an Instagram publishing container.
     *
     * @param  array<string, mixed>  $payload
     * @return array{success: bool, status: int, payload: array<string, mixed>}
     */
    public function createMediaContainer(string $accessToken, string $igAccountId, array $payload): array
    {
        $response = $this->httpClient()
            ->withToken($accessToken)
            ->post($this->graphUrl.$igAccountId.'/media', $payload);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Meta content scheduler container creation failed', [
                'ig_account_id' => $igAccountId,
                'status' => $response->status(),
                'request_payload' => $payload,
                'body' => $response->body(),
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Publish an Instagram media container.
     *
     * @return array{success: bool, status: int, payload: array<string, mixed>}
     */
    public function publishMediaContainer(string $accessToken, string $igAccountId, string $creationId): array
    {
        $response = $this->httpClient()
            ->withToken($accessToken)
            ->post($this->graphUrl.$igAccountId.'/media_publish', [
                'creation_id' => $creationId,
            ]);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Meta content scheduler publish failed', [
                'ig_account_id' => $igAccountId,
                'creation_id' => $creationId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Check publishing readiness for an Instagram container.
     *
     * @return array{success: bool, status: int, payload: array<string, mixed>}
     */
    public function getMediaContainerStatus(string $accessToken, string $igAccountId, string $containerId): array
    {
        $response = $this->httpClient()
            ->withToken($accessToken)
            ->get($this->graphUrl.$containerId, [
                'fields' => 'id,status,status_code',
            ]);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Meta content scheduler container status check failed', [
                'ig_account_id' => $igAccountId,
                'container_id' => $containerId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Fetch media insights for analytics snapshots.
     *
     * @param  array<int, string>  $metrics
     * @return array{success: bool, status: int, payload: array<string, mixed>}
     */
    public function fetchMediaInsights(string $accessToken, string $mediaId, array $metrics): array
    {
        $response = $this->httpClient()->get($this->graphUrl.$mediaId.'/insights', [
            'metric' => implode(',', array_unique(array_filter($metrics))),
            'access_token' => $accessToken,
        ]);

        if (! $response->successful()) {
            $errorMessage = (string) data_get($response->json(), 'error.message', '');
            $isUnsupportedMetric = preg_match('/(does not support the [a-z0-9_]+ metric|incompatible metric|metric [a-z0-9_]+ is no longer supported)/i', $errorMessage) === 1;

            if (! $isUnsupportedMetric) {
                Log::warning('Meta content scheduler media insights failed', [
                    'media_id' => $mediaId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Fetch Instagram account insights for a date range.
     *
     * @param  array<int, string>  $metrics
     * @return array{success: bool, status: int, payload: array<string, mixed>}
     */
    public function fetchUserInsights(
        string $accessToken,
        string $igAccountId,
        array $metrics,
        string $period = 'day',
        ?int $since = null,
        ?int $until = null,
        ?string $metricType = null,
        ?string $breakdown = null,
    ): array {
        $params = [
            'metric' => implode(',', array_unique(array_filter($metrics))),
            'period' => $period,
            'access_token' => $accessToken,
        ];

        if ($since !== null) {
            $params['since'] = $since;
        }

        if ($until !== null) {
            $params['until'] = $until;
        }

        if ($metricType !== null && $metricType !== '') {
            $params['metric_type'] = $metricType;
        }

        if ($breakdown !== null && $breakdown !== '') {
            $params['breakdown'] = $breakdown;
        }

        $response = $this->httpClient()->get($this->graphUrl.$igAccountId.'/insights', $params);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::warning('Meta content scheduler user insights failed', [
                'ig_account_id' => $igAccountId,
                'status' => $response->status(),
                'params' => $params,
                'body' => $response->body(),
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    private function truncateMessage(string $text, int $maxLength = 1000): string
    {
        $normalized = trim((string) $text);
        if ($normalized === '') {
            return '';
        }

        if (Str::length($normalized) <= $maxLength) {
            return $normalized;
        }

        return Str::limit($normalized, $maxLength, '');
    }

    /**
     * @param  array<int, array{type:string,title:string,url?:string|null,payload?:string|null}>  $buttons
     * @return array<int, array{type:string,title:string,url?:string,payload?:string}>
     */
    private function normalizeTemplateButtons(array $buttons): array
    {
        return collect($buttons)
            ->map(function ($button) {
                $type = trim((string) ($button['type'] ?? ''));
                $title = trim((string) ($button['title'] ?? ''));

                if ($type === '' || $title === '') {
                    return null;
                }

                $title = Str::limit($title, 20, '');

                if ($type === 'web_url') {
                    $url = trim((string) ($button['url'] ?? ''));
                    if ($url === '') {
                        return null;
                    }

                    return [
                        'type' => 'web_url',
                        'title' => $title,
                        'url' => $url,
                    ];
                }

                if ($type === 'postback') {
                    $payload = trim((string) ($button['payload'] ?? ''));
                    if ($payload === '') {
                        $payload = 'AUTODM_BTN_'.md5($title);
                    }

                    return [
                        'type' => 'postback',
                        'title' => $title,
                        'payload' => $payload,
                    ];
                }

                return null;
            })
            ->filter()
            ->values()
            ->all();
    }

    private function shouldFallbackToLegacyCommentRecipient($response): bool
    {
        $status = (int) $response->status();
        $errorCode = (int) data_get($response->json() ?? [], 'error.code', 0);
        $errorSubcode = (int) data_get($response->json() ?? [], 'error.error_subcode', 0);
        $errorMessage = strtolower((string) data_get($response->json() ?? [], 'error.message', ''));

        if ($status !== 400) {
            return false;
        }

        if ($errorCode === 100 && $errorSubcode === 33) {
            return true;
        }

        return str_contains($errorMessage, 'unsupported post request')
            || str_contains($errorMessage, 'does not support this operation');
    }

    /**
     * @param  array<int, array{type:string,title:string,url?:string,payload?:string}>  $normalizedButtons
     */
    private function sendLegacyCommentPrivateReplyWithButtons(
        string $accessToken,
        string $igAccountId,
        string $commentId,
        string $messageText,
        array $normalizedButtons
    ): array {
        $payload = [
            'recipient' => ['comment_id' => $commentId],
            'message' => [
                'attachment' => [
                    'type' => 'template',
                    'payload' => [
                        'template_type' => 'button',
                        'text' => $this->truncateMessage($messageText),
                        'buttons' => $normalizedButtons,
                    ],
                ],
            ],
        ];

        $response = $this->httpClient()
            ->withToken($accessToken)
            ->post($this->graphUrl.$igAccountId.'/messages', $payload);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Meta legacy comment private reply template failed', [
                'ig_account_id' => $igAccountId,
                'comment_id' => $commentId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        } else {
            Log::info('Meta legacy comment private reply template sent', [
                'ig_account_id' => $igAccountId,
                'comment_id' => $commentId,
                'status' => $response->status(),
                'payload' => $response->json() ?? [],
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    private function sendLegacyCommentPrivateReplyText(
        string $accessToken,
        string $igAccountId,
        string $commentId,
        string $messageText
    ): array {
        $payload = [
            'recipient' => ['comment_id' => $commentId],
            'message' => ['text' => $this->truncateMessage($messageText)],
        ];

        $response = $this->httpClient()
            ->withToken($accessToken)
            ->post($this->graphUrl.$igAccountId.'/messages', $payload);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Meta legacy comment private reply failed', [
                'ig_account_id' => $igAccountId,
                'comment_id' => $commentId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        } else {
            Log::info('Meta legacy comment private reply sent', [
                'ig_account_id' => $igAccountId,
                'comment_id' => $commentId,
                'status' => $response->status(),
                'payload' => $response->json() ?? [],
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Get user profile info for IG scoped user ID (Instagram User Profile API).
     */
    public function getUserProfileInfo(string $accessToken, string $igScopedId, array $fields): array
    {
        $fieldList = collect($fields)
            ->map(fn ($field) => trim((string) $field))
            ->filter()
            ->unique()
            ->implode(',');

        $response = $this->httpClient()->get($this->graphUrl.$igScopedId, [
            'fields' => $fieldList !== '' ? $fieldList : 'id',
            'access_token' => $accessToken,
        ]);

        if (! $response->successful()) {
            Log::warning('Meta user profile info lookup failed', [
                'ig_scoped_id' => $igScopedId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }

        return [
            'success' => $response->successful(),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    /**
     * Enable webhook field subscriptions for an Instagram account.
     */
    public function enableWebhookSubscriptions(string $accessToken, string $igAccountId, array $fields = ['comments', 'messages', 'messaging_postbacks']): array
    {
        $subscribedFields = implode(',', array_unique(array_filter($fields)));

        $response = $this->httpClient()
            ->withToken($accessToken)
            ->asForm()
            ->post($this->graphUrl.$igAccountId.'/subscribed_apps', [
                'subscribed_fields' => $subscribedFields,
            ]);

        if (! $response->successful()) {
            $this->disconnectOnInvalidAccessToken($response, null, $igAccountId);
            Log::error('Failed enabling IG webhook subscriptions', [
                'ig_account_id' => $igAccountId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }

        return [
            'success' => $response->successful() && (bool) $response->json('success', false),
            'status' => $response->status(),
            'payload' => $response->json() ?? [],
        ];
    }

    private function buildInstagramProfileUrl(?string $username): ?string
    {
        if (! $username) {
            return null;
        }

        return 'https://www.instagram.com/'.ltrim((string) $username, '@').'/';
    }

    private function disconnectOnInvalidAccessToken(
        Response $response,
        ?int $instagramAccountId = null,
        ?string $igAccountId = null
    ): void {
        if (! $this->isInvalidAccessTokenResponse($response)) {
            return;
        }

        $accountQuery = InstagramAccount::query()
            ->where('status', 'active');

        if ($instagramAccountId !== null) {
            $accountQuery->whereKey($instagramAccountId);
        } elseif (filled($igAccountId)) {
            $accountQuery->where('ig_account_id', (string) $igAccountId);
        } else {
            return;
        }

        $account = $accountQuery->first();
        if (! $account) {
            return;
        }

        $errorPayload = $response->json() ?? [];
        $errorMessage = trim((string) data_get($errorPayload, 'error.message', 'Invalid Instagram access token.'));
        $errorCode = (int) data_get($errorPayload, 'error.code', 0);
        $errorSubcode = (int) data_get($errorPayload, 'error.error_subcode', 0);

        $pausedFlowsCount = AutomationFlow::query()
            ->where('instagram_account_id', (int) $account->id)
            ->where('status', 'active')
            ->update([
                'status' => 'paused',
                'updated_at' => now(),
            ]);

        $account->update([
            'status' => 'disconnected',
            'webhook_subscriptions_status' => 'failed',
            'webhook_subscriptions_last_synced_at' => now(),
            'webhook_subscriptions_error' => "invalid_token_{$errorCode}_{$errorSubcode}: {$errorMessage}",
        ]);

        Log::warning('Instagram account disconnected due to invalid access token', [
            'instagram_account_id' => (int) $account->id,
            'ig_account_id' => (string) $account->ig_account_id,
            'error_code' => $errorCode,
            'error_subcode' => $errorSubcode,
            'paused_flows' => $pausedFlowsCount,
        ]);
    }

    private function isInvalidAccessTokenResponse(Response $response): bool
    {
        $errorPayload = $response->json() ?? [];
        $errorCode = (int) data_get($errorPayload, 'error.code', 0);

        if ($errorCode === 190) {
            return true;
        }

        $errorType = strtolower((string) data_get($errorPayload, 'error.type', ''));
        $errorMessage = strtolower((string) data_get($errorPayload, 'error.message', ''));

        return $errorType === 'oauthexception'
            && str_contains($errorMessage, 'access token');
    }
}
