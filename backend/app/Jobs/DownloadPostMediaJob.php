<?php

namespace App\Jobs;

use App\Models\Channel;
use App\Models\Post;
use App\Services\MediaUrlService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DownloadPostMediaJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 90;

    public int $uniqueFor = 1800;

    public array $backoff = [10, 30];

    private const ALLOWED_FIELDS = ['display_url', 'profile_image_url'];

    private const MEDIA_EXTENSIONS = ['jpg', 'png', 'webp', 'gif'];

    public function __construct(
        public int $modelId,
        public string $modelType, // 'post' or 'channel'
        public string $url,
        public string $field
    ) {
        $this->onQueue('media-downloads');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $targetField = $this->normalizeField($this->field);
        if (! in_array($targetField, self::ALLOWED_FIELDS, true)) {
            Log::error("DownloadPostMediaJob: invalid field '{$this->field}' for {$this->modelType} ID: {$this->modelId}");

            return;
        }

        try {
            Log::debug("Starting media download for {$this->modelType} ID: {$this->modelId}");

            $mediaUrlService = app(MediaUrlService::class);
            if (! $mediaUrlService->isAbsoluteUrl($this->url)) {
                Log::debug("Skipping media download for {$this->modelType} ID: {$this->modelId}; source is already a stored path.");

                return;
            }

            $uploadDisk = (string) config('filesystems.upload_disk', 'public');
            $folder = $this->modelType === 'channel' ? 'profiles' : 'images';
            $existingPath = $this->findExistingStoredPath($uploadDisk, $folder, $this->url);
            if ($existingPath !== null) {
                $this->updateTargetModel($targetField, $existingPath);

                return;
            }

            // 1. Download the media
            $httpClient = Http::timeout(25)
                ->connectTimeout(5)
                ->retry(3, fn (int $attempt): int => $attempt * 300, throw: false);

            if (app()->environment('local')) {
                $httpClient = $httpClient->withoutVerifying();
            }

            $response = $httpClient->get($this->url);
            if (! $response->successful()) {
                Log::warning("Failed to download media for {$this->modelType} ID: {$this->modelId}. Keeping remote URL.");

                return;
            }

            // 2. Determine path and filename
            $extension = $this->detectExtensionFromContentType((string) $response->header('Content-Type', ''));
            $filename = 'media_'.md5($this->url).".{$extension}";
            $path = "viral/{$folder}/{$filename}";

            // 3. Store to configured upload disk
            Storage::disk($uploadDisk)->put($path, $response->body());

            // 4. Update the model
            $this->updateTargetModel($targetField, $path);

        } catch (\Exception $e) {
            Log::error("Exception occurred while downloading media for {$this->modelType} ID: {$this->modelId}: ".$e->getMessage());
            // Fail gracefully - remote URL remains in database
        }
    }

    public function uniqueId(): string
    {
        return implode(':', [
            'download-post-media',
            $this->modelType,
            (string) $this->modelId,
            $this->normalizeField($this->field),
            md5(trim($this->url)),
        ]);
    }

    /**
     * Keep legacy compatibility for older queued payloads.
     */
    private function normalizeField(string $field): string
    {
        if ($field === 'profile_picture_url') {
            return 'profile_image_url';
        }

        return $field;
    }

    private function findExistingStoredPath(string $uploadDisk, string $folder, string $sourceUrl): ?string
    {
        $storage = Storage::disk($uploadDisk);
        $fileHash = md5($sourceUrl);

        foreach (self::MEDIA_EXTENSIONS as $extension) {
            $path = "viral/{$folder}/media_{$fileHash}.{$extension}";

            if ($storage->exists($path)) {
                return $path;
            }
        }

        return null;
    }

    private function detectExtensionFromContentType(string $contentType): string
    {
        $normalized = strtolower(trim($contentType));

        return match (true) {
            str_contains($normalized, 'png') => 'png',
            str_contains($normalized, 'webp') => 'webp',
            str_contains($normalized, 'gif') => 'gif',
            default => 'jpg',
        };
    }

    private function updateTargetModel(string $targetField, string $path): void
    {
        $modelClass = $this->modelType === 'channel' ? Channel::class : Post::class;
        $model = $modelClass::find($this->modelId);

        if (! $model) {
            Log::error("Model {$this->modelType} with ID {$this->modelId} not found after download.");

            return;
        }

        $model->update([$targetField => $path]);
        Log::debug("Successfully updated {$this->modelType} ID: {$this->modelId} with local media path.");

        // Only send to Slack for main profile pictures to avoid spamming for every post image.
        if ($this->modelType === 'channel') {
            Log::channel('slack')->info("*Media*: Profile image for #{$this->modelId} downloaded and localized.");
        }
    }
}
