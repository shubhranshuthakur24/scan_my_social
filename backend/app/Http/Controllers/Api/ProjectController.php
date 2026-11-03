<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    private const DEFAULT_POSTS_PER_PAGE = 24;

    private const MAX_POSTS_PER_PAGE = 100;

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $projects = Project::where('user_id', $user->id)
            ->select(['id', 'user_id', 'name', 'description', 'color', 'created_at', 'updated_at'])
            ->withCount('posts')
            ->when($request->search, function ($q, $search) {
                $q->where('name', 'like', "%{$search}%");
            })
            ->latest('id')
            ->get();

        return response()->json($projects);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $project = Project::create([
            'user_id' => $user->id,
            'name' => trim((string) $validated['name']),
            'description' => isset($validated['description'])
                ? $this->normalizeNullableString($validated['description'])
                : null,
            'color' => isset($validated['color']) ? trim((string) $validated['color']) : 'slate',
        ]);

        if (auth()->check()) {
            auth()->user()->logActivity('project_created', 'Created project '.$project->name, '/projects/'.$project->id);
        }

        $project->loadCount('posts');

        return response()->json($project->only([
            'id',
            'user_id',
            'name',
            'description',
            'color',
            'created_at',
            'updated_at',
            'posts_count',
        ]), 201);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProject($project);

        $project->loadCount('posts');
        $perPage = $this->resolvePerPage($request);

        $posts = $project->posts()
            ->select([
                'posts.id',
                'posts.channel_id',
                'posts.platform',
                'posts.type',
                'posts.caption',
                'posts.owner_username',
                'posts.url',
                'posts.video_url',
                'posts.video_play_count',
                'posts.video_view_count',
                'posts.likes_count',
                'posts.comments_count',
                'posts.post_timestamp',
                'posts.breakout_multiplier',
                'posts.breakout_label',
                'posts.display_url',
                'posts.created_at',
            ])
            ->orderByDesc('project_posts.created_at')
            ->paginate($perPage)
            ->through(fn (Post $post): array => [
                'id' => $post->id,
                'channel_id' => $post->channel_id,
                'platform' => $post->platform,
                'type' => $post->type,
                'caption' => $post->caption,
                'owner_username' => $post->owner_username,
                'url' => $post->url,
                'video_url' => $post->video_url,
                'video_play_count' => $post->video_play_count,
                'video_view_count' => $post->video_view_count,
                'likes_count' => $post->likes_count,
                'comments_count' => $post->comments_count,
                'taken_at' => $post->post_timestamp?->toIso8601String(),
                'breakout_multiplier' => $post->breakout_multiplier,
                'breakout_label' => $post->breakout_label,
                'display_url' => $post->display_url,
                'created_at' => $post->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
            'color' => $project->color,
            'posts_count' => (int) $project->posts_count,
            'posts' => $posts->items(),
            'posts_pagination' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
                'has_more_pages' => $posts->hasMorePages(),
            ],
        ]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProject($project);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $project->update([
            'name' => trim((string) $validated['name']),
            'description' => array_key_exists('description', $validated)
                ? $this->normalizeNullableString($validated['description'])
                : $project->description,
            'color' => array_key_exists('color', $validated)
                ? $this->normalizeNullableString($validated['color']) ?? 'slate'
                : $project->color,
        ]);

        return response()->json($project);
    }

    public function destroy(Project $project): JsonResponse
    {
        $this->authorizeProject($project);

        $project->delete();

        return response()->json(['message' => 'Project deleted']);
    }

    public function addPost(Request $request, Project $project): JsonResponse
    {
        $this->authorizeProject($project);

        $request->validate([
            'post_id' => ['sometimes', 'exists:posts,id'],
            'post_ids' => ['sometimes', 'array'],
            'post_ids.*' => ['exists:posts,id'],
        ]);

        $ids = [];
        if ($request->has('post_id')) {
            $ids[] = $request->post_id;
        }
        if ($request->has('post_ids')) {
            $ids = array_merge($ids, $request->post_ids);
        }

        if (empty($ids)) {
            return response()->json(['message' => 'No valid posts provided'], 400);
        }

        $allowedPostIds = Post::query()
            ->whereIn('id', $ids)
            ->whereIn('channel_id', $this->visibleChannelIds())
            ->pluck('id')
            ->all();

        if (count($allowedPostIds) !== count(array_unique($ids))) {
            return response()->json(['message' => 'One or more posts are not accessible.'], 403);
        }

        $project->posts()->syncWithoutDetaching($allowedPostIds);

        return response()->json(['message' => count($ids) > 1 ? 'Posts added to project' : 'Post added to project']);
    }

    public function removePost(Project $project, $postId): JsonResponse
    {
        $this->authorizeProject($project);

        $postExistsAndVisible = Post::query()
            ->whereKey($postId)
            ->whereIn('channel_id', $this->visibleChannelIds())
            ->exists();

        if (! $postExistsAndVisible) {
            return response()->json(['message' => 'Post is not accessible.'], 403);
        }

        $project->posts()->detach($postId);

        return response()->json(['message' => 'Post removed from project']);
    }

    private function authorizeProject(Project $project): void
    {
        abort_unless((int) $project->user_id === (int) auth()->id(), 403);
    }

    private function visibleChannelIds(): array
    {
        $user = auth()->user();

        $ownChannelIds = $user->channels()->pluck('channels.id');
        $watchlistChannelIds = DB::table('watchlist_channels')
            ->join('watchlists', 'watchlists.id', '=', 'watchlist_channels.watchlist_id')
            ->where('watchlists.user_id', $user->id)
            ->pluck('watchlist_channels.channel_id');

        return $ownChannelIds->merge($watchlistChannelIds)->unique()->values()->all();
    }

    private function resolvePerPage(Request $request): int
    {
        $rawPerPage = (int) $request->query('per_page', self::DEFAULT_POSTS_PER_PAGE);

        if ($rawPerPage <= 0) {
            return self::DEFAULT_POSTS_PER_PAGE;
        }

        return min($rawPerPage, self::MAX_POSTS_PER_PAGE);
    }

    private function normalizeNullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}
