<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\BookingEventTypeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class BookingEventType extends Model
{
    /** @use HasFactory<BookingEventTypeFactory> */
    use HasFactory, SoftDeletes;

    public const SCHEDULE_TYPE_WEEKLY = 'weekly';

    public const SCHEDULE_TYPE_ONE_TIME = 'one_time';

    protected $fillable = [
        'host_user_id',
        'name',
        'slug',
        'description',
        'duration_minutes',
        'buffer_minutes',
        'timezone',
        'schedule_type',
        'one_time_date',
        'one_time_start_time',
        'one_time_end_time',
        'location_type',
        'location_value',
        'location_label',
        'allows_multi_seat_booking',
        'seat_capacity',
        'exclude_from_global_slot_lock',
        'is_active',
        'sort_order',
        'minimum_booking_notice_minutes',
        'booking_window_days',
    ];

    protected function casts(): array
    {
        return [
            'duration_minutes' => 'integer',
            'buffer_minutes' => 'integer',
            'one_time_date' => 'date',
            'allows_multi_seat_booking' => 'boolean',
            'seat_capacity' => 'integer',
            'exclude_from_global_slot_lock' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'minimum_booking_notice_minutes' => 'integer',
            'booking_window_days' => 'integer',
        ];
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function availabilityRules(): HasMany
    {
        return $this->hasMany(BookingAvailabilityRule::class)->orderBy('day_of_week')->orderBy('start_time');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function availabilityOverrides(): HasMany
    {
        return $this->hasMany(BookingAvailabilityOverride::class);
    }

    public function isOneTime(): bool
    {
        return $this->schedule_type === self::SCHEDULE_TYPE_ONE_TIME;
    }

    public function publicEndsAt(?CarbonImmutable $reference = null): ?CarbonImmutable
    {
        if (! $this->isOneTime() || ! $this->one_time_date || ! $this->one_time_end_time) {
            return null;
        }

        $timezone = (string) ($this->timezone ?: config('app.timezone', 'UTC'));
        $date = $this->one_time_date->toDateString();
        $endTime = substr((string) $this->one_time_end_time, 0, 8);

        return CarbonImmutable::createFromFormat('Y-m-d H:i:s', "{$date} {$endTime}", $timezone);
    }

    public function isPubliclyBookable(?CarbonImmutable $reference = null): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if (! $this->isOneTime()) {
            return true;
        }

        $referenceTime = $reference ?? now((string) ($this->timezone ?: config('app.timezone', 'UTC')))->toImmutable();
        $endsAt = $this->publicEndsAt($referenceTime);

        return $endsAt?->greaterThan($referenceTime) ?? false;
    }
}
