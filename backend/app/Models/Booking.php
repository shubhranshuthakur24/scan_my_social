<?php

namespace App\Models;

use Carbon\Carbon;
use Database\Factories\BookingFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    /** @use HasFactory<BookingFactory> */
    use HasFactory;

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'booking_event_type_id',
        'host_user_id',
        'cancelled_by_host_id',
        'guest_name',
        'guest_email',
        'guest_phone',
        'guest_timezone',
        'guest_notes',
        'status',
        'starts_at',
        'ends_at',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    protected function startsAt(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value instanceof Carbon || $value instanceof \Illuminate\Support\Carbon
                ? $value->copy()->shiftTimezone('UTC')
                : ($value ? \Illuminate\Support\Carbon::parse($value, 'UTC') : null)
        );
    }

    protected function endsAt(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value instanceof Carbon || $value instanceof \Illuminate\Support\Carbon
                ? $value->copy()->shiftTimezone('UTC')
                : ($value ? \Illuminate\Support\Carbon::parse($value, 'UTC') : null)
        );
    }

    public function eventType(): BelongsTo
    {
        return $this->belongsTo(BookingEventType::class, 'booking_event_type_id');
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function cancelledByHost(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by_host_id');
    }
}
