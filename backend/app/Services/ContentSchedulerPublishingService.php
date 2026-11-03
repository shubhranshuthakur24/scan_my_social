<?php

namespace App\Services;

use App\Models\AutomationFlow;
use App\Models\ContentSchedulerMedia;
use App\Models\ScheduledPost;
use App\Models\ScheduledPostPublishAttempt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class ContentSchedulerPublishingService
{
    public const RETRYABLE_MEDIA_NOT_READY_CODE = 9007;

    public const RETRYABLE_MEDIA_NOT_READY_SUBCODE = 2207027;

    public const RETRYABLE_MEDIA_DOWNLOAD_TIMEOUT_SUBCODE = 2207003;

    public const RETRYABLE_MEDIA_DOWNLOAD_FAILED_SUBCODE = 2207001;

    public const RETRYABLE_MEDIA_TIMEOUT_CODE = -2;

    private const CONTAINER_STATUS_POLL_ATTEMPTS = 45;

    private const CONTAINER_STATUS_POLL_SLEEP_MICROSECONDS = 2_000_000;

    public function __construct(private readonly MetaApiService $metaApiService) {}

    public function publish(ScheduledPost $scheduledPost): ScheduledPost
    {
        $originalScheduledPost = $scheduledPost;
        $scheduledPost = $this->claimForPublishing($scheduledPost);

        if (! $scheduledPost instanceof ScheduledPost) {
            return $originalScheduledPost->refresh();
        }

        if ($scheduledPost->status !== ScheduledPost::STATUS_PUBLISHING) {
            return $scheduledPost;
        }

        $scheduledPost->loadMissing(['instagramAccount', 'media']);

        if (! $scheduledPost->instagramAccount || $scheduledPost->instagramAccount->status !== 'active') {
            return $this->markFailed($scheduledPost, 'Instagram account is disconnected.', null);
        }

        $attempt = $scheduledPost->publishAttempts()->create([
            'status' => 'running',
            'started_at' => now(),
        ]);

        try {
            $payload = $this->buildPayload($scheduledPost);
            Log::info('Meta content scheduler publish payload prepared', [
                'scheduled_post_id' => $scheduledPost->id,
                'instagram_account_id' => $scheduledPost->instagram_account_id,
                'ig_account_id' => $scheduledPost->instagramAccount?->ig_account_id,
                'format' => $scheduledPost->format,
                'payload' => $payload,
            ]);
            $containerId = $this->createContainer($scheduledPost, $payload);
            $this->waitForContainerToBeReady($scheduledPost, $containerId);

            $publishResponse = $this->metaApiService->publishMediaContainer(
                (string) $scheduledPost->instagramAccount->access_token,
                (string) $scheduledPost->instagramAccount->ig_account_id,
                $containerId
            );

            if (! (bool) ($publishResponse['success'] ?? false)) {
                if ($this->isRetryableMediaNotReadyResponse($publishResponse)) {
                    throw new RuntimeException(
                        $this->extractMetaError($publishResponse, 'Meta media is not ready for publishing yet.'),
                        self::RETRYABLE_MEDIA_NOT_READY_SUBCODE
                    );
                }

                throw new RuntimeException($this->extractMetaError($publishResponse, 'Meta publish failed.'));
            }

            $mediaId = (string) data_get($publishResponse, 'payload.id', '');

            return DB::transaction(function () use ($scheduledPost, $attempt, $payload, $publishResponse, $containerId, $mediaId): ScheduledPost {
                $attempt->update([
                    'status' => 'success',
                    'meta_container_id' => $containerId,
                    'meta_media_id' => $mediaId !== '' ? $mediaId : null,
                    'request_payload' => $payload,
                    'response_payload' => $publishResponse,
                    'finished_at' => now(),
                ]);

                $scheduledPost->update([
                    'status' => ScheduledPost::STATUS_PUBLISHED,
                    'meta_container_id' => $containerId,
                    'meta_media_id' => $mediaId !== '' ? $mediaId : null,
                    'published_at' => now(),
                    'last_error' => null,
                ]);

                // Automatically register published media into InstagramAccountMediaAnalytics
                if ($mediaId !== '' && $scheduledPost->instagram_account_id) {
                    try {
                        $firstMedia = $scheduledPost->media->first();
                        $mediaUrl = $firstMedia ? $firstMedia->deliveryUrl() : data_get($scheduledPost->options, 'mediaUrl');
                        $mediaType = strtoupper((string) $scheduledPost->format) === 'REEL' ? 'VIDEO' : 'IMAGE';

                        \App\Models\InstagramAccountMediaAnalytics::updateOrCreate(
                            [
                                'instagram_account_id' => $scheduledPost->instagram_account_id,
                                'instagram_media_id' => $mediaId,
                            ],
                            [
                                'user_id' => $scheduledPost->user_id,
                                'media_type' => $mediaType,
                                'format' => strtolower((string) $scheduledPost->format),
                                'caption' => $scheduledPost->caption,
                                'permalink' => "https://www.instagram.com/p/{$mediaId}/",
                                'media_url' => $mediaUrl,
                                'thumbnail_url' => $mediaUrl,
                                'posted_at' => now(),
                                'synced_at' => now(),
                                'reach' => 0,
                                'impressions' => 0,
                                'engagement' => 0,
                                'likes' => 0,
                                'comments' => 0,
                                'shares' => 0,
                                'saves' => 0,
                            ]
                        );
                    } catch (\Throwable $e) {
                        Log::warning('Failed to register published media in InstagramAccountMediaAnalytics', [
                            'post_id' => $scheduledPost->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }

                if ($mediaId !== '' && (bool) data_get($scheduledPost->options, 'hasAutodm')) {
                    $keyword = trim((string) data_get($scheduledPost->options, 'autodmKeyword', ''));
                    $replyText = trim((string) data_get($scheduledPost->options, 'autodmReplyText', ''));
                    if ($keyword !== '') {
                        try {
                            AutomationFlow::create([
                                'user_id' => $scheduledPost->user_id,
                                'instagram_account_id' => $scheduledPost->instagram_account_id,
                                'name' => 'AutoDM: ' . ($scheduledPost->title ?: 'Post ' . $scheduledPost->id),
                                'trigger_type' => 'specific_media',
                                'trigger_value' => $mediaId,
                                'keywords' => [strtoupper($keyword)],
                                'match_all_comments' => false,
                                'opening_message_enabled' => true,
                                'opening_message' => $replyText ?: 'Thanks for your comment! Here is your requested link.',
                                'status' => 'active',
                            ]);
                        } catch (\Throwable $e) {
                            Log::warning('Failed to attach AutoDM flow to published scheduled post', [
                                'post_id' => $scheduledPost->id,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                }

                return $scheduledPost->refresh();
            });
        } catch (RuntimeException $exception) {
            if ($this->isRetryableException($exception)) {
                $this->markRetrying($scheduledPost, $exception->getMessage(), $attempt);

                throw $exception;
            }

            return $this->markFailed($scheduledPost, $exception->getMessage(), $attempt);
        } catch (\Throwable $exception) {
            return $this->markFailed($scheduledPost, $exception->getMessage(), $attempt);
        }
    }

    private function claimForPublishing(ScheduledPost $scheduledPost): ?ScheduledPost
    {
        if ($scheduledPost->status === ScheduledPost::STATUS_PUBLISHING) {
            return $scheduledPost;
        }

        if ($scheduledPost->status !== ScheduledPost::STATUS_SCHEDULED) {
            return $scheduledPost;
        }

        $claimed = ScheduledPost::query()
            ->whereKey($scheduledPost->id)
            ->where('status', ScheduledPost::STATUS_SCHEDULED)
            ->update([
                'status' => ScheduledPost::STATUS_PUBLISHING,
                'last_error' => null,
                'updated_at' => now(),
            ]);

        if ($claimed !== 1) {
            return null;
        }

        return $scheduledPost->refresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function buildPayload(ScheduledPost $scheduledPost): array
    {
        $media = $scheduledPost->media->values();
        $firstMedia = $media->first();
        if (! $firstMedia instanceof ContentSchedulerMedia) {
            throw new RuntimeException('No media selected for this scheduled post.');
        }

        $caption = $this->captionWithHashtags($scheduledPost);
        $basePayload = [
            'caption' => $caption,
        ];

        $altText = trim((string) data_get($scheduledPost->options, 'alt_text', ''));
        if ($altText !== '' && $scheduledPost->format === ScheduledPost::FORMAT_IMAGE) {
            $basePayload['alt_text'] = $altText;
        }

        $locationId = trim((string) data_get($scheduledPost->options, 'location_id', ''));
        if ($locationId !== '') {
            $basePayload['location_id'] = $locationId;
        }

        return match ($scheduledPost->format) {
            ScheduledPost::FORMAT_IMAGE => $basePayload + [
                'image_url' => $firstMedia->deliveryUrl(),
            ],
            ScheduledPost::FORMAT_VIDEO => $basePayload + [
                'media_type' => 'REELS',
                'video_url' => $firstMedia->deliveryUrl(),
                'share_to_feed' => true,
            ],
            ScheduledPost::FORMAT_REEL => $basePayload + [
                'media_type' => 'REELS',
                'video_url' => $firstMedia->deliveryUrl(),
                'share_to_feed' => (bool) data_get($scheduledPost->options, 'share_to_feed', true),
            ],
            ScheduledPost::FORMAT_STORY => [
                'media_type' => 'STORIES',
                $firstMedia->media_type === 'video' ? 'video_url' : 'image_url' => $firstMedia->deliveryUrl(),
            ],
            ScheduledPost::FORMAT_CAROUSEL => $basePayload + [
                'media_type' => 'CAROUSEL',
                'children' => $media->map(fn (ContentSchedulerMedia $item): array => [
                    'media_type' => $item->media_type,
                    'url' => $item->deliveryUrl(),
                ])->all(),
            ],
            default => throw new RuntimeException('Unsupported Instagram format.'),
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function createContainer(ScheduledPost $scheduledPost, array $payload): string
    {
        $account = $scheduledPost->instagramAccount;
        $token = (string) $account->access_token;
        $igAccountId = (string) $account->ig_account_id;

        // Pre-warm media URLs to ensure CDN caches are populated before Meta crawler fetches them
        $this->warmMediaUrls($payload);

        if ($scheduledPost->format !== ScheduledPost::FORMAT_CAROUSEL) {
            $containerResponse = $this->createMediaContainerWithRetry($token, $igAccountId, $payload);

            if (! (bool) ($containerResponse['success'] ?? false)) {
                $subcode = (int) data_get($containerResponse, 'payload.error.error_subcode', 0);
                throw new RuntimeException(
                    $this->extractMetaError($containerResponse, 'Meta container creation failed.'),
                    $this->isTimeoutResponse($containerResponse) ? self::RETRYABLE_MEDIA_DOWNLOAD_TIMEOUT_SUBCODE : $subcode
                );
            }

            return (string) data_get($containerResponse, 'payload.id');
        }

        $children = collect($payload['children'] ?? [])
            ->map(function (array $child) use ($token, $igAccountId): string {
                $childPayload = [
                    'is_carousel_item' => true,
                    $child['media_type'] === 'video' ? 'video_url' : 'image_url' => $child['url'],
                ];
                if ($child['media_type'] === 'video') {
                    $childPayload['media_type'] = 'VIDEO';
                }

                $childResponse = $this->createMediaContainerWithRetry($token, $igAccountId, $childPayload);
                if (! (bool) ($childResponse['success'] ?? false)) {
                    $subcode = (int) data_get($childResponse, 'payload.error.error_subcode', 0);
                    throw new RuntimeException(
                        $this->extractMetaError($childResponse, 'Meta carousel child creation failed.'),
                        $this->isTimeoutResponse($childResponse) ? self::RETRYABLE_MEDIA_DOWNLOAD_TIMEOUT_SUBCODE : $subcode
                    );
                }

                return (string) data_get($childResponse, 'payload.id');
            })
            ->filter()
            ->values();

        if ($children->isEmpty()) {
            throw new RuntimeException('Meta carousel child containers were not created.');
        }

        $carouselPayload = $payload;
        $carouselPayload['children'] = $children->all();

        $containerResponse = $this->createMediaContainerWithRetry($token, $igAccountId, $carouselPayload);
        if (! (bool) ($containerResponse['success'] ?? false)) {
            $subcode = (int) data_get($containerResponse, 'payload.error.error_subcode', 0);
            throw new RuntimeException(
                $this->extractMetaError($containerResponse, 'Meta carousel container creation failed.'),
                $this->isTimeoutResponse($containerResponse) ? self::RETRYABLE_MEDIA_DOWNLOAD_TIMEOUT_SUBCODE : $subcode
            );
        }

        return (string) data_get($containerResponse, 'payload.id');
    }

    private function captionWithHashtags(ScheduledPost $scheduledPost): string
    {
        $caption = trim((string) $scheduledPost->caption);
        $hashtags = collect($scheduledPost->hashtags ?? [])
            ->map(fn ($tag): string => ltrim(trim((string) $tag), '#'))
            ->filter()
            ->map(fn (string $tag): string => '#'.Str::of($tag)->replace(' ', ''))
            ->implode(' ');

        return trim($caption.($hashtags !== '' ? "\n\n{$hashtags}" : ''));
    }

    private function markFailed(
        ScheduledPost $scheduledPost,
        string $message,
        ?ScheduledPostPublishAttempt $attempt
    ): ScheduledPost {
        $attempt?->update([
            'status' => 'failed',
            'error_message' => $message,
            'finished_at' => now(),
        ]);

        $scheduledPost->update([
            'status' => ScheduledPost::STATUS_FAILED,
            'retry_count' => $scheduledPost->retry_count + 1,
            'last_error' => $message,
        ]);

        return $scheduledPost->refresh();
    }

    private function markRetrying(
        ScheduledPost $scheduledPost,
        string $message,
        ?ScheduledPostPublishAttempt $attempt
    ): void {
        $attempt?->update([
            'status' => 'retrying',
            'error_message' => $message,
            'finished_at' => now(),
        ]);

        $scheduledPost->update([
            'status' => ScheduledPost::STATUS_PUBLISHING,
            'last_error' => $message,
        ]);
    }

    private function waitForContainerToBeReady(ScheduledPost $scheduledPost, string $containerId): void
    {
        $token = (string) $scheduledPost->instagramAccount?->access_token;
        $igAccountId = (string) $scheduledPost->instagramAccount?->ig_account_id;

        for ($attempt = 1; $attempt <= self::CONTAINER_STATUS_POLL_ATTEMPTS; $attempt++) {
            $statusResponse = $this->metaApiService->getMediaContainerStatus($token, $igAccountId, $containerId);
            if (! (bool) ($statusResponse['success'] ?? false)) {
                throw new RuntimeException(
                    $this->extractMetaError($statusResponse, 'Meta container status check failed.')
                );
            }

            $statusCode = strtoupper(trim((string) data_get($statusResponse, 'payload.status_code', '')));
            if (in_array($statusCode, ['FINISHED', 'PUBLISHED'], true)) {
                return;
            }

            if (in_array($statusCode, ['ERROR', 'EXPIRED'], true)) {
                $statusMessage = trim((string) data_get($statusResponse, 'payload.status', ''));
                $fallback = "Meta container is not publishable ({$statusCode}).";

                throw new RuntimeException($statusMessage !== '' ? $statusMessage : $fallback);
            }

            if ($attempt < self::CONTAINER_STATUS_POLL_ATTEMPTS) {
                usleep(self::CONTAINER_STATUS_POLL_SLEEP_MICROSECONDS);
            }
        }

        throw new RuntimeException(
            'Meta media is still processing. Retrying publish shortly.',
            self::RETRYABLE_MEDIA_NOT_READY_SUBCODE
        );
    }

    /**
     * @param  array<string, mixed>  $response
     */
    private function isRetryableMediaNotReadyResponse(array $response): bool
    {
        $errorCode = (int) data_get($response, 'payload.error.code', 0);
        $errorSubcode = (int) data_get($response, 'payload.error.error_subcode', 0);
        $errorMessage = strtolower((string) data_get($response, 'payload.error.message', ''));

        if ($errorCode === self::RETRYABLE_MEDIA_NOT_READY_CODE && $errorSubcode === self::RETRYABLE_MEDIA_NOT_READY_SUBCODE) {
            return true;
        }

        return str_contains($errorMessage, 'media id is not available')
            || str_contains($errorMessage, 'media is not ready');
    }

    /**
     * @param  array<string, mixed>  $response
     */
    private function extractMetaError(array $response, string $fallback): string
    {
        return trim((string) data_get($response, 'payload.error.message', '')) ?: $fallback;
    }

    /**
     * Call Meta API to create media container with immediate retry for transient download timeouts.
     *
     * @param  array<string, mixed>  $payload
     * @return array{success: bool, status: int, payload: array<string, mixed>}
     */
    private function createMediaContainerWithRetry(string $token, string $igAccountId, array $payload, int $maxAttempts = 3): array
    {
        $response = [];

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            $response = $this->metaApiService->createMediaContainer($token, $igAccountId, $payload);

            if ((bool) ($response['success'] ?? false)) {
                return $response;
            }

            if (! $this->isTimeoutResponse($response) || $attempt >= $maxAttempts) {
                return $response;
            }

            Log::warning('Meta container creation timed out downloading media; retrying after backoff', [
                'attempt' => $attempt,
                'max_attempts' => $maxAttempts,
                'ig_account_id' => $igAccountId,
                'error' => data_get($response, 'payload.error.message'),
                'error_subcode' => data_get($response, 'payload.error.error_subcode'),
            ]);

            sleep($attempt * 2);
        }

        return $response;
    }

    /**
     * @param  array<string, mixed>  $response
     */
    private function isTimeoutResponse(array $response): bool
    {
        $code = (int) data_get($response, 'payload.error.code', 0);
        $subcode = (int) data_get($response, 'payload.error.error_subcode', 0);
        $message = strtolower((string) data_get($response, 'payload.error.message', ''));

        if ($subcode === self::RETRYABLE_MEDIA_DOWNLOAD_TIMEOUT_SUBCODE || $subcode === self::RETRYABLE_MEDIA_DOWNLOAD_FAILED_SUBCODE) {
            return true;
        }

        if ($code === self::RETRYABLE_MEDIA_TIMEOUT_CODE) {
            return true;
        }

        return str_contains($message, 'timeout')
            || str_contains($message, 'downloading the media takes too long')
            || str_contains($message, 'timed out');
    }

    /**
     * Pre-warm media URLs to ensure CDN caches are populated before Meta's crawler fetches them.
     *
     * @param  array<string, mixed>  $payload
     */
    private function warmMediaUrls(array $payload): void
    {
        $urls = [];

        if (isset($payload['image_url'])) {
            $urls[] = (string) $payload['image_url'];
        }
        if (isset($payload['video_url'])) {
            $urls[] = (string) $payload['video_url'];
        }
        if (isset($payload['children']) && is_array($payload['children'])) {
            foreach ($payload['children'] as $child) {
                if (! empty($child['url'])) {
                    $urls[] = (string) $child['url'];
                }
            }
        }

        foreach (array_unique(array_filter($urls)) as $url) {
            try {
                \Illuminate\Support\Facades\Http::timeout(4)
                    ->withHeaders(['User-Agent' => 'ViralyzerCdnWarmer/1.0'])
                    ->head($url);
            } catch (\Throwable $e) {
                Log::debug('CDN media pre-warm attempt finished with notice', [
                    'url' => $url,
                    'notice' => $e->getMessage(),
                ]);
            }
        }
    }

    private function isRetryableException(RuntimeException $exception): bool
    {
        $code = $exception->getCode();

        return in_array($code, [
            self::RETRYABLE_MEDIA_NOT_READY_SUBCODE,
            self::RETRYABLE_MEDIA_DOWNLOAD_TIMEOUT_SUBCODE,
            self::RETRYABLE_MEDIA_DOWNLOAD_FAILED_SUBCODE,
        ], true);
    }
}
