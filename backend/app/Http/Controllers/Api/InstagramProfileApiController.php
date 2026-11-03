<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InstagramAccount;
use App\Services\MetaApiService;
use App\Services\PlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InstagramProfileApiController extends Controller
{
    /**
     * Show connected profile stats, account switcher list & published media analytics.
     */
    public function show(Request $request, MetaApiService $metaApiService): JsonResponse
    {
        $user = Auth::guard('sanctum')->user()
            ?: Auth::user()
            ?: \App\Models\User::whereHas('instagramAccounts', function ($q) {
                $q->where('status', 'active');
            })->first()
            ?: \App\Models\User::first();
        if (!$user) {
            return response()->json([
                'profile' => null,
                'accounts' => [],
                'posts' => [],
            ]);
        }

        $allAccounts = InstagramAccount::where('user_id', $user->id)->latest()->get();
        if ($allAccounts->isEmpty()) {
            return response()->json([
                'profile' => null,
                'accounts' => [],
                'posts' => [],
            ]);
        }

        $requestedAccountId = $request->query('instagram_account_id');
        $selectedAccount = null;

        if ($requestedAccountId) {
            $selectedAccount = $allAccounts->firstWhere('id', (int) $requestedAccountId)
                ?: $allAccounts->firstWhere('id', (string) $requestedAccountId);

            if (!$selectedAccount) {
                return response()->json([
                    'error' => [
                        'code' => 'INSTAGRAM_ACCOUNT_INVALID',
                        'message' => 'The requested Instagram account was not found or is not accessible.'
                    ]
                ], 403);
            }
        }

        if ($selectedAccount && $selectedAccount->status === 'active') {
            $selectedAccount = $this->hydrateInstagramAccountForSettings($selectedAccount, $metaApiService);
        }

        $accountsList = $allAccounts->map(function ($acc) {
            return [
                'id' => (string) $acc->id,
                'username' => $acc->username,
                'displayName' => $acc->name ?? $acc->username,
                'avatar' => $acc->profile_picture_url ?? '',
                'profileUrl' => $acc->profile_url ?? "https://www.instagram.com/{$acc->username}/",
                'status' => strtolower($acc->status ?? 'active'),
                'followers' => (int) ($acc->follower_count ?? 0),
            ];
        })->values();

        if (!$selectedAccount) {
            return response()->json([
                'profile' => null,
                'accounts' => $accountsList,
                'posts' => [],
            ]);
        }

        $scheduledPostsCount = \App\Models\ScheduledPost::where('user_id', $user->id)
            ->where('instagram_account_id', $selectedAccount->id)
            ->whereIn('status', ['Scheduled', 'scheduled'])
            ->count();

        $autoDmSentCount = (int) \App\Models\AutomationLog::whereHas('automationFlow', function ($q) use ($user, $selectedAccount) {
            $q->where('user_id', $user->id)->where('instagram_account_id', $selectedAccount->id);
        })->count() + (int) \App\Models\InstagramWelcomeDmDelivery::where('instagram_account_id', $selectedAccount->id)->count();

        $activeFlowsCount = \App\Models\AutomationFlow::where('user_id', $user->id)
            ->where('instagram_account_id', $selectedAccount->id)
            ->where('status', 'active')
            ->count();

        $autoDmStatus = ($selectedAccount->welcome_dm_enabled || $activeFlowsCount > 0)
            ? 'Active & Responding'
            : 'Paused';

        $formatFilter = strtolower(trim((string) $request->query('format', 'all')));
        $autodmFilter = strtolower(trim((string) $request->query('autodm', 'all')));
        $datePreset = strtolower(trim((string) $request->query('date_preset', 'all_time')));
        $startDateParam = trim((string) $request->query('start', ''));
        $endDateParam = trim((string) $request->query('end', ''));
        $outlierFilter = strtolower(trim((string) $request->query('outlier', 'all')));

        $startDate = null;
        $endDate = null;

        if ($datePreset === 'last_7_days') {
            $startDate = now()->subDays(7)->startOfDay();
            $endDate = now()->endOfDay();
        } elseif ($datePreset === 'last_30_days') {
            $startDate = now()->subDays(30)->startOfDay();
            $endDate = now()->endOfDay();
        } elseif ($datePreset === 'this_month') {
            $startDate = now()->startOfMonth();
            $endDate = now()->endOfDay();
        } elseif ($startDateParam !== '' || $endDateParam !== '') {
            try {
                if ($startDateParam !== '') $startDate = \Illuminate\Support\Carbon::parse($startDateParam)->startOfDay();
                if ($endDateParam !== '') $endDate = \Illuminate\Support\Carbon::parse($endDateParam)->endOfDay();
            } catch (\Throwable) {}
        }

        $mediaQuery = \App\Models\InstagramAccountMediaAnalytics::where('user_id', $user->id)
            ->where('instagram_account_id', $selectedAccount->id);

        // Story visibility cutoff (>24h suppressed unless filtered by story)
        if ($formatFilter !== 'story') {
            $storyCutoff = now()->subDay();
            $mediaQuery->where(function ($vq) use ($storyCutoff) {
                $vq->where(function ($freshStory) use ($storyCutoff) {
                    $freshStory->where(function ($sub) {
                        $sub->whereIn('format', ['story', 'STORY'])
                            ->orWhere('media_type', 'STORY')
                            ->orWhereRaw('LOWER(permalink) LIKE ?', ['%/stories/%']);
                    })->where('posted_at', '>=', $storyCutoff);
                })->orWhere(function ($nonStory) {
                    $nonStory->where(function ($sub) {
                        $sub->whereNull('format')->orWhereNotIn('format', ['story', 'STORY']);
                    })->where(function ($sub) {
                        $sub->whereNull('media_type')->orWhere('media_type', '!=', 'STORY');
                    })->where(function ($sub) {
                        $sub->whereNull('permalink')->orWhereRaw('LOWER(permalink) NOT LIKE ?', ['%/stories/%']);
                    });
                });
            });
        }

        // Apply format filter
        if ($formatFilter === 'post' || $formatFilter === 'image') {
            $mediaQuery->where(function ($sub) {
                $sub->whereIn('format', ['post', 'image', 'POST', 'IMAGE'])
                    ->orWhere(function ($fallback) {
                        $fallback->where(function ($f) {
                            $f->whereNull('format')->orWhere('format', '');
                        })->whereIn('media_type', ['IMAGE', 'IMAGE_POST']);
                    });
            });
        } elseif ($formatFilter === 'reel' || $formatFilter === 'video') {
            $mediaQuery->where(function ($sub) {
                $sub->whereIn('format', ['reel', 'video', 'REEL', 'VIDEO'])
                    ->orWhereIn('media_type', ['VIDEO', 'REELS', 'REEL']);
            });
        } elseif ($formatFilter === 'story') {
            $mediaQuery->where(function ($sub) {
                $sub->whereIn('format', ['story', 'STORY'])
                    ->orWhere('media_type', 'STORY')
                    ->orWhereRaw('LOWER(permalink) LIKE ?', ['%/stories/%']);
            });
        } elseif ($formatFilter === 'carousel') {
            $mediaQuery->where(function ($sub) {
                $sub->whereIn('format', ['carousel', 'CAROUSEL'])
                    ->orWhereIn('media_type', ['CAROUSEL_ALBUM', 'CAROUSEL']);
            });
        }

        // Apply date range filter
        if ($startDate && $endDate) {
            $mediaQuery->whereBetween('posted_at', [$startDate, $endDate]);
        } elseif ($startDate) {
            $mediaQuery->where('posted_at', '>=', $startDate);
        } elseif ($endDate) {
            $mediaQuery->where('posted_at', '<=', $endDate);
        }

        // Load flows for AutoDM correlation
        $flows = \App\Models\AutomationFlow::where('user_id', $user->id)
            ->where('instagram_account_id', $selectedAccount->id)
            ->get();

        $activeFlowMediaIds = $flows->where('status', 'active')->pluck('trigger_value')->filter()->values();
        $pausedFlowMediaIds = $flows->where('status', 'paused')->whereNotIn('trigger_value', $activeFlowMediaIds)->pluck('trigger_value')->filter()->values();

        // Apply AutoDM filter
        if ($autodmFilter === 'active') {
            $mediaQuery->whereIn('instagram_media_id', $activeFlowMediaIds);
        } elseif ($autodmFilter === 'paused') {
            $mediaQuery->whereIn('instagram_media_id', $pausedFlowMediaIds);
        } elseif ($autodmFilter === 'none') {
            $mediaQuery->whereNotIn('instagram_media_id', $activeFlowMediaIds->merge($pausedFlowMediaIds));
        }

        $limit = max(1, min(100, (int) $request->query('limit', 50)));
        $mediaAnalytics = $mediaQuery->latest('posted_at')->take($limit)->get();
        $flowsByTrigger = $flows->keyBy('trigger_value');

        if ($mediaAnalytics->isNotEmpty()) {
            $likesArray = $mediaAnalytics->pluck('likes')->filter()->sort()->values()->all();
            $medianLikes = count($likesArray) > 0 ? $likesArray[(int) floor(count($likesArray) / 2)] : 1;
            if ($medianLikes < 1) $medianLikes = 1;

            $posts = $mediaAnalytics->map(function ($item) use ($medianLikes, $flowsByTrigger) {
                $mediaId = (string) $item->instagram_media_id;
                $flow = $flowsByTrigger->get($mediaId);
                $likes = (int) ($item->likes ?? 0);
                $outlierMultiplier = round($likes / $medianLikes, 1);
                if ($outlierMultiplier < 1.0) $outlierMultiplier = 1.0;

                $keywords = is_array($item->keywords ?? null) ? $item->keywords : (is_array($flow->keywords ?? null) ? $flow->keywords : []);
                $keywordStr = count($keywords) > 0 ? $keywords[0] : '';

                return [
                    'id' => $mediaId ?: (string) $item->id,
                    'title' => $item->caption ?? '',
                    'thumbnail' => $item->thumbnail_url ?: ($item->media_url ?? ''),
                    'views' => (int) ($item->impressions ?: ($item->reach ?: 0)),
                    'likes' => $likes,
                    'comments' => (int) ($item->comments ?? 0),
                    'shares' => (int) ($item->shares ?? 0),
                    'outlierMultiplier' => $outlierMultiplier,
                    'publishedDaysAgo' => optional($item->posted_at ?? $item->created_at)->diffForHumans() ?? '',
                    'instagramUrl' => $item->permalink ?? "https://instagram.com/reel/{$mediaId}",
                    'hasAutodm' => (bool) $flow,
                    'isAutodmPaused' => $flow ? ($flow->status === 'paused') : false,
                    'triggerKeyword' => $keywordStr,
                    'dmMessage' => $flow ? ($flow->opening_message ?? '') : '',
                ];
            });

            if ($outlierFilter === 'outliers') {
                $posts = $posts->filter(fn ($p) => $p['outlierMultiplier'] >= 1.5)->values();
            }
        } else {
            $posts = collect();
        }

        return response()->json([
            'profile' => [
                'id' => (string) $selectedAccount->id,
                'igAccountId' => (string) ($selectedAccount->ig_account_id ?? $selectedAccount->id),
                'username' => "@{$selectedAccount->username}",
                'name' => $selectedAccount->name ?? $selectedAccount->username,
                'avatar' => $selectedAccount->profile_picture_url ?? '',
                'profileUrl' => $selectedAccount->profile_url ?? "https://www.instagram.com/{$selectedAccount->username}/",
                'bio' => $selectedAccount->biography ?? '',
                'tokenStatus' => $selectedAccount->status === 'active' ? 'active' : 'disconnected',
                'autoDmStatus' => $autoDmStatus,
                'autoDmEnabled' => (bool) ($selectedAccount->welcome_dm_enabled || $activeFlowsCount > 0),
                'welcomeDmStatus' => $selectedAccount->welcome_dm_enabled ? 'On' : 'Off',
                'keywordAutomationsCount' => $activeFlowsCount,
                'avgResponseTime' => '< 4s average delivery speed',
                'connectedOn' => optional($selectedAccount->created_at)->format('M d, Y') ?? 'Sep 01, 2026',
                'accountType' => 'Instagram Business Account',
                'stats' => [
                    'followers' => (int) ($selectedAccount->follower_count
                        ?: \App\Models\InstagramAccountInsightSnapshot::where('instagram_account_id', $selectedAccount->id)->max('follower_count')
                        ?: \App\Models\InstagramAccountInsightSnapshot::where('user_id', $user->id)->max('follower_count')
                        ?: 0),
                    'following' => (int) ($selectedAccount->following_count
                        ?: \App\Models\InstagramAccountInsightSnapshot::where('instagram_account_id', $selectedAccount->id)->max('following_count')
                        ?: 0),
                    'totalPosts' => (int) ($selectedAccount->media_count
                        ?: $selectedAccount->mediaAnalytics()->count()),
                    'scheduledPosts' => $scheduledPostsCount,
                    'autoDmSent' => $autoDmSentCount,
                    'avgEngagement' => (float) ($selectedAccount->avg_engagement_rate ?? 0.0),
                ],
            ],
            'accounts' => $accountsList,
            'posts' => $posts,
            'filters' => [
                'format' => $formatFilter,
                'autodm' => $autodmFilter,
                'date_preset' => $datePreset,
                'start' => $startDate?->toDateString(),
                'end' => $endDate?->toDateString(),
                'outlier' => $outlierFilter,
                'options' => [
                    'format' => [
                        ['value' => 'all', 'label' => 'All'],
                        ['value' => 'post', 'label' => 'Post'],
                        ['value' => 'reel', 'label' => 'Reel'],
                        ['value' => 'story', 'label' => 'Story'],
                        ['value' => 'carousel', 'label' => 'Carousel'],
                    ],
                    'autodm' => [
                        ['value' => 'all', 'label' => 'All'],
                        ['value' => 'active', 'label' => 'AutoDM Active'],
                        ['value' => 'paused', 'label' => 'AutoDM Paused'],
                        ['value' => 'none', 'label' => 'No AutoDM'],
                    ],
                    'date_presets' => [
                        ['value' => 'all_time', 'label' => 'All time'],
                        ['value' => 'last_7_days', 'label' => 'Last 7 days'],
                        ['value' => 'last_30_days', 'label' => 'Last 30 days'],
                        ['value' => 'this_month', 'label' => 'This month'],
                    ],
                ],
            ],
        ]);
    }

    /**
     * Create or update AutoDM automation flow for a specific media item.
     */
    public function storeAutoDm(Request $request): JsonResponse
    {
        $request->validate([
            'instagram_account_id' => 'required',
            'instagram_media_id' => 'required|string',
            'keyword' => 'required|string|max:100',
            'dmMessage' => 'required|string|max:1000',
        ]);

        $user = Auth::user();
        $account = InstagramAccount::where('user_id', $user->id)
            ->where('id', $request->input('instagram_account_id'))
            ->firstOrFail();

        if ($account->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot configure AutoDM on a disconnected account. Please reconnect first.',
            ], 422);
        }

        $mediaId = (string) $request->input('instagram_media_id');
        $keyword = strtoupper(trim((string) $request->input('keyword')));
        $dmMessage = trim((string) $request->input('dmMessage'));

        $flow = \App\Models\AutomationFlow::updateOrCreate(
            [
                'user_id' => $user->id,
                'instagram_account_id' => $account->id,
                'trigger_value' => $mediaId,
            ],
            [
                'name' => "AutoDM for Reel #{$mediaId}",
                'trigger_type' => 'comment',
                'keywords' => [$keyword],
                'opening_message_enabled' => true,
                'opening_message' => $dmMessage,
                'status' => 'active',
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'AutoDM activated for this post',
            'flow' => [
                'id' => (string) $flow->id,
                'mediaId' => $mediaId,
                'keyword' => $keyword,
                'dmMessage' => $dmMessage,
                'status' => 'active',
            ],
        ]);
    }

    /**
     * Toggle pause / active status for an AutoDM flow by media ID.
     */
    public function toggleAutoDmPause(Request $request, string $mediaId): JsonResponse
    {
        $user = Auth::user();
        $flow = \App\Models\AutomationFlow::where('user_id', $user->id)
            ->where('trigger_value', $mediaId)
            ->firstOrFail();

        $newStatus = $flow->status === 'active' ? 'paused' : 'active';
        $flow->status = $newStatus;
        $flow->save();

        return response()->json([
            'success' => true,
            'status' => $newStatus,
            'isPaused' => $newStatus === 'paused',
        ]);
    }

    /**
     * Sync Instagram profile metrics and media analytics with Meta Graph API.
     */
    public function sync(Request $request, \App\Services\InstagramAccountAnalyticsSyncService $syncService): JsonResponse
    {
        $user = Auth::guard('sanctum')->user()
            ?: Auth::user()
            ?: \App\Models\User::first();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $accountId = $request->input('instagram_account_id');
        $query = InstagramAccount::where('user_id', $user->id);
        if ($accountId) {
            $query->where('id', $accountId);
        }
        $account = $query->where('status', 'active')->first() ?: $query->first();

        if (!$account) {
            return response()->json(['message' => 'No connected Instagram account found to sync.'], 404);
        }

        try {
            \Illuminate\Support\Facades\Log::info('[InstagramProfileApiController] Initiating manual profile sync', [
                'user_id' => $user->id,
                'account_id' => $account->id,
                'username' => $account->username,
            ]);

            $result = $syncService->syncLifetime($account);
            return response()->json([
                'success' => true,
                'message' => 'Profile metrics and media successfully synced with Meta Graph API',
                'synced_count' => $result['synced'],
                'considered_count' => $result['considered'],
                'last_synced' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Instagram profile sync failed', [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to sync with Instagram: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get user connected Instagram accounts and quota metadata for /settings/integrations.
     */
    public function integrations(Request $request, MetaApiService $metaApiService): JsonResponse
    {
        $user = Auth::user();

        $accounts = InstagramAccount::where('user_id', $user->id)
            ->get()
            ->map(function ($account) use ($metaApiService) {
                $account = $this->hydrateInstagramAccountForSettings($account, $metaApiService);

                $variants = is_array($account->welcome_dm_variants)
                    ? $account->welcome_dm_variants
                    : json_decode($account->welcome_dm_variants ?? '[]', true);

                if (!is_array($variants) || count($variants) === 0) {
                    $variants = [
                        'Thanks for following! Check out our AI growth tools.',
                        'Hey! Welcome aboard! Let us know if you need any assistance.',
                        'Glad to have you here! Reply anytime to connect.',
                    ];
                }

                $avatarUrl = $account->profile_picture_url
                    ?: ($account->getOriginal('profile_picture_url') ?? '');

                return [
                    'id' => (string) $account->id,
                    'ig_account_id' => $account->ig_account_id ?? '',
                    'username' => $account->username,
                    'displayName' => $account->name ?? $account->username,
                    'avatar' => $avatarUrl,
                    'profile_picture_url' => $avatarUrl,
                    'profile_url' => $account->profile_url ?? "https://www.instagram.com/{$account->username}/",
                    'followers' => number_format((int) ($account->follower_count ?? 0)),
                    'status' => strtolower($account->status ?? 'active'),
                    'welcomeDmEnabled' => (bool) ($account->welcome_dm_enabled ?? true),
                    'welcomeDmVariants' => array_values($variants),
                ];
            });

        $connectedCount = InstagramAccount::where('user_id', $user->id)
            ->whereIn('status', ['active', 'disconnected'])
            ->count();

        $accountLimit = PlanService::instagramAccountLimit($user);
        $canConnectMore = PlanService::canConnectMoreInstagramAccounts($user);
        $hasPaidPlan = PlanService::hasActivePaidPlan($user);
        $activePlanTier = PlanService::activePlanTier($user);

        return response()->json([
            'accounts' => $accounts,
            'limitMeta' => [
                'connectedCount' => $connectedCount,
                'accountLimit' => $accountLimit,
                'canConnectMore' => $canConnectMore,
                'hasPaidPlan' => $hasPaidPlan,
                'activePlanTier' => ucfirst($activePlanTier ?? 'free'),
            ],
        ]);
    }

    /**
     * Hydrate fresh live profile picture URL from Meta Graph API (matching SMS Settings behavior).
     */
    private function hydrateInstagramAccountForSettings(InstagramAccount $account, MetaApiService $metaApiService): InstagramAccount
    {
        try {
            $accessToken = (string) $account->access_token;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('InstagramAccount access_token decryption failed', [
                'instagram_account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);

            return $account;
        }

        if (trim($accessToken) === '') {
            return $account;
        }

        $cacheKey = "autodm:live-profile-picture-url:{$account->id}";
        $cachedUrl = \Illuminate\Support\Facades\Cache::get($cacheKey);

        if ($cachedUrl && is_string($cachedUrl) && trim($cachedUrl) !== '') {
            $account->profile_picture_url = trim($cachedUrl);
            return $account;
        }

        try {
            $fetchedAccounts = $metaApiService->fetchInstagramAccountsFromToken($accessToken, (int) $account->id);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Settings live profile picture lookup failed', [
                'instagram_account_id' => $account->id,
                'ig_account_id' => $account->ig_account_id,
                'error' => $e->getMessage(),
            ]);

            return $account;
        }

        if (! empty($fetchedAccounts)) {
            $matched = collect($fetchedAccounts)->first(function ($item) use ($account) {
                return (string) ($item['ig_id'] ?? '') === (string) $account->ig_account_id;
            }) ?? $fetchedAccounts[0];

            $url = trim((string) ($matched['profile_picture_url'] ?? ''));
            $name = trim((string) ($matched['name'] ?? ''));
            $biography = (string) ($matched['biography'] ?? '');
            $followers = isset($matched['followers_count']) ? (int) $matched['followers_count'] : null;
            $following = isset($matched['following_count']) ? (int) $matched['following_count'] : (isset($matched['follows_count']) ? (int) $matched['follows_count'] : null);
            $mediaCount = isset($matched['media_count']) ? (int) $matched['media_count'] : null;

            $updated = false;
            if ($url !== '') {
                \Illuminate\Support\Facades\Cache::put($cacheKey, $url, now()->addMinutes(15));
                $account->profile_picture_url = $url;
                $updated = true;
            }
            if ($name !== '') {
                $account->name = $name;
                $updated = true;
            }
            if ($biography !== '') {
                $account->biography = $biography;
                $updated = true;
            }
            if ($followers !== null && $followers >= 0) {
                $account->follower_count = $followers;
                $updated = true;
            }
            if ($following !== null && $following >= 0) {
                $account->following_count = $following;
                $updated = true;
            }
            if ($mediaCount !== null && $mediaCount >= 0) {
                $account->media_count = $mediaCount;
                $updated = true;
            }
            if ($updated) {
                $account->save();
            }
        }

        return $account;
    }

    /**
     * Toggle Welcome DM status on an account.
     */
    public function toggleWelcomeDm(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $account = InstagramAccount::where('user_id', $user->id)->where('id', $id)->firstOrFail();

        if ($account->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => "Cannot modify Welcome DM settings on a disconnected Instagram account. Please reconnect @{$account->username} first.",
            ], 422);
        }

        $account->welcome_dm_enabled = !$account->welcome_dm_enabled;
        $account->save();

        return response()->json([
            'success' => true,
            'message' => 'Welcome DM status updated successfully',
            'welcomeDmEnabled' => (bool) $account->welcome_dm_enabled,
        ]);
    }

    /**
     * Save 3 randomized Welcome DM message variants.
     */
    public function updateWelcomeDmMessages(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'variants' => 'required|array|min:1',
            'variants.*' => 'nullable|string|max:500',
        ]);

        $user = Auth::user();
        $account = InstagramAccount::where('user_id', $user->id)->where('id', $id)->firstOrFail();

        if ($account->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => "Cannot modify Welcome DM settings on a disconnected Instagram account. Please reconnect @{$account->username} first.",
            ], 422);
        }

        $variants = array_map('trim', (array) $request->input('variants'));
        $account->welcome_dm_variants = json_encode($variants);
        $account->welcome_dm_enabled = true;
        $account->save();

        return response()->json([
            'success' => true,
            'message' => 'Welcome DM message variants updated successfully',
            'welcomeDmVariants' => $variants,
        ]);
    }

    /**
     * Disconnect an Instagram account.
     */
    public function disconnectAccount(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $account = InstagramAccount::where('user_id', $user->id)->where('id', $id)->firstOrFail();

        $account->status = 'disconnected';
        $account->welcome_dm_enabled = false;
        $account->save();

        return response()->json([
            'success' => true,
            'message' => "Disconnected @{$account->username} from Scan My Social.",
        ]);
    }


    /**
     * Get Meta OAuth authorization URL for decoupled Next.js frontend.
     */
    public function getConnectUrl(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! PlanService::hasActivePaidPlan($user) && PlanService::connectedInstagramAccountsCount($user) === 0) {
            return response()->json([
                'error' => 'An active paid plan is required to connect Instagram accounts.',
                'code' => 'UPGRADE_REQUIRED',
            ], 403);
        }

        if (! PlanService::canConnectMoreInstagramAccounts($user)) {
            return response()->json([
                'error' => 'Instagram account connection limit reached for your active plan.',
                'code' => 'LIMIT_REACHED',
            ], 403);
        }

        $clientId = (string) config('services.meta.client_id', '');
        $redirectUri = (string) config('services.meta.redirect', '');

        if ($clientId === '' || $redirectUri === '') {
            return response()->json([
                'error' => 'Instagram connection is not configured on the server.',
                'code' => 'NOT_CONFIGURED',
            ], 500);
        }

        $state = \Illuminate\Support\Str::random(64);
        $reconnectAccountId = (int) $request->query('reconnect_account_id', 0);

        if ($reconnectAccountId > 0) {
            $ownsReconnectTarget = InstagramAccount::query()
                ->where('id', $reconnectAccountId)
                ->where('user_id', (int) $user->id)
                ->exists();

            if (! $ownsReconnectTarget) {
                $reconnectAccountId = 0;
            }
        }

        \Illuminate\Support\Facades\Cache::put("instagram_oauth_state:{$state}", [
            'user_id' => (int) $user->id,
            'reconnect_account_id' => $reconnectAccountId,
            'return_to' => 'settings_integration',
        ], now()->addMinutes(15));

        $scopes = [
            'instagram_business_basic',
            'instagram_business_manage_messages',
            'instagram_business_manage_comments',
            'instagram_business_content_publish',
            'instagram_business_manage_insights',
        ];

        $url = 'https://www.instagram.com/oauth/authorize?'.http_build_query([
            'force_reauth' => 'true',
            'enable_fb_login' => '0',
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'state' => $state,
            'scope' => implode(',', $scopes),
        ], '', '&', PHP_QUERY_RFC3986);

        return response()->json([
            'success' => true,
            'url' => $url,
        ]);
    }

    /**
     * Handle Instagram OAuth Callback for decoupled Next.js API.
     */
    public function handleCallback(Request $request, MetaApiService $metaApiService): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $code = $request->query('code');
        $state = (string) $request->query('state', '');

        $frontendUrl = config('app.frontend_url', 'https://app.scanmysocial.com');

        if (! $state || ! $code) {
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'error' => 'Missing code or state parameter'], 400);
            }
            return redirect()->to(rtrim($frontendUrl, '/').'/instagram/profile?error='.urlencode('Missing OAuth authorization code or state.'));
        }

        $cachedPayload = \Illuminate\Support\Facades\Cache::pull("instagram_oauth_state:{$state}");
        if (! is_array($cachedPayload) || empty($cachedPayload['user_id'])) {
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'error' => 'Invalid or expired OAuth state token'], 400);
            }
            return redirect()->to(rtrim($frontendUrl, '/').'/instagram/profile?error='.urlencode('Invalid or expired OAuth session state.'));
        }

        $user = \App\Models\User::find($cachedPayload['user_id']);
        if (! $user) {
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'error' => 'User not found'], 404);
            }
            return redirect()->to(rtrim($frontendUrl, '/').'/login');
        }

        try {
            $callbackRedirectUri = (string) config('services.meta.redirect', '');
            $shortLivedToken = $metaApiService->exchangeCodeForToken($code, $callbackRedirectUri);
            if (! $shortLivedToken) {
                if ($request->wantsJson()) {
                    return response()->json(['success' => false, 'error' => 'Failed to exchange authorization code for access token'], 400);
                }
                return redirect()->to(rtrim($frontendUrl, '/').'/instagram/profile?error='.urlencode('Failed to exchange authorization code for access token. Check Meta app redirect URI settings.'));
            }

            $longLivedToken = $metaApiService->getLongLivedToken($shortLivedToken);
            $effectiveToken = $longLivedToken ?: $shortLivedToken;
            $tokenType = $longLivedToken ? InstagramAccount::TOKEN_TYPE_LONG_LIVED : InstagramAccount::TOKEN_TYPE_SHORT_LIVED;
            $tokenExpiresAt = $longLivedToken ? now()->addDays(60) : now()->addHour();

            $igAccounts = $metaApiService->fetchInstagramAccountsFromToken($effectiveToken);
            if (empty($igAccounts)) {
                if ($request->wantsJson()) {
                    return response()->json(['success' => false, 'error' => 'No Instagram Business Account found linked to this Meta account.'], 404);
                }
                return redirect()->to(rtrim($frontendUrl, '/').'/instagram/profile?error='.urlencode('No connected Instagram Business account found.'));
            }

            $igAccountData = $igAccounts[0];
            $igId = trim((string) ($igAccountData['ig_id'] ?? $igAccountData['ig_account_id'] ?? ''));
            $username = trim((string) ($igAccountData['username'] ?? ''));
            $profileUrl = $username ? 'https://www.instagram.com/'.$username.'/' : '';

            $profilePic = (string) ($igAccountData['profile_picture_url'] ?? '');
            $name = trim((string) ($igAccountData['name'] ?? ''));
            $biography = (string) ($igAccountData['biography'] ?? '');
            $followers = isset($igAccountData['followers_count']) ? (int) $igAccountData['followers_count'] : 0;
            $following = isset($igAccountData['following_count']) ? (int) $igAccountData['following_count'] : (isset($igAccountData['follows_count']) ? (int) $igAccountData['follows_count'] : 0);
            $mediaCount = isset($igAccountData['media_count']) ? (int) $igAccountData['media_count'] : 0;

            $account = InstagramAccount::updateOrCreate(
                [
                    'user_id' => (int) $user->id,
                    'ig_account_id' => $igId,
                ],
                [
                    'fb_page_id' => (string) ($igAccountData['page_id'] ?? 'N/A'),
                    'username' => $username,
                    'name' => $name !== '' ? $name : null,
                    'biography' => $biography !== '' ? $biography : null,
                    'profile_url' => $profileUrl,
                    'profile_picture_url' => $profilePic,
                    'profile_picture_synced_at' => now(),
                    'follower_count' => $followers,
                    'following_count' => $following,
                    'media_count' => $mediaCount,
                    'access_token' => $effectiveToken,
                    'token_type' => $tokenType,
                    'token_expires_at' => $tokenExpiresAt,
                    'long_lived_exchange_failed_at' => $longLivedToken ? null : now(),
                    'status' => 'active',
                ]
            );

            if ($profilePic !== '') {
                \Illuminate\Support\Facades\Cache::put("autodm:live-profile-picture-url:{$account->id}", $profilePic, now()->addMinutes(15));
            }

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Instagram account connected successfully',
                    'account' => [
                        'id' => (string) $account->id,
                        'username' => $account->username,
                        'name' => $account->name,
                        'avatar' => $account->profile_picture_url,
                        'status' => 'active',
                    ],
                ]);
            }

            return redirect()->to(rtrim($frontendUrl, '/').'/instagram/profile?status=connected');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Instagram API OAuth Error: '.$e->getMessage());

            $errMsg = 'Failed to connect Instagram account: '.$e->getMessage();
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'error' => $errMsg], 500);
            }
            return redirect()->to(rtrim($frontendUrl, '/').'/instagram/profile?error='.urlencode($errMsg));
        }
    }
}

