<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AffiliateApplication extends Model
{
    protected $fillable = [
        'user_id',
        'claimed_user_id',
        'name',
        'email',
        'contact',
        'note',
        'status',
        'rejection_reason',
        'claim_token',
        'claim_token_expires_at',
        'claim_requested_at',
        'claimed_at',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'claim_token_expires_at' => 'datetime',
            'claim_requested_at' => 'datetime',
            'claimed_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function claimedUser()
    {
        return $this->belongsTo(User::class, 'claimed_user_id');
    }
}
