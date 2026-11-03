<?php

namespace App\Models;

use Database\Factories\BookingHostAvailabilityRuleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingHostAvailabilityRule extends Model
{
    /** @use HasFactory<BookingHostAvailabilityRuleFactory> */
    use HasFactory;

    protected $fillable = [
        'host_user_id',
        'day_of_week',
        'start_time',
        'end_time',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }
}
