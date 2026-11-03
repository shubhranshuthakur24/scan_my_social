<?php

namespace App\Jobs;

use App\Models\InstagramAccount;
use App\Services\MetaApiService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RefreshInstagramProfilePictureJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 30;

    public array $backoff = [10, 30];

    public function __construct(public int $instagramAccountId) {}

    public function handle(MetaApiService $metaApiService): void
    {
        $account = InstagramAccount::find($this->instagramAccountId);
        if (! $account || $account->status !== 'active') {
            return;
        }

        $accounts = $metaApiService->fetchInstagramAccountsFromToken(
            (string) $account->access_token,
            (int) $account->id
        );
        if (empty($accounts)) {
            Log::warning('AutoDM profile picture refresh skipped: no account payload returned', [
                'instagram_account_id' => $account->id,
                'ig_account_id' => $account->ig_account_id,
            ]);

            return;
        }

        $selected = collect($accounts)->first(function ($item) use ($account) {
            return (string) ($item['ig_id'] ?? '') === (string) $account->ig_account_id;
        }) ?? $accounts[0];

        $profilePictureUrl = trim((string) ($selected['profile_picture_url'] ?? ''));
        $username = $this->normalizeInstagramUsername($selected['username'] ?? null);
        $profileUrl = trim((string) ($selected['profile_url'] ?? ''));

        $updates = [
            'profile_picture_synced_at' => now(),
        ];

        if ($profilePictureUrl !== '') {
            $updates['profile_picture_url'] = $profilePictureUrl;
        }

        if ($username !== null) {
            $updates['username'] = $username;
            if ($profileUrl === '') {
                $profileUrl = 'https://www.instagram.com/'.ltrim($username, '@').'/';
            }
        }

        if ($profileUrl !== '') {
            $updates['profile_url'] = $profileUrl;
        }

        $account->update($updates);

        Log::info('AutoDM profile picture refreshed', [
            'instagram_account_id' => $account->id,
            'ig_account_id' => $account->ig_account_id,
            'has_profile_picture_url' => isset($updates['profile_picture_url']),
        ]);
    }

    private function normalizeInstagramUsername(?string $username): ?string
    {
        $normalizedUsername = trim((string) $username);

        if ($normalizedUsername === '') {
            return null;
        }

        if (strcasecmp($normalizedUsername, 'Instagram User') === 0) {
            return null;
        }

        return ltrim($normalizedUsername, '@');
    }
}
