<?php

namespace App\Jobs;

use App\Models\ScheduledPost;
use App\Models\ScheduledPostAnalyticsSnapshot;
use App\Services\MetaApiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection;

class SyncScheduledPostAnalyticsJob implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly ?int $userId = null) {}

    public function handle(MetaApiService $metaApiService): void
    {
        ScheduledPost::query()
            ->when($this->userId !== null, fn ($query) => $query->where('user_id', $this->userId))
            ->where('status', ScheduledPost::STATUS_PUBLISHED)
            ->whereNotNull('meta_media_id')
            ->with('instagramAccount')
            ->latest('published_at')
            ->limit(100)
            ->get()
            ->each(function (ScheduledPost $post) use ($metaApiService): void {
                $account = $post->instagramAccount;
                if (! $account || $account->status !== 'active') {
                    return;
                }

                $token = (string) $account->access_token;
                $mediaId = (string) $post->meta_media_id;
                if ($token === '' || $mediaId === '') {
                    return;
                }

                $format = strtolower((string) $post->format);
                $initialMetrics = $this->resolveMetricsForFormat($format);

                $insightsResult = $this->fetchMediaInsightsWithFallback($metaApiService, $token, $mediaId, $initialMetrics);
                if (! $insightsResult['success']) {
                    return;
                }

                $metrics = $insightsResult['metrics'];

                ScheduledPostAnalyticsSnapshot::query()->updateOrCreate(
                    [
                        'scheduled_post_id' => $post->id,
                        'snapshot_date' => now()->toDateString(),
                    ],
                    [
                        'instagram_account_id' => $account->id,
                        'reach' => $metrics->get('reach'),
                        'impressions' => $metrics->get('views', $metrics->get('impressions')),
                        'engagement' => $metrics->get('total_interactions'),
                        'likes' => $metrics->get('likes'),
                        'comments' => $metrics->get('comments'),
                        'shares' => $metrics->get('shares'),
                        'saves' => $metrics->get('saved'),
                        'raw_metrics' => $insightsResult['response']['payload'] ?? [],
                    ]
                );
            });
    }

    /**
     * @return array<int, string>
     */
    private function resolveMetricsForFormat(string $format): array
    {
        if ($format === 'story') {
            return ['reach', 'views', 'replies', 'taps_forward', 'taps_back', 'exits'];
        }

        return ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'total_interactions'];
    }

    /**
     * @param array<int, string> $metrics
     * @return array{
     *   success: bool,
     *   response: array<string, mixed>,
     *   metrics: Collection<string, int>
     * }
     */
    private function fetchMediaInsightsWithFallback(
        MetaApiService $metaApiService,
        string $token,
        string $mediaId,
        array $metrics
    ): array {
        $lastResponse = [
            'success' => false,
            'status' => 0,
            'payload' => [],
        ];

        while (! empty($metrics)) {
            $response = $metaApiService->fetchMediaInsights($token, $mediaId, $metrics);
            $lastResponse = $response;

            if ((bool) ($response['success'] ?? false)) {
                $parsed = collect((array) data_get($response, 'payload.data', []))
                    ->mapWithKeys(fn (array $metric): array => [
                        (string) ($metric['name'] ?? '') => (int) data_get($metric, 'values.0.value', 0),
                    ]);

                return [
                    'success' => true,
                    'response' => $response,
                    'metrics' => $parsed,
                ];
            }

            $unsupportedMetric = $this->extractUnsupportedMetric((string) data_get($response, 'payload.error.message', ''));
            if ($unsupportedMetric === null) {
                break;
            }

            $metrics = array_values(array_filter(
                $metrics,
                fn (string $metric): bool => strtolower($metric) !== strtolower($unsupportedMetric)
            ));
        }

        return [
            'success' => false,
            'response' => $lastResponse,
            'metrics' => collect(),
        ];
    }

    private function extractUnsupportedMetric(string $message): ?string
    {
        $normalized = strtolower(trim($message));
        if ($normalized === '') {
            return null;
        }

        if (preg_match('/does not support the ([a-z0-9_]+) metric/i', $message, $matches) === 1) {
            return strtolower((string) ($matches[1] ?? ''));
        }

        if (preg_match('/incompatible metric \(([a-z0-9_]+)\)/i', $message, $matches) === 1) {
            return strtolower((string) ($matches[1] ?? ''));
        }

        if (preg_match('/metric ([a-z0-9_]+) is no longer supported/i', $message, $matches) === 1) {
            return strtolower((string) ($matches[1] ?? ''));
        }

        return null;
    }
}
