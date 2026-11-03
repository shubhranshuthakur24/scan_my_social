<?php

namespace App\Http\Controllers;

use App\Models\PayoutRequest;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ReferralController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // On demand generation of case-insensitive code
        $user->generateReferralCodeIfNull();

        $stats = [
            'captured' => $user->referrals()->where('status', 'captured')->count(),
            'qualified' => $user->referrals()->where('status', 'qualified')->count(),
            'rewarded' => $user->referrals()->where('status', 'rewarded')->count(),
        ];

        $transactions = $user->walletTransactions()->latest()->take(20)->get();
        $payouts = $user->payoutRequests()->latest()->take(10)->get();

        // Compute active pendings logically so user knows exactly what they can currently withdraw
        $pendingPayoutPaisa = $user->payoutRequests()->where('status', 'pending')->sum('amount');
        $availablePaisa = $user->wallet_balance - $pendingPayoutPaisa;

        return Inertia::render('Referrals/Dashboard', [
            'referralCode' => $user->referral_code,
            'walletBalance' => $user->wallet_balance,
            'availablePaisa' => max(0, $availablePaisa),
            'stats' => $stats,
            'transactions' => $transactions,
            'payouts' => $payouts,
        ]);
    }

    public function redeemCredits(Request $request)
    {
        $request->validate([
            'amount' => 'required|integer|min:50000', // Minimum ₹500
        ], [
            'amount.min' => 'The minimum amount to redeem is ₹500.',
        ]);

        $user = $request->user();
        $amountPaisa = (int) $request->amount;

        $pendingPayoutPaisa = $user->payoutRequests()->where('status', 'pending')->sum('amount');
        $availablePaisa = $user->wallet_balance - $pendingPayoutPaisa;

        if ($availablePaisa < $amountPaisa) {
            return back()->withErrors(['amount' => 'Insufficient available wallet balance.']);
        }

        DB::transaction(function () use ($user, $amountPaisa) {
            $lockedUser = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            // Re-verify strictly
            $pendingAmount = $lockedUser->payoutRequests()->where('status', 'pending')->sum('amount');
            if (($lockedUser->wallet_balance - $pendingAmount) < $amountPaisa) {
                throw ValidationException::withMessages(['amount' => 'Insufficient available balance.']);
            }

            $newBalance = $lockedUser->wallet_balance - $amountPaisa;

            // Direct Ledger Debit
            WalletTransaction::create([
                'user_id' => $lockedUser->id,
                'amount' => -$amountPaisa,
                'balance_after' => $newBalance,
                'type' => 'redeem_credits',
                'idempotency_key' => 'redeem_credits_'.uniqid(),
            ]);

            $lockedUser->update(['wallet_balance' => $newBalance]);

            // Equation: ₹1 (100 Paisa) = 1 Usage Credit
            $creditsToAdd = intdiv($amountPaisa, 100);
            if ($creditsToAdd > 0) {
                $lockedUser->addCredits($creditsToAdd, 'Wallet Redemption');
            }
        });

        return back()->with('success', 'Credits successfully redeemed to your account!');
    }

    public function requestPayout(Request $request)
    {
        $request->validate([
            'amount' => 'required|integer|min:50000', // Minimum ₹500
            'bank_details' => 'required|array',
            'bank_details.account_name' => 'required|string|max:255',
            'bank_details.account_number' => 'required|string|max:255',
            'bank_details.ifsc' => 'required|string|max:50',
        ], [
            'amount.min' => 'The minimum amount for bank withdrawal is ₹500.',
        ]);

        $user = $request->user();
        $amountPaisa = (int) $request->amount;

        DB::transaction(function () use ($user, $amountPaisa, $request) {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $pendingAmount = PayoutRequest::query()
                ->where('user_id', $lockedUser->id)
                ->where('status', 'pending')
                ->sum('amount');

            if (($lockedUser->wallet_balance - $pendingAmount) < $amountPaisa) {
                throw ValidationException::withMessages([
                    'amount' => 'Insufficient available balance. You likely have pending withdrawal requests.',
                ]);
            }

            PayoutRequest::create([
                'user_id' => $lockedUser->id,
                'amount' => $amountPaisa,
                'status' => 'pending',
                'bank_details' => $request->bank_details,
            ]);
        });

        return back()->with('success', 'Bank payout request securely submitted. It will be reviewed shortly.');
    }
}
