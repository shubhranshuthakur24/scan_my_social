<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreContentSchedulerMediaRequest;
use App\Http\Requests\StoreScheduledPostRequest;
use App\Jobs\PublishScheduledPostJob;
use App\Jobs\SyncInstagramAccountAnalyticsJob;
use App\Models\AutomationFlow;
use App\Models\AutomationLog;
use App\Models\ContentSchedulerMedia;
use App\Models\InstagramAccount;
use App\Models\InstagramAccountInsightSnapshot;
use App\Models\InstagramAccountMediaAnalytics;
use App\Models\ScheduledPost;
use App\Models\SchedulerNote;
use App\Services\MetaApiService;
use App\Services\PlanService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ContentSchedulerController extends Controller
{
    private const ANALYTICS_MAX_DAYS = 90;

    /**
     * @var array<string, string>
     */
    private const KNOWN_CONTINENT_NAMES = [
        'africa' => 'Africa',
        'antarctica' => 'Antarctica',
        'asia' => 'Asia',
        'europe' => 'Europe',
        'north america' => 'North America',
        'south america' => 'South America',
        'oceania' => 'Oceania',
        'australia' => 'Oceania',
    ];

    public function calendar(Request $request): Response
    {
        $user = $request->user();
        $month = $this->resolveMonth((string) $request->query('month', now()->format('Y-m')));
        $monthStart = Carbon::createFromFormat('Y-m-d', "{$month}-01")->startOfMonth();
        $monthEnd = $monthStart->copy()->endOfMonth();
        $instagramAccounts = InstagramAccount::query()
            ->where('user_id', $user->id)
            ->latest()
            ->get(['id', 'username', 'status', 'profile_url', 'profile_picture_url', 'ig_account_id']);
        $activeAccounts = $instagramAccounts->where('status', 'active');
        $hasActiveAccount = $activeAccounts->isNotEmpty();
        $requestedAccountId = (int) $request->integer('instagram_account_id');
        $selectedInstagramAccount = null;

        if ($hasActiveAccount) {
            if ($requestedAccountId > 0) {
                $selectedInstagramAccount = $activeAccounts->firstWhere('id', $requestedAccountId);
            }

            if (! $selectedInstagramAccount) {
                $selectedInstagramAccount = $activeAccounts->first();
            }
        }

        $selectedInstagramAccountId = $selectedInstagramAccount?->id;

        $notes = SchedulerNote::query()
            ->where('user_id', $user->id)
            ->whereBetween('note_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->orderBy('note_date')
            ->orderBy('created_at')
            ->get();

        if ($hasActiveAccount && $selectedInstagramAccountId !== null) {
            $posts = ScheduledPost::query()
                ->where('user_id', $user->id)
                ->where('instagram_account_id', $selectedInstagramAccountId)
                ->whereBetween('scheduled_at', [$monthStart, $monthEnd])
                ->with(['instagramAccount:id,username,status', 'media:id,media_type,url,path,disk'])
                ->orderBy('scheduled_at')
                ->get();
            $statusCounts = $this->statusCounts($user->id, $selectedInstagramAccountId);
            $queuePosts = ScheduledPost::query()
                ->where('user_id', $user->id)
                ->where('instagram_account_id', $selectedInstagramAccountId)
                ->where('status', ScheduledPost::STATUS_PUBLISHING)
                ->with(['instagramAccount:id,username,status', 'media:id,media_type,url,path,disk'])
                ->orderBy('updated_at')
                ->limit(8)
                ->get();
        } else {
            $posts = collect();
            $statusCounts = [
                'scheduled' => 0,
                'in_queue' => 0,
                'published' => 0,
                'failed' => 0,
            ];
            $queuePosts = collect();
        }

        return Inertia::render('ContentScheduler/Calendar', [
            'calendar_month' => $month,
            'calendar_today' => now()->toDateString(),
            'instagram_accounts' => $instagramAccounts->map(fn (InstagramAccount $account): array => [
                'id' => $account->id,
                'username' => $account->username,
                'status' => $account->status,
                'profile_url' => $account->profile_url,
                'profile_picture_url' => $account->profile_picture_url,
                'ig_account_id' => $account->ig_account_id,
            ])->values(),
            'selected_instagram_account_id' => $selectedInstagramAccountId,
            'has_active_account' => $hasActiveAccount,
            'disconnectToast' => $this->resolveDisconnectedAccountToast((int) $user->id),
            'connected_count' => $instagramAccounts->count(),
            'active_connected_count' => $activeAccounts->count(),
            'can_connect_more' => PlanService::canConnectMoreInstagramAccounts($user),
            'events' => $posts->map(fn (ScheduledPost $post): array => $this->scheduledPostPayload($post))->values(),
            'scheduler_notes' => $notes->map(fn (SchedulerNote $note): array => [
                'id' => $note->id,
                'note_date' => $note->note_date?->toDateString(),
                'content' => $note->content,
                'created_at' => $note->created_at?->toIso8601String(),
                'updated_at' => $note->updated_at?->toIso8601String(),
            ])->values(),
            'status_counts' => $statusCounts,
            'queue_posts' => $queuePosts
                ->map(fn (ScheduledPost $post): array => $this->scheduledPostPayload($post))
                ->values(),
        ]);
    }

    public function library(Request $request): Response
    {
        $user = $request->user();
        $mediaType = (string) $request->query('type', 'all');
        $search = trim((string) $request->query('search', ''));

        $media = ContentSchedulerMedia::query()
            ->where('user_id', $user->id)
            ->when(in_array($mediaType, ['image', 'video'], true), fn ($query) => $query->where('media_type', $mediaType))
            ->when($search !== '', function ($query) use ($search): void {
                $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $search);
                $query->where(function ($innerQuery) use ($escaped): void {
                    $innerQuery
                        ->where('title', 'like', "%{$escaped}%")
                        ->orWhere('original_name', 'like', "%{$escaped}%")
                        ->orWhere('default_caption', 'like', "%{$escaped}%");
                });
            })
            ->latest()
            ->get();

        return Inertia::render('ContentScheduler/Library', [
            'media_assets' => $media->map(fn (ContentSchedulerMedia $asset): array => $this->mediaPayload($asset))->values(),
            'filters' => [
                'type' => $mediaType,
                'search' => $search,
            ],
            'library_summary' => [
                'total' => ContentSchedulerMedia::query()->where('user_id', $user->id)->count(),
                'images' => ContentSchedulerMedia::query()->where('user_id', $user->id)->where('media_type', 'image')->count(),
                'videos' => ContentSchedulerMedia::query()->where('user_id', $user->id)->where('media_type', 'video')->count(),
            ],
        ]);
    }

    public function storeMedia(StoreContentSchedulerMediaRequest $request): RedirectResponse
    {
        $this->authorize('create', ContentSchedulerMedia::class);

        $file = $request->file('media');
        $disk = (string) config('filesystems.upload_disk', 'public');
        $path = $file->store('content-scheduler/media', $disk);
        $mediaType = str_starts_with((string) $file->getMimeType(), 'video/') ? 'video' : 'image';

        ContentSchedulerMedia::query()->create([
            'user_id' => $request->user()->id,
            'disk' => $disk,
            'path' => $path,
            'url' => Storage::disk($disk)->url($path),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => (string) $file->getMimeType(),
            'media_type' => $mediaType,
            'size_bytes' => (int) $file->getSize(),
            'title' => $request->string('title')->trim()->toString() ?: null,
            'default_caption' => $request->string('default_caption')->trim()->toString() ?: null,
            'metadata' => [],
        ]);

        return back()->with('success', 'Media uploaded.');
    }

    public function destroyMedia(ContentSchedulerMedia $media): RedirectResponse
    {
        $this->authorize('delete', $media);

        if ($media->scheduledPosts()->whereIn('status', [ScheduledPost::STATUS_SCHEDULED, ScheduledPost::STATUS_PUBLISHING])->exists()) {
            return back()->withErrors(['media' => 'Media used by an active scheduled post cannot be deleted.']);
        }

        try {
            Storage::disk((string) $media->disk)->delete((string) $media->path);
        } catch (\Throwable $exception) {
            Log::error('Failed to delete media asset from storage disk during removal', [
                'media_id' => $media->id,
                'disk' => $media->disk,
                'path' => $media->path,
                'exception' => $exception->getMessage(),
            ]);
        }
        $media->delete();

        return back()->with('success', 'Media deleted.');
    }

    public function schedule(Request $request): Response
    {
        $user = $request->user();
        $instagramAccounts = InstagramAccount::query()
            ->where('user_id', $user->id)
            ->latest()
            ->get(['id', 'username', 'profile_url', 'profile_picture_url', 'status', 'ig_account_id']);
        $activeAccounts = $instagramAccounts->where('status', 'active');
        $hasActiveAccount = $activeAccounts->isNotEmpty();
        $requestedAccountId = (int) $request->integer('instagram_account_id');
        $selectedInstagramAccount = null;

        if ($hasActiveAccount) {
            if ($requestedAccountId > 0) {
                $selectedInstagramAccount = $activeAccounts->firstWhere('id', $requestedAccountId);
            }

            if (! $selectedInstagramAccount) {
                $selectedInstagramAccount = $activeAccounts->first();
            }
        }

        $selectedInstagramAccountId = $selectedInstagramAccount?->id;

        $scheduledPosts = ($hasActiveAccount && $selectedInstagramAccountId !== null)
            ? ScheduledPost::query()
                ->where('user_id', $user->id)
                ->where('instagram_account_id', $selectedInstagramAccountId)
                ->with(['instagramAccount:id,username,status', 'media:id,media_type,url,path,disk'])
                ->latest()
                ->limit(20)
                ->get()
                ->map(fn (ScheduledPost $post): array => $this->scheduledPostPayload($post))
            : collect();

        return Inertia::render('ContentScheduler/Schedule', [
            'instagram_accounts' => $instagramAccounts->map(fn (InstagramAccount $account): array => [
                'id' => $account->id,
                'username' => $account->username,
                'profile_url' => $account->profile_url,
                'profile_picture_url' => $account->profile_picture_url,
                'status' => $account->status,
                'ig_account_id' => $account->ig_account_id,
            ]),
            'selected_instagram_account_id' => $selectedInstagramAccountId,
            'has_active_account' => $hasActiveAccount,
            'disconnectToast' => $this->resolveDisconnectedAccountToast((int) $user->id),
            'connected_count' => $instagramAccounts->count(),
            'active_connected_count' => $activeAccounts->count(),
            'can_connect_more' => PlanService::canConnectMoreInstagramAccounts($user),
            'media_assets' => ContentSchedulerMedia::query()
                ->where('user_id', $user->id)
                ->latest()
                ->limit(60)
                ->get()
                ->map(fn (ContentSchedulerMedia $asset): array => $this->mediaPayload($asset)),
            'scheduled_posts' => $scheduledPosts,
            'format_options' => [
                ['value' => ScheduledPost::FORMAT_IMAGE, 'label' => 'Image Post'],
                ['value' => ScheduledPost::FORMAT_VIDEO, 'label' => 'Video Post'],
                ['value' => ScheduledPost::FORMAT_REEL, 'label' => 'Reel'],
                ['value' => ScheduledPost::FORMAT_STORY, 'label' => 'Story'],
                ['value' => ScheduledPost::FORMAT_CAROUSEL, 'label' => 'Carousel'],
            ],
        ]);
    }

    public function storeScheduledPost(StoreScheduledPostRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $mediaIds = collect($validated['media_asset_ids'])->values();
        $draftPostId = (int) ($validated['draft_post_id'] ?? 0);
        $publishNow = $request->boolean('publish_now');

        $post = DB::transaction(function () use ($request, $validated, $mediaIds, $draftPostId, $publishNow): ScheduledPost {
            $payload = [
                'instagram_account_id' => $validated['instagram_account_id'],
                'title' => $validated['title'] ?? null,
                'platform' => 'instagram',
                'format' => $validated['format'],
                'status' => $publishNow ? ScheduledPost::STATUS_PUBLISHING : $validated['status'],
                'caption' => $validated['caption'] ?? null,
                'hashtags' => $validated['hashtags'] ?? [],
                'options' => $validated['options'] ?? [],
                'scheduled_at' => $publishNow ? now() : ($validated['scheduled_at'] ?? null),
            ];

            $post = null;
            if ($draftPostId > 0) {
                $post = ScheduledPost::query()
                    ->whereKey($draftPostId)
                    ->where('user_id', $request->user()->id)
                    ->where('status', ScheduledPost::STATUS_DRAFT)
                    ->lockForUpdate()
                    ->first();
            }

            if ($post) {
                $post->fill($payload);
                $post->save();
            } else {
                $post = ScheduledPost::query()->create([
                    'user_id' => $request->user()->id,
                    ...$payload,
                ]);
            }

            $post->media()->sync($mediaIds->mapWithKeys(fn ($id, int $index): array => [
                $id => ['sort_order' => $index],
            ])->all());

            return $post;
        });

        if ($publishNow) {
            PublishScheduledPostJob::dispatch($post->id);
        }

        $message = match ($post->status) {
            ScheduledPost::STATUS_PUBLISHING => 'Publishing queued.',
            ScheduledPost::STATUS_SCHEDULED => 'Post scheduled.',
            default => 'Draft saved.',
        };

        return redirect()
            ->route('instagram.schedule')
            ->with('success', $message);
    }

    public function reschedule(Request $request, ScheduledPost $scheduledPost): RedirectResponse
    {
        $this->authorize('update', $scheduledPost);

        $validated = $request->validate([
            'scheduled_at' => ['required', 'date', 'after:now'],
        ]);

        $scheduledPost->update([
            'status' => ScheduledPost::STATUS_SCHEDULED,
            'scheduled_at' => $validated['scheduled_at'],
            'last_error' => null,
        ]);

        return back()->with('success', 'Post rescheduled.');
    }

    public function cancel(ScheduledPost $scheduledPost): RedirectResponse
    {
        $this->authorize('delete', $scheduledPost);

        DB::transaction(function () use ($scheduledPost): void {
            $scheduledPost->update(['status' => ScheduledPost::STATUS_CANCELLED]);
            $scheduledPost->delete();
        });

        return back()->with('success', 'Post removed from calendar.');
    }

    public function retryPublish(ScheduledPost $scheduledPost): RedirectResponse
    {
        $this->authorize('update', $scheduledPost);

        abort_unless($scheduledPost->status === ScheduledPost::STATUS_FAILED, 422);

        $scheduledPost->update([
            'status' => ScheduledPost::STATUS_SCHEDULED,
            'scheduled_at' => now(),
            'last_error' => null,
        ]);

        PublishScheduledPostJob::dispatch($scheduledPost->id);

        return back()->with('success', 'Publishing retry queued.');
    }

    public function storeNote(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'note_date' => ['required', 'date'],
            'content' => ['required', 'string', 'max:1500'],
        ]);
        $content = trim((string) $validated['content']);

        if ($content === '') {
            return back()->withErrors(['content' => 'Note content is required.']);
        }

        SchedulerNote::query()->create([
            'user_id' => $request->user()->id,
            'note_date' => $validated['note_date'],
            'content' => $content,
        ]);

        return back()->with('success', 'Note added.');
    }

    public function updateNote(Request $request, SchedulerNote $schedulerNote): RedirectResponse
    {
        abort_unless($schedulerNote->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:1500'],
        ]);
        $content = trim((string) $validated['content']);

        if ($content === '') {
            return back()->withErrors(['content' => 'Note content is required.']);
        }

        $schedulerNote->update([
            'content' => $content,
        ]);

        return back()->with('success', 'Note updated.');
    }

    public function destroyNote(Request $request, SchedulerNote $schedulerNote): RedirectResponse
    {
        abort_unless($schedulerNote->user_id === $request->user()->id, 403);

        $schedulerNote->delete();

        return back()->with('success', 'Note deleted.');
    }

    public function analytics(Request $request): Response
    {
        $user = $request->user();
        [$start, $end] = $this->resolveAnalyticsDateRange($request);
        $instagramAccounts = InstagramAccount::query()
            ->where('user_id', $user->id)
            ->latest()
            ->get(['id', 'username', 'status', 'profile_url', 'profile_picture_url', 'ig_account_id']);
        $activeInstagramAccounts = $instagramAccounts->where('status', 'active');
        $hasActiveAccount = $activeInstagramAccounts->isNotEmpty();

        $requestedAccountId = (int) $request->integer('instagram_account_id');
        $selectedInstagramAccount = null;

        if ($hasActiveAccount) {
            if ($requestedAccountId > 0) {
                $selectedInstagramAccount = $activeInstagramAccounts->firstWhere('id', $requestedAccountId);
            }

            if (! $selectedInstagramAccount) {
                $selectedInstagramAccount = $activeInstagramAccounts->first();
            }
        }

        return Inertia::render('ContentScheduler/Analytics', [
            'instagram_accounts' => $instagramAccounts->map(fn (InstagramAccount $account): array => [
                'id' => $account->id,
                'username' => $account->username,
                'status' => $account->status,
                'profile_url' => $account->profile_url,
                'profile_picture_url' => $account->profile_picture_url,
                'ig_account_id' => $account->ig_account_id,
            ])->values(),
            'selected_instagram_account_id' => $selectedInstagramAccount?->id,
            'selected_account' => $this->instagramAccountContextPayload($selectedInstagramAccount),
            'has_active_account' => $hasActiveAccount,
            'disconnectToast' => $this->resolveDisconnectedAccountToast((int) $user->id),
            'connected_count' => $instagramAccounts->count(),
            'active_connected_count' => $activeInstagramAccounts->count(),
            'can_connect_more' => PlanService::canConnectMoreInstagramAccounts($user),
            ...$this->instagramAnalyticsProps(
                userId: $user->id,
                selectedInstagramAccountId: $selectedInstagramAccount?->id,
                start: $start,
                end: $end
            ),
        ]);
    }

    public function myInsta(Request $request, MetaApiService $metaApiService): Response
    {
        $user = $request->user();
        $formatFilters = $this->resolveMyInstaFormatFilters($request->query('format', 'all'));
        $autodmFilter = $this->resolveMyInstaAutodmFilter((string) $request->query('autodm', 'all'));
        [$startDateFilter, $endDateFilter] = $this->resolveMyInstaDateRange(
            (string) $request->query('start', ''),
            (string) $request->query('end', '')
        );
        $instagramAccounts = InstagramAccount::query()
            ->where('user_id', $user->id)
            ->latest()
            ->get([
                'id',
                'username',
                'status',
                'profile_url',
                'profile_picture_url',
                'profile_picture_synced_at',
                'ig_account_id',
                'access_token',
            ]);

        $disconnectToast = $this->resolveDisconnectedAccountToast((int) $user->id);
        $activeAccounts = $instagramAccounts->where('status', 'active');
        $hasActiveAccount = $activeAccounts->isNotEmpty();

        $requestedAccountId = (int) $request->integer('instagram_account_id');
        $selectedInstagramAccount = null;

        if ($requestedAccountId > 0) {
            $selectedInstagramAccount = $instagramAccounts->firstWhere('id', $requestedAccountId);
        }

        if (! $selectedInstagramAccount) {
            $selectedInstagramAccount = $activeAccounts->first() ?: $instagramAccounts->first();
        }

        $isSelectedActive = $selectedInstagramAccount && $selectedInstagramAccount->status === 'active';

        if ($isSelectedActive) {
            $selectedInstagramAccount = $this->refreshSelectedMyInstaAccountProfilePicture($selectedInstagramAccount, $metaApiService);
            // Auto-sync posts in the background if the last sync was over 4 hours ago
            $autoSyncKey = "instagram:auto-sync:{$selectedInstagramAccount->id}";
            if (! app()->environment('testing') && ! Cache::has($autoSyncKey)) {
                SyncInstagramAccountAnalyticsJob::dispatch(
                    userId: (int) $user->id,
                    instagramAccountId: (int) $selectedInstagramAccount->id,
                    startDate: now()->subDays(14)->toDateString(),
                    endDate: now()->toDateString(),
                    lifetime: false
                );
                Cache::put($autoSyncKey, true, now()->addHours(4));
            }

            $instagramAccounts = $instagramAccounts->map(fn (InstagramAccount $account): InstagramAccount => $account->id === $selectedInstagramAccount->id
                ? $selectedInstagramAccount
                : $account);
        }

        $feedPosts = [
            'data' => [],
            'current_page' => 1,
            'next_page_url' => null,
            'prev_page_url' => null,
            'per_page' => 18,
            'path' => $request->url(),
        ];
        $accountTotals = [
            'posts' => 0,
            'likes' => 0,
            'comments' => 0,
            'reach' => 0,
            'impressions' => 0,
        ];
        $autodmKpis = $this->myInstaAutodmKpis($user->id, $isSelectedActive ? $selectedInstagramAccount?->id : null);

        if ($isSelectedActive) {
            $activeAutodmFlowMediaIdsQuery = AutomationFlow::query()
                ->where('user_id', $user->id)
                ->where('instagram_account_id', $selectedInstagramAccount->id)
                ->where('status', 'active')
                ->whereNotNull('trigger_value')
                ->where('trigger_value', '!=', '')
                ->select('trigger_value');

            $pausedAutodmFlowMediaIdsQuery = AutomationFlow::query()
                ->where('user_id', $user->id)
                ->where('instagram_account_id', $selectedInstagramAccount->id)
                ->where('status', 'paused')
                ->whereNotNull('trigger_value')
                ->where('trigger_value', '!=', '')
                ->whereNotIn('trigger_value', (clone $activeAutodmFlowMediaIdsQuery))
                ->select('trigger_value');

            $filteredFeedQuery = InstagramAccountMediaAnalytics::query()
                ->where('user_id', $user->id)
                ->where('instagram_account_id', $selectedInstagramAccount->id);

            $this->applyMyInstaStoryVisibilityFilter($filteredFeedQuery);
            $this->applyMyInstaFormatFilter($filteredFeedQuery, $formatFilters);
            $this->applyMyInstaPostedAtDateFilter($filteredFeedQuery, $startDateFilter, $endDateFilter);
            $this->applyMyInstaAutodmFilter(
                $filteredFeedQuery,
                $autodmFilter,
                $activeAutodmFlowMediaIdsQuery,
                $pausedAutodmFlowMediaIdsQuery
            );

            $aggregate = (clone $filteredFeedQuery)
                ->selectRaw('COUNT(*) as posts')
                ->selectRaw('COALESCE(SUM(likes), 0) as likes')
                ->selectRaw('COALESCE(SUM(comments), 0) as comments')
                ->selectRaw('COALESCE(SUM(reach), 0) as reach')
                ->selectRaw('COALESCE(SUM(impressions), 0) as impressions')
                ->first();

            $accountTotals = [
                'posts' => (int) ($aggregate?->posts ?? 0),
                'likes' => (int) ($aggregate?->likes ?? 0),
                'comments' => (int) ($aggregate?->comments ?? 0),
                'reach' => (int) ($aggregate?->reach ?? 0),
                'impressions' => (int) ($aggregate?->impressions ?? 0),
            ];

            $paginator = (clone $filteredFeedQuery)
                ->orderByDesc('posted_at')
                ->orderByDesc('id')
                ->paginate(18)
                ->withQueryString();

            $rows = $paginator->getCollection();
            $mediaIds = $rows
                ->map(fn (InstagramAccountMediaAnalytics $row): string => trim((string) $row->instagram_media_id))
                ->filter(fn (string $mediaId): bool => $mediaId !== '')
                ->unique()
                ->values();

            $autodmFlowsByMediaId = AutomationFlow::query()
                ->where('user_id', $user->id)
                ->where('instagram_account_id', $selectedInstagramAccount->id)
                ->whereIn('status', ['active', 'paused'])
                ->whereIn('trigger_value', $mediaIds->all())
                ->get(['id', 'status', 'trigger_value'])
                ->map(function (AutomationFlow $flow): array {
                    return [
                        'id' => (int) $flow->id,
                        'status' => (string) $flow->status,
                        'media_id' => trim((string) $flow->trigger_value),
                    ];
                })
                ->filter(fn (array $flow): bool => $flow['media_id'] !== '')
                ->sortByDesc(fn (array $flow): int => $flow['id'])
                ->sortBy(fn (array $flow): int => $flow['status'] === 'active' ? 0 : 1)
                ->groupBy('media_id')
                ->map(function ($flows): ?array {
                    $first = $flows->first();

                    if (! is_array($first)) {
                        return null;
                    }

                    return [
                        'id' => (int) ($first['id'] ?? 0),
                        'status' => (string) ($first['status'] ?? ''),
                    ];
                });

            $feedPosts = [
                'data' => $rows
                    ->map(function (InstagramAccountMediaAnalytics $row) use ($autodmFlowsByMediaId): array {
                        $normalizedMediaId = trim((string) $row->instagram_media_id);
                        $autodmFlowMeta = $normalizedMediaId !== ''
                            ? $autodmFlowsByMediaId->get($normalizedMediaId)
                            : null;
                        $autodmFlowId = is_array($autodmFlowMeta)
                            ? (int) ($autodmFlowMeta['id'] ?? 0)
                            : 0;
                        $autodmFlowStatus = is_array($autodmFlowMeta)
                            ? trim((string) ($autodmFlowMeta['status'] ?? ''))
                            : null;

                        return $this->instagramFeedPostPayload(
                            row: $row,
                            autodmRunning: $autodmFlowId > 0,
                            autodmFlowId: $autodmFlowId > 0 ? $autodmFlowId : null,
                            autodmFlowStatus: $autodmFlowStatus !== '' ? $autodmFlowStatus : null
                        );
                    })
                    ->values()
                    ->all(),
                'current_page' => $paginator->currentPage(),
                'next_page_url' => $paginator->nextPageUrl(),
                'prev_page_url' => $paginator->previousPageUrl(),
                'per_page' => $paginator->perPage(),
                'path' => $paginator->path(),
            ];
        }

        return Inertia::render('ContentScheduler/MyInsta', [
            'instagram_accounts' => $instagramAccounts->map(fn (InstagramAccount $account): array => [
                'id' => $account->id,
                'username' => $account->username,
                'status' => $account->status,
                'profile_url' => $account->profile_url,
                'profile_picture_url' => $account->profile_picture_url,
                'ig_account_id' => $account->ig_account_id,
            ])->values(),
            'selected_instagram_account_id' => $selectedInstagramAccount?->id,
            'connected_count' => $instagramAccounts->count(),
            'active_connected_count' => $activeAccounts->count(),
            'has_active_account' => $hasActiveAccount,
            'disconnectToast' => $disconnectToast,
            'can_connect_more' => PlanService::canConnectMoreInstagramAccounts($user),
            'feed_posts' => $feedPosts,
            'account_totals' => $accountTotals,
            'autodm_kpis' => $autodmKpis,
            'filters' => $this->myInstaFiltersPayload(
                formatFilters: $formatFilters,
                autodmFilter: $autodmFilter,
                startDate: $startDateFilter?->toDateString(),
                endDate: $endDateFilter?->toDateString()
            ),
        ]);
    }

    public function postDetails(string $mediaId, Request $request, MetaApiService $metaApiService): JsonResponse
    {
        $user = $request->user();

        $post = InstagramAccountMediaAnalytics::query()
            ->where('user_id', $user->id)
            ->where('instagram_media_id', $mediaId)
            ->first();

        if (! $post) {
            return response()->json(['error' => 'Post not found.'], 404);
        }

        $flow = AutomationFlow::query()
            ->where('user_id', $user->id)
            ->where('instagram_account_id', $post->instagram_account_id)
            ->where('trigger_value', $mediaId)
            ->first();

        $flowData = null;
        if ($flow) {
            $flowData = [
                'id' => (int) $flow->id,
                'name' => (string) $flow->name,
                'status' => (string) $flow->status,
                'trigger_type' => (string) $flow->trigger_type,
                'keywords' => $flow->keywords,
                'match_all_comments' => (bool) $flow->match_all_comments,
                'opening_message_enabled' => (bool) $flow->opening_message_enabled,
                'opening_message' => (string) $flow->opening_message,
                'opening_button_text' => (string) $flow->opening_button_text,
                'public_reply_enabled' => (bool) $flow->public_reply_enabled,
                'public_comment_reply' => $flow->public_comment_reply,
                'ask_to_follow_enabled' => (bool) $flow->ask_to_follow_enabled,
                'ask_to_follow_message' => (string) $flow->ask_to_follow_message,
            ];
        }

        $commentsData = [];
        $account = InstagramAccount::query()
            ->where('id', $post->instagram_account_id)
            ->where('user_id', $user->id)
            ->first();

        if ($account && $account->status === 'active' && $account->access_token) {
            try {
                $commentsResponse = $metaApiService->fetchMediaComments(
                    $account->access_token,
                    $account->ig_account_id,
                    $mediaId,
                    15
                );
                $commentsData = $commentsResponse['data'] ?? [];
            } catch (\Exception $e) {
                Log::error('Failed to fetch media comments for drawer', [
                    'media_id' => $mediaId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'post' => [
                'id' => (int) $post->id,
                'instagram_media_id' => (string) $post->instagram_media_id,
                'media_type' => (string) $post->media_type,
                'format' => (string) $post->format,
                'caption' => (string) $post->caption,
                'permalink' => (string) $post->permalink,
                'media_url' => (string) $post->media_url,
                'thumbnail_url' => (string) $post->thumbnail_url,
                'posted_at' => $post->posted_at?->toIso8601String(),
                'reach' => (int) $post->reach,
                'impressions' => (int) $post->impressions,
                'likes' => (int) $post->likes,
                'comments' => (int) $post->comments,
                'shares' => (int) $post->shares,
                'saves' => (int) $post->saves,
                'story_replies' => (int) $post->story_replies,
                'story_taps_forward' => (int) $post->story_taps_forward,
                'story_taps_back' => (int) $post->story_taps_back,
                'story_exits' => (int) $post->story_exits,
            ],
            'flow' => $flowData,
            'comments' => $commentsData,
        ]);
    }

    public function syncAnalytics(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'instagram_account_id' => ['required', 'integer', 'exists:instagram_accounts,id'],
            'start' => ['nullable', 'date'],
            'end' => ['nullable', 'date'],
        ]);

        $account = InstagramAccount::query()
            ->whereKey((int) $validated['instagram_account_id'])
            ->where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        if (! $account) {
            return back()->withErrors(['instagram_account_id' => 'Select an active connected Instagram account to sync.']);
        }

        $startStr = (string) ($validated['start'] ?? '');
        $endStr = (string) ($validated['end'] ?? '');

        if ($startStr === '' && $endStr === '') {
            $earliest = InstagramAccountMediaAnalytics::where('instagram_account_id', $account->id)
                ->min('posted_at');
            $start = $earliest ? Carbon::parse($earliest)->startOfDay() : now()->subDays(29)->startOfDay();
            $end = now()->endOfDay();
        } else {
            $start = $this->resolveDate($startStr, now()->subDays(29))->startOfDay();
            $end = $this->resolveDate($endStr, now())->endOfDay();
            [$start, $end] = $this->clampAnalyticsDateRange($start, $end);
        }

        SyncInstagramAccountAnalyticsJob::dispatch(
            $request->user()->id,
            $account->id,
            $start->toDateString(),
            $end->toDateString(),
        );

        return back()->with('success', 'Instagram account analytics sync queued. Refresh in a few moments.');
    }

    /**
     * @return array<string, mixed>
     */
    private function instagramAnalyticsProps(
        int $userId,
        ?int $selectedInstagramAccountId,
        Carbon $start,
        Carbon $end
    ): array {
        $dateRange = $this->analyticsDateRangePayload($start, $end);
        $emptyOverview = $this->analyticsOverviewPayload(
            posts: 0,
            reach: 0,
            impressions: 0,
            engagement: 0,
            followers: 0,
            lastSyncedAt: null,
            previousMetrics: [
                'posts' => 0,
                'reach' => 0,
                'impressions' => 0,
                'engagement' => 0,
            ],
        );

        if (! $selectedInstagramAccountId) {
            return [
                'date_range' => $dateRange,
                'overview' => $emptyOverview,
                'daily_metrics' => $this->emptyDailyMetricSeries($start, $end),
                'daily_metric_details' => $this->emptyDailyMetricDetails($start, $end),
                'format_breakdown' => $this->emptyFormatBreakdown(),
            ];
        }

        $currentPeriodMetrics = $this->instagramPeriodMetrics(
            userId: $userId,
            selectedInstagramAccountId: $selectedInstagramAccountId,
            start: $start,
            end: $end,
        );
        [$previousStart, $previousEnd] = $this->previousAnalyticsDateRange($start, $end);
        $previousPeriodMetrics = $this->instagramPeriodMetrics(
            userId: $userId,
            selectedInstagramAccountId: $selectedInstagramAccountId,
            start: $previousStart,
            end: $previousEnd,
        );

        return [
            'date_range' => $dateRange,
            'overview' => $this->analyticsOverviewPayload(
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
                ],
            ),
            'daily_metrics' => $this->instagramDailyMetrics(
                userId: $userId,
                selectedInstagramAccountId: $selectedInstagramAccountId,
                start: $start,
                end: $end,
            ),
            'daily_metric_details' => $this->instagramDailyMetricDetails(
                userId: $userId,
                selectedInstagramAccountId: $selectedInstagramAccountId,
                start: $start,
                end: $end,
            ),
            'format_breakdown' => $this->instagramFormatBreakdown(
                userId: $userId,
                selectedInstagramAccountId: $selectedInstagramAccountId,
                start: $start,
                end: $end,
                totalPosts: $currentPeriodMetrics['posts'],
            ),
        ];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolveAnalyticsDateRange(Request $request): array
    {
        $startQuery = $request->query('start');
        $endQuery = $request->query('end');

        if ($request->has('start') && $startQuery === '' && $request->has('end') && $endQuery === '') {
            $requestedAccountId = (int) $request->integer('instagram_account_id');
            if ($requestedAccountId <= 0) {
                $firstActive = InstagramAccount::where('user_id', $request->user()->id)
                    ->where('status', 'active')
                    ->latest()
                    ->first();
                $requestedAccountId = $firstActive?->id;
            }

            $earliest = null;
            if ($requestedAccountId) {
                $earliest = InstagramAccountMediaAnalytics::where('instagram_account_id', $requestedAccountId)
                    ->min('posted_at');
            }

            $start = $earliest ? Carbon::parse($earliest) : now()->subDays(29);
            $end = now();

            return [$start->startOfDay(), $end->endOfDay()];
        }

        $start = $this->resolveDate((string) $startQuery, now()->subDays(29))->startOfDay();
        $end = $this->resolveDate((string) $endQuery, now())->endOfDay();

        return $this->clampAnalyticsDateRange($start, $end);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function clampAnalyticsDateRange(Carbon $start, Carbon $end): array
    {
        $normalizedStart = $start->copy()->startOfDay();
        $normalizedEnd = $end->copy()->endOfDay();

        if ($normalizedEnd->lt($normalizedStart)) {
            [$normalizedStart, $normalizedEnd] = [$normalizedEnd->copy()->startOfDay(), $normalizedStart->copy()->endOfDay()];
        }

        $dayCount = (int) $normalizedStart->copy()->startOfDay()->diffInDays($normalizedEnd->copy()->startOfDay()) + 1;
        if ($dayCount <= self::ANALYTICS_MAX_DAYS) {
            return [$normalizedStart, $normalizedEnd];
        }

        return [$normalizedEnd->copy()->subDays(self::ANALYTICS_MAX_DAYS - 1)->startOfDay(), $normalizedEnd];
    }

    /**
     * @return array<string, mixed>
     */
    private function analyticsDateRangePayload(Carbon $start, Carbon $end): array
    {
        return [
            'start' => $start->toDateString(),
            'end' => $end->toDateString(),
            'days' => (int) $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1,
            'preset' => $this->resolveAnalyticsPreset($start, $end),
        ];
    }

    private function resolveAnalyticsPreset(Carbon $start, Carbon $end): string
    {
        if (request()->has('start') && request()->query('start') === '' && request()->has('end') && request()->query('end') === '') {
            return 'all_time';
        }

        $startDate = $start->toDateString();
        $endDate = $end->toDateString();
        $today = now();

        if ($startDate === $today->copy()->subDays(6)->toDateString() && $endDate === $today->toDateString()) {
            return 'last_7_days';
        }

        if ($startDate === $today->copy()->subDays(29)->toDateString() && $endDate === $today->toDateString()) {
            return 'last_30_days';
        }

        if ($startDate === $today->copy()->startOfMonth()->toDateString() && $endDate === $today->copy()->endOfMonth()->toDateString()) {
            return 'this_month';
        }

        return 'custom';
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function previousAnalyticsDateRange(Carbon $start, Carbon $end): array
    {
        $days = (int) $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1;
        $previousEnd = $start->copy()->subDay()->endOfDay();
        $previousStart = $previousEnd->copy()->subDays($days - 1)->startOfDay();

        return [$previousStart, $previousEnd];
    }

    /**
     * @return array<string, int|string|null>
     */
    private function instagramPeriodMetrics(
        int $userId,
        int $selectedInstagramAccountId,
        Carbon $start,
        Carbon $end
    ): array {
        $mediaQuery = InstagramAccountMediaAnalytics::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $selectedInstagramAccountId)
            ->whereBetween('posted_at', [$start, $end]);

        $mediaDailyRows = $this->instagramMediaDailyRows(
            userId: $userId,
            selectedInstagramAccountId: $selectedInstagramAccountId,
            start: $start,
            end: $end,
        );

        $mediaAggregate = (clone $mediaQuery)
            ->selectRaw('COUNT(*) as posts')
            ->selectRaw('COALESCE(SUM(reach), 0) as reach')
            ->selectRaw('COALESCE(SUM(impressions), 0) as impressions')
            ->selectRaw('COALESCE(SUM(engagement), 0) as engagement')
            ->first();

        $mediaLastSyncedAt = (clone $mediaQuery)
            ->whereNotNull('synced_at')
            ->max('synced_at');

        $insightQuery = InstagramAccountInsightSnapshot::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $selectedInstagramAccountId)
            ->whereBetween('snapshot_date', [$start->toDateString(), $end->toDateString()]);
        $insightSnapshots = $this->instagramInsightSnapshotsByDate(
            userId: $userId,
            selectedInstagramAccountId: $selectedInstagramAccountId,
            start: $start,
            end: $end,
        );

        $insightLastSyncedAt = (clone $insightQuery)
            ->whereNotNull('synced_at')
            ->max('synced_at');

        $hasInsightRows = $insightSnapshots->isNotEmpty();

        return [
            'posts' => (int) ($mediaAggregate?->posts ?? 0),
            'reach' => (int) ($hasInsightRows ? $insightSnapshots->sum('reach') : ($mediaAggregate?->reach ?? 0)),
            'impressions' => (int) ($hasInsightRows
                ? $insightSnapshots->sum(function (InstagramAccountInsightSnapshot $snapshot) use ($mediaDailyRows): int {
                    $date = $snapshot->snapshot_date?->toDateString();
                    $mediaImpressions = is_string($date)
                        ? (int) ($mediaDailyRows->get($date)?->impressions ?? 0)
                        : 0;

                    return $this->resolvedInsightSnapshotImpressions($snapshot, $mediaImpressions);
                })
                : ($mediaAggregate?->impressions ?? 0)),
            'engagement' => (int) ($mediaAggregate?->engagement ?? 0),
            'followers' => (int) ($hasInsightRows ? $insightSnapshots->max('follower_count') : 0),
            'last_synced_at' => $this->latestIsoDateTime($mediaLastSyncedAt, $insightLastSyncedAt),
        ];
    }

    /**
     * @return array<int, array<string, int|string>>
     */
    private function instagramDailyMetrics(
        int $userId,
        int $selectedInstagramAccountId,
        Carbon $start,
        Carbon $end
    ): array {
        $defaultSeries = collect($this->emptyDailyMetricSeries($start, $end))->keyBy('date');

        $mediaDailyRows = $this->instagramMediaDailyRows(
            userId: $userId,
            selectedInstagramAccountId: $selectedInstagramAccountId,
            start: $start,
            end: $end,
        );
        $insightDailyRows = $this->instagramInsightSnapshotsByDate(
            userId: $userId,
            selectedInstagramAccountId: $selectedInstagramAccountId,
            start: $start,
            end: $end,
        );

        return $defaultSeries
            ->map(function (array $day) use ($insightDailyRows, $mediaDailyRows): array {
                $date = (string) $day['date'];
                $insightDay = $insightDailyRows->get($date);
                $mediaDay = $mediaDailyRows->get($date);

                return [
                    'date' => $date,
                    'reach' => (int) ($insightDay?->reach ?? $mediaDay?->reach ?? 0),
                    'impressions' => $this->resolvedInsightSnapshotImpressions(
                        $insightDay,
                        (int) ($mediaDay?->impressions ?? 0),
                    ),
                    'engagement' => (int) ($mediaDay?->engagement ?? 0),
                ];
            })
            ->values()
            ->all();
    }

    private function instagramMediaDailyRows(
        int $userId,
        int $selectedInstagramAccountId,
        Carbon $start,
        Carbon $end
    ): Collection {
        return InstagramAccountMediaAnalytics::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $selectedInstagramAccountId)
            ->whereBetween('posted_at', [$start, $end])
            ->whereNotNull('posted_at')
            ->selectRaw('DATE(posted_at) as date')
            ->selectRaw('COALESCE(SUM(reach), 0) as reach')
            ->selectRaw('COALESCE(SUM(impressions), 0) as impressions')
            ->selectRaw('COALESCE(SUM(engagement), 0) as engagement')
            ->groupBy(DB::raw('DATE(posted_at)'))
            ->get()
            ->keyBy('date');
    }

    private function instagramInsightSnapshotsByDate(
        int $userId,
        int $selectedInstagramAccountId,
        Carbon $start,
        Carbon $end
    ): Collection {
        return InstagramAccountInsightSnapshot::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $selectedInstagramAccountId)
            ->whereBetween('snapshot_date', [$start->toDateString(), $end->toDateString()])
            ->get(['snapshot_date', 'reach', 'impressions', 'follower_count', 'raw_metrics', 'synced_at'])
            ->keyBy(fn (InstagramAccountInsightSnapshot $snapshot): string => $snapshot->snapshot_date->toDateString());
    }

    private function resolvedInsightSnapshotImpressions(
        ?InstagramAccountInsightSnapshot $snapshot,
        int $mediaImpressions
    ): int {
        $fallbackValue = max(0, $mediaImpressions);

        if (! $snapshot) {
            return $fallbackValue;
        }

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

        return $fallbackValue;
    }

    /**
     * @return array<string, array{continents: array<int, array{continent: string, reach: int, impressions: int, engagement: int, share_percent: float}>}>
     */
    private function instagramDailyMetricDetails(
        int $userId,
        int $selectedInstagramAccountId,
        Carbon $start,
        Carbon $end
    ): array {
        $details = $this->emptyDailyMetricDetails($start, $end);

        $snapshotRows = InstagramAccountInsightSnapshot::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $selectedInstagramAccountId)
            ->whereBetween('snapshot_date', [$start->toDateString(), $end->toDateString()])
            ->get(['snapshot_date', 'raw_metrics']);

        foreach ($snapshotRows as $snapshotRow) {
            $date = $snapshotRow->snapshot_date?->toDateString();
            if (! is_string($date) || ! array_key_exists($date, $details)) {
                continue;
            }

            $continents = $this->extractContinentBreakdownForDate(
                (array) ($snapshotRow->raw_metrics ?? []),
                $date
            );

            if ($continents === []) {
                continue;
            }

            $details[$date]['continents'] = $continents;
        }

        return $details;
    }

    /**
     * @return array<string, array{continents: array<int, array{continent: string, reach: int, impressions: int, engagement: int, share_percent: float}>}>
     */
    private function emptyDailyMetricDetails(Carbon $start, Carbon $end): array
    {
        $details = [];

        foreach ($this->emptyDailyMetricSeries($start, $end) as $day) {
            $details[(string) $day['date']] = [
                'continents' => [],
            ];
        }

        return $details;
    }

    /**
     * @param  array<string, mixed>  $rawMetrics
     * @return array<int, array{continent: string, reach: int, impressions: int, engagement: int, share_percent: float}>
     */
    private function extractContinentBreakdownForDate(array $rawMetrics, string $targetDate): array
    {
        $entries = [];

        $candidateSources = [
            $rawMetrics['continent_breakdown'] ?? null,
            $rawMetrics['daily_continent_breakdown'] ?? null,
            $rawMetrics['continents'] ?? null,
            $rawMetrics['regional_breakdown'] ?? null,
            $rawMetrics['region_breakdown'] ?? null,
            $rawMetrics[$targetDate] ?? null,
        ];

        foreach ($candidateSources as $candidateSource) {
            $entries = array_merge(
                $entries,
                $this->extractContinentEntriesFromCandidate($candidateSource, $targetDate)
            );
        }

        if ($entries === []) {
            return [];
        }

        $totalsByContinent = [];

        foreach ($entries as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $continent = $this->normalizeContinentName(
                $entry['continent'] ?? $entry['name'] ?? $entry['region'] ?? $entry['key'] ?? null
            );

            if (! is_string($continent)) {
                continue;
            }

            $reach = $this->toNonNegativeInt(
                data_get(
                    $entry,
                    'reach',
                    data_get(
                        $entry,
                        'metrics.reach',
                        data_get($entry, 'value', data_get($entry, 'count', 0))
                    )
                )
            );
            $impressions = $this->toNonNegativeInt(
                data_get($entry, 'impressions', data_get($entry, 'metrics.impressions', 0))
            );
            $engagement = $this->toNonNegativeInt(
                data_get(
                    $entry,
                    'engagement',
                    data_get($entry, 'metrics.engagement', data_get($entry, 'metrics.interactions', 0))
                )
            );

            if (! array_key_exists($continent, $totalsByContinent)) {
                $totalsByContinent[$continent] = [
                    'continent' => $continent,
                    'reach' => 0,
                    'impressions' => 0,
                    'engagement' => 0,
                ];
            }

            $totalsByContinent[$continent]['reach'] += $reach;
            $totalsByContinent[$continent]['impressions'] += $impressions;
            $totalsByContinent[$continent]['engagement'] += $engagement;
        }

        $rows = array_values($totalsByContinent);
        if ($rows === []) {
            return [];
        }

        $totalReach = collect($rows)->sum('reach');

        usort($rows, function (array $left, array $right): int {
            $metricComparison = $right['reach'] <=> $left['reach'];
            if ($metricComparison !== 0) {
                return $metricComparison;
            }

            $impressionComparison = $right['impressions'] <=> $left['impressions'];
            if ($impressionComparison !== 0) {
                return $impressionComparison;
            }

            return $right['engagement'] <=> $left['engagement'];
        });

        return collect($rows)
            ->map(fn (array $row): array => [
                'continent' => (string) $row['continent'],
                'reach' => (int) $row['reach'],
                'impressions' => (int) $row['impressions'],
                'engagement' => (int) $row['engagement'],
                'share_percent' => $totalReach > 0
                    ? round(((int) $row['reach'] / $totalReach) * 100, 1)
                    : 0.0,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function extractContinentEntriesFromCandidate(mixed $candidate, string $targetDate): array
    {
        if (! is_array($candidate) || $candidate === []) {
            return [];
        }

        $entries = [];

        if (array_key_exists($targetDate, $candidate) && is_array($candidate[$targetDate])) {
            $entries = array_merge($entries, $this->normalizeContinentEntries($candidate[$targetDate]));
        }

        if ($this->arrayLooksLikeContinentMap($candidate)) {
            $entries = array_merge($entries, $this->normalizeContinentEntries($candidate));
        }

        if (array_is_list($candidate)) {
            foreach ($candidate as $row) {
                if (! is_array($row)) {
                    continue;
                }

                $rowDate = $this->normalizeDateKey(
                    $row['date'] ?? $row['snapshot_date'] ?? $row['day'] ?? null
                );

                if ($rowDate === $targetDate) {
                    if (is_array($row['continents'] ?? null)) {
                        $entries = array_merge($entries, $this->normalizeContinentEntries($row['continents']));

                        continue;
                    }

                    $entries[] = $row;
                }

                if (is_array($row['data'] ?? null)) {
                    $entries = array_merge(
                        $entries,
                        $this->extractContinentEntriesFromCandidate($row['data'], $targetDate)
                    );
                }
            }
        }

        if (is_array($candidate['data'] ?? null)) {
            $entries = array_merge(
                $entries,
                $this->extractContinentEntriesFromCandidate($candidate['data'], $targetDate)
            );
        }

        if (is_array($candidate['values'] ?? null)) {
            $entries = array_merge(
                $entries,
                $this->extractContinentEntriesFromCandidate($candidate['values'], $targetDate)
            );
        }

        return $entries;
    }

    /**
     * @param  array<string, mixed>|array<int, mixed>  $candidate
     * @return array<int, array<string, mixed>>
     */
    private function normalizeContinentEntries(array $candidate): array
    {
        if ($candidate === []) {
            return [];
        }

        if (array_is_list($candidate)) {
            return collect($candidate)
                ->filter(fn ($row): bool => is_array($row))
                ->values()
                ->all();
        }

        $rows = [];

        foreach ($candidate as $key => $value) {
            $continent = $this->normalizeContinentName($key);
            if (! is_string($continent)) {
                continue;
            }

            if (is_array($value)) {
                $rows[] = [
                    'continent' => $continent,
                    ...$value,
                ];

                continue;
            }

            $rows[] = [
                'continent' => $continent,
                'reach' => $value,
            ];
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>|array<int, mixed>  $candidate
     */
    private function arrayLooksLikeContinentMap(array $candidate): bool
    {
        foreach (array_keys($candidate) as $key) {
            if ($this->normalizeContinentName($key) !== null) {
                return true;
            }
        }

        return false;
    }

    private function normalizeDateKey(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $normalized = trim((string) $value);
        if ($normalized === '') {
            return null;
        }

        try {
            return Carbon::parse($normalized)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function normalizeContinentName(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $normalized = strtolower(trim((string) $value));
        if ($normalized === '') {
            return null;
        }

        $normalized = str_replace(['_', '-'], ' ', $normalized);
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        if (! is_string($normalized) || $normalized === '') {
            return null;
        }

        return self::KNOWN_CONTINENT_NAMES[$normalized] ?? null;
    }

    private function toNonNegativeInt(mixed $value): int
    {
        if (! is_numeric($value)) {
            return 0;
        }

        return max(0, (int) round((float) $value));
    }

    /**
     * @return array<int, array<string, int|string|float>>
     */
    private function instagramFormatBreakdown(
        int $userId,
        int $selectedInstagramAccountId,
        Carbon $start,
        Carbon $end,
        int $totalPosts
    ): array {
        $defaultRows = collect($this->emptyFormatBreakdown())->keyBy('format');

        $formatRows = InstagramAccountMediaAnalytics::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $selectedInstagramAccountId)
            ->whereBetween('posted_at', [$start, $end])
            ->selectRaw('format')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('format')
            ->get()
            ->map(function ($row): array {
                $format = $this->normalizeAnalyticsFormat((string) ($row->format ?? ''));

                return [
                    'format' => $format,
                    'count' => (int) ($row->total ?? 0),
                ];
            })
            ->groupBy('format')
            ->map(fn ($group): int => (int) $group->sum('count'));

        return $defaultRows
            ->map(function (array $row) use ($formatRows, $totalPosts): array {
                $count = (int) ($formatRows->get($row['format']) ?? 0);

                return [
                    ...$row,
                    'count' => $count,
                    'share_percent' => $totalPosts > 0 ? round(($count / $totalPosts) * 100, 1) : 0.0,
                ];
            })
            ->sortByDesc('count')
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{format: string, label: string, count: int, share_percent: float}>
     */
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

    /**
     * @return array<int, array{date: string, reach: int, impressions: int, engagement: int}>
     */
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

    /**
     * @param  array<string, int>  $previousMetrics
     * @return array<string, mixed>
     */
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
            'total_posts' => $posts,
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

    /**
     * @return array<string, int|float|string|null>
     */
    private function metricComparisonPayload(int $current, int $previous): array
    {
        $delta = $current - $previous;

        if ($current === 0 && $previous === 0) {
            $trend = 'none';
        } elseif ($delta > 0) {
            $trend = 'up';
        } elseif ($delta < 0) {
            $trend = 'down';
        } else {
            $trend = 'neutral';
        }

        return [
            'current' => $current,
            'previous' => $previous,
            'delta' => $delta,
            'delta_percent' => $previous > 0 ? round(($delta / $previous) * 100, 1) : null,
            'trend' => $trend,
        ];
    }

    private function normalizeAnalyticsFormat(string $format): string
    {
        $normalized = strtolower(trim($format));

        return match ($normalized) {
            'reel', 'reels' => 'reel',
            'story', 'stories' => 'story',
            'carousel', 'carousel_album' => 'carousel',
            'video' => 'video',
            default => 'image',
        };
    }

    private function latestIsoDateTime(?string $firstValue, ?string $secondValue): ?string
    {
        $candidates = collect([$firstValue, $secondValue])
            ->filter(fn ($value): bool => is_string($value) && trim($value) !== '')
            ->map(function (string $value): Carbon {
                return Carbon::parse($value);
            })
            ->sortByDesc(fn (Carbon $value): int => $value->getTimestamp());

        return $candidates->isNotEmpty() ? $candidates->first()->toIso8601String() : null;
    }

    /**
     * @return array<string, int|string|null>
     */
    private function instagramAccountContextPayload(?InstagramAccount $account): array
    {
        return [
            'id' => $account?->id,
            'username' => $account?->username,
            'status' => $account?->status,
            'profile_url' => $account?->profile_url,
            'profile_picture_url' => $account?->profile_picture_url,
            'ig_account_id' => $account?->ig_account_id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function instagramFeedPostPayload(
        InstagramAccountMediaAnalytics $row,
        bool $autodmRunning = false,
        ?int $autodmFlowId = null,
        ?string $autodmFlowStatus = null
    ): array {
        $mediaUrl = trim((string) ($row->media_url ?? ''));
        $thumbnailUrl = trim((string) ($row->thumbnail_url ?? ''));
        $resolvedFormat = $this->resolveInstagramFeedRowFormat($row);
        $normalizedFormat = strtolower(trim($resolvedFormat));
        $normalizedMediaType = strtoupper(trim((string) ($row->media_type ?? '')));
        $isVideoLike = in_array($normalizedFormat, ['reel', 'video'], true) || in_array($normalizedMediaType, ['VIDEO', 'REELS'], true);
        $sourceMediaUrl = $mediaUrl !== '' ? $mediaUrl : null;
        $previewMediaUrl = $isVideoLike
            ? ($thumbnailUrl !== '' ? $thumbnailUrl : ($mediaUrl !== '' ? $mediaUrl : null))
            : ($mediaUrl !== '' ? $mediaUrl : ($thumbnailUrl !== '' ? $thumbnailUrl : null));
        $normalizedMediaProductType = strtoupper(trim((string) data_get($row->raw_media, 'media_product_type', '')));

        return [
            'id' => $row->id,
            'instagram_media_id' => $row->instagram_media_id,
            'format' => $resolvedFormat,
            'media_type' => $row->media_type,
            'media_product_type' => $normalizedMediaProductType !== '' ? $normalizedMediaProductType : null,
            'caption' => $row->caption,
            'permalink' => $row->permalink,
            'media_url' => $sourceMediaUrl,
            'preview_media_url' => $previewMediaUrl,
            'thumbnail_url' => $thumbnailUrl !== '' ? $thumbnailUrl : null,
            'posted_at' => $row->posted_at?->toIso8601String(),
            'likes' => (int) $row->likes,
            'comments' => (int) $row->comments,
            'reach' => (int) $row->reach,
            'impressions' => (int) $row->impressions,
            'story_replies' => (int) $row->story_replies,
            'story_taps_forward' => (int) $row->story_taps_forward,
            'story_taps_back' => (int) $row->story_taps_back,
            'story_exits' => (int) $row->story_exits,
            'autodm_running' => $autodmRunning,
            'autodm_flow_id' => $autodmFlowId,
            'autodm_flow_status' => $autodmFlowStatus,
        ];
    }

    private function resolveInstagramFeedRowFormat(InstagramAccountMediaAnalytics $row): string
    {
        $normalizedFormat = strtolower(trim((string) ($row->format ?? '')));
        $normalizedMediaType = strtoupper(trim((string) ($row->media_type ?? data_get($row->raw_media, 'media_type', ''))));
        $normalizedMediaProductType = strtoupper(trim((string) data_get($row->raw_media, 'media_product_type', '')));
        $normalizedPermalink = strtolower(trim((string) ($row->permalink ?? data_get($row->raw_media, 'permalink', ''))));

        if ($normalizedMediaProductType === 'STORIES' || ($normalizedPermalink !== '' && str_contains($normalizedPermalink, '/stories/'))) {
            return 'story';
        }

        if ($normalizedMediaProductType === 'REELS') {
            return 'reel';
        }

        if ($normalizedFormat !== '') {
            return $normalizedFormat;
        }

        return match ($normalizedMediaType) {
            'VIDEO' => 'video',
            'CAROUSEL_ALBUM' => 'carousel',
            'STORY' => 'story',
            default => 'image',
        };
    }

    private function resolveMonth(string $month): string
    {
        if (preg_match('/^\d{4}-\d{2}$/', $month) !== 1) {
            return now()->format('Y-m');
        }

        return $month;
    }

    private function resolveDate(string $date, Carbon $fallback): Carbon
    {
        if ($date === '') {
            return $fallback;
        }

        try {
            return Carbon::parse($date);
        } catch (\Throwable) {
            return $fallback;
        }
    }

    /**
     * @return array<string, int>
     */
    private function statusCounts(int $userId, ?int $instagramAccountId = null): array
    {
        return ScheduledPost::query()
            ->where('user_id', $userId)
            ->when(
                $instagramAccountId !== null,
                fn ($query) => $query->where('instagram_account_id', $instagramAccountId)
            )
            ->select('status', DB::raw('COUNT(*) as aggregate'))
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn ($value): int => (int) $value)
            ->all();
    }

    /**
     * @return array<string, int>
     */
    private function myInstaAutodmKpis(int $userId, ?int $instagramAccountId): array
    {
        $emptyMetrics = [
            'total_automations' => 0,
            'active_automations' => 0,
            'paused_automations' => 0,
            'runs_last_7_days' => 0,
        ];

        if ($instagramAccountId === null) {
            return $emptyMetrics;
        }

        $flowQuery = AutomationFlow::query()
            ->where('user_id', $userId)
            ->where('instagram_account_id', $instagramAccountId);

        $flowIds = (clone $flowQuery)
            ->pluck('id');

        $statusCounts = (clone $flowQuery)
            ->whereIn('status', ['active', 'paused'])
            ->select('status', DB::raw('COUNT(*) as aggregate'))
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $runsLast7Days = 0;

        if ($flowIds->isNotEmpty()) {
            $runsLast7Days = AutomationLog::query()
                ->whereIn('automation_flow_id', $flowIds->all())
                ->where('created_at', '>=', now()->subDays(7))
                ->count();
        }

        $activeAutomations = (int) ($statusCounts->get('active') ?? 0);
        $pausedAutomations = (int) ($statusCounts->get('paused') ?? 0);

        return [
            'total_automations' => $flowIds->count(),
            'active_automations' => $activeAutomations,
            'paused_automations' => $pausedAutomations,
            'runs_last_7_days' => $runsLast7Days,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function resolveMyInstaFormatFilters(mixed $format): array
    {
        $allowedFormats = ['post', 'reel', 'story', 'carousel'];
        $rawFormats = [];

        if (is_array($format)) {
            foreach ($format as $value) {
                if (! is_scalar($value)) {
                    continue;
                }

                array_push($rawFormats, ...explode(',', strtolower(trim((string) $value))));
            }
        } elseif (is_scalar($format)) {
            $rawFormats = explode(',', strtolower(trim((string) $format)));
        }

        $normalizedFormats = array_values(array_filter(
            array_map(static fn (string $value): string => trim($value), $rawFormats),
            static fn (string $value): bool => $value !== ''
        ));

        if ($normalizedFormats === [] || in_array('all', $normalizedFormats, true)) {
            return [];
        }

        return array_values(array_filter(
            $allowedFormats,
            static fn (string $allowedFormat): bool => in_array($allowedFormat, $normalizedFormats, true)
        ));
    }

    /**
     * @param  array<int, string>  $formatFilters
     */
    private function serializeMyInstaFormatFilters(array $formatFilters): string
    {
        return $formatFilters === [] ? 'all' : implode(',', $formatFilters);
    }

    private function resolveMyInstaAutodmFilter(string $autodm): string
    {
        $normalizedAutodm = strtolower(trim($autodm));
        $allowedAutodmFilters = ['all', 'active', 'paused', 'none'];

        return in_array($normalizedAutodm, $allowedAutodmFilters, true) ? $normalizedAutodm : 'all';
    }

    /**
     * @return array{0: ?Carbon, 1: ?Carbon}
     */
    private function resolveMyInstaDateRange(string $startDate, string $endDate): array
    {
        $resolvedStartDate = $this->resolveNullableDate($startDate)?->startOfDay();
        $resolvedEndDate = $this->resolveNullableDate($endDate)?->endOfDay();

        if ($resolvedStartDate && $resolvedEndDate && $resolvedStartDate->gt($resolvedEndDate)) {
            return [
                $resolvedEndDate->copy()->startOfDay(),
                $resolvedStartDate->copy()->endOfDay(),
            ];
        }

        return [$resolvedStartDate, $resolvedEndDate];
    }

    private function resolveNullableDate(string $date): ?Carbon
    {
        $normalizedDate = trim($date);
        if ($normalizedDate === '') {
            return null;
        }

        try {
            return Carbon::parse($normalizedDate);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  Builder<InstagramAccountMediaAnalytics>  $query
     */
    private function applyMyInstaStoryVisibilityFilter(Builder $query): void
    {
        $storyCutoff = now()->subDay();

        $query->where(function (Builder $visibilityQuery) use ($storyCutoff): void {
            $visibilityQuery
                ->where(function (Builder $freshStoryQuery) use ($storyCutoff): void {
                    $this->applyMyInstaStoryIndicatorFilter($freshStoryQuery);
                    $freshStoryQuery->where('posted_at', '>=', $storyCutoff);
                })
                ->orWhere(function (Builder $nonStoryQuery): void {
                    $this->applyMyInstaNonStoryIndicatorFilter($nonStoryQuery);
                });
        });
    }

    /**
     * @param  Builder<InstagramAccountMediaAnalytics>  $query
     */
    private function applyMyInstaStoryIndicatorFilter(Builder $query): void
    {
        $query->where(function (Builder $storyIndicatorQuery): void {
            $storyIndicatorQuery
                ->whereIn('format', ['story', 'STORY'])
                ->orWhere('media_type', 'STORY')
                ->orWhereRaw('LOWER(permalink) LIKE ?', ['%/stories/%']);
        });
    }

    /**
     * @param  Builder<InstagramAccountMediaAnalytics>  $query
     */
    private function applyMyInstaNonStoryIndicatorFilter(Builder $query): void
    {
        $query
            ->where(function (Builder $formatQuery): void {
                $formatQuery
                    ->whereNull('format')
                    ->orWhereNotIn('format', ['story', 'STORY']);
            })
            ->where(function (Builder $mediaTypeQuery): void {
                $mediaTypeQuery
                    ->whereNull('media_type')
                    ->orWhere('media_type', '!=', 'STORY');
            })
            ->where(function (Builder $permalinkQuery): void {
                $permalinkQuery
                    ->whereNull('permalink')
                    ->orWhereRaw('LOWER(permalink) NOT LIKE ?', ['%/stories/%']);
            });
    }

    /**
     * @param  Builder<InstagramAccountMediaAnalytics>  $query
     * @param  array<int, string>  $formatFilters
     */
    private function applyMyInstaFormatFilter(Builder $query, array $formatFilters): void
    {
        if ($formatFilters === []) {
            return;
        }

        $query->where(function (Builder $formatQuery) use ($formatFilters): void {
            foreach ($formatFilters as $formatFilter) {
                $formatQuery->orWhere(function (Builder $singleFormatQuery) use ($formatFilter): void {
                    $this->applyMyInstaSingleFormatClause($singleFormatQuery, $formatFilter);
                });
            }
        });
    }

    /**
     * @param  Builder<InstagramAccountMediaAnalytics>  $query
     */
    private function applyMyInstaSingleFormatClause(Builder $query, string $formatFilter): void
    {
        if ($formatFilter === 'post') {
            $query->where(function (Builder $innerQuery): void {
                $innerQuery
                    ->whereIn('format', ['post', 'image', 'video', 'POST', 'IMAGE', 'VIDEO'])
                    ->orWhere(function (Builder $fallbackQuery): void {
                        $fallbackQuery
                            ->where(function (Builder $rawFormatQuery): void {
                                $rawFormatQuery
                                    ->whereNull('format')
                                    ->orWhere('format', '');
                            })
                            ->whereIn('media_type', ['IMAGE', 'VIDEO']);
                    });
            });

            return;
        }

        if ($formatFilter === 'reel') {
            $query->where(function (Builder $innerQuery): void {
                $innerQuery
                    ->whereIn('format', ['reel', 'REEL'])
                    ->orWhere('media_type', 'REELS');
            });

            return;
        }

        if ($formatFilter === 'story') {
            $query->where(function (Builder $innerQuery): void {
                $innerQuery
                    ->whereIn('format', ['story', 'STORY'])
                    ->orWhere('media_type', 'STORY');
            });

            return;
        }

        $query->where(function (Builder $innerQuery): void {
            $innerQuery
                ->whereIn('format', ['carousel', 'CAROUSEL'])
                ->orWhere('media_type', 'CAROUSEL_ALBUM');
        });
    }

    /**
     * @param  Builder<InstagramAccountMediaAnalytics>  $query
     */
    private function applyMyInstaPostedAtDateFilter(
        Builder $query,
        ?Carbon $startDateFilter,
        ?Carbon $endDateFilter
    ): void {
        if (! $startDateFilter && ! $endDateFilter) {
            return;
        }

        if ($startDateFilter && $endDateFilter) {
            $query->whereBetween('posted_at', [$startDateFilter, $endDateFilter]);

            return;
        }

        if ($startDateFilter) {
            $query->where('posted_at', '>=', $startDateFilter);

            return;
        }

        $query->where('posted_at', '<=', $endDateFilter);
    }

    /**
     * @param  Builder<InstagramAccountMediaAnalytics>  $query
     * @param  Builder<AutomationFlow>  $activeAutodmFlowMediaIdsQuery
     * @param  Builder<AutomationFlow>  $pausedAutodmFlowMediaIdsQuery
     */
    private function applyMyInstaAutodmFilter(
        Builder $query,
        string $autodmFilter,
        Builder $activeAutodmFlowMediaIdsQuery,
        Builder $pausedAutodmFlowMediaIdsQuery
    ): void {
        if ($autodmFilter === 'all') {
            return;
        }

        if ($autodmFilter === 'active') {
            $query->whereIn('instagram_media_id', (clone $activeAutodmFlowMediaIdsQuery));

            return;
        }

        if ($autodmFilter === 'paused') {
            $query->whereIn('instagram_media_id', (clone $pausedAutodmFlowMediaIdsQuery));

            return;
        }

        $query->where(function ($innerQuery) use ($activeAutodmFlowMediaIdsQuery, $pausedAutodmFlowMediaIdsQuery): void {
            $innerQuery
                ->whereNull('instagram_media_id')
                ->orWhere('instagram_media_id', '')
                ->orWhere(function ($mappedMediaQuery) use ($activeAutodmFlowMediaIdsQuery, $pausedAutodmFlowMediaIdsQuery): void {
                    $mappedMediaQuery
                        ->whereNotIn('instagram_media_id', (clone $activeAutodmFlowMediaIdsQuery))
                        ->whereNotIn('instagram_media_id', (clone $pausedAutodmFlowMediaIdsQuery));
                });
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function myInstaFiltersPayload(
        array $formatFilters,
        string $autodmFilter,
        ?string $startDate,
        ?string $endDate
    ): array {
        return [
            'format' => $this->serializeMyInstaFormatFilters($formatFilters),
            'autodm' => $autodmFilter,
            'start' => $startDate,
            'end' => $endDate,
            'options' => [
                'format' => [
                    ['value' => 'all', 'label' => 'All'],
                    ['value' => 'post', 'label' => 'Post'],
                    ['value' => 'reel', 'label' => 'Reel'],
                    ['value' => 'story', 'label' => 'Story'],
                    ['value' => 'carousel', 'label' => 'Carousel'],
                ],
                'autodm' => [
                    ['value' => 'all', 'label' => 'All'],
                    ['value' => 'active', 'label' => 'AutoDM Active'],
                    ['value' => 'paused', 'label' => 'AutoDM Paused'],
                    ['value' => 'none', 'label' => 'No AutoDM'],
                ],
                'date_presets' => [
                    ['value' => 'all_time', 'label' => 'All time'],
                    ['value' => 'last_7_days', 'label' => 'Last 7 days'],
                    ['value' => 'last_30_days', 'label' => 'Last 30 days'],
                    ['value' => 'this_month', 'label' => 'This month'],
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mediaPayload(ContentSchedulerMedia $asset): array
    {
        return [
            'id' => $asset->id,
            'title' => $asset->title,
            'original_name' => $asset->original_name,
            'media_type' => $asset->media_type,
            'mime_type' => $asset->mime_type,
            'size_bytes' => $asset->size_bytes,
            'url' => $asset->deliveryUrl(),
            'default_caption' => $asset->default_caption,
            'created_at' => $asset->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function scheduledPostPayload(ScheduledPost $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title ?: ucfirst($post->format).' post',
            'format' => $post->format,
            'status' => $post->status,
            'caption' => $post->caption,
            'hashtags' => $post->hashtags ?? [],
            'options' => $post->options ?? [],
            'scheduled_at' => $post->scheduled_at?->toIso8601String(),
            'published_at' => $post->published_at?->toIso8601String(),
            'last_error' => $post->last_error,
            'retry_count' => $post->retry_count,
            'meta_media_id' => $post->meta_media_id,
            'instagram_account' => $post->instagramAccount ? [
                'id' => $post->instagramAccount->id,
                'username' => $post->instagramAccount->username,
                'status' => $post->instagramAccount->status,
            ] : null,
            'media' => $post->media->map(fn (ContentSchedulerMedia $asset): array => $this->mediaPayload($asset))->values(),
        ];
    }

    private function refreshSelectedMyInstaAccountProfilePicture(
        InstagramAccount $account,
        MetaApiService $metaApiService
    ): InstagramAccount {
        if ($account->status !== 'active') {
            return $account;
        }

        $lastSyncedAt = $account->profile_picture_synced_at;
        if ($lastSyncedAt instanceof Carbon && $lastSyncedAt->gte(now()->subDay())) {
            return $account;
        }

        $updates = [
            'profile_picture_synced_at' => now(),
        ];

        try {
            $accounts = $metaApiService->fetchInstagramAccountsFromToken(
                (string) $account->access_token,
                (int) $account->id
            );
        } catch (\Throwable $exception) {
            Log::warning('My Insta selected account profile picture refresh failed', [
                'instagram_account_id' => $account->id,
                'ig_account_id' => $account->ig_account_id,
                'error' => $exception->getMessage(),
            ]);

            $account->fill($updates);
            if ($account->isDirty()) {
                $account->save();
            }

            return $account;
        }

        if (! empty($accounts)) {
            $selected = collect($accounts)->first(function ($item) use ($account) {
                return (string) ($item['ig_id'] ?? '') === (string) $account->ig_account_id;
            }) ?? $accounts[0];

            if (is_array($selected)) {
                $profilePictureUrl = $this->normalizeOptionalUrl($selected['profile_picture_url'] ?? null);
                $profileUrl = $this->normalizeOptionalUrl($selected['profile_url'] ?? null);
                $username = trim((string) ($selected['username'] ?? ''));
                $normalizedUsername = $username !== '' ? ltrim($username, '@') : null;

                if ($profilePictureUrl !== null) {
                    $updates['profile_picture_url'] = $profilePictureUrl;
                }

                if ($profileUrl !== null) {
                    $updates['profile_url'] = $profileUrl;
                }

                if ($normalizedUsername !== null && strcasecmp($normalizedUsername, 'Instagram User') !== 0) {
                    $updates['username'] = $normalizedUsername;
                }
            }
        }

        $account->fill($updates);
        if ($account->isDirty()) {
            $account->save();
        }

        return $account;
    }

    private function normalizeOptionalUrl(?string $url): ?string
    {
        $normalizedUrl = trim((string) $url);

        return $normalizedUrl !== '' ? $normalizedUrl : null;
    }

    /**
     * @return array{account_id: int, username: string|null, updated_at: string|null, message: string}|null
     */
    private function resolveDisconnectedAccountToast(int $userId): ?array
    {
        $disconnectedAccount = InstagramAccount::query()
            ->where('user_id', $userId)
            ->where('status', 'disconnected')
            ->latest('updated_at')
            ->first(['id', 'username', 'ig_account_id', 'updated_at']);

        if (! $disconnectedAccount) {
            return null;
        }

        $accountLabel = trim((string) $disconnectedAccount->username);
        if ($accountLabel === '') {
            $accountLabel = trim((string) $disconnectedAccount->ig_account_id);
        }

        return [
            'account_id' => (int) $disconnectedAccount->id,
            'username' => $disconnectedAccount->username,
            'updated_at' => optional($disconnectedAccount->updated_at)->toIso8601String(),
            'message' => "Instagram account @{$accountLabel} disconnected. Reconnect to resume publishing, automations, and analytics.",
        ];
    }
}
