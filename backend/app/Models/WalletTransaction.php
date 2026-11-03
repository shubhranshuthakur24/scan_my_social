<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    protected $fillable = [
        'user_id',
        'amount',
        'balance_after',
        'type',
        'reference_type',
        'reference_id',
        'idempotency_key',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
