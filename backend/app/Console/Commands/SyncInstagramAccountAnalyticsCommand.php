<?php

namespace App\Console\Commands;

use App\Jobs\SyncInstagramAccountAnalyticsJob;
use App\Models\InstagramAccount;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SyncInstagramAccountAnalyticsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'content-scheduler:sync-instagram-analytics
                            {--account-id= : Sync a single local instagram_accounts.id}
                            {--start= : Start date (Y-m-d), default 29 days ago}
                            {--end= : End date (Y-m-d), default today}
                            {--lifetime : Sync all available historical media for selected account(s)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Queue Instagram analytics refresh for active connected account(s).';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $lifetime = (bool) $this->option('lifetime');
        $accountId = (int) ($this->option('account-id') ?? 0);

        $start = $this->resolveDateOption((string) ($this->option('start') ?? ''), now()->subDays(29))->toDateString();
        $end = $this->resolveDateOption((string) ($this->option('end') ?? ''), now())->toDateString();

        $query = InstagramAccount::query()
            ->where('status', 'active')
            ->whereNotNull('access_token')
            ->where('access_token', '!=', '');

        if ($accountId > 0) {
            $query->whereKey($accountId);
        }

        $scheduled = 0;

        $query->select(['id', 'user_id'])
            ->chunkById(200, function ($accounts) use ($lifetime, $start, $end, &$scheduled): void {
                foreach ($accounts as $account) {
                    SyncInstagramAccountAnalyticsJob::dispatch(
                        userId: (int) $account->user_id,
                        instagramAccountId: (int) $account->id,
                        startDate: $lifetime ? null : $start,
                        endDate: $lifetime ? null : $end,
                        lifetime: $lifetime
                    );
                    $scheduled++;
                }
            });

        if ($scheduled === 0) {
            $this->warn('No active connected Instagram accounts matched.');

            return self::SUCCESS;
        }

        $this->info("Queued Instagram analytics sync for {$scheduled} account(s).");

        return self::SUCCESS;
    }

    private function resolveDateOption(string $value, Carbon $fallback): Carbon
    {
        $normalized = trim($value);
        if ($normalized === '') {
            return $fallback;
        }

        try {
            return Carbon::parse($normalized);
        } catch (\Throwable) {
            return $fallback;
        }
    }
}
