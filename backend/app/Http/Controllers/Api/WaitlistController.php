<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Waitlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaitlistController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(
            [
                'email' => [
                    'required',
                    'email',
                    'max:255',
                ],
            ],
            [
                'email.required' => 'Email is required.',
                'email.email' => 'Please enter a valid email address.',
            ]
        );

        $email = strtolower($validated['email']);
        $existing = Waitlist::where('email', $email)->first();

        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => 'Thanks, you are already on the list',
            ], 200);
        }

        Waitlist::create([
            'email' => $email,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'You are on the waitlist.',
        ], 201);
    }
}
