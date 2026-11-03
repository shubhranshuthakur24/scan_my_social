<?php

namespace App\Http\Controllers;

use App\Mail\AffiliateApplicationSubmittedMail;
use App\Mail\AffiliateClaimLinkMail;
use App\Models\AffiliateApplication;
use App\Models\PayoutRequest;
use App\Models\Referral;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\AffiliateApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AffiliateController extends Controller
{
    private const CLAIM_TOKEN_TTL_MINUTES = 4320; // 3 days

    private const APPLICATION_COOLDOWN_HOURS = 24;

    public function index()
    {
        /** @var User|null $user */
        $user = auth()->user();

        // 1. If approved on User model, show dashboard
        if ($user && $user->affiliate_status === 'approved') {
            return $this->dashboard($user);
        }

        // 2. Check for existing application in affiliate_applications table
        $application = null;
        if ($user) {
            $application = AffiliateApplication::query()
                ->where(function ($query) use ($user) {
                    $query->where('user_id', $user->id)
                        ->orWhere('claimed_user_id', $user->id)
                        ->orWhereRaw('LOWER(email) = ?', [strtolower((string) $user->email)]);
                })
                ->latest()
                ->first();
        }

        return Inertia::render('Affiliate/Apply', [
            'status' => $application?->status ?? $user?->affiliate_status, // Fallback for old system
            'rejection_reason' => $application?->rejection_reason ?? $user?->affiliate_rejection_reason,
            'applied_at' => ($application?->created_at ?? $user?->affiliate_applied_at)?->toDateTimeString(),
            'canRequestClaim' => (bool) ($user && $application && $application->claimed_user_id !== $user->id),
            'auth' => [
                'user' => $user,
            ],
        ]);
    }

    public function apply(Request $request)
    {
        $user = auth()->user();
        $normalizedContact = $this->normalizeContact((string) $request->input('contact', ''));
        $request->merge(['contact' => $normalizedContact]);

        $request->validate([
            'name' => $user ? 'nullable' : 'required|string|max:255',
            'email' => $user ? 'nullable' : 'required|email|max:255',
            'contact' => ['required', 'string', 'max:20', 'regex:/^\+?[1-9]\d{7,14}$/'],
            'note' => 'nullable|string|max:1000',
            'website' => 'nullable|size:0',
        ]);

        $normalizedEmail = strtolower(trim((string) ($user?->email ?? $request->email)));
        if ($normalizedEmail === '') {
            throw ValidationException::withMessages([
                'email' => 'A valid email is required.',
            ]);
        }

        $hasRecentPendingApplication = AffiliateApplication::query()
            ->where('status', 'pending')
            ->where(function ($query) use ($normalizedEmail, $normalizedContact) {
                $query->whereRaw('LOWER(email) = ?', [$normalizedEmail])
                    ->orWhere('contact', $normalizedContact);
            })
            ->where('created_at', '>=', now()->subHours(self::APPLICATION_COOLDOWN_HOURS))
            ->exists();

        if ($hasRecentPendingApplication) {
            throw ValidationException::withMessages([
                'contact' => 'A pending affiliate application already exists for this email/contact. Please wait 24 hours before reapplying.',
            ]);
        }

        $application = AffiliateApplication::create([
            'user_id' => $user?->id,
            'claimed_user_id' => $user?->id,
            'name' => $user?->name ?? $request->name,
            'email' => $normalizedEmail,
            'contact' => $normalizedContact,
            'note' => $request->note,
            'status' => 'pending',
            'claimed_at' => $user ? now() : null,
        ]);

        // Also update user status if logged in for compatibility
        if ($user) {
            $user->update([
                'affiliate_status' => 'pending',
                'affiliate_applied_at' => now(),
                'affiliate_contact' => $normalizedContact,
                'affiliate_note' => $request->note,
            ]);
        }

        try {
            Mail::to($application->email)->send(new AffiliateApplicationSubmittedMail($application));
        } catch (\Throwable $exception) {
            \Log::warning('Failed to send affiliate application submitted email.', [
                'application_id' => $application->id,
                'email' => $application->email,
                'error' => $exception->getMessage(),
            ]);
        }

        return back()->with('success', 'Your application has been submitted for review.');
    }

    public function requestClaimLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $normalizedEmail = strtolower(trim((string) $request->input('email')));
        $application = AffiliateApplication::query()
            ->whereRaw('LOWER(email) = ?', [$normalizedEmail])
            ->latest()
            ->first();

        if (! $application) {
            return back()->with('success', 'If an application exists for this email, a claim link has been sent.');
        }

        $plainToken = Str::random(64);
        $application->update([
            'claim_token' => hash('sha256', $plainToken),
            'claim_token_expires_at' => now()->addMinutes(self::CLAIM_TOKEN_TTL_MINUTES),
            'claim_requested_at' => now(),
        ]);

        $claimUrl = route('affiliate.claim.verify', [
            'application' => $application->id,
            'token' => $plainToken,
        ]);

        Mail::to($application->email)->send(new AffiliateClaimLinkMail($application, $claimUrl));

        return back()->with('success', 'If an application exists for this email, a claim link has been sent.');
    }

    public function verifyClaim(Request $request, AffiliateApplication $application, string $token)
    {
        $user = $request->user();
        if (! $user) {
            return redirect()->route('login');
        }

        if (! $application->claim_token || ! $application->claim_token_expires_at) {
            return redirect()->route('affiliate')->withErrors(['affiliate' => 'This claim link is invalid or already used.']);
        }

        $hashedToken = hash('sha256', $token);
        if (! hash_equals($application->claim_token, $hashedToken)) {
            return redirect()->route('affiliate')->withErrors(['affiliate' => 'This claim link is invalid.']);
        }

        if ($application->claim_token_expires_at->isPast()) {
            return redirect()->route('affiliate')->withErrors(['affiliate' => 'This claim link has expired. Please request a new link.']);
        }

        if (strtolower((string) $user->email) !== strtolower((string) $application->email)) {
            return redirect()->route('affiliate')->withErrors(['affiliate' => 'Please sign in using the same email as the affiliate application before claiming it.']);
        }

        DB::transaction(function () use ($application, $user) {
            $lockedApplication = AffiliateApplication::query()->whereKey($application->id)->lockForUpdate()->firstOrFail();
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            $lockedApplication->update([
                'user_id' => $lockedApplication->user_id ?? $lockedUser->id,
                'claimed_user_id' => $lockedUser->id,
                'claimed_at' => now(),
                'claim_token' => null,
                'claim_token_expires_at' => null,
            ]);

            if ($lockedApplication->status === 'approved_unclaimed') {
                $lockedApplication->update([
                    'status' => 'approved_claimed',
                    'approved_at' => $lockedApplication->approved_at ?? now(),
                ]);

                app(AffiliateApprovalService::class)->syncApprovedAffiliate($lockedUser, $lockedApplication);
            }
        });

        return redirect()->route('affiliate')->with('success', 'Affiliate application claimed successfully.');
    }

    public function updateBankDetails(Request $request)
    {
        $request->validate([
            'bank_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:255',
            'ifsc_code' => 'required|string|max:50',
            'account_holder_name' => 'required|string|max:255',
        ]);

        $request->user()->update($request->only([
            'bank_name',
            'account_number',
            'ifsc_code',
            'account_holder_name',
        ]));

        return back()->with('success', 'Bank details updated successfully.');
    }

    public function requestPayout(Request $request)
    {
        $request->validate([
            'amount' => 'required|integer|min:50000', // Minimum ₹500
        ], [
            'amount.min' => 'The minimum amount for withdrawal is ₹500.',
        ]);

        $user = $request->user();
        $amountPaisa = (int) $request->amount;

        if (! $user->bank_name || ! $user->account_number || ! $user->ifsc_code) {
            return back()->withErrors(['amount' => 'Please update your bank details first.']);
        }

        DB::transaction(function () use ($user, $amountPaisa) {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $pendingAmount = PayoutRequest::query()
                ->where('user_id', $lockedUser->id)
                ->where('status', 'pending')
                ->sum('amount');

            if (($lockedUser->wallet_balance - $pendingAmount) < $amountPaisa) {
                throw ValidationException::withMessages([
                    'amount' => 'Insufficient available balance.',
                ]);
            }

            PayoutRequest::create([
                'user_id' => $lockedUser->id,
                'amount' => $amountPaisa,
                'status' => 'pending',
                'bank_details' => [
                    'bank_name' => $lockedUser->bank_name,
                    'account_number' => $lockedUser->account_number,
                    'ifsc' => $lockedUser->ifsc_code,
                    'account_name' => $lockedUser->account_holder_name,
                ],
            ]);
        });

        return back()->with('success', 'Payout request submitted successfully.');
    }

    private function dashboard($user)
    {
        $stats = [
            'captured' => Referral::where('referrer_id', $user->id)->where('type', 'affiliate')->count(),
            'rewarded' => Referral::where('referrer_id', $user->id)->where('type', 'affiliate')->where('status', 'rewarded')->count(),
        ];

        $referredUsers = Referral::query()
            ->with('referee:id,name,email,created_at')
            ->where('referrer_id', $user->id)
            ->where('type', 'affiliate')
            ->latest()
            ->take(20)
            ->get()
            ->filter(fn (Referral $referral) => $referral->referee !== null)
            ->map(fn (Referral $referral): array => [
                'id' => $referral->id,
                'name' => $referral->referee->name,
                'email' => $this->maskEmail($referral->referee->email),
                'joined_at' => $referral->referee->created_at?->toDateTimeString(),
                'status' => $referral->status,
                'is_paid_conversion' => $referral->status === 'rewarded',
            ])
            ->values();

        $transactions = WalletTransaction::where('user_id', $user->id)
            ->whereIn('reference_type', ['referral_reward', 'affiliate_reward'])
            ->latest()
            ->take(20)
            ->get();

        $payouts = $user->payoutRequests()->latest()->take(10)->get();

        return Inertia::render('Affiliate/Dashboard', [
            'affiliateCode' => $user->affiliate_code,
            'walletBalance' => $user->wallet_balance,
            'availablePaisa' => $user->wallet_balance - $user->payoutRequests()->where('status', 'pending')->sum('amount'),
            'bankDetails' => [
                'bank_name' => $user->bank_name,
                'account_number' => $user->account_number,
                'ifsc_code' => $user->ifsc_code,
                'account_holder_name' => $user->account_holder_name,
            ],
            'stats' => $stats,
            'referredUsers' => $referredUsers,
            'transactions' => $transactions,
            'payouts' => $payouts,
        ]);
    }

    private function maskEmail(?string $email): string
    {
        if (! $email || ! str_contains($email, '@')) {
            return '';
        }

        [$localPart, $domain] = explode('@', $email, 2);
        $visibleCharacters = strlen($localPart) <= 2 ? 1 : 2;

        return substr($localPart, 0, $visibleCharacters).'***@'.$domain;
    }

    private function normalizeContact(string $contact): string
    {
        $trimmed = trim($contact);
        $hasPlusPrefix = str_starts_with($trimmed, '+');
        $digits = preg_replace('/\D+/', '', $trimmed) ?? '';

        if ($digits === '') {
            return '';
        }

        return $hasPlusPrefix ? '+'.$digits : $digits;
    }
}
