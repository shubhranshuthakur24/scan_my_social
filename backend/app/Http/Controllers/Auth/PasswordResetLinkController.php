<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // Silently skip sending reset link for Google-only accounts
        // without revealing account type to prevent user enumeration
        $user = User::where('email', $request->email)->first();

        if ($user && $user->google_id && is_null($user->password)) {
            return back()->with('status', __(Password::RESET_LINK_SENT));
        }

        Password::sendResetLink($request->only('email'));

        // Return a generic success status for both existing and non-existing emails
        // to avoid account enumeration via response differences.
        return back()->with('status', __(Password::RESET_LINK_SENT));
    }
}
