<?php

namespace App\Jobs;

use App\Models\InstagramAccount;
use App\Services\InstagramAccountAnalyticsSyncService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class SyncInstagramAccountAnalyticsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $timeout = 300;

    public function __construct(
        private readonly int $userId,
        private readonly int $instagramAccountId,
        private readonly ?string $startDate = null,
        private readonly ?string $endDate = null,
        private readonly bool $lifetime = false,
    ) {
        if ($connection = config('queue.instagram_analytics_connection')) {
            $this->onConnection($connection);
        }
        $this->onQueue('instagram-analytics');

        Log::info('[SyncInstagramAccountAnalyticsJob] Job dispatched', [
            'user_id' => $this->userId,
            'instagram_account_id' => $this->instagramAccountId,
            'start_date' => $this->startDate,
            'end_date' => $this->endDate,
            'lifetime' => $this->lifetime,
        ]);
    }

    public function handle(InstagramAccountAnalyticsSyncService $syncService): void
    {
        Log::info('[SyncInstagramAccountAnalyticsJob] Executing job handle()', [
            'user_id' => $this->userId,
            'instagram_account_id' => $this->instagramAccountId,
            'lifetime' => $this->lifetime,
        ]);

        $account = InstagramAccount::query()
            ->whereKey($this->instagramAccountId)
            ->where('user_id', $this->userId)
            ->where('status', 'active')
            ->first();

        if (! $account) {
            Log::warning('[SyncInstagramAccountAnalyticsJob] Active Instagram account not found or inactive', [
                'user_id' => $this->userId,
                'instagram_account_id' => $this->instagramAccountId,
            ]);
            return;
        }

        if ($this->lifetime) {
            $result = $syncService->syncLifetime($account);
            Log::info('[SyncInstagramAccountAnalyticsJob] Completed lifetime sync', [
                'user_id' => $this->userId,
                'instagram_account_id' => $this->instagramAccountId,
                'synced' => $result['synced'] ?? 0,
                'considered' => $result['considered'] ?? 0,
            ]);

            return;
        }

        try {
            $start = Carbon::parse((string) $this->startDate)->startOfDay();
        } catch (\Throwable) {
            $start = now()->subDays(29)->startOfDay();
        }

        try {
            $end = Carbon::parse((string) $this->endDate)->endOfDay();
        } catch (\Throwable) {
            $end = now()->endOfDay();
        }

        if ($end->lt($start)) {
            [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        $syncService->syncRange($account, $start, $end);
        Log::info('[SyncInstagramAccountAnalyticsJob] Completed range sync', [
            'user_id' => $this->userId,
            'instagram_account_id' => $this->instagramAccountId,
            'start' => $start->toDateString(),
            'end' => $end->toDateString(),
        ]);
    }
}
