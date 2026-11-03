<?php

namespace App\Jobs;

use App\Models\ScheduledPost;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PublishDueScheduledPostsJob implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $scheduledPostIds = DB::transaction(fn (): Collection => $this->claimDueScheduledPostIds());

        $scheduledPostIds->each(fn (int $scheduledPostId) => PublishScheduledPostJob::dispatch($scheduledPostId));
    }

    /**
     * @return Collection<int, int>
     */
    private function claimDueScheduledPostIds(): Collection
    {
        $scheduledPostIds = ScheduledPost::query()
            ->dueForPublishing()
            ->orderBy('scheduled_at')
            ->limit(50)
            ->lockForUpdate()
            ->pluck('id');

        if ($scheduledPostIds->isEmpty()) {
            return $scheduledPostIds;
        }

        ScheduledPost::query()
            ->whereKey($scheduledPostIds)
            ->where('status', ScheduledPost::STATUS_SCHEDULED)
            ->update([
                'status' => ScheduledPost::STATUS_PUBLISHING,
                'last_error' => null,
                'updated_at' => now(),
            ]);

        return ScheduledPost::query()
            ->whereKey($scheduledPostIds)
            ->where('status', ScheduledPost::STATUS_PUBLISHING)
            ->pluck('id');
    }
}
