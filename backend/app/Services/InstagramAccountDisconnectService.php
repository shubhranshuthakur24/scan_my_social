<?php

namespace App\Services;

use App\Models\InstagramAccount;
use Illuminate\Support\Facades\Cache;

class InstagramAccountDisconnectService
{
    public function disconnect(InstagramAccount $instagramAccount): void
    {
        $instagramAccount->forceFill([
            'access_token' => null,
            'token_expires_at' => null,
            'long_lived_exchange_failed_at' => null,
            'status' => 'disconnected',
            'webhook_subscriptions_status' => null,
            'webhook_subscriptions_last_synced_at' => null,
            'webhook_subscriptions_error' => null,
            'welcome_dm_enabled' => false,
        ])->save();

        Cache::forget($this->liveProfilePictureCacheKey((int) $instagramAccount->id));
    }

    private function liveProfilePictureCacheKey(int $instagramAccountId): string
    {
        return "autodm:live-profile-picture-url:{$instagramAccountId}";
    }
}
