<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class PayoutRequest extends Model
{
    protected $fillable = [
        'user_id',
        'amount',
        'status',
        'bank_details',
        'notes',
        'razorpay_payout_id',
        'razorpay_fund_account_id',
        'razorpay_status',
        'razorpay_error',
    ];

    protected function casts(): array
    {
        return [
            'bank_details' => 'encrypted:array',
        ];
    }

    protected static function booted()
    {
        static::updating(function ($payout) {
            $originalStatus = $payout->getOriginal('status');
            $newStatus = $payout->status;

            if ($originalStatus === $newStatus) {
                return;
            }

            // Define allowed transitions
            $allowedTransitions = [
                'pending' => ['processing', 'rejected', 'failed'],
                'processing' => ['paid', 'failed', 'reversed'],
                'paid' => [], // Final state
                'rejected' => [], // Final state
                'failed' => ['pending'], // Allow retry if failed? Or stay final.
                'reversed' => ['pending'], // Allow retry if reversed?
            ];

            $allowed = $allowedTransitions[$originalStatus] ?? [];

            if (! in_array($newStatus, $allowed, true)) {
                throw ValidationException::withMessages([
                    'status' => ["Invalid status transition from {$originalStatus} to {$newStatus}."],
                ]);
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
