<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\PasswordChangedMail;
use App\Mail\PasswordSetupFromGoogleMail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rules\Password;

class PasswordController extends Controller
{
    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        $hadPasswordBeforeUpdate = ! is_null($user->password);

        $rules = [
            'password' => ['required', Password::defaults(), 'confirmed'],
        ];

        if ($hadPasswordBeforeUpdate) {
            $rules['current_password'] = ['required', 'current_password'];
        }

        $validated = $request->validate($rules);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        if ($hadPasswordBeforeUpdate) {
            Mail::to($user->email)->queue(new PasswordChangedMail($user));
        } else {
            Mail::to($user->email)->queue(new PasswordSetupFromGoogleMail($user));
        }

        return back();
    }
}
