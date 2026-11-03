<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\User;
use App\Services\PlanService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetMonthlyCreditsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:reset-monthly-credits';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset monthly credits for active subscriptions when their reset date is due.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $processedCount = 0;
        $skippedCount = 0;

        Subscription::query()
            ->select(['id', 'user_id', 'name', 'next_credit_reset_at', 'status'])
            ->where('status', 'active')
            ->whereNotNull('next_credit_reset_at')
            ->where('next_credit_reset_at', '<=', now())
            ->orderBy('id')
            ->chunkById(200, function ($subscriptions) use (&$processedCount, &$skippedCount): void {
                foreach ($subscriptions as $subscription) {
                    DB::transaction(function () use ($subscription, &$processedCount, &$skippedCount): void {
                        $lockedSubscription = Subscription::query()
                            ->whereKey($subscription->id)
                            ->lockForUpdate()
                            ->first();

                        if (
                            ! $lockedSubscription ||
                            $lockedSubscription->status !== 'active' ||
                            $lockedSubscription->next_credit_reset_at === null ||
                            $lockedSubscription->next_credit_reset_at->isFuture()
                        ) {
                            $skippedCount++;

                            return;
                        }

                        $lockedUser = User::query()
                            ->whereKey($lockedSubscription->user_id)
                            ->lockForUpdate()
                            ->first();

                        if (! $lockedUser) {
                            $skippedCount++;

                            return;
                        }

                        $allowance = PlanService::monthlyCreditAllowanceForPlan($lockedSubscription->name);
                        $lockedUser->forceFill(['credits' => $allowance])->save();

                        $nextResetAt = Carbon::parse($lockedSubscription->next_credit_reset_at);
                        while ($nextResetAt->lessThanOrEqualTo(now())) {
                            $nextResetAt = $nextResetAt->addMonthNoOverflow();
                        }

                        $lockedSubscription->forceFill([
                            'next_credit_reset_at' => $nextResetAt,
                        ])->save();

                        $processedCount++;
                    }, 3);
                }
            });

        $this->info("Monthly credits reset completed. Processed: {$processedCount}, Skipped: {$skippedCount}.");

        return self::SUCCESS;
    }
}
