<?php

namespace App\Http\Controllers;

use App\Jobs\RetryInstagramLongLivedTokenExchangeJob;
use App\Jobs\SyncInstagramAccountAnalyticsJob;
use App\Models\InstagramAccount;
use App\Models\User;
use App\Services\InstagramAccountDisconnectService;
use App\Services\MetaApiService;
use App\Services\PlanService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SocialIntegrationController extends Controller
{
    /**
     * Redirect to Instagram for OAuth using Instagram Login for Business.
     */
    public function connectInstagram(Request $request): RedirectResponse
    {
        $user = $request->user();
        $oauthSource = trim((string) $request->query('source', ''));
        if ($oauthSource === 'settings_integration') {
            $request->session()->put('social_integrations_oauth_return_to', 'settings_integration');
        } else {
            $request->session()->forget('social_integrations_oauth_return_to');
        }

        if (! PlanService::hasActivePaidPlan($user) && PlanService::connectedInstagramAccountsCount($user) === 0) {
            return redirect()
                ->route('settings.upgrade')
                ->withErrors(['error' => 'An active paid plan is required to connect Instagram accounts.']);
        }

        $clientId = (string) config('services.meta.client_id', '');
        $redirectUri = (string) config('services.meta.redirect', '');

        if ($clientId === '' || $redirectUri === '') {
            Log::error('Instagram OAuth connect misconfigured', [
                'client_id_set' => $clientId !== '',
                'redirect_set' => $redirectUri !== '',
            ]);

            return $this->redirectAfterOauthError($request, 'Instagram connection is not configured.');
        }

        $state = Str::random(64);
        $reconnectAccountId = (int) $request->query('reconnect_account_id', 0);
        if ($reconnectAccountId > 0) {
            $ownsReconnectTarget = InstagramAccount::query()
                ->where('id', $reconnectAccountId)
                ->where('user_id', (int) $user->id)
                ->exists();

            if ($ownsReconnectTarget) {
                $request->session()->put('social_integrations_instagram_reconnect_account_id', $reconnectAccountId);
            } else {
                $reconnectAccountId = 0;
                $request->session()->forget('social_integrations_instagram_reconnect_account_id');
            }
        } else {
            $request->session()->forget('social_integrations_instagram_reconnect_account_id');
        }

        $request->session()->put('social_integrations_instagram_oauth_state', $state);

        $url = 'https://www.instagram.com/oauth/authorize?'.http_build_query([
            'force_reauth' => 'true',
            'enable_fb_login' => '0',
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'state' => $state,
            'scope' => implode(',', $this->instagramScopes()),
        ], '', '&', PHP_QUERY_RFC3986);

        return redirect($url);
    }

    /**
     * Handle the OAuth callback from Instagram.
     */
    public function instagramCallback(Request $request, MetaApiService $metaApiService): RedirectResponse
    {
        $code = $request->query('code');
        $state = (string) $request->query('state', '');
        $expectedState = (string) $request->session()->pull('social_integrations_instagram_oauth_state', '');
        $reconnectAccountId = (int) $request->session()->pull('social_integrations_instagram_reconnect_account_id', 0);

        // Decoupled API Cache fallback for Next.js OAuth
        if ($expectedState === '' && $state !== '') {
            $cachedPayload = Cache::pull("instagram_oauth_state:{$state}");
            if (is_array($cachedPayload) && ! empty($cachedPayload['user_id'])) {
                $expectedState = $state;
                $reconnectAccountId = (int) ($cachedPayload['reconnect_account_id'] ?? 0);
                $request->session()->put('social_integrations_oauth_return_to', $cachedPayload['return_to'] ?? 'settings_integration');

                $cachedUser = \App\Models\User::find($cachedPayload['user_id']);
                if ($cachedUser) {
                    Auth::login($cachedUser);
                }
            }
        }

        Log::info('Instagram OAuth callback received', [
            'has_code' => (bool) $code,
            'has_state' => $state !== '',
            'user_id' => Auth::id(),
        ]);

        if ($expectedState === '' || ! hash_equals($expectedState, $state)) {
            return $this->redirectAfterOauthError($request, 'Invalid OAuth state. Please try connecting again.');
        }

        if (! $code) {
            return $this->redirectAfterOauthError($request, 'Authorization failed or was cancelled.');
        }

        try {
            $shortLivedToken = $metaApiService->exchangeCodeForToken($code);

            if (! $shortLivedToken) {
                return $this->redirectAfterOauthError($request, 'Failed to exchange code for access token. Please try connecting again.');
            }

            $longLivedToken = $metaApiService->getLongLivedToken($shortLivedToken);
            $tokenType = $longLivedToken
                ? InstagramAccount::TOKEN_TYPE_LONG_LIVED
                : InstagramAccount::TOKEN_TYPE_SHORT_LIVED;
            $effectiveAccessToken = $longLivedToken ?: $shortLivedToken;
            $tokenExpiresAt = $longLivedToken ? now()->addDays(60) : now()->addHour();
            $longLivedExchangeFailedAt = $longLivedToken ? null : now();
            if (! $longLivedToken) {
                Log::warning('Instagram OAuth: long-lived token exchange failed; continuing with temporary short-lived token', [
                    'user_id' => $request->user()?->id,
                ]);
            }

            $igAccounts = $metaApiService->fetchInstagramAccountsFromToken($effectiveAccessToken);

            if (empty($igAccounts)) {
                return $this->redirectAfterOauthError($request, 'No Instagram Business Accounts found.');
            }

            $validAccounts = collect($igAccounts)->filter(function ($igAccount) use ($request) {
                if (! is_array($igAccount) || empty($igAccount['ig_id'])) {
                    Log::warning('Instagram OAuth: missing ig_id in account payload', [
                        'user_id' => $request->user()?->id,
                        'payload' => $igAccount,
                    ]);

                    return false;
                }

                return true;
            })->values();

            if ($validAccounts->isEmpty()) {
                return $this->redirectAfterOauthError($request, 'No valid Instagram Business Accounts found.');
            }

            $pendingSelectionPayload = [
                'access_token' => $effectiveAccessToken,
                'token_type' => $tokenType,
                'token_expires_at' => $tokenExpiresAt->toIso8601String(),
                'long_lived_exchange_failed_at' => $longLivedExchangeFailedAt?->toIso8601String(),
                'accounts' => $validAccounts
                    ->map(fn ($account) => [
                        'ig_id' => (string) ($account['ig_id'] ?? ''),
                        'username' => $this->normalizeInstagramUsername($account['username'] ?? null),
                        'page_id' => (string) ($account['page_id'] ?? 'N/A'),
                        'profile_url' => $this->resolveProfileUrl(
                            $account['profile_url'] ?? null,
                            $this->normalizeInstagramUsername($account['username'] ?? null)
                        ),
                        'profile_picture_url' => $this->normalizeOptionalUrl($account['profile_picture_url'] ?? null),
                    ])
                    ->values()
                    ->all(),
            ];
            Cache::put($this->pendingInstagramSelectionCacheKey((int) $request->user()->id), $pendingSelectionPayload, now()->addMinutes(20));

            if ($validAccounts->count() > 1) {
                if ($reconnectAccountId > 0) {
                    $reconnectTarget = InstagramAccount::query()
                        ->where('id', $reconnectAccountId)
                        ->where('user_id', (int) $request->user()->id)
                        ->first(['ig_account_id']);

                    if ($reconnectTarget) {
                        $targetIgId = (string) $reconnectTarget->ig_account_id;
                        $matchedCandidate = collect($pendingSelectionPayload['accounts'])->first(function ($candidate) use ($targetIgId) {
                            return (string) ($candidate['ig_id'] ?? '') === $targetIgId;
                        });

                        if (is_array($matchedCandidate)) {
                            $selectionResult = $this->connectSelectedInstagramAccount(
                                $request->user(),
                                $matchedCandidate,
                                $effectiveAccessToken,
                                $metaApiService,
                                $tokenType,
                                $tokenExpiresAt,
                                $longLivedExchangeFailedAt
                            );

                            Cache::forget($this->pendingInstagramSelectionCacheKey((int) $request->user()->id));

                            if ($selectionResult['status'] === 'blocked') {
                                return $this->redirectAfterOauthError($request, $selectionResult['message']);
                            }

                            if ($selectionResult['status'] === 'warning') {
                                return $this->redirectAfterOauthWarning($request, $selectionResult['message']);
                            }

                            return $this->redirectAfterOauthSuccess($request, $selectionResult['message']);
                        }
                    }
                }

                return redirect()
                    ->route('social-integrations.instagram.select.show')
                    ->with('warning', 'Choose one Instagram account to connect for this OAuth session.');
            }

            $selectionResult = $this->connectSelectedInstagramAccount(
                $request->user(),
                $pendingSelectionPayload['accounts'][0],
                $effectiveAccessToken,
                $metaApiService,
                $tokenType,
                $tokenExpiresAt,
                $longLivedExchangeFailedAt
            );
            Cache::forget($this->pendingInstagramSelectionCacheKey((int) $request->user()->id));

            if ($selectionResult['status'] === 'blocked') {
                return $this->redirectAfterOauthError($request, $selectionResult['message']);
            }

            if ($selectionResult['status'] === 'warning') {
                return $this->redirectAfterOauthWarning($request, $selectionResult['message']);
            }

            return $this->redirectAfterOauthSuccess($request, $selectionResult['message']);
        } catch (\Exception $e) {
            Log::error('Instagram OAuth Error: '.$e->getMessage());

            return $this->redirectAfterOauthError($request, 'Failed to connect to Instagram.');
        }
    }

    /**
     * Show account picker when OAuth returns multiple Instagram candidates.
     */
    public function showInstagramAccountSelection(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $pendingSelection = Cache::get($this->pendingInstagramSelectionCacheKey((int) $user->id));

        if (! is_array($pendingSelection) || empty($pendingSelection['accounts']) || ! is_array($pendingSelection['accounts'])) {
            return $this->redirectAfterOauthError($request, 'Account selection expired. Please connect again.');
        }

        $connectedIgIds = $user->instagramAccounts()
            ->pluck('ig_account_id')
            ->map(fn ($igId) => (string) $igId)
            ->all();

        $candidates = collect($pendingSelection['accounts'])
            ->map(function ($candidate) use ($user, $connectedIgIds) {
                $igAccountId = (string) ($candidate['ig_id'] ?? '');
                $isExisting = in_array($igAccountId, $connectedIgIds, true);
                $canSelect = PlanService::canConnectInstagramAccount($user, $igAccountId);

                return [
                    'ig_account_id' => $igAccountId,
                    'username' => (string) ($candidate['username'] ?? ''),
                    'page_id' => (string) ($candidate['page_id'] ?? 'N/A'),
                    'profile_url' => $this->resolveProfileUrl(
                        $candidate['profile_url'] ?? null,
                        $candidate['username'] ?? null
                    ),
                    'profile_picture_url' => $this->normalizeOptionalUrl($candidate['profile_picture_url'] ?? null),
                    'is_existing' => $isExisting,
                    'can_select' => $canSelect,
                ];
            })
            ->filter(fn ($candidate) => $candidate['ig_account_id'] !== '')
            ->values();

        if ($candidates->isEmpty()) {
            return $this->redirectAfterOauthError($request, 'No valid Instagram Business Accounts found.');
        }

        return Inertia::render('AutoDM/AccountPicker', [
            'candidates' => $candidates->all(),
            'connectedCount' => PlanService::connectedInstagramAccountsCount($user),
            'accountLimit' => PlanService::instagramAccountLimit($user),
            'hasPaidPlan' => PlanService::hasActivePaidPlan($user),
            'activePlanTier' => PlanService::activePlanTier($user),
        ]);
    }

    /**
     * Complete account selection and connect one chosen account.
     */
    public function completeInstagramAccountSelection(Request $request, MetaApiService $metaApiService): RedirectResponse
    {
        $validated = $request->validate([
            'ig_account_id' => 'required|string',
        ]);

        $user = $request->user();
        $pendingSelection = Cache::get($this->pendingInstagramSelectionCacheKey((int) $user->id));

        if (! is_array($pendingSelection) || empty($pendingSelection['accounts']) || ! is_array($pendingSelection['accounts'])) {
            return $this->redirectAfterOauthError($request, 'Account selection expired. Please connect again.');
        }

        $selectedIgId = trim((string) ($validated['ig_account_id'] ?? ''));
        $selectedAccount = collect($pendingSelection['accounts'])->first(function ($candidate) use ($selectedIgId) {
            return (string) ($candidate['ig_id'] ?? '') === $selectedIgId;
        });

        if (! is_array($selectedAccount)) {
            return back()->withErrors(['ig_account_id' => 'Selected account is invalid.']);
        }

        $selectionResult = $this->connectSelectedInstagramAccount(
            $user,
            $selectedAccount,
            (string) ($pendingSelection['access_token'] ?? ''),
            $metaApiService,
            $this->normalizeTokenType((string) ($pendingSelection['token_type'] ?? InstagramAccount::TOKEN_TYPE_LONG_LIVED)),
            $this->parseCachedTimestamp($pendingSelection['token_expires_at'] ?? null),
            $this->parseCachedTimestamp($pendingSelection['long_lived_exchange_failed_at'] ?? null)
        );

        if ($selectionResult['status'] === 'blocked') {
            return back()->withErrors(['ig_account_id' => $selectionResult['message']]);
        }

        Cache::forget($this->pendingInstagramSelectionCacheKey((int) $user->id));

        if ($selectionResult['status'] === 'warning') {
            return $this->redirectAfterOauthWarning($request, $selectionResult['message']);
        }

        return $this->redirectAfterOauthSuccess($request, $selectionResult['message']);
    }

    public function disconnectInstagram(
        Request $request,
        InstagramAccount $instagramAccount,
        InstagramAccountDisconnectService $disconnectService
    ): RedirectResponse {
        if ($instagramAccount->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        $disconnectService->disconnect($instagramAccount);

        return back()->with('success', 'Instagram account disconnected.');
    }

    /**
     * @return array<int, string>
     */
    private function instagramScopes(): array
    {
        return [
            'instagram_business_basic',
            'instagram_business_manage_messages',
            'instagram_business_manage_comments',
            'instagram_business_content_publish',
            'instagram_business_manage_insights',
        ];
    }

    /**
     * @param  array<string, mixed>  $selectedAccount
     * @return array{status: 'success'|'warning'|'blocked', message: string}
     */
    private function connectSelectedInstagramAccount(
        User $user,
        array $selectedAccount,
        string $accessToken,
        MetaApiService $metaApiService,
        string $tokenType = InstagramAccount::TOKEN_TYPE_LONG_LIVED,
        ?Carbon $tokenExpiresAt = null,
        ?Carbon $longLivedExchangeFailedAt = null
    ): array {
        $normalizedAccessToken = trim($accessToken);
        if ($normalizedAccessToken === '') {
            return [
                'status' => 'blocked',
                'message' => 'Failed to connect: missing OAuth access token.',
            ];
        }

        $igAccountId = trim((string) ($selectedAccount['ig_id'] ?? $selectedAccount['ig_account_id'] ?? ''));
        if ($igAccountId === '') {
            return [
                'status' => 'blocked',
                'message' => 'Selected Instagram account is invalid.',
            ];
        }

        if (! PlanService::canConnectInstagramAccount($user, $igAccountId)) {
            $limit = PlanService::instagramAccountLimit($user);
            $limitLabel = $limit > 0 ? (string) $limit : '0';

            return [
                'status' => 'blocked',
                'message' => "You have reached your Instagram account limit ({$limitLabel}). Upgrade to connect more accounts.",
            ];
        }

        $username = $this->normalizeInstagramUsername($selectedAccount['username'] ?? null);
        $profileUrl = $this->resolveProfileUrl($selectedAccount['profile_url'] ?? null, $username);
        $normalizedTokenType = $this->normalizeTokenType($tokenType);
        $resolvedTokenExpiresAt = $tokenExpiresAt ?: (
            $normalizedTokenType === InstagramAccount::TOKEN_TYPE_SHORT_LIVED
            ? now()->addHour()
            : now()->addDays(60)
        );
        $resolvedLongLivedExchangeFailedAt = $normalizedTokenType === InstagramAccount::TOKEN_TYPE_SHORT_LIVED
            ? ($longLivedExchangeFailedAt ?: now())
            : null;

        $account = InstagramAccount::updateOrCreate(
            [
                'user_id' => (int) $user->id,
                'ig_account_id' => $igAccountId,
            ],
            [
                'fb_page_id' => (string) ($selectedAccount['page_id'] ?? 'N/A'),
                'username' => $username,
                'profile_url' => $profileUrl,
                'profile_picture_url' => $this->normalizeOptionalUrl($selectedAccount['profile_picture_url'] ?? null),
                'profile_picture_synced_at' => now(),
                'access_token' => $normalizedAccessToken,
                'token_type' => $normalizedTokenType,
                'status' => 'active',
                'token_expires_at' => $resolvedTokenExpiresAt,
                'long_lived_exchange_failed_at' => $resolvedLongLivedExchangeFailedAt,
            ]
        );
        Cache::forget($this->liveProfilePictureCacheKey((int) $account->id));

        $subscription = $metaApiService->enableWebhookSubscriptions(
            $normalizedAccessToken,
            $igAccountId,
            ['comments', 'messages', 'messaging_postbacks']
        );

        $subscriptionSuccess = (bool) ($subscription['success'] ?? false);
        $subscriptionErrorMessage = is_array($subscription['payload'] ?? null)
            ? ($subscription['payload']['error']['message'] ?? 'subscription_enable_failed')
            : 'subscription_enable_failed';

        $account->update([
            'webhook_subscriptions_status' => $subscriptionSuccess ? 'enabled' : 'failed',
            'webhook_subscriptions_last_synced_at' => now(),
            'webhook_subscriptions_error' => $subscriptionSuccess
                ? null
                : $subscriptionErrorMessage,
        ]);

        Log::info('[SocialIntegrationController] Dispatching lifetime analytics sync job post-OAuth connection', [
            'user_id' => (int) $user->id,
            'instagram_account_id' => (int) $account->id,
            'username' => $account->username,
        ]);

        SyncInstagramAccountAnalyticsJob::dispatch(
            userId: (int) $user->id,
            instagramAccountId: (int) $account->id,
            startDate: null,
            endDate: null,
            lifetime: true
        );

        if ($normalizedTokenType === InstagramAccount::TOKEN_TYPE_SHORT_LIVED) {
            RetryInstagramLongLivedTokenExchangeJob::dispatch((int) $account->id)->delay(now()->addMinutes(5));
        }

        if (! $subscriptionSuccess) {
            return [
                'status' => 'warning',
                'message' => 'Instagram account connected, but webhook subscription failed.',
            ];
        }

        if ($normalizedTokenType === InstagramAccount::TOKEN_TYPE_SHORT_LIVED) {
            return [
                'status' => 'warning',
                'message' => 'Instagram account connected with a temporary token. ScanMySocial will keep trying to secure a long-lived token, but you may need to reconnect soon.',
            ];
        }

        return [
            'status' => 'success',
            'message' => 'Instagram account connected successfully.',
        ];
    }

    private function normalizeTokenType(string $tokenType): string
    {
        return $tokenType === InstagramAccount::TOKEN_TYPE_SHORT_LIVED
            ? InstagramAccount::TOKEN_TYPE_SHORT_LIVED
            : InstagramAccount::TOKEN_TYPE_LONG_LIVED;
    }

    private function parseCachedTimestamp(mixed $value): ?Carbon
    {
        if (! is_scalar($value) || trim((string) $value) === '') {
            return null;
        }

        try {
            return Carbon::parse((string) $value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function pendingInstagramSelectionCacheKey(int $userId): string
    {
        return "social-integrations:instagram:pending-selection:{$userId}";
    }

    private function oauthReturnUrl(Request $request): string
    {
        $returnTo = (string) $request->session()->get('social_integrations_oauth_return_to', '');

        if ($returnTo === 'settings_integration') {
            $frontendBaseUrl = env('FRONTEND_URL', 'http://localhost:3000');

            return rtrim($frontendBaseUrl, '/').'/settings/integrations?status=connected';
        }

        return route('autodm.index');
    }

    private function clearOauthReturnTarget(Request $request): void
    {
        $request->session()->forget('social_integrations_oauth_return_to');
    }

    private function redirectAfterOauthError(Request $request, string $message): RedirectResponse
    {
        $redirectUrl = $this->oauthReturnUrl($request);
        $this->clearOauthReturnTarget($request);

        return redirect()->to($redirectUrl)->withErrors(['error' => $message]);
    }

    private function redirectAfterOauthWarning(Request $request, string $message): RedirectResponse
    {
        $redirectUrl = $this->oauthReturnUrl($request);
        $this->clearOauthReturnTarget($request);

        return redirect()->to($redirectUrl)->with('warning', $message);
    }

    private function redirectAfterOauthSuccess(Request $request, string $message): RedirectResponse
    {
        $redirectUrl = $this->oauthReturnUrl($request);
        $this->clearOauthReturnTarget($request);

        return redirect()->to($redirectUrl)->with('success', $message);
    }

    private function buildInstagramProfileUrl(?string $username): ?string
    {
        if (! $username) {
            return null;
        }

        return 'https://www.instagram.com/'.ltrim((string) $username, '@').'/';
    }

    private function resolveProfileUrl(?string $profileUrl, ?string $username): ?string
    {
        $normalizedProfileUrl = trim((string) $profileUrl);

        if ($normalizedProfileUrl !== '') {
            return $normalizedProfileUrl;
        }

        return $this->buildInstagramProfileUrl($username);
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

    private function normalizeOptionalUrl(?string $url): ?string
    {
        $normalizedUrl = trim((string) $url);

        return $normalizedUrl !== '' ? $normalizedUrl : null;
    }

    private function liveProfilePictureCacheKey(int $instagramAccountId): string
    {
        return "autodm:live-profile-picture-url:{$instagramAccountId}";
    }
}
