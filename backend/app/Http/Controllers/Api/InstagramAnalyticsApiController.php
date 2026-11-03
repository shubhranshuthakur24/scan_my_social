<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SyncInstagramAccountAnalyticsJob;
use App\Models\AutomationFlow;
use App\Models\AutomationLog;
use App\Models\InstagramAccount;
use App\Models\InstagramAccountInsightSnapshot;
use App\Models\InstagramAccountMediaAnalytics;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InstagramAnalyticsApiController extends Controller
{
    private const ANALYTICS_MAX_DAYS = 90;

    private function resolveUser(Request $request): ?\App\Models\User
    {
        $user = Auth::user() ?: $request->user();
        if (!$user && app()->environment('local')) {
            $user = \App\Models\User::first();
        }
        return $user;
    }

    /**
     * Get reach velocity, audience growth, format mix, and conversion analytics.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json([
                'accounts' => [],
                'selected_account_id' => null,
                'selected_account' => null,
                'has_active_account' => false,
                'overview' => $this->emptyOverviewPayload(),
                'daily_metrics' => [],
                'format_breakdown' => $this->emptyFormatBreakdown(),
                'top_performing_reels' => [],
                'autodm_analytics' => $this->emptyAutodmPayload(),
            ]);
        }

        $instagramAccounts = InstagramAccount::query()
            ->where('user_id', $user->id)
            ->latest()
            ->get(['id', 'username', 'status', 'profile_url', 'profile_picture_url', 'ig_account_id']);

        $activeAccounts = $instagramAccounts->where('status', 'active');
        $hasActiveAccount = $activeAccounts->isNotEmpty();

        $requestedAccountId = (int) $request->integer('instagram_account_id');
        $selectedAccount = null;

        if ($hasActiveAccount && $requestedAccountId > 0) {
            $selectedAccount = $activeAccounts->firstWhere('id', $requestedAccountId);
            if (!$selectedAccount) {
                return response()->json([
                    'error' => [
                        'code' => 'INSTAGRAM_ACCOUNT_INVALID',
                        'message' => 'The requested Instagram account was not found or is not accessible.'
                    ]
                ], 403);
            }
        }

        [$start, $end] = $this->resolveAnalyticsDateRange($request);
        $selectedAccountId = $selectedAccount?->id;

        $accountsPayload = $instagramAccounts->map(fn (InstagramAccount $account): array => [
            'id' => (string) $account->id,
            'username' => $account->username,
            'status' => $account->status,
            'profile_url' => $account->profile_url,
            'profile_picture_url' => $account->profile_picture_url,
            'ig_account_id' => $account->ig_account_id,
        ])->values()->all();

        $selectedAccountPayload = $selectedAccount ? [
            'id' => (string) $selectedAccount->id,
            'username' => $selectedAccount->username,
            'status' => $selectedAccount->status,
            'profile_url' => $selectedAccount->profile_url,
            'profile_picture_url' => $selectedAccount->profile_picture_url,
            'ig_account_id' => $selectedAccount->ig_account_id,
        ] : null;

        if (!$selectedAccountId) {
            return response()->json([
                'accounts' => $accountsPayload,
                'selected_account_id' => null,
                'selected_account' => null,
                'has_active_account' => false,
                'overview' => $this->emptyOverviewPayload(),
                'daily_metrics' => $this->emptyDailyMetricSeries($start, $end),
                'format_breakdown' => $this->emptyFormatBreakdown(),
                'top_performing_reels' => [],
                'autodm_analytics' => $this->emptyAutodmPayload(),
            ]);
        }

        $currentPeriodMetrics = $this->instagramPeriodMetrics($user->id, $selectedAccountId, $start, $end);
        [$previousStart, $previousEnd] = $this->previousAnalyticsDateRange($start, $end);
        $previousPeriodMetrics = $this->instagramPeriodMetrics($user->id, $selectedAccountId, $previousStart, $previousEnd);

        $overviewPayload = $this->analyticsOverviewPayload(
            posts: $currentPeriodMetrics['posts'],
            reach: $currentPeriodMetrics['reach'],
            impressions: $currentPeriodMetrics['impressions'],
            engagement: $currentPeriodMetrics['engagement'],
            followers: $currentPeriodMetrics['followers'],
            lastSyncedAt: $currentPeriodMetrics['last_synced_at'],
            previousMetrics: [
                'posts' => $previousPeriodMetrics['posts'],
                'reach' => $previousPeriodMetrics['reach'],
                'impressions' => $previousPeriodMetrics['impressions'],
                'engagement' => $previousPeriodMetrics['engagement'],
            ]
        );

        $dailyMetrics = $this->instagramDailyMetrics($user->id, $selectedAccountId, $start, $end, (int) ($currentPeriodMetrics['followers'] ?? 0));
        $formatBreakdown = $this->instagramFormatBreakdown($user->id, $selectedAccountId, $start, $end, $currentPeriodMetrics['posts']);
        $topPerformingReels = $this->topPerformingReelsPayload($user->id, $selectedAccountId, $start, $end);
        $autodmAnalytics = $this->autodmAnalyticsPayload($user->id, $selectedAccountId);
        $storyAnalytics = $this->storyAnalyticsPayload($user->id, $selectedAccountId, $start, $end);

        // Compute backward-compatible fields for legacy clients
        $reachVelocity = collect($dailyMetrics)->map(fn ($d) => [
            'date' => Carbon::parse($d['date'])->format('M d'),
            'impressions' => $d['reach'],
        ])->all();

        $followerVelocity = InstagramAccountInsightSnapshot::query()
            ->where('user_id', $user->id)
            ->where('instagram_account_id', $selectedAccountId)
            ->whereBetween('snapshot_date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('snapshot_date')
            ->get()
            ->map(fn ($s) => [
                'date' => optional($s->snapshot_date)->format('M d') ?? '',
                'followers' => (int) ($s->follower_count ?? 0),
            ])->all();

        $avgReach = (float) (InstagramAccountMediaAnalytics::query()
            ->where('user_id', $user->id)
            ->where('instagram_account_id', $selectedAccountId)
            ->where('reach', '>', 0)
            ->avg('reach') ?? 0.0);
        $avgOutlier = $avgReach > 0 ? 1.5 : 1.0;

        return response()->json([
            'accounts' => $accountsPayload,
            'selected_account_id' => (string) $selectedAccountId,
            'selected_account' => $selectedAccountPayload,
            'has_active_account' => true,
            'date_range' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
                'days' => (int) $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1,
            ],
            'overview' => $overviewPayload,
            'daily_metrics' => $dailyMetrics,
            'format_breakdown' => $formatBreakdown,
            'top_performing_reels' => $topPerformingReels,
            'autodm_analytics' => $autodmAnalytics,
            'story_analytics' => $storyAnalytics,

            // Backward compatibility properties
            'followerVelocity' => $followerVelocity,
            'reachVelocity' => $reachVelocity,
            'topPerformingReels' => $topPerformingReels,
            'autoDmConversionRate' => $autodmAnalytics['conversion_rate'],
            'totalAutomationsTriggered' => $autodmAnalytics['automations_sent'],
            'avgOutlierScore' => round($avgOutlier, 1),
            'totalFollowers' => $currentPeriodMetrics['followers'],
            'followersGrowth' => $currentPeriodMetrics['followers'] - $previousPeriodMetrics['followers'],
            'accountsReached' => $currentPeriodMetrics['reach'],
            'totalImpressions' => $currentPeriodMetrics['impressions'],
        ]);
    }

    private function resolveAnalyticsDateRange(Request $request): array
    {
        $period = $request->query('period', '30d');
        $end = now()->endOfDay();

        $start = match ($period) {
            '7d' => now()->subDays(6)->startOfDay(),
            '14d' => now()->subDays(13)->startOfDay(),
            '30d' => now()->subDays(29)->startOfDay(),
            '90d' => now()->subDays(89)->startOfDay(),
            default => now()->subDays(29)->startOfDay(),
        };

        if ($request->has('start') && $request->query('start') !== '') {
            try {
                $start = Carbon::parse($request->query('start'))->startOfDay();
            } catch (\Throwable) {}
        }
        if ($request->has('end') && $request->query('end') !== '') {
            try {
                $end = Carbon::parse($request->query('end'))->endOfDay();
            } catch (\Throwable) {}
        }

        return [$start, $end];
    }

    private function previousAnalyticsDateRange(Carbon $start, Carbon $end): array
    {
        $days = (int) $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1;
        $previousEnd = $start->copy()->subDay()->endOfDay();
        $previousStart = $previousEnd->copy()->subDays($days - 1)->startOfDay();

        return [$previousStart, $previousEnd];
    }

    private function instagramPeriodMetrics(int $userId, int $accountId, Carbon $start, Carbon $end): array
    {
        $mediaQuery = InstagramAccountMediaAnalytics::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $accountId)
            ->whereBetween('posted_at', [$start, $end]);

        $mediaAggregate = (clone $mediaQuery)
            ->selectRaw('COUNT(*) as posts')
            ->selectRaw('COALESCE(SUM(reach), 0) as reach')
            ->selectRaw('COALESCE(SUM(impressions), 0) as impressions')
            ->selectRaw('COALESCE(SUM(engagement), 0) as engagement')
            ->first();

        $mediaLastSyncedAt = (clone $mediaQuery)->whereNotNull('synced_at')->max('synced_at');

        $insightQuery = InstagramAccountInsightSnapshot::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $accountId)
            ->whereBetween('snapshot_date', [$start->toDateString(), $end->toDateString()]);

        $insightSnapshots = (clone $insightQuery)->get(['snapshot_date', 'reach', 'impressions', 'follower_count', 'synced_at', 'raw_metrics']);
        $insightLastSyncedAt = (clone $insightQuery)->whereNotNull('synced_at')->max('synced_at');

        $hasInsightRows = $insightSnapshots->isNotEmpty();
        $posts = (int) ($mediaAggregate?->posts ?? 0);

        $insightReach = $hasInsightRows ? (int) $insightSnapshots->sum('reach') : 0;
        $mediaReach = (int) ($mediaAggregate?->reach ?? 0);
        $reach = max($insightReach, $mediaReach);

        $insightImpressions = $hasInsightRows ? (int) $insightSnapshots->sum('impressions') : 0;
        $mediaImpressions = (int) ($mediaAggregate?->impressions ?? 0);
        $impressions = max($insightImpressions, $mediaImpressions);

        $insightInteractions = (int) $insightSnapshots->sum(function ($s) {
            $day = data_get($s->raw_metrics, 'day_interactions');
            if ($day !== null) {
                return (int) $day;
            }
            $totalInteractions = (int) data_get($s->raw_metrics, 'total_interactions', 0);
            $totalViews = (int) data_get($s->raw_metrics, 'total_views', 0);
            if ($totalInteractions > 0 && $totalViews > 0 && $s->impressions > 0) {
                return (int) round(($s->impressions / $totalViews) * $totalInteractions);
            }
            return 0;
        });

        $mediaEngagement = (int) ($mediaAggregate?->engagement ?? 0);
        $engagement = max($insightInteractions, $mediaEngagement);
        $followers = (int) ($hasInsightRows ? $insightSnapshots->max('follower_count') : 0);

        return [
            'posts' => $posts,
            'reach' => $reach,
            'impressions' => $impressions,
            'engagement' => $engagement,
            'followers' => $followers,
            'last_synced_at' => $mediaLastSyncedAt ?: $insightLastSyncedAt,
        ];
    }

    private function analyticsOverviewPayload(
        int $posts,
        int $reach,
        int $impressions,
        int $engagement,
        int $followers,
        ?string $lastSyncedAt,
        array $previousMetrics
    ): array {
        return [
            'posts' => $posts,
            'reach' => $reach,
            'impressions' => $impressions,
            'engagement' => $engagement,
            'followers' => $followers,
            'last_synced_at' => $lastSyncedAt,
            'has_data' => $posts > 0 || $reach > 0 || $impressions > 0 || $engagement > 0,
            'comparison' => [
                'posts' => $this->metricComparisonPayload($posts, (int) ($previousMetrics['posts'] ?? 0)),
                'reach' => $this->metricComparisonPayload($reach, (int) ($previousMetrics['reach'] ?? 0)),
                'impressions' => $this->metricComparisonPayload($impressions, (int) ($previousMetrics['impressions'] ?? 0)),
                'engagement' => $this->metricComparisonPayload($engagement, (int) ($previousMetrics['engagement'] ?? 0)),
            ],
        ];
    }

    private function metricComparisonPayload(int $current, int $previous): array
    {
        $delta = $current - $previous;
        $trend = $current === 0 && $previous === 0 ? 'none' : ($delta > 0 ? 'up' : ($delta < 0 ? 'down' : 'neutral'));

        return [
            'current' => $current,
            'previous' => $previous,
            'delta' => $delta,
            'delta_percent' => $previous > 0 ? round(($delta / $previous) * 100, 1) : null,
            'trend' => $trend,
        ];
    }

    private function instagramDailyMetrics(int $userId, int $accountId, Carbon $start, Carbon $end, int $fallbackFollowers = 0): array
    {
        $series = [];
        $cursor = $start->copy()->startOfDay();
        $limit = $end->copy()->endOfDay();

        $mediaDailyRows = InstagramAccountMediaAnalytics::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $accountId)
            ->whereBetween('posted_at', [$start, $end])
            ->whereNotNull('posted_at')
            ->selectRaw('DATE(posted_at) as date')
            ->selectRaw('COALESCE(SUM(reach), 0) as reach')
            ->selectRaw('COALESCE(SUM(impressions), 0) as impressions')
            ->selectRaw('COALESCE(SUM(engagement), 0) as engagement')
            ->groupBy(DB::raw('DATE(posted_at)'))
            ->get()
            ->keyBy('date');

        $insightDailyRows = InstagramAccountInsightSnapshot::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $accountId)
            ->whereBetween('snapshot_date', [$start->toDateString(), $end->toDateString()])
            ->get(['snapshot_date', 'reach', 'impressions', 'profile_views', 'follower_count', 'raw_metrics'])
            ->keyBy(fn ($s) => $s->snapshot_date->toDateString());

        $baselineFollowers = (int) (InstagramAccountInsightSnapshot::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $accountId)
            ->where('follower_count', '>', 0)
            ->max('follower_count') ?? $fallbackFollowers);

        while ($cursor->lte($limit)) {
            $date = $cursor->toDateString();
            $insightDay = $insightDailyRows->get($date);
            $mediaDay = $mediaDailyRows->get($date);

            $dayFollowers = (int) ($insightDay?->follower_count ?? 0);
            if ($dayFollowers === 0) {
                $dayFollowers = $baselineFollowers;
            } else {
                $baselineFollowers = $dayFollowers;
            }

            $dayInteractions = data_get($insightDay?->raw_metrics, 'day_interactions');
            if ($dayInteractions === null) {
                $totInteractions = (int) data_get($insightDay?->raw_metrics, 'total_interactions', 0);
                $totViews = (int) data_get($insightDay?->raw_metrics, 'total_views', 0);
                $dayInteractions = $totInteractions > 0 && $totViews > 0 && ($insightDay?->impressions ?? 0) > 0
                    ? (int) round((($insightDay->impressions) / $totViews) * $totInteractions)
                    : 0;
            }
            $dayEngagement = max((int) $dayInteractions, (int) ($mediaDay?->engagement ?? 0));

            $series[] = [
                'date' => $date,
                'reach' => (int) ($insightDay?->reach ?? $mediaDay?->reach ?? 0),
                'impressions' => (int) ($insightDay?->impressions ?? $mediaDay?->impressions ?? 0),
                'engagement' => $dayEngagement,
                'followers' => $dayFollowers,
                'profile_views' => (int) ($insightDay?->profile_views ?? 0),
            ];
            $cursor->addDay();
        }

        return $series;
    }

    private function instagramFormatBreakdown(int $userId, int $accountId, Carbon $start, Carbon $end, int $totalPosts): array
    {
        $periodSnapshots = InstagramAccountInsightSnapshot::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $accountId)
            ->whereBetween('snapshot_date', [$start->toDateString(), $end->toDateString()])
            ->get(['snapshot_date', 'impressions', 'raw_metrics']);

        $latestSnapshot = $periodSnapshots->sortByDesc('snapshot_date')->first();
        if (!$latestSnapshot) {
            $latestSnapshot = InstagramAccountInsightSnapshot::query()
                ->where('user_id', $userId)
                ->where('instagram_account_id', $accountId)
                ->latest('snapshot_date')
                ->first();
        }

        $viewsBreakdown = (array) data_get($latestSnapshot?->raw_metrics, 'views_breakdown', []);
        $totalViews = array_sum($viewsBreakdown);

        if ($totalViews > 0) {
            $periodImpressions = $periodSnapshots->isNotEmpty() ? (int) $periodSnapshots->sum('impressions') : $totalViews;
            if ($periodImpressions <= 0) {
                $periodImpressions = $totalViews;
            }

            $defaultRows = [
                'reel' => ['format' => 'reel', 'label' => 'Reel', 'raw_count' => (int) ($viewsBreakdown['reel'] ?? 0)],
                'post' => ['format' => 'post', 'label' => 'Post', 'raw_count' => (int) ($viewsBreakdown['post'] ?? 0)],
                'story' => ['format' => 'story', 'label' => 'Story', 'raw_count' => (int) ($viewsBreakdown['story'] ?? 0)],
                'carousel' => ['format' => 'carousel', 'label' => 'Carousel', 'raw_count' => (int) ($viewsBreakdown['carousel'] ?? 0)],
                'video' => ['format' => 'video', 'label' => 'Video', 'raw_count' => (int) ($viewsBreakdown['video'] ?? 0)],
            ];

            $result = [];
            foreach ($defaultRows as $row) {
                $share = round(($row['raw_count'] / $totalViews) * 100, 1);
                $scaledCount = (int) round($periodImpressions * ($share / 100));
                $result[] = [
                    'format' => $row['format'],
                    'label' => $row['label'],
                    'count' => $scaledCount,
                    'share_percent' => $share,
                ];
            }

            usort($result, fn ($a, $b) => $b['count'] <=> $a['count']);
            return $result;
        }

        $defaultRows = [
            'reel' => ['format' => 'reel', 'label' => 'Reel', 'count' => 0, 'share_percent' => 0.0],
            'story' => ['format' => 'story', 'label' => 'Story', 'count' => 0, 'share_percent' => 0.0],
            'carousel' => ['format' => 'carousel', 'label' => 'Carousel', 'count' => 0, 'share_percent' => 0.0],
            'image' => ['format' => 'image', 'label' => 'Image', 'count' => 0, 'share_percent' => 0.0],
            'video' => ['format' => 'video', 'label' => 'Video', 'count' => 0, 'share_percent' => 0.0],
        ];

        $formatRows = InstagramAccountMediaAnalytics::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $accountId)
            ->whereBetween('posted_at', [$start, $end])
            ->selectRaw('format')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('format')
            ->get();

        foreach ($formatRows as $row) {
            $fmt = strtolower(trim((string) ($row->format ?? 'image')));
            if (isset($defaultRows[$fmt])) {
                $defaultRows[$fmt]['count'] += (int) $row->total;
            } else {
                $defaultRows['image']['count'] += (int) $row->total;
            }
        }

        $result = [];
        foreach ($defaultRows as $row) {
            $cnt = $row['count'];
            $row['share_percent'] = $totalPosts > 0 ? round(($cnt / $totalPosts) * 100, 1) : 0.0;
            $result[] = $row;
        }

        usort($result, fn ($a, $b) => $b['count'] <=> $a['count']);
        return $result;
    }

    private function topPerformingReelsPayload(int $userId, int $accountId, Carbon $start, Carbon $end): array
    {
        $avgReach = (float) (InstagramAccountMediaAnalytics::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $accountId)
            ->where('reach', '>', 0)
            ->avg('reach') ?? 0.0);

        return InstagramAccountMediaAnalytics::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $accountId)
            ->whereBetween('posted_at', [$start, $end])
            ->orderByDesc('reach')
            ->orderByDesc('impressions')
            ->take(8)
            ->get()
            ->map(function (InstagramAccountMediaAnalytics $row) use ($avgReach) {
                $multiplier = ($avgReach > 0 && $row->reach > 0)
                    ? round($row->reach / $avgReach, 1)
                    : 1.0;

                return [
                    'id' => (string) $row->id,
                    'instagram_media_id' => $row->instagram_media_id,
                    'title' => $row->caption ?? 'Instagram Post',
                    'caption' => $row->caption ?? '',
                    'thumbnail' => $row->thumbnail_url ?: ($row->media_url ?: ''),
                    'media_url' => $row->media_url,
                    'permalink' => $row->permalink,
                    'views' => (int) ($row->reach > 0 ? $row->reach : $row->impressions),
                    'reach' => (int) $row->reach,
                    'impressions' => (int) $row->impressions,
                    'likes' => (int) $row->likes,
                    'comments' => (int) $row->comments,
                    'shares' => (int) $row->shares,
                    'saves' => (int) $row->saves,
                    'outlierMultiplier' => $multiplier,
                    'outlier_multiplier' => $multiplier,
                    'publishedDaysAgo' => optional($row->posted_at)->diffForHumans() ?? '',
                ];
            })->values()->all();
    }

    private function autodmAnalyticsPayload(int $userId, int $accountId): array
    {
        $flows = AutomationFlow::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $accountId)
            ->get();

        $flowIds = $flows->pluck('id');
        $totalAutomations = $flows->count();
        $activeAutomations = $flows->where('status', 'active')->count();
        $pausedAutomations = $flows->where('status', 'paused')->count();
        $automationsSent = (int) $flows->sum('sent_count');

        $runsLast7Days = 0;
        if ($flowIds->isNotEmpty()) {
            $runsLast7Days = AutomationLog::query()
                ->whereIn('automation_flow_id', $flowIds->all())
                ->where('created_at', '>=', now()->subDays(7))
                ->count();
        }

        $avgConversion = $totalAutomations > 0 ? (float) $flows->avg('conversion_rate') : 0.0;

        return [
            'total_automations' => $totalAutomations,
            'active_automations' => $activeAutomations,
            'paused_automations' => $pausedAutomations,
            'automations_sent' => $automationsSent,
            'conversion_rate' => round($avgConversion, 1),
            'runs_last_7_days' => $runsLast7Days,
        ];
    }

    private function storyAnalyticsPayload(int $userId, int $accountId, Carbon $start, Carbon $end): array
    {
        $aggregate = InstagramAccountMediaAnalytics::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $accountId)
            ->where('format', 'story')
            ->whereBetween('posted_at', [$start, $end])
            ->selectRaw('COUNT(*) as total_stories')
            ->selectRaw('COALESCE(SUM(reach), 0) as reach')
            ->selectRaw('COALESCE(SUM(story_replies), 0) as replies')
            ->selectRaw('COALESCE(SUM(story_taps_forward), 0) as taps_forward')
            ->selectRaw('COALESCE(SUM(story_taps_back), 0) as taps_back')
            ->selectRaw('COALESCE(SUM(story_exits), 0) as exits')
            ->first();

        $total = (int) ($aggregate?->total_stories ?? 0);
        $tapsForward = (int) ($aggregate?->taps_forward ?? 0);
        $tapsBack = (int) ($aggregate?->taps_back ?? 0);
        $exits = (int) ($aggregate?->exits ?? 0);
        $replies = (int) ($aggregate?->replies ?? 0);
        $reach = (int) ($aggregate?->reach ?? 0);

        $completionRate = ($tapsForward + $exits) > 0
            ? round(($tapsForward / ($tapsForward + $exits)) * 100, 1)
            : 0.0;

        return [
            'total_stories' => $total,
            'reach' => $reach,
            'replies' => $replies,
            'taps_forward' => $tapsForward,
            'taps_back' => $tapsBack,
            'exits' => $exits,
            'completion_rate' => $completionRate,
        ];
    }

    private function emptyOverviewPayload(): array
    {
        return [
            'posts' => 0,
            'reach' => 0,
            'impressions' => 0,
            'engagement' => 0,
            'followers' => 0,
            'last_synced_at' => null,
            'has_data' => false,
            'comparison' => [
                'posts' => ['current' => 0, 'previous' => 0, 'delta' => 0, 'delta_percent' => null, 'trend' => 'none'],
                'reach' => ['current' => 0, 'previous' => 0, 'delta' => 0, 'delta_percent' => null, 'trend' => 'none'],
                'impressions' => ['current' => 0, 'previous' => 0, 'delta' => 0, 'delta_percent' => null, 'trend' => 'none'],
                'engagement' => ['current' => 0, 'previous' => 0, 'delta' => 0, 'delta_percent' => null, 'trend' => 'none'],
            ],
        ];
    }

    private function emptyFormatBreakdown(): array
    {
        return [
            ['format' => 'reel', 'label' => 'Reel', 'count' => 0, 'share_percent' => 0.0],
            ['format' => 'story', 'label' => 'Story', 'count' => 0, 'share_percent' => 0.0],
            ['format' => 'carousel', 'label' => 'Carousel', 'count' => 0, 'share_percent' => 0.0],
            ['format' => 'image', 'label' => 'Image', 'count' => 0, 'share_percent' => 0.0],
            ['format' => 'video', 'label' => 'Video', 'count' => 0, 'share_percent' => 0.0],
        ];
    }

    private function emptyDailyMetricSeries(Carbon $start, Carbon $end): array
    {
        $series = [];
        $cursor = $start->copy()->startOfDay();
        $limit = $end->copy()->endOfDay();

        while ($cursor->lte($limit)) {
            $series[] = [
                'date' => $cursor->toDateString(),
                'reach' => 0,
                'impressions' => 0,
                'engagement' => 0,
            ];
            $cursor->addDay();
        }

        return $series;
    }

    private function emptyAutodmPayload(): array
    {
        return [
            'total_automations' => 0,
            'active_automations' => 0,
            'paused_automations' => 0,
            'automations_sent' => 0,
            'conversion_rate' => 0.0,
            'runs_last_7_days' => 0,
        ];
    }

    /**
     * Sync Instagram analytics and media metrics with Meta Graph API.
     */
    public function sync(Request $request, \App\Services\InstagramAccountAnalyticsSyncService $syncService): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $accountId = $request->input('instagram_account_id');
        if (!$accountId) {
            return response()->json([
                'error' => [
                    'code' => 'INSTAGRAM_ACCOUNT_REQUIRED',
                    'message' => 'An instagram_account_id parameter is required.'
                ]
            ], 422);
        }

        $account = InstagramAccount::where('user_id', $user->id)
            ->where('id', $accountId)
            ->first();

        if (!$account) {
            return response()->json([
                'error' => [
                    'code' => 'INSTAGRAM_ACCOUNT_INVALID',
                    'message' => 'The requested Instagram account was not found or is not accessible.'
                ]
            ], 403);
        }

        try {
            \Illuminate\Support\Facades\Log::info('[InstagramAnalyticsApiController] Initiating manual analytics sync', [
                'user_id' => $user->id,
                'account_id' => $account->id,
                'username' => $account->username,
            ]);

            $result = $syncService->syncLifetime($account);
            return response()->json([
                'success' => true,
                'message' => 'Analytics and profile metrics successfully synced with Meta Graph API',
                'account_id' => (string) $account->id,
                'synced_count' => $result['synced'],
                'considered_count' => $result['considered'],
                'last_synced' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Instagram analytics sync failed', [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to sync analytics with Instagram: ' . $e->getMessage(),
            ], 500);
        }
    }
}
