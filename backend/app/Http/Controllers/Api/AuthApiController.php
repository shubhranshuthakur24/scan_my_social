<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InstagramAccount;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class AuthApiController extends Controller
{
    /**
     * Register a new user and return Sanctum access token.
     */
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar_url ?? '',
                'role' => $user->role ?? 'User',
            ],
            'token' => $token,
            'isAuthenticated' => true,
        ], 201);
    }

    /**
     * Get active user session & connected Meta Instagram account status.
     */
    public function me(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'user' => null,
                'instagramAccount' => null,
                'isAuthenticated' => false,
            ]);
        }

        $instagramAccount = null;
        $account = InstagramAccount::where('user_id', $user->id)
            ->where('status', 'active')
            ->latest()
            ->first();

        if ($account) {
            $instagramAccount = [
                'id' => (string) $account->id,
                'username' => $account->username ?? '',
                'name' => $account->name ?? '',
                'profilePictureUrl' => $account->profile_picture_url ?? '',
                'followerCount' => (int) ($account->follower_count ?? 0),
                'tokenStatus' => $account->status === 'active' ? 'active' : 'expired',
                'tokenExpiresAt' => optional($account->token_expires_at)->toIso8601String(),
                'autoDmActiveCount' => 0,
                'avgEngagementRate' => 0.0,
            ];
        }

        return response()->json([
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'bio' => $user->bio ?? '',
                'avatar' => $user->avatar_url ?? '',
                'role' => $user->role ?? 'User',
            ],
            'instagramAccount' => $instagramAccount,
            'isAuthenticated' => true,
        ]);
    }

    /**
     * Authenticate user session & return Sanctum access token.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'user' => [
                    'id' => (string) $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar_url ?? '',
                    'role' => $user->role ?? 'User',
                ],
                'token' => $token,
                'isAuthenticated' => true,
            ]);
        }

        return response()->json(['error' => 'Invalid email or password'], 401);
    }

    /**
     * Revoke active user Sanctum token.
     */
    public function logout(Request $request): JsonResponse
    {
        $user = Auth::user();
        if ($user) {
            $user->currentAccessToken()?->delete();
        }

        return response()->json(['success' => true, 'message' => 'Logged out successfully']);
    }

    /**
     * Get Meta Facebook OAuth redirect URL.
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
}
