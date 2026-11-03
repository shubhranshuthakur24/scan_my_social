<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Middleware\CaptureAttributionMiddleware;
use App\Models\Referral;
use App\Models\User;
use App\Models\UserAttribution;
use App\Services\LinkPageUsernameService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => [
                'required',
                'confirmed',
                Rules\Password::min(8)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
            'referral_code_present' => ['nullable', 'boolean'],
            'referral_code' => ['nullable', 'string'],
        ]);

        $user = DB::transaction(function () use ($request): User {
            $usernameService = app(LinkPageUsernameService::class);

            $newUser = User::create([
                'name' => $request->name,
                'username' => $usernameService->generate((string) $request->name),
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);

            $isReferralFieldPresent = $request->boolean('referral_code_present');
            $rawReferralCode = $isReferralFieldPresent
                ? (string) $request->input('referral_code', '')
                : (string) $request->cookie('sms_referral_code', '');
            $referralCode = strtoupper(trim($rawReferralCode));

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

            $attribution = CaptureAttributionMiddleware::attributionFromRequest($request);

            if ($attribution !== []) {
                UserAttribution::query()->create([
                    ...$attribution,
                    'user_id' => $newUser->id,
                ]);
            }

            return $newUser;
        });

        event(new Registered($user));

        Auth::login($user);

        $response = redirect(route('dashboard', absolute: false));

        if ($request->hasCookie('sms_referral_code')) {
            $response->withCookie(cookie()->forget('sms_referral_code'));
        }

        if ($request->session()->has(CaptureAttributionMiddleware::SESSION_KEY)
            || $request->hasCookie(CaptureAttributionMiddleware::COOKIE_NAME)) {
            $request->session()->forget(CaptureAttributionMiddleware::SESSION_KEY);
            $response->withCookie(CaptureAttributionMiddleware::forgetCookie());
        }

        return $response;
    }
}
