<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PayoutRequest;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\RazorpayXService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AdminPayoutController extends Controller
{
    public function index()
    {
        $payouts = PayoutRequest::with('user:id,name,email,wallet_balance')
            ->latest()
            ->get();

        $stats = [
            'pending_count' => PayoutRequest::where('status', 'pending')->count(),
            'processing_count' => PayoutRequest::where('status', 'processing')->count(),
            'total_paid' => PayoutRequest::where('status', 'paid')->sum('amount'),
        ];

        return Inertia::render('Admin/Payouts', [
            'payouts' => $payouts,
            'stats' => $stats,
        ]);
    }

    public function updateStatus(Request $request, PayoutRequest $payout)
    {
        $request->validate([
            'status' => 'required|string|in:approved,rejected',
            'notes' => 'nullable|string|max:1000',
        ]);

        $newStatus = (string) $request->status;
        $notes = $request->filled('notes') ? (string) $request->input('notes') : null;

        if ($newStatus === 'rejected') {
            return $this->handleRejection($payout, $notes);
        }

        // newStatus === 'approved' → merged approve + pay flow
        return $this->handleApproveAndPay($payout, $notes);
    }

    private function handleRejection(PayoutRequest $payout, ?string $notes)
    {
        DB::transaction(function () use ($payout, $notes) {
            $lockedPayout = PayoutRequest::query()->whereKey($payout->id)->lockForUpdate()->firstOrFail();

            if ($lockedPayout->status !== 'pending') {
                throw ValidationException::withMessages([
                    'status' => ['This payout is already processed and cannot be changed back.'],
                ]);
            }

            $lockedPayout->update([
                'status' => 'rejected',
                'notes' => $notes ?? $lockedPayout->notes,
            ]);
        });

        return back()->with('success', 'Payout request has been rejected.');
    }

    private function handleApproveAndPay(PayoutRequest $payout, ?string $notes)
    {
        // Phase 1: DB Transaction   lock rows, validate, and deduct wallet balance.
        $lockedPayoutId = null;

        try {
            DB::transaction(function () use ($payout, $notes, &$lockedPayoutId) {
                $lockedPayout = PayoutRequest::query()->whereKey($payout->id)->lockForUpdate()->firstOrFail();

                if ($lockedPayout->status !== 'pending') {
                    throw ValidationException::withMessages([
                        'status' => ['This payout is already processed and cannot be changed back.'],
                    ]);
                }

                $lockedUser = User::query()->whereKey($lockedPayout->user_id)->lockForUpdate()->firstOrFail();
                $idempotencyKey = 'redeem_bank_'.$lockedPayout->id;

                if (! WalletTransaction::query()->where('idempotency_key', $idempotencyKey)->exists()) {
                    if ($lockedUser->wallet_balance < $lockedPayout->amount) {
                        throw ValidationException::withMessages([
                            'status' => ['Cannot process payout because the user\'s wallet balance is insufficient.'],
                        ]);
                    }

                    $newBalance = $lockedUser->wallet_balance - $lockedPayout->amount;

                    WalletTransaction::query()->create([
                        'user_id' => $lockedUser->id,
                        'amount' => -$lockedPayout->amount,
                        'balance_after' => $newBalance,
                        'type' => 'redeem_bank',
                        'reference_type' => 'payout',
                        'reference_id' => (string) $lockedPayout->id,
                        'idempotency_key' => $idempotencyKey,
                    ]);

                    $lockedUser->update(['wallet_balance' => $newBalance]);
                }

                $lockedPayout->update([
                    'status' => 'processing', // Initiating bank transfer
                    'notes' => $notes ?? $lockedPayout->notes,
                ]);

                $lockedPayoutId = $lockedPayout->id;
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to initiate payout process: '.$e->getMessage());
        }

        // Phase 2: API Call   initiate payout via RazorpayX (outside DB transaction).
        $freshPayout = PayoutRequest::query()->with('user')->findOrFail($lockedPayoutId);

        try {
            $razorpayXService = app(RazorpayXService::class);
            $result = $razorpayXService->createPayout($freshPayout);

            $freshPayout->update([
                'razorpay_payout_id' => $result['payout_id'],
                'razorpay_fund_account_id' => $result['fund_account_id'],
                'razorpay_status' => 'initiated',
            ]);

            return back()->with('success', 'Payout approved. Bank transfer initiated and is now Processing.');

        } catch (\Exception $e) {
            \Log::error('RazorpayX Payout API failed. Wallet was already deducted.', [
                'payout_id' => $freshPayout->id,
                'error' => $e->getMessage(),
            ]);

            DB::transaction(function () use ($freshPayout, $e) {
                $lockedPayout = PayoutRequest::query()->whereKey($freshPayout->id)->lockForUpdate()->firstOrFail();
                $lockedUser = User::query()->whereKey($lockedPayout->user_id)->lockForUpdate()->firstOrFail();

                $debitIdempotencyKey = 'redeem_bank_'.$lockedPayout->id;
                $rollbackIdempotencyKey = 'redeem_bank_rollback_'.$lockedPayout->id;

                if (
                    WalletTransaction::query()->where('idempotency_key', $debitIdempotencyKey)->exists()
                    && ! WalletTransaction::query()->where('idempotency_key', $rollbackIdempotencyKey)->exists()
                ) {
                    $newBalance = $lockedUser->wallet_balance + $lockedPayout->amount;

                    WalletTransaction::query()->create([
                        'user_id' => $lockedUser->id,
                        'amount' => $lockedPayout->amount,
                        'balance_after' => $newBalance,
                        'type' => 'refund',
                        'reference_type' => 'payout',
                        'reference_id' => (string) $lockedPayout->id,
                        'idempotency_key' => $rollbackIdempotencyKey,
                    ]);

                    $lockedUser->update(['wallet_balance' => $newBalance]);
                }

                $lockedPayout->update([
                    'status' => 'failed',
                    'razorpay_status' => 'initiation_failed',
                    'razorpay_error' => $e->getMessage(),
                ]);
            });

            return back()->with('error', 'Payout initiation failed and wallet balance was restored automatically. Please review and retry.');
        }
    }
}
