<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\AdminNotificationLog;
use App\Models\Booking;
use App\Models\BookingEventType;
use App\Models\Channel;
use App\Models\InstagramAccount;
use App\Models\InstagramAccountInsightSnapshot;
use App\Models\InstagramAccountMediaAnalytics;
use App\Models\Lead;
use App\Models\PayoutRequest;
use App\Models\ScheduledPost;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class GenericPagesController extends Controller
{
    public function dashboard()
    {
        $user = auth()->user();
        $now = now();
        $analyticsStart = $now->copy()->subDays(29)->startOfDay();
        $analyticsEnd = $now->copy()->endOfDay();

        $statsCount = [
            'channels' => $user->channels()->count(),
            'videos_analyzed' => $user->contentAnalyses()->count(),
            'scripts' => $user->generatedScripts()->count(),
            'projects' => $user->projects()->count(),
        ];

        $leadStatusCounts = Lead::query()
            ->where('user_id', $user->id)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $scheduledStatusCounts = ScheduledPost::query()
            ->where('user_id', $user->id)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $activeInstagramAccounts = InstagramAccount::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->latest()
            ->get(['id', 'username']);
        $selectedInstagramAccount = $activeInstagramAccounts->first();

        $instagramMediaQuery = null;
        $instagramInsightQuery = null;
        $instagramPosts = 0;
        $instagramReach = 0;
        $instagramImpressions = 0;
        $instagramEngagement = 0;
        $instagramFollowers = 0;
        $instagramLastSyncedAt = null;
        $topInstagramPosts = collect();

        if ($selectedInstagramAccount) {
            $instagramMediaQuery = InstagramAccountMediaAnalytics::query()
                ->where('user_id', $user->id)
                ->where('instagram_account_id', $selectedInstagramAccount->id)
                ->whereBetween('posted_at', [$analyticsStart, $analyticsEnd]);

            $instagramInsightQuery = InstagramAccountInsightSnapshot::query()
                ->where('user_id', $user->id)
                ->where('instagram_account_id', $selectedInstagramAccount->id)
                ->whereBetween('snapshot_date', [$analyticsStart->toDateString(), $analyticsEnd->toDateString()]);

            $mediaAggregate = (clone $instagramMediaQuery)
                ->selectRaw('COUNT(*) as posts')
                ->selectRaw('COALESCE(SUM(reach), 0) as reach')
                ->selectRaw('COALESCE(SUM(impressions), 0) as impressions')
                ->selectRaw('COALESCE(SUM(engagement), 0) as engagement')
                ->first();
            $mediaDailyImpressions = (clone $instagramMediaQuery)
                ->whereNotNull('posted_at')
                ->selectRaw('DATE(posted_at) as date')
                ->selectRaw('COALESCE(SUM(impressions), 0) as impressions')
                ->groupBy(DB::raw('DATE(posted_at)'))
                ->get()
                ->keyBy('date');
            $insightSnapshots = (clone $instagramInsightQuery)
                ->get(['snapshot_date', 'reach', 'impressions', 'follower_count', 'raw_metrics', 'synced_at']);

            $hasInsightRows = $insightSnapshots->isNotEmpty();
            $instagramPosts = (int) ($mediaAggregate?->posts ?? 0);
            $instagramReach = (int) ($hasInsightRows ? $insightSnapshots->sum('reach') : ($mediaAggregate?->reach ?? 0));
            $instagramImpressions = (int) ($hasInsightRows
                ? $insightSnapshots->sum(function (InstagramAccountInsightSnapshot $snapshot) use ($mediaDailyImpressions): int {
                    $date = $snapshot->snapshot_date?->toDateString();
                    $mediaImpressions = is_string($date)
                        ? (int) ($mediaDailyImpressions->get($date)?->impressions ?? 0)
                        : 0;

                    return $this->resolvedInsightSnapshotImpressions($snapshot, $mediaImpressions);
                })
                : ($mediaAggregate?->impressions ?? 0));
            $instagramEngagement = (int) ($mediaAggregate?->engagement ?? 0);
            $instagramFollowers = (int) ($hasInsightRows ? $insightSnapshots->max('follower_count') : 0);

            $mediaLastSyncedAt = (clone $instagramMediaQuery)->whereNotNull('synced_at')->max('synced_at');
            $insightLastSyncedAt = (clone $instagramInsightQuery)->whereNotNull('synced_at')->max('synced_at');
            $instagramLastSyncedAt = $this->latestIsoDateTime($mediaLastSyncedAt, $insightLastSyncedAt);

            $topInstagramPosts = (clone $instagramMediaQuery)
                ->orderByDesc('reach')
                ->orderByDesc('impressions')
                ->limit(3)
                ->get(['id', 'caption', 'permalink', 'reach', 'impressions', 'engagement', 'posted_at']);
        }

        $upcomingBookingsQuery = Booking::query()
            ->where('host_user_id', $user->id)
            ->where('status', Booking::STATUS_CONFIRMED)
            ->where('starts_at', '>=', $now->copy()->utc());

        $upcomingBookings = (clone $upcomingBookingsQuery)
            ->with('eventType:id,name')
            ->orderBy('starts_at')
            ->limit(4)
            ->get();

        $recentActivities = $user->activities()
            ->latest()
            ->take(6)
            ->get()
            ->map(function (Activity $activity): array {
                $iconMap = $this->activityIconMap();

                return [
                    'title' => ucwords(str_replace('_', ' ', $activity->type)),
                    'desc' => $activity->description,
                    'icon' => $iconMap[$activity->type] ?? 'activity',
                    'href' => $this->safeActivityHref($activity->url),
                    'date' => $activity->created_at->diffForHumans(),
                ];
            });

        $nextScheduledPosts = ScheduledPost::query()
            ->where('user_id', $user->id)
            ->where('status', ScheduledPost::STATUS_SCHEDULED)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '>=', $now)
            ->with('instagramAccount:id,username')
            ->orderBy('scheduled_at')
            ->limit(4)
            ->get();

        $nextBestActions = [];
        if ($statsCount['channels'] === 0) {
            $nextBestActions = [
                ['title' => 'Track your first channel', 'desc' => 'Add competitor or inspiration channels', 'icon' => 'channel', 'action' => 'Get Started', 'href' => '/competitors', 'color' => 'primary'],
                ['title' => 'Explore viral videos', 'desc' => 'Discover top-performing content', 'icon' => 'trendingUp', 'action' => 'Browse', 'href' => '/Library', 'color' => 'accent'],
                ['title' => 'Create your first project', 'desc' => 'Organize scripts and videos', 'icon' => 'projects', 'action' => 'Create', 'href' => '/projects', 'color' => 'warning'],
            ];
        } elseif ($statsCount['videos_analyzed'] === 0) {
            $nextBestActions = [
                ['title' => 'Discover viral videos', 'desc' => 'Find high-performing videos to analyze', 'icon' => 'trendingUp', 'action' => 'Browse', 'href' => '/Library', 'color' => 'accent'],
                ['title' => 'Track new channels', 'desc' => 'Add more competitor channels', 'icon' => 'channel', 'action' => 'Get Started', 'href' => '/competitors', 'color' => 'primary'],
                ['title' => 'Create your first project', 'desc' => 'Organize scripts and videos', 'icon' => 'projects', 'action' => 'Create', 'href' => '/projects', 'color' => 'warning'],
            ];
        } elseif ($statsCount['scripts'] === 0) {
            $nextBestActions = [
                ['title' => 'Create a fresh script', 'desc' => 'Write an AI-powered script from scratch', 'icon' => 'scripts', 'action' => 'Create', 'href' => '/scripts', 'color' => 'success'],
                ['title' => 'Discover viral videos', 'desc' => 'Find more videos to analyze', 'icon' => 'trendingUp', 'action' => 'Browse', 'href' => '/Library', 'color' => 'accent'],
                ['title' => 'Track new channels', 'desc' => 'Expand your tracking list', 'icon' => 'channel', 'action' => 'Get Started', 'href' => '/competitors', 'color' => 'primary'],
            ];
        } else {
            $nextBestActions = [
                ['title' => 'Review your Watchlist', 'desc' => 'See new videos from tracked channels', 'icon' => 'videos', 'action' => 'Review', 'href' => '/Library', 'color' => 'accent'],
                ['title' => 'Create a fresh script', 'desc' => 'Write an AI-powered script from scratch', 'icon' => 'scripts', 'action' => 'Create', 'href' => '/scripts', 'color' => 'success'],
                ['title' => 'Organize your work', 'desc' => 'Manage projects and saved videos', 'icon' => 'projects', 'action' => 'Manage', 'href' => '/projects', 'color' => 'warning'],
            ];
        }

        return Inertia::render('Dashboard', [
            'statsCount' => $statsCount,
            'nextBestActions' => $nextBestActions,
            'recentActivities' => $recentActivities,
            'kpi_summary' => [
                [
                    'key' => 'channels_tracked',
                    'label' => 'Channels Tracked',
                    'value' => (int) ($statsCount['channels'] ?? 0),
                    'href' => '/competitors',
                    'icon' => 'UsersRound',
                    'tone' => 'primary',
                ],
                [
                    'key' => 'videos_analyzed',
                    'label' => 'Videos Analyzed',
                    'value' => (int) ($statsCount['videos_analyzed'] ?? 0),
                    'href' => '/Library',
                    'icon' => 'PlayCircle',
                    'tone' => 'sky',
                ],
                [
                    'key' => 'scripts_generated',
                    'label' => 'Scripts Generated',
                    'value' => (int) ($statsCount['scripts'] ?? 0),
                    'href' => '/scripts',
                    'icon' => 'ScrollText',
                    'tone' => 'emerald',
                ],
                [
                    'key' => 'projects',
                    'label' => 'Projects',
                    'value' => (int) ($statsCount['projects'] ?? 0),
                    'href' => '/projects',
                    'icon' => 'FolderKanban',
                    'tone' => 'amber',
                ],
                [
                    'key' => 'total_leads',
                    'label' => 'Total Leads',
                    'value' => (int) $leadStatusCounts->sum(),
                    'href' => '/crm',
                    'icon' => 'Users',
                    'tone' => 'violet',
                ],
                [
                    'key' => 'upcoming_bookings',
                    'label' => 'Upcoming Bookings',
                    'value' => (int) (clone $upcomingBookingsQuery)->count(),
                    'href' => '/appointments/upcoming',
                    'icon' => 'CalendarClock',
                    'tone' => 'rose',
                ],
            ],
            'instagram_overview' => [
                'has_account' => (bool) $selectedInstagramAccount,
                'active_accounts_count' => $activeInstagramAccounts->count(),
                'account' => $selectedInstagramAccount ? [
                    'id' => $selectedInstagramAccount->id,
                    'username' => $selectedInstagramAccount->username,
                ] : null,
                'period' => [
                    'start' => $analyticsStart->toDateString(),
                    'end' => $analyticsEnd->toDateString(),
                    'days' => 30,
                ],
                'posts' => $instagramPosts,
                'reach' => $instagramReach,
                'impressions' => $instagramImpressions,
                'engagement' => $instagramEngagement,
                'followers' => $instagramFollowers,
                'last_synced_at' => $instagramLastSyncedAt,
                'top_posts' => $topInstagramPosts->map(fn (InstagramAccountMediaAnalytics $row): array => [
                    'id' => $row->id,
                    'caption' => trim((string) $row->caption),
                    'permalink' => $this->safeExternalUrl($row->permalink),
                    'reach' => (int) $row->reach,
                    'impressions' => (int) $row->impressions,
                    'engagement' => (int) $row->engagement,
                    'posted_at' => $row->posted_at?->toIso8601String(),
                ])->values(),
            ],
            'scheduler_overview' => [
                'draft' => (int) ($scheduledStatusCounts->get(ScheduledPost::STATUS_DRAFT) ?? 0),
                'scheduled' => (int) ($scheduledStatusCounts->get(ScheduledPost::STATUS_SCHEDULED) ?? 0),
                'publishing' => (int) ($scheduledStatusCounts->get(ScheduledPost::STATUS_PUBLISHING) ?? 0),
                'failed' => (int) ($scheduledStatusCounts->get(ScheduledPost::STATUS_FAILED) ?? 0),
                'due_now' => (int) ScheduledPost::query()
                    ->where('user_id', $user->id)
                    ->where('status', ScheduledPost::STATUS_SCHEDULED)
                    ->whereNotNull('scheduled_at')
                    ->where('scheduled_at', '<=', $now)
                    ->count(),
                'next_queue' => $nextScheduledPosts->map(fn (ScheduledPost $post): array => [
                    'id' => $post->id,
                    'title' => trim((string) ($post->title ?: ucfirst((string) $post->format).' post')),
                    'format' => $post->format,
                    'scheduled_at' => $post->scheduled_at?->toIso8601String(),
                    'instagram_username' => $post->instagramAccount?->username,
                ])->values(),
            ],
            'crm_funnel' => [
                'total' => (int) $leadStatusCounts->sum(),
                'new' => (int) ($leadStatusCounts->get(Lead::STATUS_NEW) ?? 0),
                'booked' => (int) ($leadStatusCounts->get(Lead::STATUS_BOOKED) ?? 0),
                'cancelled' => (int) ($leadStatusCounts->get(Lead::STATUS_CANCELLED) ?? 0),
                'archived' => (int) ($leadStatusCounts->get(Lead::STATUS_ARCHIVED) ?? 0),
                'booked_rate_percent' => $this->safePercent(
                    (int) ($leadStatusCounts->get(Lead::STATUS_BOOKED) ?? 0),
                    max(1, (int) $leadStatusCounts->sum())
                ),
                'recent_leads' => Lead::query()
                    ->where('user_id', $user->id)
                    ->orderByRaw('COALESCE(captured_at, created_at) DESC')
                    ->limit(5)
                    ->get(['id', 'name', 'email', 'source_label', 'status', 'captured_at', 'created_at'])
                    ->map(fn (Lead $lead): array => [
                        'id' => $lead->id,
                        'name' => $lead->name ?: 'Unnamed lead',
                        'email' => $lead->email,
                        'source_label' => $lead->source_label,
                        'status' => $lead->status,
                        'captured_at' => $lead->captured_at?->toIso8601String() ?? $lead->created_at?->toIso8601String(),
                    ])
                    ->values(),
            ],
            'appointments_overview' => [
                'active_event_types' => (int) BookingEventType::query()
                    ->where('host_user_id', $user->id)
                    ->where('is_active', true)
                    ->count(),
                'upcoming_bookings_count' => (int) (clone $upcomingBookingsQuery)->count(),
                'cancelled_bookings_last_30_days' => (int) Booking::query()
                    ->where('host_user_id', $user->id)
                    ->where('status', Booking::STATUS_CANCELLED)
                    ->where('updated_at', '>=', $now->copy()->subDays(30))
                    ->count(),
                'next_bookings' => $upcomingBookings->map(fn (Booking $booking): array => [
                    'id' => $booking->id,
                    'guest_name' => $booking->guest_name,
                    'event_type_name' => $booking->eventType?->name,
                    'starts_at' => $booking->starts_at?->toIso8601String(),
                    'guest_timezone' => $booking->guest_timezone,
                ])->values(),
            ],
            'recent_activity_overview' => [
                'unread_notifications' => (int) $user->unreadNotifications()->count(),
                'last_7_days' => (int) $user->activities()->where('created_at', '>=', $now->copy()->subDays(7))->count(),
                'items' => $recentActivities,
            ],
        ]);
    }

    public function adminHome()
    {
        return Inertia::render('Admin/Home', [
            'adminStats' => [
                'channels_monitored' => Channel::query()->count(),
                'failed_scrapes' => Channel::query()
                    ->where('apify_profile_run_status', 'FAILED')
                    ->orWhere('apify_post_run_status', 'FAILED')
                    ->count(),
                'pending_payouts' => PayoutRequest::query()->where('status', 'pending')->count(),
                'notifications_sent' => AdminNotificationLog::query()->count(),
            ],
        ]);
    }

    public function recentActivity()
    {
        $user = auth()->user();

        $activities = $user->activities()->latest()->paginate(20)->through(function ($activity) {
            $typeMap = [
                'channel_tracked' => [
                    'icon' => 'channel',
                    'color' => 'text-emerald-600',
                    'bgColor' => 'bg-emerald-100',
                    'iconBgColor' => 'bg-emerald-500',
                    'category' => 'User Action',
                ],
                'video_analyzed' => [
                    'icon' => 'microscope',
                    'color' => 'text-blue-600',
                    'bgColor' => 'bg-blue-100',
                    'iconBgColor' => 'bg-blue-500',
                    'category' => 'Processing',
                ],
                'script_generated' => [
                    'icon' => 'scripts',
                    'color' => 'text-primary-600',
                    'bgColor' => 'bg-purple-100',
                    'iconBgColor' => 'bg-purple-500',
                    'category' => 'AI Activity',
                ],
                'project_created' => [
                    'icon' => 'projects',
                    'color' => 'text-amber-600',
                    'bgColor' => 'bg-amber-100',
                    'iconBgColor' => 'bg-amber-500',
                    'category' => 'User Action',
                ],
            ];

            $mapping = $typeMap[$activity->type] ?? [
                'icon' => 'activity',
                'color' => 'text-slate-600',
                'bgColor' => 'bg-slate-100',
                'iconBgColor' => 'bg-slate-500',
                'category' => 'System',
            ];

            return [
                'id' => $activity->id,
                'title' => ucwords(str_replace('_', ' ', $activity->type)),
                'desc' => $activity->description,
                'icon' => $mapping['icon'],
                'color' => $mapping['color'],
                'bgColor' => $mapping['bgColor'],
                'iconBgColor' => $mapping['iconBgColor'],
                'href' => $this->safeActivityHref($activity->url),
                'time' => $activity->created_at->diffForHumans(),
                'category' => $mapping['category'],
            ];
        });

        return Inertia::render('RecentActivity', [
            'activities' => $activities,
        ]);
    }

    public function pricing()
    {
        return Inertia::render('Pricing', [
            'hasClaimedFree' => auth()->check() ? (bool) auth()->user()->has_claimed_free : false,
        ]);
    }

    public function waitlist()
    {
        return Inertia::render('Waitlist');
    }

    public function privacyPolicy()
    {
        return Inertia::render('PrivacyPolicy');
    }

    public function autodmTerms()
    {
        return Inertia::render('AutoDM/Terms');
    }

    public function autodmDataDeletion()
    {
        return redirect()->to(route('privacy-policy').'#data-deletion');
    }

    private function safeActivityHref(?string $url): string
    {
        return Activity::sanitizeInternalUrl($url) ?? '#';
    }

    /**
     * @return array<string, string>
     */
    private function activityIconMap(): array
    {
        return [
            'channel_tracked' => 'channel',
            'video_analyzed' => 'microscope',
            'script_generated' => 'scripts',
            'project_created' => 'projects',
        ];
    }

    private function safePercent(int $part, int $whole): float
    {
        if ($whole <= 0) {
            return 0.0;
        }

        return round(($part / $whole) * 100, 1);
    }

    private function latestIsoDateTime(?string $firstValue, ?string $secondValue): ?string
    {
        $candidates = collect([$firstValue, $secondValue])
            ->filter(fn ($value): bool => is_string($value) && trim($value) !== '')
            ->map(fn (string $value): Carbon => Carbon::parse($value))
            ->sortByDesc(fn (Carbon $value): int => $value->getTimestamp());

        return $candidates->isNotEmpty() ? $candidates->first()->toIso8601String() : null;
    }

    private function resolvedInsightSnapshotImpressions(
        InstagramAccountInsightSnapshot $snapshot,
        int $mediaImpressions
    ): int {
        $snapshotValue = max(0, (int) $snapshot->impressions);
        $rawMetricRows = data_get($snapshot->raw_metrics, 'data');

        if (! is_array($rawMetricRows) || $rawMetricRows === []) {
            return $snapshotValue;
        }

        foreach ($rawMetricRows as $metricRow) {
            if (is_array($metricRow)) {
                $name = strtolower(trim((string) ($metricRow['name'] ?? '')));
                if ($name === 'impressions' || $name === 'views') {
                    return $snapshotValue;
                }
            }
        }

        return max(0, $mediaImpressions);
    }

    private function safeExternalUrl(?string $url): ?string
    {
        if (! is_string($url)) {
            return null;
        }

        $normalized = trim($url);
        if ($normalized === '' || ! str_starts_with(strtolower($normalized), 'https://')) {
            return null;
        }

        return $normalized;
    }
}
