<?php

namespace App\Jobs;

use App\Models\AutomationFlow;
use App\Models\InstagramAccount;
use App\Services\MetaApiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RetryInstagramLongLivedTokenExchangeJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 0;

    public function __construct(public int $instagramAccountId)
    {
        $this->onQueue('autodm');
    }

    public function handle(MetaApiService $metaApiService): void
    {
        $account = InstagramAccount::query()->find($this->instagramAccountId);

        if (! $account || $account->status !== 'active' || $account->token_type !== InstagramAccount::TOKEN_TYPE_SHORT_LIVED) {
            return;
        }

        if (! $account->token_expires_at || $account->token_expires_at->isPast()) {
            $this->disconnectExpiredShortTokenAccount($account);

            return;
        }

        $longLivedToken = $metaApiService->getLongLivedToken((string) $account->access_token);

        if ($longLivedToken) {
            $account->update([
                'access_token' => $longLivedToken,
                'token_type' => InstagramAccount::TOKEN_TYPE_LONG_LIVED,
                'token_expires_at' => now()->addDays(60),
                'long_lived_exchange_failed_at' => null,
            ]);

            Log::info('Instagram short-lived token upgraded to long-lived token', [
                'instagram_account_id' => (int) $account->id,
                'ig_account_id' => (string) $account->ig_account_id,
            ]);

            return;
        }

        $secondsUntilExpiry = max(0, $account->token_expires_at->getTimestamp() - now()->getTimestamp());

        if ($secondsUntilExpiry <= 60) {
            $this->disconnectExpiredShortTokenAccount($account);

            return;
        }

        Log::warning('Instagram long-lived token retry failed; retrying while short token remains valid', [
            'instagram_account_id' => (int) $account->id,
            'seconds_until_expiry' => $secondsUntilExpiry,
        ]);

        $this->release(min(600, max(60, $secondsUntilExpiry - 60)));
    }

    private function disconnectExpiredShortTokenAccount(InstagramAccount $account): void
    {
        $pausedFlowsCount = AutomationFlow::query()
            ->where('instagram_account_id', (int) $account->id)
            ->where('status', 'active')
            ->update([
                'status' => 'paused',
                'updated_at' => now(),
            ]);

        $account->update([
            'status' => 'disconnected',
            'webhook_subscriptions_status' => 'failed',
            'webhook_subscriptions_last_synced_at' => now(),
            'webhook_subscriptions_error' => 'short_lived_token_expired: Long-lived token exchange did not complete before the temporary Instagram token expired.',
        ]);

        Log::warning('Instagram account disconnected after short-lived fallback token expired', [
            'instagram_account_id' => (int) $account->id,
            'ig_account_id' => (string) $account->ig_account_id,
            'paused_flows' => $pausedFlowsCount,
        ]);
    }
}
