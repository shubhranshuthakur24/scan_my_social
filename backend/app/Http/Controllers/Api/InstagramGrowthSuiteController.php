<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InstagramGrowthSuiteController extends Controller
{
    /**
     * Auth Session API - Get active user & Meta token status.
     */
    public function me(): JsonResponse
    {
        return response()->json([
            'user' => [
                'id' => 'usr_alex_johnson',
                'name' => 'Alex Johnson',
                'email' => 'alex@viralyzer.io',
                'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                'role' => 'Creator Pro',
            ],
            'instagramAccount' => [
                'id' => 'ig_alexjohnson_growth',
                'username' => 'alexjohnson_growth',
                'name' => 'Alex Johnson | Creator Systems',
                'profilePictureUrl' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                'followerCount' => 142800,
                'tokenStatus' => 'active',
                'tokenExpiresAt' => '2026-11-30T23:59:59Z',
                'autoDmActiveCount' => 4820,
                'avgEngagementRate' => 5.4,
            ],
            'isAuthenticated' => true,
        ]);
    }

    /**
     * Auth Login API.
     */
    public function login(Request $request): JsonResponse
    {
        $email = $request->input('email', 'alex@viralyzer.io');
        return response()->json([
            'user' => [
                'id' => 'usr_alex_johnson',
                'name' => explode('@', $email)[0],
                'email' => $email,
                'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                'role' => 'Creator Pro',
            ],
            'instagramAccount' => [
                'id' => 'ig_alexjohnson_growth',
                'username' => 'alexjohnson_growth',
                'name' => 'Alex Johnson | Creator Systems',
                'profilePictureUrl' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                'followerCount' => 142800,
                'tokenStatus' => 'active',
                'tokenExpiresAt' => '2026-11-30T23:59:59Z',
                'autoDmActiveCount' => 4820,
                'avgEngagementRate' => 5.4,
            ],
            'isAuthenticated' => true,
        ]);
    }

    /**
     * Auth Logout API.
     */
    public function logout(): JsonResponse
    {
        return response()->json(['success' => true, 'message' => 'Logged out successfully']);
    }

    /**
     * Get Meta OAuth Redirect URL.
     */
    public function instagramRedirect(): JsonResponse
    {
        $appId = config('services.facebook.client_id', '123456789012345');
        $redirectUri = urlencode(url('/api/v1/auth/instagram/callback'));
        $scope = urlencode('instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_messages');

        return response()->json([
            'url' => "https://www.facebook.com/v19.0/dialog/oauth?client_id={$appId}&redirect_uri={$redirectUri}&scope={$scope}&response_type=code",
            'appId' => $appId,
            'status' => 'ready',
        ]);
    }

    /**
     * My Profile API - Creator stats & outlier posts.
     */
    public function profile(): JsonResponse
    {
        return response()->json([
            'profile' => [
                'username' => '@alexjohnson_growth',
                'name' => 'Alex Johnson',
                'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                'bio' => 'AI growth architect & content systems specialist. Helping modern creators scale to 100k+ with automated workflows.',
                'tokenStatus' => 'active',
                'autoDmStatus' => 'Active & Responding',
                'avgResponseTime' => '< 4s average delivery speed',
                'stats' => [
                    'followers' => 142800,
                    'scheduledPosts' => 6,
                    'autoDmSent' => 4820,
                    'avgEngagement' => 5.4,
                ],
            ],
            'posts' => [
                [
                    'id' => 'p1',
                    'title' => 'How I Scaled My IG to 100k in 90 Days',
                    'thumbnail' => 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
                    'views' => 482000,
                    'outlierMultiplier' => 4.2,
                    'likes' => 38400,
                    'comments' => 2940,
                    'shares' => 14200,
                    'publishedDaysAgo' => '3 days ago',
                ],
                [
                    'id' => 'p2',
                    'title' => 'Top 5 AI Tools for Creators in 2026',
                    'thumbnail' => 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
                    'views' => 310000,
                    'outlierMultiplier' => 2.8,
                    'likes' => 24100,
                    'comments' => 1840,
                    'shares' => 8900,
                    'publishedDaysAgo' => '1 week ago',
                ],
            ],
        ]);
    }

    /**
     * Profile Meta Sync Trigger API.
     */
    public function syncProfile(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Meta Graph API metrics synchronized',
            'lastSynced' => now()->toIso8601String(),
        ]);
    }

    /**
     * Publishing Calendar API.
     */
    public function calendar(): JsonResponse
    {
        $now = now();
        return response()->json([
            [
                'id' => 'cal-1',
                'caption' => 'Mastering AI Content Automation in 2026 🚀',
                'mediaUrl' => 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
                'format' => 'REEL',
                'scheduledTime' => $now->addDay()->toIso8601String(),
                'status' => 'Scheduled',
                'hashtags' => ['#AIGrowth', '#CreatorEconomy', '#ViralHooks'],
            ],
            [
                'id' => 'cal-2',
                'caption' => '3 Carousel Templates that Drive 10k+ Leads 💡',
                'mediaUrl' => 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
                'format' => 'CAROUSEL',
                'scheduledTime' => $now->addDays(2)->toIso8601String(),
                'status' => 'Scheduled',
                'hashtags' => ['#CarouselDesign', '#LeadGen'],
            ],
        ]);
    }

    /**
     * Content Scheduler API - List queue.
     */
    public function schedulerQueue(): JsonResponse
    {
        return $this->calendar();
    }

    /**
     * Content Scheduler API - Create scheduled post.
     */
    public function createScheduledPost(Request $request): JsonResponse
    {
        $post = [
            'id' => 'sch-' . time(),
            'caption' => $request->input('caption', ''),
            'mediaUrl' => $request->input('mediaUrl', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'),
            'format' => $request->input('format', 'REEL'),
            'scheduledTime' => $request->input('scheduledTime', now()->toIso8601String()),
            'status' => 'Scheduled',
            'hashtags' => $request->input('hashtags', []),
        ];

        return response()->json($post, 201);
    }

    /**
     * Preset Hashtags API.
     */
    public function hashtags(): JsonResponse
    {
        return response()->json([
            [
                'category' => 'Growth & Scaling',
                'tags' => ['#AIGrowth', '#CreatorEconomy', '#ViralHooks', '#SocialMediaSystems', '#Solopreneur'],
            ],
            [
                'category' => 'Tech & AI',
                'tags' => ['#ArtificialIntelligence', '#ChatGPT', '#AutomationTools', '#FutureOfWork', '#TechCreators'],
            ],
        ]);
    }

    /**
     * AutoDM Campaign API - List campaigns.
     */
    public function autoDmCampaigns(): JsonResponse
    {
        return response()->json([
            [
                'id' => 'adm-1',
                'keyword' => 'PROMPT',
                'triggerType' => 'Exact Match',
                'dmsSent' => 3420,
                'conversionRate' => 48.2,
                'status' => 'Active',
                'createdAt' => '2026-09-01T10:00:00Z',
                'primaryDmMessage' => 'Hey! Here is your exclusive AI Prompt Vault access link 🚀',
                'followGateRequired' => true,
                'followUpDelayMinutes' => 5,
            ],
            [
                'id' => 'adm-2',
                'keyword' => 'VIRAL',
                'triggerType' => 'Contains Keyword',
                'dmsSent' => 1400,
                'conversionRate' => 36.5,
                'status' => 'Active',
                'createdAt' => '2026-09-05T14:30:00Z',
                'primaryDmMessage' => 'Thanks for watching! Grab the 5 viral hooks breakdown here 📈',
                'followGateRequired' => false,
                'followUpDelayMinutes' => 0,
            ],
        ]);
    }

    /**
     * AutoDM Campaign API - Create campaign.
     */
    public function createAutoDmCampaign(Request $request): JsonResponse
    {
        $campaign = [
            'id' => 'adm-' . time(),
            'keyword' => strtoupper($request->input('keyword', 'KEYWORD')),
            'triggerType' => $request->input('triggerType', 'Exact Match'),
            'dmsSent' => 0,
            'conversionRate' => 0,
            'status' => 'Active',
            'createdAt' => now()->toIso8601String(),
            'primaryDmMessage' => $request->input('primaryDmMessage', ''),
            'followGateRequired' => $request->input('followGateRequired', true),
            'followUpDelayMinutes' => $request->input('followUpDelayMinutes', 5),
        ];

        return response()->json($campaign, 201);
    }

    /**
     * AutoDM Campaign API - Toggle active status.
     */
    public function updateAutoDmCampaign(Request $request, string $id): JsonResponse
    {
        return response()->json([
            'id' => $id,
            'success' => true,
            'status' => $request->input('status', 'Active'),
            'updatedAt' => now()->toIso8601String(),
        ]);
    }

    /**
     * Meta Instagram Webhook Verification Handshake (GET).
     */
    public function verifyWebhook(Request $request)
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        $verifyToken = config('services.meta.verify_token', 'viralyzer_meta_secret');

        if ($mode === 'subscribe' && $token === $verifyToken) {
            return response($challenge, 200);
        }

        return response()->json(['error' => 'Forbidden - Invalid verify token'], 403);
    }

    /**
     * Meta Instagram Webhook Realtime Event Listener (POST).
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        \Log::info("Meta Webhook Received in Laravel api/ app", $payload);

        return response()->json(['status' => 'EVENT_RECEIVED'], 200);
    }

    /**
     * Analytics API.
     */
    public function analytics(): JsonResponse
    {
        return response()->json([
            'followerVelocity' => [
                ['date' => 'Sep 07', 'followers' => 138200],
                ['date' => 'Sep 09', 'followers' => 140500],
                ['date' => 'Sep 11', 'followers' => 141900],
                ['date' => 'Sep 13', 'followers' => 142800],
            ],
            'reachVelocity' => [
                ['date' => 'Sep 07', 'impressions' => 45000],
                ['date' => 'Sep 09', 'impressions' => 72000],
                ['date' => 'Sep 11', 'impressions' => 98000],
                ['date' => 'Sep 13', 'impressions' => 125000],
            ],
            'topPerformingReels' => [],
            'autoDmConversionRate' => 48.2,
            'totalAutomationsTriggered' => 4820,
            'avgOutlierScore' => 3.4,
        ]);
    }
}
