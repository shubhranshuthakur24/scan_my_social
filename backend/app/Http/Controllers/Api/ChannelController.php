<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ScrapeChannelMetadataJob;
use App\Models\Channel;
use App\Models\User;
use App\Services\ChannelService;
use App\Services\PlanService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ChannelController extends Controller
{
    public function __construct(
        private readonly ChannelService $channelService
    ) {}

    /**
     * Return only channels that the authenticated user has added.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $search = trim((string) $request->query('search', ''));

        $query = $user->channels()
            ->select([
                'channels.id',
                'channels.handle',
                'channels.name',
                'channels.platform',
                'channels.bio',
                'channels.profile_image_url',
                'channels.followers_count',
                'channels.posts_count',
                'channels.follows_count',
                'channels.is_private',
                'channels.is_verified',
                'channels.is_business',
                'channels.apify_profile_run_status',
                'channels.apify_post_run_status',
            ])
            ->withPivot('created_at')
            ->latest('channel_users.created_at');

        if ($search !== '') {
            $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $search);
            $query->where(function ($q) use ($search, $escaped) {
                // Same optimized strategy as global search
                if (strlen($search) < 3) {
                    $q->where('handle', 'like', "{$escaped}%");
                } else {
                    $q->whereFullText(['handle', 'name'], "{$search}*", ['mode' => 'boolean'])
                        ->orWhere('handle', 'like', "{$escaped}%");
                }
            });
        }

        $paginated = $query->paginate(50);

        return response()->json([
            ...$paginated->toArray(),
            'untrack_limit' => PlanService::channelUntrackLimit(),
            'untrack_used' => (int) $user->channel_untrack_count,
            'untrack_remaining' => PlanService::remainingChannelUntracks($user),
        ]);
    }

    /**
     * Search ALL channels in the database (global discovery).
     * Returns up to 15 results, each with an `is_mine` flag
     * indicating whether the current user already tracks it.
     */
    public function search(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if ($q === '') {
            return response()->json([]);
        }

        // Strict Normalization
        $q = strtolower($q);
        $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $q);
        $user = Auth::user();

        $columns = [
            'id',
            'handle',
            'name',
            'platform',
            'profile_image_url',
            'followers_count',
        ];

        // Optimized Search: unionAll + fromSub for tiered relevance
        // Tier 1: Exact Match (Highest Priority)
        $exactMatch = Channel::query()
            ->select($columns)
            ->selectRaw('1 as relevance_tier')
            ->where('handle', $q)
            ->limit(15);

        // Tier 2: Prefix Match
        $prefixMatch = Channel::query()
            ->select($columns)
            ->selectRaw('2 as relevance_tier')
            ->where('handle', 'like', "{$escaped}%")
            ->limit(15);

        // Tier 3: Full-Text Match (Lowest Priority) - Only for 3+ characters
        $fullTextMatch = Channel::query()
            ->select($columns)
            ->selectRaw('3 as relevance_tier')
            ->whereFullText(['handle', 'name'], "{$q}*", ['mode' => 'boolean'])
            ->limit(15);

        // Combine branches conditionally based on query length
        $unionQuery = $exactMatch->unionAll($prefixMatch);
        if (strlen($q) >= 3) {
            $unionQuery = $unionQuery->unionAll($fullTextMatch);
        }

        // We use unionAll for speed and wrap in fromSub for multi-tier sorting
        $channels = Channel::query()
            ->fromSub($unionQuery, 'search_union')
            ->orderBy('relevance_tier')
            ->orderByDesc('followers_count') // Tie-break by popularity
            ->limit(15)
            ->get();

        // Extra safety deduplication (should be minimal due to SQL exclusions)
        $channels = $channels->unique('id')->values();

        // Ownership Lookup using Laravel-native collect()->flip() for efficiency
        $ownedLookup = collect(DB::table('channel_users')
            ->where('user_id', $user->id)
            ->whereIn('channel_id', $channels->pluck('id'))
            ->pluck('channel_id'))
            ->flip();

        $channels = $channels->map(function ($channel) use ($ownedLookup) {
            $channel->is_mine = $ownedLookup->has((int) $channel->id);

            return $channel;
        });

        return response()->json($channels);
    }

    /**
     * Add one or more channels for the authenticated user.
     * Channels are shared globally (deduped by handle+platform),
     * but the user-channel relationship is tracked via the pivot.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'channels' => 'required|array',
            'channels.*.platform' => 'required|string|in:instagram,youtube,linkedin',
            'channels.*.channel' => 'required|string',
        ]);

        $user = Auth::user();
        $toProcess = [];
        $errors = [];
        $seen = [];

        foreach ($validated['channels'] as $index => $channelData) {
            $platform = strtolower((string) $channelData['platform']);
            $input = (string) $channelData['channel'];

            $normalized = $this->channelService->normalizeAndValidate($input, $platform);
            if (! ($normalized['valid'] ?? false)) {
                $reason = (string) ($normalized['reason'] ?? 'invalid_format');
                $errors['channels'][$index] = [
                    'reason' => $reason,
                    'message' => "The handle or link '{$input}' is invalid for {$platform}.",
                ];

                continue;
            }

            $handle = strtolower(trim((string) $normalized['handle']));

            // Final safety check to prevent "valid but empty" results from bloating DB
            if ($handle === '') {
                $errors['channels'][$index] = [
                    'reason' => 'invalid_format',
                    'message' => "The handle extracted from '{$input}' is empty.",
                ];

                continue;
            }
            $key = "{$platform}:{$handle}";
            if (isset($seen[$key])) {
                $errors['channels'][$index] = [
                    'reason' => 'duplicate_request',
                    'message' => "Duplicate channel '{$input}' in request payload.",
                ];

                continue;
            }

            $seen[$key] = true;
            $toProcess[] = [
                'index' => $index,
                'platform' => $platform,
                'input' => $input,
                'handle' => $handle,
            ];
        }

        $accepted = [];
        $limitReachedAtStart = false;
        $limit = null;
        $activities = [];
        $jobsToDispatch = [];

        DB::transaction(function () use ($user, $toProcess, &$accepted, &$errors, &$limitReachedAtStart, &$limit, &$activities, &$jobsToDispatch) {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->first();
            if (! $lockedUser) {
                return;
            }

            $currentCount = DB::table('channel_users')->where('user_id', $lockedUser->id)->count();
            $limit = PlanService::channelLimit($lockedUser);
            $remainingSlots = max(0, $limit - $currentCount);

            if ($remainingSlots === 0) {
                $limitReachedAtStart = true;

                return;
            }

            foreach ($toProcess as $item) {
                if ($remainingSlots <= 0) {
                    $errors['channels'][$item['index']] = [
                        'reason' => 'quota_exceeded',
                        'message' => "Your plan allows up to {$limit} channels. Upgrade to track more.",
                    ];

                    continue;
                }

                [$channel, $wasCreated] = $this->upsertChannel($item['handle'], $item['platform']);

                $syncResult = $lockedUser->channels()->syncWithoutDetaching([$channel->id]);
                $attachedIds = collect($syncResult['attached'] ?? [])->map(fn ($id) => (int) $id)->all();
                $attached = in_array((int) $channel->id, $attachedIds, true);

                if (! $attached) {
                    $errors['channels'][$item['index']] = [
                        'reason' => 'already_tracked',
                        'message' => "You are already tracking @{$channel->handle} on {$channel->platform}.",
                    ];

                    continue;
                }

                if ($wasCreated) {
                    $jobsToDispatch[] = $channel;
                }

                // Prepare batch activity logging
                $activities[] = [
                    'type' => 'channel_tracked',
                    'description' => 'Tracked channel '.$channel->name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $accepted[] = $channel;
                $remainingSlots--;
            }
        });

        // Ensure actions only run if transaction succeeded
        DB::afterCommit(function () use ($user, $activities, $jobsToDispatch) {
            if (count($activities) > 0) {
                $user->activities()->createMany($activities);
            }

            foreach ($jobsToDispatch as $channel) {
                ScrapeChannelMetadataJob::dispatch($channel);
            }
        });

        if ($limitReachedAtStart) {
            $effectiveLimit = $limit ?? PlanService::channelLimit($user);

            return response()->json([
                'error' => 'channel_limit_reached',
                'message' => "Your plan allows up to {$effectiveLimit} channels. Upgrade to track more.",
            ], 403);
        }

        $createdCount = count($accepted);
        $rejectedCount = count($errors['channels'] ?? []);

        if ($createdCount > 0 && $rejectedCount > 0) {
            $message = "{$createdCount} channel(s) added. {$rejectedCount} item(s) were rejected.";
        } elseif ($createdCount > 0) {
            $message = "{$createdCount} channel(s) added successfully.";
        } else {
            $message = 'No channels were added.';
        }

        if ($request->header('X-Inertia')) {
            return redirect()->route('channels')->with('message', $message);
        }

        return response()->json([
            'message' => $message,
            'created_count' => $createdCount,
            'rejected_count' => $rejectedCount,
            'channels' => $accepted,
            'errors' => $errors ?: (object) [],
        ], $rejectedCount > 0 ? 207 : 201);
    }

    public function destroy(Channel $channel): JsonResponse
    {
        $user = Auth::user();
        $result = DB::transaction(function () use ($user, $channel) {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->first();
            if (! $lockedUser) {
                return [
                    'status' => 'user_missing',
                ];
            }

            $isTrackedByUser = $lockedUser->channels()
                ->where('channels.id', $channel->id)
                ->exists();

            if (! $isTrackedByUser) {
                return [
                    'status' => 'not_tracked',
                    'limit' => PlanService::channelUntrackLimit(),
                    'used' => (int) $lockedUser->channel_untrack_count,
                    'remaining' => PlanService::remainingChannelUntracks($lockedUser),
                ];
            }

            $remainingUntracks = PlanService::remainingChannelUntracks($lockedUser);
            if ($remainingUntracks <= 0) {
                return [
                    'status' => 'limit_reached',
                    'limit' => PlanService::channelUntrackLimit(),
                    'used' => (int) $lockedUser->channel_untrack_count,
                    'remaining' => 0,
                ];
            }

            $detachedRows = $lockedUser->channels()->detach($channel->id);
            if ($detachedRows === 0) {
                return [
                    'status' => 'not_tracked',
                    'limit' => PlanService::channelUntrackLimit(),
                    'used' => (int) $lockedUser->channel_untrack_count,
                    'remaining' => PlanService::remainingChannelUntracks($lockedUser),
                ];
            }

            $watchlistIds = $lockedUser->watchlists()->pluck('watchlists.id');
            if ($watchlistIds->isNotEmpty()) {
                DB::table('watchlist_channels')
                    ->whereIn('watchlist_id', $watchlistIds)
                    ->where('channel_id', $channel->id)
                    ->delete();
            }

            $updatedRows = User::query()
                ->whereKey($lockedUser->id)
                ->where('channel_untrack_count', '<', PlanService::channelUntrackLimit())
                ->increment('channel_untrack_count');

            if ($updatedRows === 0) {
                return [
                    'status' => 'limit_reached',
                    'limit' => PlanService::channelUntrackLimit(),
                    'used' => (int) $lockedUser->channel_untrack_count,
                    'remaining' => 0,
                ];
            }

            $lockedUser->refresh();

            return [
                'status' => 'ok',
                'limit' => PlanService::channelUntrackLimit(),
                'used' => (int) $lockedUser->channel_untrack_count,
                'remaining' => PlanService::remainingChannelUntracks($lockedUser),
            ];
        });

        if (($result['status'] ?? null) === 'limit_reached') {
            return response()->json([
                'error' => 'untrack_limit_reached',
                'message' => 'Only 5 untracks are allowed.',
                'untrack_limit' => $result['limit'],
                'untrack_used' => $result['used'],
                'untrack_remaining' => $result['remaining'],
            ], 403);
        }

        if (($result['status'] ?? null) === 'not_tracked') {
            return response()->json([
                'error' => 'channel_not_tracked',
                'message' => 'This channel is not tracked by your account.',
                'untrack_limit' => $result['limit'],
                'untrack_used' => $result['used'],
                'untrack_remaining' => $result['remaining'],
            ], 404);
        }

        return response()->json([
            'message' => "Untracked @{$channel->handle}. {$result['remaining']} of {$result['limit']} remaining.",
            'untrack_limit' => $result['limit'],
            'untrack_used' => $result['used'],
            'untrack_remaining' => $result['remaining'],
        ]);
    }

    /**
     * @return array{0: Channel, 1: bool}
     */
    private function upsertChannel(string $handle, string $platform): array
    {
        $existing = Channel::query()
            ->where('handle', $handle)
            ->where('platform', $platform)
            ->first();

        if ($existing) {
            return [$existing, false];
        }

        try {
            $created = Channel::query()->create([
                'handle' => $handle,
                'platform' => $platform,
                'name' => $handle,
                'apify_profile_run_status' => 'QUEUED',
            ]);

            return [$created, true];
        } catch (QueryException $e) {
            if (! $this->isDuplicateKeyException($e)) {
                throw $e;
            }

            $channel = Channel::query()
                ->where('handle', $handle)
                ->where('platform', $platform)
                ->first();

            if (! $channel) {
                throw $e;
            }

            return [$channel, false];
        }
    }

    private function isDuplicateKeyException(QueryException $e): bool
    {
        $sqlState = (string) ($e->errorInfo[0] ?? '');

        return in_array($sqlState, ['23000', '23505'], true);
    }
}
