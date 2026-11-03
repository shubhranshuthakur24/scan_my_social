<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\AffiliateApplicationApprovedMail;
use App\Mail\AffiliateApplicationRejectedMail;
use App\Models\AffiliateApplication;
use App\Services\AffiliateApprovalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AdminAffiliateController extends Controller
{
    public function index()
    {
        $applications = AffiliateApplication::with(['user', 'claimedUser'])
            ->latest()
            ->get();

        return Inertia::render('Admin/Affiliates', [
            'applications' => $applications,
        ]);
    }

    public function updateStatus(Request $request, AffiliateApplication $application)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
            'reason' => 'required_if:status,rejected|nullable|string|max:1000',
        ]);

        $status = (string) $request->status;
        $reason = $request->filled('reason') ? (string) $request->reason : null;

        DB::transaction(function () use ($application, $status, $reason) {
            $lockedApplication = AffiliateApplication::query()->whereKey($application->id)->lockForUpdate()->firstOrFail();

            if ($status === 'rejected') {
                $lockedApplication->update([
                    'status' => 'rejected',
                    'rejection_reason' => $reason,
                ]);

                if ($lockedApplication->claimedUser) {
                    $lockedApplication->claimedUser->update([
                        'affiliate_status' => 'rejected',
                        'affiliate_rejection_reason' => $reason,
                        'affiliate_contact' => $lockedApplication->contact,
                        'affiliate_note' => $lockedApplication->note,
                        'affiliate_applied_at' => $lockedApplication->created_at,
                    ]);
                }

                return;
            }

            if (! in_array($lockedApplication->status, ['pending', 'rejected', 'approved_unclaimed', 'approved_claimed'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['This application is in an invalid state and cannot be approved.'],
                ]);
            }

            $claimedUser = $lockedApplication->claimedUser;

            if (! $claimedUser && $lockedApplication->user_id) {
                $lockedApplication->update(['claimed_user_id' => $lockedApplication->user_id]);
                $claimedUser = $lockedApplication->user;
            }

            if ($claimedUser) {
                $lockedApplication->update([
                    'status' => 'approved_claimed',
                    'rejection_reason' => null,
                    'approved_at' => $lockedApplication->approved_at ?? now(),
                ]);

                app(AffiliateApprovalService::class)->syncApprovedAffiliate(
                    $claimedUser,
                    $lockedApplication
                );

                return;
            }

            $lockedApplication->update([
                'status' => 'approved_unclaimed',
                'rejection_reason' => null,
                'approved_at' => $lockedApplication->approved_at ?? now(),
            ]);
        });

        $finalApplication = $application->fresh();

        try {
            if ($status === 'approved' && $finalApplication) {
                Mail::to($finalApplication->email)->send(new AffiliateApplicationApprovedMail($finalApplication));
            }

            if ($status === 'rejected' && $finalApplication) {
                Mail::to($finalApplication->email)->send(new AffiliateApplicationRejectedMail($finalApplication));
            }
        } catch (\Throwable $exception) {
            \Log::warning('Failed to send affiliate decision email.', [
                'application_id' => $finalApplication?->id,
                'status' => $status,
                'email' => $finalApplication?->email,
                'error' => $exception->getMessage(),
            ]);
        }

        if ($status === 'approved') {
            return back()->with('success', 'Application approved successfully.');
        }

        return back()->with('success', 'Application rejected successfully.');
    }
}
