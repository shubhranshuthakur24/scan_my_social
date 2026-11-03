<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class EmailVerificationNotificationController extends Controller
{
    /**
     * Send a new email verification notification.
     */
    public function store(Request $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        $cooldownSeconds = 60;
        $key = 'verification-resend:'.(string) $request->user()->id;

        if (RateLimiter::tooManyAttempts($key, 1)) {
            $seconds = RateLimiter::availableIn($key);

            return back()
                ->with('error', "Please wait {$seconds} seconds before requesting another verification email.")
                ->with('verification_resend_wait_seconds', $seconds);
        }

        RateLimiter::hit($key, $cooldownSeconds);
        $request->user()->sendEmailVerificationNotification();

        return back()
            ->with('status', 'verification-link-sent')
            ->with('verification_resend_wait_seconds', $cooldownSeconds);
    }
}
