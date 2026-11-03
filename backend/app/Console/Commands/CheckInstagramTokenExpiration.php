<?php

namespace App\Console\Commands;

use App\Models\InstagramAccount;
use App\Notifications\AppNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CheckInstagramTokenExpiration extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'instagram:check-tokens';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for connected Instagram accounts whose tokens are expiring soon and notify their owners.';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $this->info('Checking Instagram tokens for expiration...');

        // Find active accounts expiring in the next 7 days
        $expiringAccounts = InstagramAccount::query()
            ->where('status', 'active')
            ->whereNotNull('token_expires_at')
            ->where('token_expires_at', '<=', now()->addDays(7))
            ->with('user')
            ->get();

        if ($expiringAccounts->isEmpty()) {
            $this->info('No expiring Instagram accounts found.');

            return;
        }

        foreach ($expiringAccounts as $account) {
            $user = $account->user;
            if (! $user) {
                continue;
            }

            $cacheKey = "instagram:token-alert-sent:{$account->id}";

            if (Cache::has($cacheKey)) {
                $this->info("Alert already sent recently for account @{$account->username}. Skipping.");

                continue;
            }

            $daysLeft = (int) now()->diffInDays($account->token_expires_at, false);
            $daysLeft = max(0, $daysLeft);

            $message = "Your connected Instagram account @{$account->username} token is expiring in {$daysLeft} days. Please go to settings and reconnect your account to keep automation working.";

            Log::info('Instagram token expiration alert dispatched', [
                'user_id' => $user->id,
                'instagram_account_id' => $account->id,
                'username' => $account->username,
                'days_left' => $daysLeft,
            ]);

            $user->notify(new AppNotification(
                title: 'Instagram Connection Expiring Soon',
                message: $message,
                type: 'warning',
                actionUrl: route('settings', ['tab' => 'integration']),
                extraData: [
                    'instagram_account_id' => $account->id,
                    'username' => $account->username,
                    'token_expires_at' => $account->token_expires_at->toIso8601String(),
                ]
            ));

            // Don't alert again for 3 days
            Cache::put($cacheKey, true, now()->addDays(3));
        }

        $this->info('Expiration checks completed.');
    }
}
