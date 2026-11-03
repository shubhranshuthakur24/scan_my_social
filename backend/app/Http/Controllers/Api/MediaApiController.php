<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreContentSchedulerMediaRequest;
use App\Models\ContentSchedulerMedia;
use App\Models\ScheduledPost;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MediaApiController extends Controller
{
    private function resolveUser(Request $request): ?User
    {
        return Auth::user() ?: $request->user();
    }

    /**
     * List user's content scheduler media assets.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $type = (string) $request->query('type', 'all');
        $search = trim((string) $request->query('search', ''));
        $limit = min((int) $request->query('limit', 50), 100);

        $media = ContentSchedulerMedia::query()
            ->where('user_id', $user->id)
            ->when(in_array($type, ['image', 'video'], true), fn ($query) => $query->where('media_type', $type))
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
            ->limit($limit)
            ->get()
            ->map(fn (ContentSchedulerMedia $item): array => [
                'id' => (string) $item->id,
                'title' => $item->title ?: $item->original_name,
                'originalName' => $item->original_name,
                'mediaType' => $item->media_type,
                'url' => $item->deliveryUrl(),
                'sizeBytes' => (int) $item->size_bytes,
                'mimeType' => $item->mime_type,
                'width' => data_get($item->metadata, 'width'),
                'height' => data_get($item->metadata, 'height'),
                'aspectRatio' => data_get($item->metadata, 'aspect_ratio'),
                'createdAt' => optional($item->created_at)->toIso8601String() ?? '',
            ]);

        return response()->json([
            'media' => $media,
            'total' => ContentSchedulerMedia::where('user_id', $user->id)->count(),
        ]);
    }

    /**
     * Upload a new media asset for the content scheduler.
     */
    public function store(StoreContentSchedulerMediaRequest $request, \App\Services\MediaSecurityService $securityService): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $file = $request->file('media');
        $mediaInspection = $securityService->inspectAndValidate($file);

        $disk = (string) config('filesystems.upload_disk', 'public');
        $path = $file->store('content-scheduler/media', $disk);
        $mediaType = $mediaInspection['media_type'];

        $metadata = [];
        if ($mediaType === 'image' && !empty($mediaInspection['width'])) {
            $metadata = [
                'width' => $mediaInspection['width'],
                'height' => $mediaInspection['height'],
                'aspect_ratio' => $mediaInspection['aspect_ratio'],
            ];
        }

        $asset = ContentSchedulerMedia::create([
            'user_id' => $user->id,
            'disk' => $disk,
            'path' => $path,
            'url' => Storage::disk($disk)->url($path),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => (string) $file->getMimeType(),
            'media_type' => $mediaType,
            'size_bytes' => (int) $file->getSize(),
            'title' => $request->string('title')->trim()->toString() ?: null,
            'default_caption' => $request->string('default_caption')->trim()->toString() ?: null,
            'metadata' => $metadata,
        ]);

        return response()->json([
            'id' => (string) $asset->id,
            'title' => $asset->title ?: $asset->original_name,
            'originalName' => $asset->original_name,
            'mediaType' => $asset->media_type,
            'url' => $asset->deliveryUrl(),
            'sizeBytes' => (int) $asset->size_bytes,
            'mimeType' => $asset->mime_type,
            'width' => $metadata['width'] ?? null,
            'height' => $metadata['height'] ?? null,
            'aspectRatio' => $metadata['aspect_ratio'] ?? null,
            'createdAt' => optional($asset->created_at)->toIso8601String() ?? now()->toIso8601String(),
        ], 201);
    }

    /**
     * Delete a media asset if not used in active scheduled posts.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $media = ContentSchedulerMedia::where('user_id', $user->id)->where('id', $id)->first();
        if (!$media) {
            return response()->json(['message' => 'Media asset not found'], 404);
        }

        if ($media->scheduledPosts()->whereIn('status', [ScheduledPost::STATUS_SCHEDULED, ScheduledPost::STATUS_PUBLISHING])->exists()) {
            return response()->json([
                'message' => 'Media used by an active scheduled post cannot be deleted.',
            ], 422);
        }

        try {
            Storage::disk((string) $media->disk)->delete((string) $media->path);
        } catch (\Throwable $exception) {
            Log::error('Failed to delete media asset file from storage', [
                'media_id' => $media->id,
                'disk' => $media->disk,
                'path' => $media->path,
                'error' => $exception->getMessage(),
            ]);
        }

        $media->delete();

        return response()->json([
            'id' => $id,
            'deleted' => true,
            'message' => 'Media deleted successfully',
        ]);
    }
}
