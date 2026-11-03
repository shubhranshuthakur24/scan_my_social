<?php

namespace App\Services;

use App\Models\InstagramAccount;
use App\Models\InstagramAccountInsightSnapshot;
use App\Models\InstagramAccountMediaAnalytics;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class InstagramAccountAnalyticsSyncService
{
    public function __construct(private readonly MetaApiService $metaApiService) {}

    /**
     * @return array{synced:int, considered:int}
     */
    public function syncRange(InstagramAccount $account, Carbon $start, Carbon $end): array
    {
        $token = trim((string) $account->access_token);
        $igAccountId = trim((string) $account->ig_account_id);

        if ($token === '' || $igAccountId === '') {
            return [
                'synced' => 0,
                'considered' => 0,
            ];
        }

        $this->syncAccountInsights($account, $token, $igAccountId, $start, $end);

        $mediaItems = $this->fetchMedia($token, $igAccountId, $start, $end);
        $syncedCount = $this->syncMediaItems($account, $token, $mediaItems);

        return [
            'synced' => $syncedCount,
            'considered' => $mediaItems->count(),
        ];
    }

    /**
     * @return array{synced:int, considered:int}
     */
    public function syncLifetime(InstagramAccount $account): array
    {
        $token = trim((string) $account->access_token);
        $igAccountId = trim((string) $account->ig_account_id);

        if ($token === '' || $igAccountId === '') {
            return [
                'synced' => 0,
                'considered' => 0,
            ];
        }

        $this->syncAccountInsights($account, $token, $igAccountId, null, null);

        $mediaItems = $this->fetchMedia($token, $igAccountId, null, null, 250);
        $syncedCount = $this->syncMediaItems($account, $token, $mediaItems);

        return [
            'synced' => $syncedCount,
            'considered' => $mediaItems->count(),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $mediaItems
     */
    private function syncMediaItems(InstagramAccount $account, string $token, Collection $mediaItems): int
    {
        $syncedCount = 0;

        $mediaItems->each(function (array $item) use ($account, $token, &$syncedCount): void {
            $mediaId = trim((string) ($item['id'] ?? ''));
            if ($mediaId === '') {
                return;
            }

            $resolvedFormat = $this->resolveFormat($item);
            $insightsMetrics = $this->resolveInsightsMetricsForMediaItem($resolvedFormat);
            $insightsResult = $this->fetchMediaInsightsWithFallback($token, $mediaId, $insightsMetrics);
            $insightsResponse = $insightsResult['response'];
            $metrics = $insightsResult['metrics'];
            $hadInsightSuccess = $insightsResult['success'];
            $existingRow = InstagramAccountMediaAnalytics::query()
                ->where('instagram_account_id', $account->id)
                ->where('instagram_media_id', $mediaId)
                ->first();

            $likes = (int) $metrics->get('likes', $existingRow?->likes ?? 0);
            $comments = (int) $metrics->get('comments', $existingRow?->comments ?? 0);
            $shares = (int) $metrics->get('shares', $existingRow?->shares ?? 0);
            $saves = (int) $metrics->get('saved', $existingRow?->saves ?? 0);
            $storyReplies = (int) $metrics->get('replies', $existingRow?->story_replies ?? 0);
            $storyTapsForward = (int) $metrics->get('taps_forward', $existingRow?->story_taps_forward ?? 0);
            $storyTapsBack = (int) $metrics->get('taps_back', $existingRow?->story_taps_back ?? 0);
            $storyExits = (int) $metrics->get('exits', $existingRow?->story_exits ?? 0);
            $engagement = (int) $metrics->get(
                'total_interactions',
                $hadInsightSuccess
                    ? ($likes + $comments + $shares + $saves)
                    : ($existingRow?->engagement ?? 0)
            );

            $postedAt = $this->parseTimestamp((string) ($item['timestamp'] ?? null));
            $mediaType = strtoupper((string) ($item['media_type'] ?? ''));

            InstagramAccountMediaAnalytics::query()->updateOrCreate(
                [
                    'instagram_account_id' => $account->id,
                    'instagram_media_id' => $mediaId,
                ],
                [
                    'user_id' => $account->user_id,
                    'media_type' => $mediaType !== '' ? $mediaType : null,
                    'format' => $resolvedFormat,
                    'caption' => $this->nullableTrim((string) ($item['caption'] ?? '')),
                    'permalink' => $this->nullableTrim((string) ($item['permalink'] ?? '')),
                    'media_url' => $this->nullableTrim((string) ($item['media_url'] ?? '')),
                    'thumbnail_url' => $this->nullableTrim((string) ($item['thumbnail_url'] ?? '')),
                    'posted_at' => $postedAt,
                    'synced_at' => now(),
                    'reach' => (int) $metrics->get('reach', $existingRow?->reach ?? 0),
                    'impressions' => (int) $metrics->get('views', $metrics->get('impressions', $existingRow?->impressions ?? 0)),
                    'engagement' => max(0, $engagement),
                    'likes' => max(0, $likes),
                    'comments' => max(0, $comments),
                    'shares' => max(0, $shares),
                    'saves' => max(0, $saves),
                    'story_replies' => max(0, $storyReplies),
                    'story_taps_forward' => max(0, $storyTapsForward),
                    'story_taps_back' => max(0, $storyTapsBack),
                    'story_exits' => max(0, $storyExits),
                    'raw_media' => $item,
                    'raw_metrics' => array_merge(
                        (array) ($insightsResponse['payload'] ?? []),
                        [
                            'metrics_attempted' => $insightsResult['attempted_metrics'],
                            'metrics_supported' => $insightsResult['supported_metrics'],
                            'insights_success' => $hadInsightSuccess,
                        ]
                    ),
                ]
            );

            $syncedCount++;
        });

        return $syncedCount;
    }

    private function syncAccountInsights(
        InstagramAccount $account,
        string $token,
        string $igAccountId,
        ?Carbon $start,
        ?Carbon $end
    ): void {
        $insightStart = $start ?: now()->subDays(29)->startOfDay();
        $insightEnd = $end ?: now()->endOfDay();

        $response = $this->metaApiService->fetchUserInsights(
            $token,
            $igAccountId,
            ['reach', 'profile_views', 'follower_count'],
            'day',
            $insightStart->timestamp,
            $insightEnd->timestamp
        );

        $viewsResponse = $this->metaApiService->fetchUserInsights(
            $token,
            $igAccountId,
            ['views'],
            'day',
            $insightStart->timestamp,
            $insightEnd->timestamp,
            'total_value',
            'media_product_type'
        );

        $interactionsResponse = $this->metaApiService->fetchUserInsights(
            $token,
            $igAccountId,
            ['total_interactions'],
            'day',
            $insightStart->timestamp,
            $insightEnd->timestamp,
            'total_value',
            'media_product_type'
        );

        $engagedResponse = $this->metaApiService->fetchUserInsights(
            $token,
            $igAccountId,
            ['accounts_engaged'],
            'day',
            $insightStart->timestamp,
            $insightEnd->timestamp,
            'total_value'
        );

        $totalViews = 0;
        $viewsBreakdown = [
            'reel' => 0,
            'post' => 0,
            'story' => 0,
            'carousel' => 0,
            'video' => 0,
        ];
        if (!empty($viewsResponse['payload']['data'][0])) {
            $viewsEntry = $viewsResponse['payload']['data'][0];
            $totalViews = (int) data_get($viewsEntry, 'total_value.value', 0);
            $breakdowns = (array) data_get($viewsEntry, 'total_value.breakdowns.0.results', []);
            foreach ($breakdowns as $b) {
                $rawType = strtolower((string) ($b['dimension_values'][0] ?? ''));
                $val = (int) ($b['value'] ?? 0);
                if ($rawType === 'carousel_container') {
                    $viewsBreakdown['carousel'] += $val;
                } elseif (isset($viewsBreakdown[$rawType])) {
                    $viewsBreakdown[$rawType] += $val;
                } else {
                    $viewsBreakdown['post'] += $val;
                }
            }
        }

        $totalInteractions = 0;
        $interactionsBreakdown = [
            'reel' => 0,
            'post' => 0,
            'story' => 0,
            'carousel' => 0,
            'video' => 0,
        ];
        if (!empty($interactionsResponse['payload']['data'][0])) {
            $interactionsEntry = $interactionsResponse['payload']['data'][0];
            $totalInteractions = (int) data_get($interactionsEntry, 'total_value.value', 0);
            $breakdowns = (array) data_get($interactionsEntry, 'total_value.breakdowns.0.results', []);
            foreach ($breakdowns as $b) {
                $rawType = strtolower((string) ($b['dimension_values'][0] ?? ''));
                $val = (int) ($b['value'] ?? 0);
                if ($rawType === 'carousel_container') {
                    $interactionsBreakdown['carousel'] += $val;
                } elseif (isset($interactionsBreakdown[$rawType])) {
                    $interactionsBreakdown[$rawType] += $val;
                } else {
                    $interactionsBreakdown['post'] += $val;
                }
            }
        }

        $accountsEngaged = (int) data_get($engagedResponse, 'payload.data.0.total_value.value', 0);

        if (! (bool) ($response['success'] ?? false) && $totalViews === 0) {
            return;
        }

        $seriesByMetric = collect((array) data_get($response, 'payload.data', []))
            ->mapWithKeys(function ($entry): array {
                if (! is_array($entry)) {
                    return [];
                }

                $metricName = trim((string) ($entry['name'] ?? ''));
                if ($metricName === '') {
                    return [];
                }

                $byDate = collect((array) ($entry['values'] ?? []))
                    ->mapWithKeys(function ($valueEntry): array {
                        if (! is_array($valueEntry)) {
                            return [];
                        }

                        $rawDate = (string) ($valueEntry['end_time'] ?? '');
                        if (trim($rawDate) === '') {
                            return [];
                        }

                        try {
                            $dateKey = Carbon::parse($rawDate)->toDateString();
                        } catch (\Throwable) {
                            return [];
                        }

                        return [
                            $dateKey => (int) ($valueEntry['value'] ?? 0),
                        ];
                    });

                return [
                    $metricName => $byDate,
                ];
            });

        $allDates = $seriesByMetric
            ->values()
            ->flatMap(fn (Collection $series): array => array_keys($series->all()))
            ->unique()
            ->values();

        if ($allDates->isEmpty()) {
            $allDates = collect([now()->toDateString()]);
        }

        $reachSeries = $seriesByMetric->get('reach', collect());
        $totalReach = (int) $reachSeries->sum();

        $allDates->each(function (string $date) use ($account, $seriesByMetric, $response, $totalViews, $viewsBreakdown, $totalInteractions, $interactionsBreakdown, $accountsEngaged, $reachSeries, $totalReach): void {
            $dayReach = (int) $reachSeries->get($date, 0);
            $dayImpressions = $totalReach > 0 && $totalViews > 0
                ? (int) round(($dayReach / $totalReach) * $totalViews)
                : 0;
            $dayInteractions = $totalReach > 0 && $totalInteractions > 0
                ? (int) round(($dayReach / $totalReach) * $totalInteractions)
                : 0;

            InstagramAccountInsightSnapshot::query()->updateOrCreate(
                [
                    'instagram_account_id' => $account->id,
                    'snapshot_date' => $date,
                ],
                [
                    'user_id' => $account->user_id,
                    'reach' => $dayReach,
                    'impressions' => $dayImpressions,
                    'profile_views' => (int) $seriesByMetric->get('profile_views', collect())->get($date, 0),
                    'follower_count' => (int) $seriesByMetric->get('follower_count', collect())->get($date, 0),
                    'following_count' => (int) ($account->following_count ?? 0),
                    'media_count' => (int) ($account->media_count ?? 0),
                    'synced_at' => now(),
                    'raw_metrics' => [
                        'reach_series' => $response['payload'] ?? [],
                        'day_interactions' => $dayInteractions,
                        'total_views' => $totalViews,
                        'views_breakdown' => $viewsBreakdown,
                        'total_interactions' => $totalInteractions,
                        'interactions_breakdown' => $interactionsBreakdown,
                        'accounts_engaged' => $accountsEngaged,
                    ],
                ]
            );
        });
    }

    /**
     * @return array{
     *   success: bool,
     *   response: array<string, mixed>,
     *   metrics: Collection<string, int>,
     *   attempted_metrics: array<int, string>,
     *   supported_metrics: array<int, string>
     * }
     */
    private function fetchMediaInsightsWithFallback(string $token, string $mediaId, array $metrics): array
    {
        $attempted = [];
        $lastResponse = [
            'success' => false,
            'status' => 0,
            'payload' => [],
        ];

        while (! empty($metrics)) {
            $attempted[] = implode(',', $metrics);
            $response = $this->metaApiService->fetchMediaInsights($token, $mediaId, $metrics);
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
                    'attempted_metrics' => $attempted,
                    'supported_metrics' => $metrics,
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
            'attempted_metrics' => $attempted,
            'supported_metrics' => [],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function resolveInsightsMetricsForMediaItem(string $format): array
    {
        if ($format === 'story') {
            return ['reach', 'views', 'replies', 'taps_forward', 'taps_back', 'exits'];
        }

        return ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'total_interactions'];
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

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function fetchMedia(
        string $token,
        string $igAccountId,
        ?Carbon $start,
        ?Carbon $end,
        int $maxPages = 40
    ): Collection {
        $results = collect();

        foreach (['media', 'stories'] as $surface) {
            $after = null;

            for ($page = 0; $page < $maxPages; $page++) {
                $response = $surface === 'stories'
                    ? $this->metaApiService->fetchUserStories($token, $igAccountId, $after, 50)
                    : $this->metaApiService->fetchUserMedia($token, $igAccountId, $after, 50);

                $items = collect((array) data_get($response, 'data', []));
                if ($items->isEmpty()) {
                    break;
                }

                $items->each(function ($item) use (&$results, $start, $end): void {
                    if (! is_array($item)) {
                        return;
                    }

                    $normalizedItem = $item;
                    if (strtolower(trim((string) ($normalizedItem['media_product_type'] ?? ''))) === ''
                        && isset($normalizedItem['permalink'])
                        && is_string($normalizedItem['permalink'])
                        && str_contains(strtolower($normalizedItem['permalink']), '/stories/')) {
                        $normalizedItem['media_product_type'] = 'STORIES';
                    }

                    $timestamp = $this->parseTimestamp((string) ($normalizedItem['timestamp'] ?? null));
                    if (! $timestamp) {
                        return;
                    }

                    if (($start && $end) && ! $timestamp->between($start, $end)) {
                        return;
                    }

                    if ($start && ! $end && $timestamp->lt($start)) {
                        return;
                    }

                    if ($end && ! $start && $timestamp->gt($end)) {
                        return;
                    }

                    $mediaId = trim((string) ($normalizedItem['id'] ?? ''));
                    if ($mediaId === '') {
                        return;
                    }

                    $results->put($mediaId, $normalizedItem);
                });

                $hasNext = (bool) data_get($response, 'paging.has_next_page', false);
                $nextCursor = data_get($response, 'paging.next_cursor');
                $after = is_string($nextCursor) && trim($nextCursor) !== '' ? trim($nextCursor) : null;

                if (! $hasNext || $after === null) {
                    break;
                }
            }
        }

        return $results->values();
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function resolveFormat(array $item): string
    {
        $mediaProductType = strtoupper((string) ($item['media_product_type'] ?? ''));
        if ($mediaProductType === 'STORIES') {
            return 'story';
        }

        if ($mediaProductType === 'REELS') {
            return 'reel';
        }

        $permalink = strtolower(trim((string) ($item['permalink'] ?? '')));
        if ($permalink !== '' && str_contains($permalink, '/stories/')) {
            return 'story';
        }

        $mediaType = strtoupper((string) ($item['media_type'] ?? ''));

        return match ($mediaType) {
            'VIDEO' => 'video',
            'CAROUSEL_ALBUM' => 'carousel',
            'STORY' => 'story',
            default => 'image',
        };
    }

    private function parseTimestamp(?string $value): ?Carbon
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function nullableTrim(string $value): ?string
    {
        $normalized = trim($value);

        return $normalized === '' ? null : $normalized;
    }
}
