<?php

namespace App\Models;

use Database\Factories\BookingAvailabilityRuleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingAvailabilityRule extends Model
{
    /** @use HasFactory<BookingAvailabilityRuleFactory> */
    use HasFactory;

    protected $fillable = [
        'booking_event_type_id',
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

    public function eventType(): BelongsTo
    {
        return $this->belongsTo(BookingEventType::class, 'booking_event_type_id');
    }
}
