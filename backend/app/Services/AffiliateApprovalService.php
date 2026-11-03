<?php

namespace App\Services;

use App\Models\AffiliateApplication;
use App\Models\User;

class AffiliateApprovalService
{
    public function syncApprovedAffiliate(User $user, AffiliateApplication $application): void
    {
        $user->update([
            'affiliate_status' => 'approved',
            'affiliate_rejection_reason' => null,
            'affiliate_contact' => $application->contact,
            'affiliate_note' => $application->note,
            'affiliate_applied_at' => $application->created_at,
            'affiliate_approved_at' => $application->approved_at ?? now(),
        ]);

        if (! $user->affiliate_code) {
            $user->generateAffiliateCode();
        }
    }
}
