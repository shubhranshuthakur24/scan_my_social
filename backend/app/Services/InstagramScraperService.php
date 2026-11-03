<?php

namespace App\Services;

use App\Jobs\DownloadPostMediaJob;
use App\Models\Channel;
use App\Models\Post;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InstagramScraperService
{
    protected string $apiToken;

    protected string $actorId;

    protected string $postRefreshActorId;

    protected string $profileActorId;

    protected MediaUrlService $mediaUrlService;

    public function __construct()
    {
        $this->apiToken = (string) config('services.apify.token');
        $this->actorId = (string) config('services.apify.actor_id');
        $this->postRefreshActorId = (string) config('services.apify.actor_post_refresh', $this->actorId);
        $this->profileActorId = (string) config('services.apify.profile_actor_id', 'dSCLg0C3YEZ83HzYX');
        $this->mediaUrlService = app(MediaUrlService::class);
    }

    protected function httpClient(int $timeout = 60, int $connectTimeout = 30): PendingRequest
    {
        $verifySsl = config('services.apify.verify_ssl');

        if ($verifySsl === null || $verifySsl === '') {
            $verifySsl = ! app()->environment('local');
        }

        $client = Http::withToken($this->apiToken)
            ->timeout($timeout)
            ->connectTimeout($connectTimeout);

        if (! $verifySsl) {
            $client = $client->withoutVerifying();
        }

        return $client;
    }

    /**
     * Start an async profile scrape run
     */
    public function initiateProfileScrape(Channel $channel): string
    {
        if ($channel->apify_profile_run_status === 'RUNNING') {
            Log::info("Profile scrape already in progress for @{$channel->handle}. Skipping duplicate run.");

            return $channel->apify_profile_run_id;
        }

        Log::info("Initiating profile scrape for @{$channel->handle}");
        Log::channel('slack')->info("🚀 *Scraper*: Initiating profile scrape for @{$channel->handle}");

        $run = $this->startRun($this->profileActorId, ['usernames' => [$channel->handle]]);
        $runId = $run['id'];

        $channel->forceFill([
            'apify_profile_run_id' => $runId,
            'apify_profile_run_status' => 'RUNNING',
        ])->save();

        return $runId;
    }

    /**
     * Start an async post scrape run
     */
    public function initiatePostScrape(Channel $channel): string
    {
        if ($channel->apify_post_run_status === 'RUNNING') {
            Log::info("Scrape already in progress for @{$channel->handle}. Skipping duplicate run.");

            return $channel->apify_post_run_id;
        }

        Log::info("Initiating post scrape for @{$channel->handle}");
        Log::channel('slack')->info("📥 *Scraper*: Initiating deep post scrape for @{$channel->handle}");

        $run = $this->startScrapeRun($channel->handle);
        $runId = $run['id'];

        $channel->forceFill([
            'apify_post_run_id' => $runId,
            'apify_post_run_status' => 'RUNNING',
        ])->save();

        return $runId;
    }

    /**
     * Handle completion of a profile run
     */
    public function handleProfileRunCompletion(Channel $channel, string $runId): void
    {
        $items = $this->fetchRunDataset($runId, 1);

        if (empty($items)) {
            Log::warning("No profile data found for @{$channel->handle} in run {$runId}");
            $channel->forceFill(['apify_profile_run_status' => 'FAILED'])->save();

            return;
        }

        $profile = $items[0];
        $username = $channel->handle;

        $profileImageUrl = $profile['hdProfilePicUrlInfo']['url'] ?? $profile['profilePicUrl'] ?? $profile['profile_pic_url'] ?? null;

        $channel->update([
            'name' => $profile['fullName'] ?? $profile['full_name'] ?? null,
            'profile_image_url' => $profileImageUrl,
            'followers_count' => (int) ($profile['followersCount'] ?? $profile['followers_count'] ?? 0),
            'posts_count' => (int) ($profile['postsCount'] ?? $profile['posts_count'] ?? 0),
            'follows_count' => (int) ($profile['followsCount'] ?? $profile['follows_count'] ?? 0),
            'views_count' => (int) ($profile['totalViewsCount'] ?? $profile['totalViews'] ?? $profile['total_views'] ?? $profile['videoViews'] ?? $channel->views_count ?? 0),
            'is_private' => $profile['private'] ?? $profile['is_private'] ?? false,
            'is_verified' => $profile['verified'] ?? $profile['is_verified'] ?? false,
            'is_business' => $profile['isBusinessAccount'] ?? $profile['is_business'] ?? false,
            'bio' => $profile['biography'] ?? $profile['bio'] ?? null,
        ]);
        $channel->forceFill(['apify_profile_run_status' => 'SUCCEEDED'])->save();

        // Queue high-res profile image download
        if ($profileImageUrl) {
            DownloadPostMediaJob::dispatch(
                $channel->id,
                'channel',
                $profileImageUrl,
                'profile_image_url'
            );
        }

        Log::info("Profile updated for @{$username}. Checking if post scrape is needed.");
        Log::channel('slack')->info("✅ *Scraper*: Profile metadata updated for @{$username}");

        // Automatically trigger post scrape after profile success ONLY if not private
        if (! $channel->is_private) {
            $this->initiatePostScrape($channel);
        } else {
            Log::info("Skipping post scrape for @{$username} because account is private.");
            $channel->forceFill(['apify_post_run_status' => 'SUCCEEDED'])->save(); // Mark as done since we can't do more
        }
    }

    /**
     * Handle completion of a post run
     */
    public function handlePostRunCompletion(Channel $channel, string $runId): void
    {
        $this->fetchRunResults($runId, 100, $channel);

        $channel->update(['last_refreshed_data_on' => now()]);
        $channel->forceFill(['apify_post_run_status' => 'SUCCEEDED'])->save();

        // Run full outlier + engagement detection after fetching new results
        app(OutlierDetectionService::class)->processChannel($channel);

        Log::info("Deep scrape completed and posts saved for @{$channel->handle}");
        Log::channel('slack')->info("🏁 *Scraper*: Deep scrape completed and posts saved for @{$channel->handle}");
    }

    /**
     * Start an async Apify actor run
     */
    public function startRun(string $actorId, array $input): array
    {
        try {
            $response = $this->httpClient(60, 30)
                ->retry(4, fn ($attempt) => pow(2, $attempt) * 250)
                ->post("https://api.apify.com/v2/acts/{$actorId}/runs", $input);

            if (! $response->successful()) {
                Log::error('Apify run start failed', [
                    'actor' => $actorId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new \Exception("Apify run start failed for {$actorId}: ".$response->body());
            }

            $data = $response->json('data');
        } catch (\Exception $e) {
            Log::error('Exception in Apify startRun', [
                'actor' => $actorId,
                'message' => $e->getMessage(),
                'exception' => $e,
            ]);
            throw $e;
        }

        Log::info('Apify run started', [
            'run_id' => $data['id'],
            'actor' => $actorId,
            'status' => $data['status'],
        ]);

        return $data;
    }

    /**
     * Start an async Instagram scraping run (legacy wrapper)
     */
    public function startScrapeRun(string $username): array
    {
        return $this->startRun($this->actorId, [
            'username' => [$username],
            'directUrls' => ["https://www.instagram.com/{$username}/"],
            'resultsLimit' => 100,
        ]);
    }

    /**
     * Check status of a running Apify actor
     */
    public function checkRunStatus(string $runId): array
    {
        $response = $this->httpClient(30, 15)
            ->retry(4, fn ($attempt) => pow(2, $attempt) * 250)
            ->get("https://api.apify.com/v2/actor-runs/{$runId}");

        if (! $response->successful()) {
            throw new \Exception('Failed to check run status: '.$response->body());
        }

        return $response->json('data');
    }

    /**
     * Fetch raw results from a completed run's dataset
     */
    public function fetchRunDataset(string $runId, int $limit = 100): array
    {
        $response = $this->httpClient(60, 30)
            ->retry(4, fn ($attempt) => pow(2, $attempt) * 250)
            ->get("https://api.apify.com/v2/actor-runs/{$runId}/dataset/items");

        if (! $response->successful()) {
            throw new \Exception('Failed to fetch dataset items: '.$response->body());
        }

        return collect($response->json())->take($limit)->toArray();
    }

    /**
     * Fetch results from a completed run and process them as posts
     */
    public function fetchRunResults(string $runId, int $limit = 100, ?Channel $channel = null): array
    {
        $items = collect($this->fetchRunDataset($runId, $limit));

        if ($items->isEmpty()) {
            return [];
        }

        // Filter out Apify error entries (e.g. no_items, private/empty accounts)
        $items = $items->filter(fn ($item) => ! isset($item['error']));

        if ($items->isEmpty()) {
            Log::warning("No valid posts returned for run {$runId} (account may be private or have no posts)");

            return [];
        }

        // If no channel is provided, try to find or create one from the post data
        if (! $channel) {
            $firstPost = $items->first();
            $handle = $firstPost['ownerUsername'] ?? 'unknown';

            if ($handle === 'unknown') {
                Log::warning("Could not determine channel handle from post data in run {$runId}");
            }

            $channel = Channel::updateOrCreate(
                [
                    'handle' => $handle,
                    'platform' => 'instagram',
                ],
                [
                    'name' => $firstPost['ownerFullName'] ?? null,
                    'profile_image_url' => $firstPost['profilePicUrl'] ?? null,
                    'followers_count' => $firstPost['ownerFollowersCount'] ?? null,
                    'bio' => $firstPost['ownerBiography'] ?? null,
                ]
            );
        }

        // Filter to only Video posts
        $items = $items->filter(fn ($item) => ($item['type'] ?? '') === 'Video')->values();

        // Normalize and deterministically sort by timestamp:
        // 1) Valid timestamp first
        // 2) Newest first (desc)
        // 3) Stable tie-break by original dataset index
        $normalizedItems = $items->map(function ($item, $index) {
            $rawTimestamp = $item['timestamp'] ?? null;
            $parsedTimestamp = null;

            if (is_string($rawTimestamp) && trim($rawTimestamp) !== '') {
                $unix = strtotime($rawTimestamp);
                if ($unix !== false) {
                    $parsedTimestamp = $unix;
                }
            }

            return [
                'item' => $item,
                'original_index' => $index,
                'parsed_timestamp' => $parsedTimestamp,
            ];
        });

        $normalizedItems = $normalizedItems
            ->sort(function (array $left, array $right) {
                $leftHasTimestamp = $left['parsed_timestamp'] !== null;
                $rightHasTimestamp = $right['parsed_timestamp'] !== null;

                if ($leftHasTimestamp !== $rightHasTimestamp) {
                    return $leftHasTimestamp ? -1 : 1;
                }

                if ($leftHasTimestamp && $left['parsed_timestamp'] !== $right['parsed_timestamp']) {
                    // Newest first
                    return $left['parsed_timestamp'] < $right['parsed_timestamp'] ? 1 : -1;
                }

                return $left['original_index'] <=> $right['original_index'];
            })
            ->values();

        $validTimestampCount = $normalizedItems->whereNotNull('parsed_timestamp')->count();
        $invalidTimestampCount = $normalizedItems->count() - $validTimestampCount;
        $firstSortedItem = $normalizedItems->first();
        $lastSortedItem = $normalizedItems->last();

        Log::info('Apify video ingestion order prepared', [
            'run_id' => $runId,
            'channel_id' => $channel?->id,
            'total_video_items' => $normalizedItems->count(),
            'valid_timestamp_count' => $validTimestampCount,
            'invalid_timestamp_count' => $invalidTimestampCount,
            'first_sorted_timestamp' => $firstSortedItem['item']['timestamp'] ?? null,
            'last_sorted_timestamp' => $lastSortedItem['item']['timestamp'] ?? null,
        ]);

        $items = $normalizedItems->pluck('item')->values();
        $mediaDownloadDispatchMap = [];

        // Save posts with channel_id
        foreach ($items as $item) {
            try {
                $externalPostId = $item['id'] ?? uniqid();
                $postData = $this->mapPostData($item);

                // Check for existing post to avoid overwriting static data and local storage paths
                $existingPost = Post::where('post_id', $externalPostId)->first();

                if ($existingPost) {
                    // Update only dynamic metrics for existing posts
                    $updateData = [
                        'likes_count' => $postData['likes_count'],
                        'comments_count' => $postData['comments_count'],
                        'video_view_count' => $postData['video_view_count'],
                        'video_play_count' => $postData['video_play_count'],
                        'audio_url' => $postData['audio_url'],
                    ];

                    // Only update display_url if it's NOT already a localized stored path.
                    $existingDisplayUrl = trim((string) ($existingPost->getRawOriginal('display_url') ?? ''));
                    if (
                        $existingDisplayUrl === '' ||
                        $this->mediaUrlService->isAbsoluteUrl($existingDisplayUrl)
                    ) {
                        $updateData['display_url'] = $postData['display_url'];
                    }

                    $existingPost->update($updateData);
                    $post = $existingPost;
                } else {
                    // Create new post with full data
                    $post = Post::create(array_merge($postData, [
                        'post_id' => $externalPostId,
                        'channel_id' => $channel->id,
                        'platform' => 'instagram',
                    ]));
                }

                // Queue download only for remote source URLs (absolute). Localized paths are already stored.
                $storedDisplayUrl = trim((string) ($post->getRawOriginal('display_url') ?? ''));
                if ($storedDisplayUrl !== '' && $this->mediaUrlService->isAbsoluteUrl($storedDisplayUrl)) {
                    $dispatchKey = implode(':', ['post', (string) $post->id, 'display_url', md5($storedDisplayUrl)]);

                    $mediaDownloadDispatchMap[$dispatchKey] = [
                        'post_id' => (int) $post->id,
                        'url' => $storedDisplayUrl,
                    ];
                }
            } catch (\Exception $e) {
                Log::error('Failed to save post: '.$e->getMessage(), [
                    'post_id' => $item['id'] ?? 'unknown',
                    'error' => $e->getMessage(),
                ]);
            }
        }

        foreach ($mediaDownloadDispatchMap as $payload) {
            DownloadPostMediaJob::dispatch(
                $payload['post_id'],
                'post',
                $payload['url'],
                'display_url'
            );
        }

        // Always run full outlier + engagement detection after fetching new results
        if ($channel) {
            app(OutlierDetectionService::class)->processChannel($channel);
            Log::info("Ran outlier detection for @{$channel->handle} after fetching results.");
        }

        Log::info("Fetched and saved {$items->count()} Instagram posts from run {$runId}");

        return $items->toArray();
    }

    /**
     * Poll a run until it completes or times out
     */
    protected function pollRunUntilComplete(string $runId, int $maxWaitSeconds, ?Channel $channel = null, string $type = 'post'): array
    {
        $startTime = time();
        $statusField = "apify_{$type}_run_status";

        while (time() - $startTime < $maxWaitSeconds) {
            $status = $this->checkRunStatus($runId);

            if ($channel) {
                $channel->forceFill([$statusField => $status['status']])->save();
            }

            if (in_array($status['status'], ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'])) {
                return $status;
            }

            sleep(5);
        }

        throw new \Exception("Run {$runId} timed out after {$maxWaitSeconds} seconds.");
    }

    /**
     * Wait for run to complete and fetch results (blocking)
     */
    public function scrapeUsernameSync(string $username, int $limit = 100, int $maxWaitSeconds = 300, ?Channel $channel = null): array
    {
        $run = $this->startScrapeRun($username);
        $runId = $run['id'];

        if ($channel) {
            $channel->forceFill([
                'apify_post_run_id' => $runId,
                'apify_post_run_status' => 'RUNNING',
            ])->save();
        }

        $status = $this->pollRunUntilComplete($runId, $maxWaitSeconds, $channel, 'post');

        if ($status['status'] === 'SUCCEEDED') {
            $results = $this->fetchRunResults($runId, $limit, $channel);
            if ($channel) {
                $channel->update(['last_refreshed_data_on' => now()]);
                // Outlier detection is already run inside fetchRunResults
            }

            return $results;
        }

        throw new \Exception("Post scrape run {$runId} failed with status: {$status['status']}");
    }

    /**
     * Refresh a single post's metadata and media URLs synchronously.
     * Useful for fixing expired 403 CDN URLs during transcription.
     */
    public function refreshPostSync(Post $post, int $maxWaitSeconds = 180): bool
    {
        Log::info("Refreshing single post metadata for: {$post->post_id} (@{$post->short_code})");

        $username = $post->owner_username ?: ($post->channel?->handle ?? '');

        try {
            $directUrls = $this->buildRefreshDirectUrls($post);
            if (empty($directUrls)) {
                Log::warning("Cannot refresh post {$post->post_id}: no direct URL candidates available.");

                return false;
            }

            $input = [
                'directUrls' => $directUrls,
                'resultsLimit' => 5,
            ];

            // Some versions of the Apify Instagram Scraper require 'username' even for directUrls
            if ($username !== '') {
                $input['username'] = [$username];
            }

            $run = $this->startRun($this->postRefreshActorId, $input);

            $runId = $run['id'];
            $status = $this->pollRunUntilComplete($runId, $maxWaitSeconds, null, 'post');

            if ($status['status'] === 'SUCCEEDED') {
                $items = collect($this->fetchRunDataset($runId, 10))
                    ->filter(fn ($item) => is_array($item) && ! isset($item['error']))
                    ->values();

                if ($items->isEmpty()) {
                    Log::warning("Refresh run {$runId} returned no valid rows for post {$post->post_id}");

                    return false;
                }

                $refreshItem = $this->selectRefreshDatasetItem($items, $post);
                if (! $refreshItem) {
                    Log::warning("No refresh row could be matched for post {$post->post_id} from run {$runId}");

                    return false;
                }

                return $this->applySinglePostRefresh($post, $refreshItem);
            }

            Log::error("Failed to refresh post {$post->post_id}: run status {$status['status']}");

            return false;
        } catch (\Exception $e) {
            Log::error("Exception while refreshing post {$post->post_id}: ".$e->getMessage());

            return false;
        }
    }

    /**
     * Build URL candidates for direct post refresh.
     */
    protected function buildRefreshDirectUrls(Post $post): array
    {
        $urls = [];

        $existingUrl = trim((string) ($post->url ?? ''));
        if ($existingUrl !== '') {
            $urls[] = $existingUrl;
        }

        $shortCode = trim((string) ($post->short_code ?? ''));
        if ($shortCode !== '') {
            $urls[] = "https://www.instagram.com/p/{$shortCode}/";
            $urls[] = "https://www.instagram.com/reel/{$shortCode}/";
        }

        return array_values(array_unique(array_filter($urls, fn (string $url) => $url !== '')));
    }

    /**
     * Pick the row that most likely represents the target post.
     */
    protected function selectRefreshDatasetItem(Collection $items, Post $post): ?array
    {
        $targetPostId = trim((string) $post->post_id);
        if ($targetPostId !== '') {
            $matchById = $items->first(
                fn (array $item): bool => trim((string) ($item['id'] ?? '')) === $targetPostId
            );

            if (is_array($matchById)) {
                return $matchById;
            }
        }

        $targetShortCode = strtolower(trim((string) $post->short_code));
        if ($targetShortCode !== '') {
            $matchByShortCode = $items->first(
                fn (array $item): bool => strtolower(trim((string) ($item['shortCode'] ?? ''))) === $targetShortCode
            );

            if (is_array($matchByShortCode)) {
                return $matchByShortCode;
            }
        }

        $targetUrls = collect($this->buildRefreshDirectUrls($post))
            ->map(fn (string $url): ?string => $this->normalizeInstagramUrl($url))
            ->filter()
            ->values()
            ->all();

        if (! empty($targetUrls)) {
            $matchByUrl = $items->first(function (array $item) use ($targetUrls): bool {
                $itemUrls = collect([$item['url'] ?? null, $item['inputUrl'] ?? null])
                    ->map(fn (?string $url): ?string => $this->normalizeInstagramUrl($url))
                    ->filter()
                    ->all();

                return ! empty(array_intersect($targetUrls, $itemUrls));
            });

            if (is_array($matchByUrl)) {
                return $matchByUrl;
            }
        }

        return null;
    }

    /**
     * Update a single post from a direct refresh dataset row.
     */
    protected function applySinglePostRefresh(Post $post, array $item): bool
    {
        $postData = $this->mapPostData($item);
        $previousAudioUrl = trim((string) ($post->audio_url ?? ''));
        $updateData = [];

        if ($this->hasAnyKey($item, ['likesCount'])) {
            $updateData['likes_count'] = $postData['likes_count'];
        }

        if ($this->hasAnyKey($item, ['commentsCount'])) {
            $updateData['comments_count'] = $postData['comments_count'];
        }

        if ($this->hasAnyKey($item, ['videoViewCount', 'viewCount', 'viewsCount', 'video_view_count'])) {
            $updateData['video_view_count'] = $postData['video_view_count'];
        }

        if ($this->hasAnyKey($item, ['videoPlayCount', 'playCount', 'playsCount', 'video_play_count'])) {
            $updateData['video_play_count'] = $postData['video_play_count'];
        }

        $scrapedAudioUrl = trim((string) ($postData['audio_url'] ?? ''));
        if ($scrapedAudioUrl !== '') {
            $updateData['audio_url'] = $scrapedAudioUrl;
        }

        $scrapedVideoUrl = trim((string) ($postData['video_url'] ?? ''));
        if ($scrapedVideoUrl !== '') {
            $updateData['video_url'] = $scrapedVideoUrl;
        }

        $scrapedUrl = trim((string) ($postData['url'] ?? ''));
        if ($scrapedUrl !== '') {
            $updateData['url'] = $scrapedUrl;
        }

        $scrapedDisplayUrl = trim((string) ($postData['display_url'] ?? ''));
        $existingDisplayUrl = trim((string) ($post->getRawOriginal('display_url') ?? ''));
        if (
            $scrapedDisplayUrl !== '' &&
            ($existingDisplayUrl === '' || $this->mediaUrlService->isAbsoluteUrl($existingDisplayUrl))
        ) {
            $updateData['display_url'] = $scrapedDisplayUrl;
        }

        if (! empty($updateData)) {
            $post->update($updateData);
        }

        $post->refresh();
        $currentAudioUrl = trim((string) ($post->audio_url ?? ''));

        if (
            array_key_exists('display_url', $updateData)
            && $updateData['display_url'] !== ''
            && $this->mediaUrlService->isAbsoluteUrl((string) $updateData['display_url'])
        ) {
            DownloadPostMediaJob::dispatch(
                $post->id,
                'post',
                (string) $updateData['display_url'],
                'display_url'
            );
        }

        Log::info('Single post refresh applied', [
            'post_id' => $post->post_id,
            'db_post_id' => $post->id,
            'scraped_audio_url_present' => $scrapedAudioUrl !== '',
            'audio_url_present' => $currentAudioUrl !== '',
            'audio_url_changed' => $currentAudioUrl !== '' && $currentAudioUrl !== $previousAudioUrl,
            'updated_columns' => array_keys($updateData),
        ]);

        return $scrapedAudioUrl !== '' && $currentAudioUrl !== '';
    }

    protected function hasAnyKey(array $item, array $keys): bool
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $item)) {
                return true;
            }
        }

        return false;
    }

    protected function normalizeInstagramUrl(?string $url): ?string
    {
        $normalized = strtolower(trim((string) $url));
        if ($normalized === '') {
            return null;
        }

        $normalizedWithoutQuery = preg_replace('/\\?.*$/', '', $normalized) ?? $normalized;

        return rtrim($normalizedWithoutQuery, '/');
    }

    /**
     * Map Apify response to database fields
     */
    protected function mapPostData(array $item): array
    {
        return [
            'type' => $item['type'] ?? null,
            'short_code' => $item['shortCode'] ?? null,
            'caption' => $item['caption'] ?? null,
            'hashtags' => $item['hashtags'] ?? [],
            'mentions' => $item['mentions'] ?? [],
            'url' => $item['url'] ?? null,
            'comments_count' => $item['commentsCount'] ?? 0,
            'first_comment' => $item['firstComment'] ?? null,
            'latest_comments' => $item['latestComments'] ?? [],
            'dimensions_height' => $item['dimensionsHeight'] ?? null,
            'dimensions_width' => $item['dimensionsWidth'] ?? null,
            'display_url' => $item['displayUrl'] ?? null,
            'images' => $item['images'] ?? [],
            'video_url' => $item['videoUrl'] ?? null,
            'likes_count' => $item['likesCount'] ?? 0,
            'video_view_count' => $item['videoViewCount'] ?? $item['viewCount'] ?? $item['viewsCount'] ?? $item['video_view_count'] ?? null,
            'post_timestamp' => isset($item['timestamp']) ? date('Y-m-d H:i:s', strtotime($item['timestamp'])) : null,
            'child_posts' => $item['childPosts'] ?? [],
            'owner_full_name' => $item['ownerFullName'] ?? null,
            'owner_username' => $item['ownerUsername'] ?? null,
            'owner_id' => $item['ownerId'] ?? null,
            'product_type' => $item['productType'] ?? null,
            'tagged_users' => $item['taggedUsers'] ?? [],
            'coauthor_producers' => $item['coauthorProducers'] ?? [],
            'is_comments_disabled' => $item['isCommentsDisabled'] ?? false,
            'input_url' => $item['inputUrl'] ?? null,
            'audio_url' => $item['audioUrl'] ?? null,
            'alt' => $item['alt'] ?? null,
            'video_play_count' => $item['videoPlayCount'] ?? $item['playCount'] ?? $item['playsCount'] ?? $item['video_play_count'] ?? null,
            'video_duration' => $item['videoDuration'] ?? null,
            'music_info' => $item['musicInfo'] ?? [],
            'location_name' => $item['locationName'] ?? null,
            'location_id' => $item['locationId'] ?? null,
            'is_pinned' => $item['isPinned'] ?? false,
            'is_approved' => false, // Default to false, manual approval needed
            'is_transcribed' => false,
        ];
    }
}
