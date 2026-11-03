<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Referral;
use App\Models\User;
use App\Services\LinkPageUsernameService;
use GuzzleHttp\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    /**
     * Redirect the user to Google's OAuth page.
     */
    public function redirect()
    {
        return Socialite::driver('google')
            ->scopes(['openid', 'email', 'profile'])
            ->with(['prompt' => 'select_account'])
            ->redirect();
    }

    /**
     * Handle the callback from Google.
     */
    public function callback()
    {
        try {
            if (app()->environment('local')) {
                $httpClient = new Client(['verify' => false]);
                Socialite::driver('google')->setHttpClient($httpClient);
            }
            $googleUser = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            Log::error('Google Auth Failed: '.$e->getMessage());

            return redirect()->route('login')->withErrors([
                'email' => 'Google authentication failed. Please try again.',
            ]);
        }

        // 1. Find by google_id
        $user = User::where('google_id', $googleUser->getId())->first();

        if ($user) {
            // Update token in case it changed
            if (! $user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }
            $updates = ['google_token' => $googleUser->token];
            if (! $user->username) {
                $updates['username'] = app(LinkPageUsernameService::class)->generate($user->name, (int) $user->id);
            }
            $user->update($updates);
            Auth::login($user);
            session()->regenerate();

            return $this->redirectToDashboardWithReferralCookieCleanup();
        }

        // 2. Find by email   link the Google account
        $user = User::where('email', $googleUser->getEmail())->first();

        if ($user) {
            if (! $user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }
            $updates = [
                'google_id' => $googleUser->getId(),
                'google_token' => $googleUser->token,
            ];
            if (! $user->username) {
                $updates['username'] = app(LinkPageUsernameService::class)->generate($user->name, (int) $user->id);
            }
            $user->update($updates);
            Auth::login($user);
            session()->regenerate();

            return $this->redirectToDashboardWithReferralCookieCleanup();
        }

        // 3. Create a brand-new user from Google data
        $user = DB::transaction(function () use ($googleUser): User {
            $usernameService = app(LinkPageUsernameService::class);

            $newUser = User::query()->create([
                'name' => $googleUser->getName(),
                'username' => $usernameService->generate((string) $googleUser->getName()),
                'email' => $googleUser->getEmail(),
                'google_id' => $googleUser->getId(),
                'google_token' => $googleUser->token,
            ]);

            $newUser->forceFill(['email_verified_at' => now()])->save();

            if (request()->hasCookie('sms_referral_code')) {
                $code = request()->cookie('sms_referral_code');
                if (is_string($code)) {
                    $referralCode = strtoupper(trim($code));
                    if ($referralCode !== '') {
                        $referrer = User::query()
                            ->where('affiliate_code', $referralCode)
                            ->first();
                        $referralType = 'affiliate';

                        if (! $referrer) {
                            $referrer = User::query()
                                ->where('referral_code', $referralCode)
                                ->first();
                            $referralType = 'referral';
                        }

                        if ($referrer && $referrer->id !== $newUser->id) {
                            $newUser->referred_by_id = $referrer->id;
                            $newUser->save();

                            Referral::query()->create([
                                'referrer_id' => $referrer->id,
                                'referee_id' => $newUser->id,
                                'status' => 'captured',
                                'type' => $referralType,
                                'is_recurring' => $referralType === 'affiliate' && $referrer->affiliate_status === 'approved',
                            ]);
                        }
                    }
                }
            }

            return $newUser;
        });

        Auth::login($user);
        session()->regenerate();

        return $this->redirectToDashboardWithReferralCookieCleanup();
    }

    private function redirectToDashboardWithReferralCookieCleanup(): RedirectResponse
    {
        $response = redirect()->intended(route('dashboard'));

        if (request()->hasCookie('sms_referral_code')) {
            $response->withCookie(cookie()->forget('sms_referral_code'));
        }

        return $response;
    }
}
