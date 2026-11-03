<?php

namespace App\Jobs;

use App\Models\ScheduledPost;
use App\Services\ContentSchedulerPublishingService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class PublishScheduledPostJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    private const RETRYABLE_MEDIA_NOT_READY_SUBCODE = 2207027;

    private const RETRYABLE_MEDIA_DOWNLOAD_TIMEOUT_SUBCODE = 2207003;

    private const RETRYABLE_MEDIA_DOWNLOAD_FAILED_SUBCODE = 2207001;

    public int $tries = 7;

    public int $uniqueFor = 1800;

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [15, 30, 60, 120, 300, 600];
    }

    public function __construct(public readonly int $scheduledPostId) {}

    /**
     * @return array<int, object>
     */
    public function middleware(): array
    {
        return [
            (new WithoutOverlapping($this->uniqueId()))
                ->releaseAfter(60)
                ->expireAfter($this->uniqueFor),
        ];
    }

    public function handle(ContentSchedulerPublishingService $publishingService): void
    {
        $scheduledPost = ScheduledPost::query()->find($this->scheduledPostId);

        if (! $scheduledPost) {
            return;
        }

        try {
            $publishingService->publish($scheduledPost);
        } catch (RuntimeException $exception) {
            $retryableCodes = [
                self::RETRYABLE_MEDIA_NOT_READY_SUBCODE,
                self::RETRYABLE_MEDIA_DOWNLOAD_TIMEOUT_SUBCODE,
                self::RETRYABLE_MEDIA_DOWNLOAD_FAILED_SUBCODE,
            ];

            if (! in_array($exception->getCode(), $retryableCodes, true)) {
                throw $exception;
            }

            $this->release($this->retryDelayForAttempt($this->attempts()));
        }
    }

    public function failed(Throwable $exception): void
    {
        $scheduledPost = ScheduledPost::query()->find($this->scheduledPostId);
        if (! $scheduledPost) {
            Log::error('Scheduled post publish job failed permanently for missing post record', [
                'scheduled_post_id' => $this->scheduledPostId,
                'job_attempts' => $this->attempts(),
                'exception_class' => $exception::class,
                'exception_code' => (int) $exception->getCode(),
                'exception_message' => $exception->getMessage(),
            ]);

            return;
        }

        if ($scheduledPost->status !== ScheduledPost::STATUS_PUBLISHING) {
            return;
        }

        $lastOpenAttempt = $scheduledPost->publishAttempts()
            ->whereIn('status', ['running', 'retrying'])
            ->latest('id')
            ->first();

        $lastOpenAttempt?->update([
            'status' => 'failed',
            'error_message' => $exception->getMessage(),
            'finished_at' => now(),
        ]);

        $scheduledPost->update([
            'status' => ScheduledPost::STATUS_FAILED,
            'retry_count' => ($scheduledPost->retry_count ?? 0) + 1,
            'last_error' => $exception->getMessage(),
        ]);

        Log::error('Scheduled post publish job failed permanently', [
            'scheduled_post_id' => $scheduledPost->id,
            'instagram_account_id' => $scheduledPost->instagram_account_id,
            'status' => $scheduledPost->status,
            'retry_count' => (int) ($scheduledPost->retry_count ?? 0),
            'job_attempts' => $this->attempts(),
            'exception_class' => $exception::class,
            'exception_code' => (int) $exception->getCode(),
            'exception_message' => $exception->getMessage(),
        ]);
    }

    public function uniqueId(): string
    {
        return "scheduled-post-publish:{$this->scheduledPostId}";
    }

    private function retryDelayForAttempt(int $attempt): int
    {
        $delays = $this->backoff();
        $index = max(0, min($attempt - 1, count($delays) - 1));

        return $delays[$index];
    }
}
