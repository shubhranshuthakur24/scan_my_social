<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Services\InstagramScraperService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminChannelController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $this->normalizeFilters($request);

        $channels = Channel::query()
            ->select([
                'id',
                'handle',
                'name',
                'platform',
                'followers_count',
                'posts_count',
                'is_private',
                'is_verified',
                'apify_profile_run_status',
                'apify_post_run_status',
                'last_refreshed_data_on',
                'updated_at',
            ])
            ->withCount([
                'users',
                'posts as stored_posts_count',
            ])
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $filters['search']);

                $query->where(function ($subQuery) use ($filters, $escaped) {
                    $subQuery
                        ->where('handle', 'like', "%{$escaped}%")
                        ->orWhere('name', 'like', "%{$escaped}%");

                    if (strlen($filters['search']) >= 3) {
                        $subQuery->orWhereFullText(['handle', 'name'], "{$filters['search']}*", ['mode' => 'boolean']);
                    }
                });
            })
            ->when($filters['platform'] !== 'all', fn ($query) => $query->where('platform', $filters['platform']))
            ->when($filters['profile_status'] !== 'ALL', fn ($query) => $this->applyStatusFilter($query, 'apify_profile_run_status', $filters['profile_status']))
            ->when($filters['post_status'] !== 'ALL', fn ($query) => $this->applyStatusFilter($query, 'apify_post_run_status', $filters['post_status']))
            ->orderByDesc('updated_at')
            ->paginate(30)
            ->withQueryString()
            ->through(fn (Channel $channel) => [
                'id' => $channel->id,
                'handle' => $channel->handle,
                'name' => $channel->name,
                'platform' => $channel->platform,
                'followers_count' => (int) ($channel->followers_count ?? 0),
                'posts_count' => (int) ($channel->posts_count ?? 0),
                'tracked_by_users_count' => (int) ($channel->users_count ?? 0),
                'stored_posts_count' => (int) ($channel->stored_posts_count ?? 0),
                'is_private' => (bool) $channel->is_private,
                'is_verified' => (bool) $channel->is_verified,
                'profile_status' => $this->normalizeStatus($channel->apify_profile_run_status),
                'post_status' => $this->normalizeStatus($channel->apify_post_run_status),
                'last_refreshed_data_on' => optional($channel->last_refreshed_data_on)?->toISOString(),
                'updated_at' => optional($channel->updated_at)?->toISOString(),
            ]);

        return Inertia::render('Admin/Channels', [
            'channels' => $channels,
            'stats' => $this->buildStats(),
            'filters' => $filters,
            'statusOptions' => ['ALL', 'IDLE', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'],
            'platformOptions' => ['all', 'instagram', 'youtube', 'linkedin'],
        ]);
    }

    public function retryProfile(Channel $channel, InstagramScraperService $scraper): RedirectResponse
    {
        if ($channel->platform !== 'instagram') {
            return back()->with('error', 'Profile scraping is currently supported only for Instagram channels.');
        }

        if ($this->normalizeStatus($channel->apify_profile_run_status) === 'RUNNING') {
            return back()->with('error', 'Profile scraping is already running for this channel.');
        }

        try {
            $scraper->initiateProfileScrape($channel->fresh());
        } catch (\Throwable $exception) {
            return back()->with('error', 'Failed to start profile scraping: '.$exception->getMessage());
        }

        return back()->with('success', "Profile scraping initiated for @{$channel->handle}.");
    }

    public function retryPost(Channel $channel, InstagramScraperService $scraper): RedirectResponse
    {
        if ($channel->platform !== 'instagram') {
            return back()->with('error', 'Post scraping is currently supported only for Instagram channels.');
        }

        if ((bool) $channel->is_private) {
            return back()->with('error', 'Cannot start post scraping for private Instagram accounts.');
        }

        if ($this->normalizeStatus($channel->apify_profile_run_status) !== 'SUCCEEDED') {
            return back()->with('error', 'Profile scrape must succeed before post scraping can be started.');
        }

        if ($this->normalizeStatus($channel->apify_post_run_status) === 'RUNNING') {
            return back()->with('error', 'Post scraping is already running for this channel.');
        }

        try {
            $scraper->initiatePostScrape($channel->fresh());
        } catch (\Throwable $exception) {
            return back()->with('error', 'Failed to start post scraping: '.$exception->getMessage());
        }

        return back()->with('success', "Post scraping initiated for @{$channel->handle}.");
    }

    /**
     * @return array{search:string, platform:string, profile_status:string, post_status:string}
     */
    private function normalizeFilters(Request $request): array
    {
        $platform = strtolower((string) $request->query('platform', 'all'));
        if (! in_array($platform, ['all', 'instagram', 'youtube', 'linkedin'], true)) {
            $platform = 'all';
        }

        $profileStatus = strtoupper((string) $request->query('profile_status', 'ALL'));
        $postStatus = strtoupper((string) $request->query('post_status', 'ALL'));
        $allowedStatuses = ['ALL', 'IDLE', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'];

        if (! in_array($profileStatus, $allowedStatuses, true)) {
            $profileStatus = 'ALL';
        }

        if (! in_array($postStatus, $allowedStatuses, true)) {
            $postStatus = 'ALL';
        }

        return [
            'search' => trim((string) $request->query('search', '')),
            'platform' => $platform,
            'profile_status' => $profileStatus,
            'post_status' => $postStatus,
        ];
    }

    private function applyStatusFilter($query, string $field, string $status): void
    {
        if ($status === 'IDLE') {
            $query->whereNull($field);

            return;
        }

        $query->where($field, $status);
    }

    private function normalizeStatus(?string $status): string
    {
        $normalized = strtoupper(trim((string) $status));

        return $normalized !== '' ? $normalized : 'IDLE';
    }

    /**
     * @return array{total_channels:int, profile_running:int, post_running:int, profile_failed:int, post_failed:int, ready_for_post_scrape:int}
     */
    private function buildStats(): array
    {
        $failedStates = ['FAILED', 'ABORTED', 'TIMED-OUT'];

        return [
            'total_channels' => Channel::count(),
            'profile_running' => Channel::where('apify_profile_run_status', 'RUNNING')->count(),
            'post_running' => Channel::where('apify_post_run_status', 'RUNNING')->count(),
            'profile_failed' => Channel::whereIn('apify_profile_run_status', $failedStates)->count(),
            'post_failed' => Channel::whereIn('apify_post_run_status', $failedStates)->count(),
            'ready_for_post_scrape' => Channel::where('platform', 'instagram')
                ->where('is_private', false)
                ->where('apify_profile_run_status', 'SUCCEEDED')
                ->whereNull('apify_post_run_status')
                ->count(),
        ];
    }
}
