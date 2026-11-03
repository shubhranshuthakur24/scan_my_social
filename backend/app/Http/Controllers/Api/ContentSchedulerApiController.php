<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\PublishScheduledPostJob;
use App\Models\ContentSchedulerMedia;
use App\Models\InstagramAccount;
use App\Models\ScheduledPost;
use App\Models\SchedulerNote;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ContentSchedulerApiController extends Controller
{
    /**
     * Resolve the current authenticated user with strict production guards.
     */
    private function resolveUser(Request $request): ?User
    {
        return Auth::user() ?: $request->user();
    }

    /**
     * Get publishing calendar entries & scheduled post queue.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $accountId = $request->query('instagram_account_id');
        $status = $request->query('status');

        if ($accountId) {
            $validAccount = InstagramAccount::where('user_id', $user->id)->where('id', $accountId)->exists();
            if (!$validAccount) {
                return response()->json([
                    'error' => [
                        'code' => 'INSTAGRAM_ACCOUNT_INVALID',
                        'message' => 'The requested Instagram account was not found or is not accessible.'
                    ]
                ], 403);
            }
        } else {
            return response()->json([
                'error' => [
                    'code' => 'INSTAGRAM_ACCOUNT_REQUIRED',
                    'message' => 'An instagram_account_id query parameter is required.'
                ]
            ], 422);
        }

        $query = ScheduledPost::where('user_id', $user->id)
            ->where('instagram_account_id', $accountId)
            ->with(['media'])
            ->latest();

        if ($status) {
            $statuses = array_filter(array_map('trim', explode(',', strtolower($status))));
            if (!empty($statuses)) {
                $query->whereIn('status', $statuses);
            }
        }

        $posts = $query->limit(100)
            ->get()
            ->map(function (ScheduledPost $post) {
                $options = is_array($post->options) ? $post->options : (json_decode($post->options ?? '[]', true) ?: []);
                $firstMedia = $post->media->first();
                $mediaUrl = $firstMedia ? $firstMedia->deliveryUrl() : ($options['mediaUrl'] ?? ($options['thumbnail'] ?? ''));

                return [
                    'id' => (string) $post->id,
                    'instagram_account_id' => (string) $post->instagram_account_id,
                    'caption' => $post->caption ?? '',
                    'mediaUrl' => $mediaUrl,
                    'mediaAssetIds' => $post->media->pluck('id')->map(fn ($id) => (int) $id)->all(),
                    'format' => strtoupper($post->format ?? 'REEL'),
                    'scheduledTime' => optional($post->scheduled_at)->toIso8601String() ?? '',
                    'publishedAt' => optional($post->published_at)->toIso8601String(),
                    'metaMediaId' => $post->meta_media_id,
                    'permalink' => $post->meta_media_id ? "https://www.instagram.com/p/{$post->meta_media_id}/" : null,
                    'status' => ucfirst($post->status ?? 'Scheduled'),
                    'hashtags' => is_array($post->hashtags) ? $post->hashtags : (json_decode($post->hashtags ?? '[]', true) ?: []),
                    'hasAutodm' => (bool) ($options['hasAutodm'] ?? false),
                    'autodmKeyword' => $options['autodmKeyword'] ?? '',
                    'lastError' => $post->last_error,
                ];
            });

        $notes = SchedulerNote::where('user_id', $user->id)
            ->orderBy('note_date')
            ->limit(100)
            ->get()
            ->map(function ($note) {
                return [
                    'id' => (string) $note->id,
                    'date' => optional($note->note_date)->toDateString() ?? '',
                    'content' => $note->content ?? '',
                    'color' => $note->color ?? 'amber',
                ];
            });

        return response()->json([
            'posts' => $posts,
            'notes' => $notes,
        ]);
    }

    /**
     * Schedule a new Reel, Carousel, Photo, or Story post.
     */
    public function store(Request $request, \App\Services\Validation\ContentFormatValidator $contentFormatValidator): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $isPublishNow = $request->boolean('publish_now') || strtolower((string) $request->input('status')) === 'publishing';

        $rules = [
            'instagram_account_id' => ['required', 'integer'],
            'format' => ['required', 'string', 'in:reel,carousel,image,story,video,REEL,CAROUSEL,IMAGE,STORY,VIDEO'],
            'caption' => ['nullable', 'string', 'max:2200'],
            'hashtags' => ['nullable'],
            'media_asset_ids' => ['required', 'array', 'min:1', 'max:10'],
            'media_asset_ids.*' => ['integer', 'distinct'],
            'hasAutodm' => ['nullable', 'boolean'],
            'autodmKeyword' => ['nullable', 'string', 'max:100'],
            'autodmReplyText' => ['nullable', 'string', 'max:1000'],
        ];

        if (!$isPublishNow) {
            $rules['scheduledTime'] = ['required', 'date', 'after:now'];
        }

        $request->validate($rules);

        // 1. Verify Instagram Account Ownership & Status
        $accountId = (int) $request->input('instagram_account_id');
        $account = InstagramAccount::query()
            ->whereKey($accountId)
            ->where('user_id', $user->id)
            ->first();

        if (!$account) {
            return response()->json([
                'message' => 'The selected Instagram account is invalid or does not belong to you.',
                'errors' => ['instagram_account_id' => ['Select one of your connected Instagram accounts.']]
            ], 422);
        }

        if ($account->status !== 'active') {
            return response()->json([
                'message' => 'This Instagram account is disconnected.',
                'errors' => ['instagram_account_id' => ['This Instagram account is disconnected.']]
            ], 422);
        }

        // 2. Verify Media Assets Ownership
        $mediaAssetIds = collect($request->input('media_asset_ids', []))
            ->map(fn ($id): int => (int) $id)
            ->filter()
            ->values();

        $mediaAssets = ContentSchedulerMedia::query()
            ->where('user_id', $user->id)
            ->whereIn('id', $mediaAssetIds)
            ->get()
            ->keyBy('id');

        if ($mediaAssets->count() !== $mediaAssetIds->count()) {
            return response()->json([
                'message' => 'One or more selected media assets could not be found in your library.',
                'errors' => ['media_asset_ids' => ['Select media assets from your media library.']]
            ], 422);
        }

        // Preserve ordered collection matching user's selected slide order
        $orderedMediaAssets = $mediaAssetIds->map(fn ($id) => $mediaAssets->get($id))->filter()->values();

        // 3. Format Validation Layer (Contract, Boundaries & Carousel Consistency)
        $format = strtolower($request->input('format'));
        if ($format === 'video') {
            $format = 'reel';
        }

        $validationResult = $contentFormatValidator->validate($format, $orderedMediaAssets);
        if (!$validationResult->isValid()) {
            return response()->json($validationResult->toArray(), 422);
        }

        // 4. Parse Dates & Status
        $scheduledAt = $isPublishNow ? now() : Carbon::parse($request->input('scheduledTime'));
        $status = $isPublishNow ? ScheduledPost::STATUS_PUBLISHING : ScheduledPost::STATUS_SCHEDULED;

        $rawHashtags = $request->input('hashtags', []);
        $hashtags = is_array($rawHashtags) ? $rawHashtags : (json_decode($rawHashtags, true) ?: []);

        $post = DB::transaction(function () use ($user, $account, $request, $format, $status, $scheduledAt, $hashtags, $mediaAssetIds): ScheduledPost {
            $post = ScheduledPost::create([
                'user_id' => $user->id,
                'instagram_account_id' => $account->id,
                'title' => $request->input('title', 'Scheduled Post'),
                'platform' => 'instagram',
                'caption' => $request->input('caption', ''),
                'format' => $format,
                'scheduled_at' => $scheduledAt,
                'status' => $status,
                'hashtags' => $hashtags,
                'options' => [
                    'hasAutodm' => (bool) $request->input('hasAutodm', false),
                    'autodmKeyword' => $request->input('autodmKeyword', ''),
                    'autodmReplyText' => $request->input('autodmReplyText', ''),
                    'alt_text' => $request->input('alt_text', ''),
                    'location_id' => $request->input('location_id', ''),
                    'share_to_feed' => $request->boolean('share_to_feed', true),
                ],
            ]);

            $post->media()->sync($mediaAssetIds->mapWithKeys(fn ($id, int $index): array => [
                $id => ['sort_order' => $index],
            ])->all());

            return $post;
        });

        // 5. Dispatch immediate publishing job if publishNow
        if ($isPublishNow) {
            PublishScheduledPostJob::dispatch($post->id);
        }

        $firstMedia = $mediaAssets->get($mediaAssetIds->first());

        return response()->json([
            'id' => (string) $post->id,
            'instagram_account_id' => (string) $post->instagram_account_id,
            'caption' => $post->caption,
            'mediaUrl' => $firstMedia ? $firstMedia->deliveryUrl() : '',
            'mediaAssetIds' => $mediaAssetIds->all(),
            'format' => strtoupper($post->format),
            'scheduledTime' => optional($post->scheduled_at)->toIso8601String() ?? now()->toIso8601String(),
            'status' => ucfirst($post->status),
            'hashtags' => $hashtags,
            'hasAutodm' => (bool) data_get($post->options, 'hasAutodm', false),
            'autodmKeyword' => (string) data_get($post->options, 'autodmKeyword', ''),
        ], 201);
    }

    /**
     * Reschedule post date/time.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $post = ScheduledPost::where('user_id', $user->id)->where('id', $id)->first();
        if (!$post) {
            return response()->json(['message' => 'Scheduled post not found'], 404);
        }

        if (in_array($post->status, [ScheduledPost::STATUS_PUBLISHED, ScheduledPost::STATUS_CANCELLED], true)) {
            return response()->json(['message' => 'Cannot reschedule a post that is already published or cancelled.'], 422);
        }

        $request->validate([
            'scheduledTime' => ['required', 'date', 'after:now'],
        ]);

        $post->update([
            'status' => ScheduledPost::STATUS_SCHEDULED,
            'scheduled_at' => Carbon::parse($request->input('scheduledTime')),
            'last_error' => null,
        ]);

        return response()->json([
            'id' => (string) $post->id,
            'success' => true,
            'scheduledTime' => optional($post->scheduled_at)->toIso8601String(),
            'status' => ucfirst($post->status),
            'updatedAt' => now()->toIso8601String(),
        ]);
    }

    /**
     * Cancel and delete scheduled post.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $post = ScheduledPost::where('user_id', $user->id)->where('id', $id)->first();
        if (!$post) {
            return response()->json(['message' => 'Scheduled post not found'], 404);
        }

        DB::transaction(function () use ($post): void {
            $post->update(['status' => ScheduledPost::STATUS_CANCELLED]);
            $post->delete();
        });

        return response()->json([
            'id' => $id,
            'deleted' => true,
            'message' => 'Scheduled post successfully cancelled and removed.',
        ]);
    }

    /**
     * Retry a failed scheduled post publishing attempt.
     */
    public function retry(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $post = ScheduledPost::where('user_id', $user->id)->where('id', $id)->first();
        if (!$post) {
            return response()->json(['message' => 'Scheduled post not found'], 404);
        }

        if ($post->status !== ScheduledPost::STATUS_FAILED) {
            return response()->json(['message' => 'Only failed posts can be retried.'], 422);
        }

        $post->update([
            'status' => ScheduledPost::STATUS_SCHEDULED,
            'scheduled_at' => now(),
            'last_error' => null,
        ]);

        PublishScheduledPostJob::dispatch($post->id);

        return response()->json([
            'id' => (string) $post->id,
            'success' => true,
            'status' => 'Scheduled',
            'message' => 'Publishing retry queued.',
        ]);
    }

    /**
     * Store a new editorial strategy note in the database.
     */
    public function storeNote(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $request->validate([
            'date' => ['required', 'string'],
            'content' => ['required', 'string', 'max:1500'],
            'color' => ['nullable', 'string', 'in:amber,blue,purple,emerald'],
        ]);

        $dateStr = $request->input('date');
        $content = trim($request->input('content'));
        $color = $request->input('color', 'amber');

        $note = SchedulerNote::create([
            'user_id' => $user->id,
            'note_date' => $dateStr,
            'content' => $content,
            'color' => $color,
        ]);

        return response()->json([
            'id' => (string) $note->id,
            'date' => optional($note->note_date)->toDateString() ?? $dateStr,
            'content' => $note->content,
            'color' => $note->color ?? 'amber',
        ], 201);
    }

    /**
     * Update an existing strategy note in the database.
     */
    public function updateNote(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $request->validate([
            'content' => ['sometimes', 'required', 'string', 'max:1500'],
            'color' => ['nullable', 'string', 'in:amber,blue,purple,emerald'],
        ]);

        $note = SchedulerNote::where('user_id', $user->id)->where('id', $id)->first();
        if (!$note) {
            return response()->json(['message' => 'Note not found'], 404);
        }

        $updateData = [];
        if ($request->has('content')) {
            $updateData['content'] = trim($request->input('content'));
        }
        if ($request->has('color')) {
            $updateData['color'] = $request->input('color');
        }

        if (!empty($updateData)) {
            $note->update($updateData);
        }

        return response()->json([
            'id' => (string) $note->id,
            'date' => optional($note->note_date)->toDateString() ?? '',
            'content' => $note->content,
            'color' => $note->color ?? 'amber',
            'updated' => true,
        ]);
    }

    /**
     * Delete an editorial strategy note from the database.
     */
    public function destroyNote(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        SchedulerNote::where('user_id', $user->id)->where('id', $id)->delete();

        return response()->json([
            'id' => $id,
            'deleted' => true,
            'message' => 'Strategy note successfully deleted',
        ]);
    }

    /**
     * Return curated viral hashtag presets.
     */
    public function hashtags(): JsonResponse
    {
        return response()->json([
            [
                'category' => 'Growth & Scaling',
                'tags' => ['#AIGrowth', '#CreatorEconomy', '#ViralHooks', '#SocialMediaSystems', '#Solopreneur'],
            ],
            [
                'category' => 'Tech & AI',
                'tags' => ['#ArtificialIntelligence', '#ChatGPT', '#AutomationTools', '#FutureOfWork', '#TechCreators'],
            ],
            [
                'category' => 'Content Strategy',
                'tags' => ['#ReelsStrategy', '#ContentMarketing', '#PersonalBranding', '#AudienceBuilding', '#DigitalProducts'],
            ],
        ]);
    }
}
