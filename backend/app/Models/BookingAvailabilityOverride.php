<?php

namespace App\Models;

use Database\Factories\BookingAvailabilityOverrideFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingAvailabilityOverride extends Model
{
    /** @use HasFactory<BookingAvailabilityOverrideFactory> */
    use HasFactory;

    protected $fillable = [
        'host_user_id',
        'booking_event_type_id',
        'override_date',
        'start_time',
        'end_time',
        'is_available',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'override_date' => 'date',
            'is_available' => 'boolean',
        ];
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function eventType(): BelongsTo
    {
        return $this->belongsTo(BookingEventType::class, 'booking_event_type_id');
    }
}
