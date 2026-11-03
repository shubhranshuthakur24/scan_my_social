<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingAvailabilityOverride;
use App\Models\BookingEventType;
use App\Models\BookingHostAvailabilityRule;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class BookingAvailabilityService
{
    /**
     * @return array<int, array<string, string>>
     */
    public function generateDailySlots(BookingEventType $eventType, CarbonImmutable $hostDate, ?int $ignoreBookingId = null): array
    {
        $eventType->loadMissing('host:id,lock_time_slots_across_event_types,booking_timezone,default_minimum_booking_notice_minutes,default_booking_window_days');
        $timezone = $eventType->timezone ?: ($eventType->host->booking_timezone ?: (string) config('app.timezone', 'UTC'));
        $dateInTimezone = $hostDate->setTimezone($timezone);
        $durationMinutes = max(5, (int) $eventType->duration_minutes);
        $bufferMinutes = max(0, (int) $eventType->buffer_minutes);
        $slotCapacity = $this->slotCapacity($eventType);
        $applyGlobalSlotLock = $this->shouldApplyGlobalSlotLock($eventType);
        $candidateWindows = $this->candidateWindowsForDate($eventType, $dateInTimezone, $timezone);
        if ($candidateWindows === []) {
            return [];
        }

        $availabilityOverrides = BookingAvailabilityOverride::query()
            ->where('host_user_id', $eventType->host_user_id)
            ->whereDate('override_date', $dateInTimezone->toDateString())
            ->where(function ($query) use ($eventType): void {
                $query
                    ->whereNull('booking_event_type_id')
                    ->orWhere('booking_event_type_id', $eventType->id);
            })
            ->orderByRaw('CASE WHEN booking_event_type_id IS NULL THEN 1 ELSE 0 END')
            ->get();

        if ($this->isFullyBlockedByOverrides($availabilityOverrides)) {
            return [];
        }

        $dayStartUtc = $dateInTimezone->startOfDay()->utc();
        $dayEndUtc = $dateInTimezone->endOfDay()->utc();

        $bookings = Booking::query()
            ->where('status', Booking::STATUS_CONFIRMED)
            ->when($ignoreBookingId, fn ($query) => $query->whereKeyNot($ignoreBookingId))
            ->where('starts_at', '<', $dayEndUtc)
            ->where('ends_at', '>', $dayStartUtc)
            ->when(
                $applyGlobalSlotLock,
                function ($query) use ($eventType): void {
                    $query
                        ->where('host_user_id', $eventType->host_user_id)
                        ->whereHas('eventType', fn ($eventTypeQuery) => $eventTypeQuery->where('exclude_from_global_slot_lock', false));
                },
                fn ($query) => $query->where('booking_event_type_id', $eventType->id)
            )
            ->get(['booking_event_type_id', 'starts_at', 'ends_at']);

        $slots = [];
        $nowUtc = now()->utc()->toImmutable();

        foreach ($candidateWindows as [$candidateStart, $candidateEnd]) {
            $cursor = $candidateStart;

            while ($cursor->addMinutes($durationMinutes)->lessThanOrEqualTo($candidateEnd)) {
                $slotStartUtc = $cursor->utc();
                $slotEndUtc = $slotStartUtc->addMinutes($durationMinutes);

                $noticeMinutes = (int) ($eventType->minimum_booking_notice_minutes
                    ?? $eventType->host->default_minimum_booking_notice_minutes
                    ?? 120);
                $earliestAllowedSlot = $nowUtc->addMinutes($noticeMinutes);

                if ($slotStartUtc->lessThan($earliestAllowedSlot)) {
                    $cursor = $cursor->addMinutes($durationMinutes + $bufferMinutes);

                    continue;
                }

                if (
                    $this->slotHasCapacity($bookings, $slotStartUtc, $slotEndUtc, $slotCapacity, (int) $eventType->id, $applyGlobalSlotLock) &&
                    ! $this->isBlockedByOverrideRange($availabilityOverrides, $dateInTimezone, $slotStartUtc, $slotEndUtc, $timezone)
                ) {
                    $slots[] = [
                        'starts_at' => $slotStartUtc->toIso8601String(),
                        'ends_at' => $slotEndUtc->toIso8601String(),
                        'label' => $cursor->format('g:i A'),
                    ];
                }

                $cursor = $cursor->addMinutes($durationMinutes + $bufferMinutes);
            }
        }

        return collect($slots)
            ->unique('starts_at')
            ->sortBy('starts_at')
            ->values()
            ->all();
    }

    public function isSlotStillAvailable(BookingEventType $eventType, CarbonImmutable $startsAtUtc, CarbonImmutable $endsAtUtc, ?int $ignoreBookingId = null): bool
    {
        $slotCapacity = $this->slotCapacity($eventType);
        $applyGlobalSlotLock = $this->shouldApplyGlobalSlotLock($eventType);

        $overlappingBookings = Booking::query()
            ->where('status', Booking::STATUS_CONFIRMED)
            ->when($ignoreBookingId, fn ($query) => $query->whereKeyNot($ignoreBookingId))
            ->where('starts_at', '<', $endsAtUtc)
            ->where('ends_at', '>', $startsAtUtc)
            ->when(
                $applyGlobalSlotLock,
                function ($query) use ($eventType): void {
                    $query
                        ->where('host_user_id', $eventType->host_user_id)
                        ->whereHas('eventType', fn ($eventTypeQuery) => $eventTypeQuery->where('exclude_from_global_slot_lock', false));
                },
                fn ($query) => $query->where('booking_event_type_id', $eventType->id)
            )
            ->get(['booking_event_type_id', 'starts_at', 'ends_at']);

        return $this->slotHasCapacity(
            $overlappingBookings,
            $startsAtUtc,
            $endsAtUtc,
            $slotCapacity,
            (int) $eventType->id,
            $applyGlobalSlotLock
        );
    }

    /**
     * @param  Collection<int, Booking>  $bookings
     */
    private function slotHasCapacity(
        Collection $bookings,
        CarbonImmutable $slotStartUtc,
        CarbonImmutable $slotEndUtc,
        ?int $slotCapacity,
        int $eventTypeId,
        bool $applyGlobalSlotLock
    ): bool {
        $overlappingBookings = $bookings->filter(function (Booking $booking) use ($slotStartUtc, $slotEndUtc): bool {
            [$bookingStart, $bookingEnd] = $this->bookingBoundsUtc($booking);

            return $bookingStart->lessThan($slotEndUtc) && $bookingEnd->greaterThan($slotStartUtc);
        });

        if ($overlappingBookings->isEmpty()) {
            return true;
        }

        if ($applyGlobalSlotLock && $overlappingBookings->contains(
            fn (Booking $booking): bool => (int) $booking->booking_event_type_id !== $eventTypeId
        )) {
            return false;
        }

        $sameEventBookings = $overlappingBookings->filter(
            fn (Booking $booking): bool => (int) $booking->booking_event_type_id === $eventTypeId
        );

        if ($sameEventBookings->isEmpty()) {
            return true;
        }

        $exactSlotBookingCount = $sameEventBookings->filter(function (Booking $booking) use ($slotStartUtc, $slotEndUtc): bool {
            [$bookingStart, $bookingEnd] = $this->bookingBoundsUtc($booking);

            return $bookingStart->equalTo($slotStartUtc) && $bookingEnd->equalTo($slotEndUtc);
        })->count();

        if ($sameEventBookings->count() !== $exactSlotBookingCount) {
            return false;
        }

        if ($slotCapacity === 1) {
            return false;
        }

        if ($slotCapacity === null) {
            return true;
        }

        return $exactSlotBookingCount < $slotCapacity;
    }

    private function shouldApplyGlobalSlotLock(BookingEventType $eventType): bool
    {
        if ($eventType->exclude_from_global_slot_lock) {
            return false;
        }

        $eventType->loadMissing('host:id,lock_time_slots_across_event_types');

        return (bool) $eventType->host?->lock_time_slots_across_event_types;
    }

    private function slotCapacity(BookingEventType $eventType): ?int
    {
        if (! $eventType->allows_multi_seat_booking) {
            return 1;
        }

        if ($eventType->seat_capacity === null) {
            return null;
        }

        return max(1, (int) $eventType->seat_capacity);
    }

    /**
     * @return array<int, array{0: CarbonImmutable, 1: CarbonImmutable}>
     */
    private function candidateWindowsForDate(BookingEventType $eventType, CarbonImmutable $dateInTimezone, string $timezone): array
    {
        if ($eventType->isOneTime()) {
            return $this->oneTimeCandidateWindows($eventType, $dateInTimezone, $timezone);
        }

        return $this->weeklyCandidateWindows($eventType, $dateInTimezone, $timezone);
    }

    /**
     * @return array<int, array{0: CarbonImmutable, 1: CarbonImmutable}>
     */
    private function oneTimeCandidateWindows(BookingEventType $eventType, CarbonImmutable $dateInTimezone, string $timezone): array
    {
        $eventDate = $eventType->one_time_date?->toDateString();
        $startTime = $eventType->one_time_start_time ? substr((string) $eventType->one_time_start_time, 0, 8) : null;
        $endTime = $eventType->one_time_end_time ? substr((string) $eventType->one_time_end_time, 0, 8) : null;

        if ($eventDate === null || $startTime === null || $endTime === null) {
            return [];
        }

        if ($dateInTimezone->toDateString() !== $eventDate) {
            return [];
        }

        $windowStart = CarbonImmutable::createFromFormat('Y-m-d H:i:s', "{$eventDate} {$startTime}", $timezone);
        $windowEnd = CarbonImmutable::createFromFormat('Y-m-d H:i:s', "{$eventDate} {$endTime}", $timezone);

        if (! $windowStart || ! $windowEnd || $windowEnd->lessThanOrEqualTo($windowStart)) {
            return [];
        }

        return [[$windowStart, $windowEnd]];
    }

    /**
     * @return array<int, array{0: CarbonImmutable, 1: CarbonImmutable}>
     */
    private function weeklyCandidateWindows(BookingEventType $eventType, CarbonImmutable $dateInTimezone, string $timezone): array
    {
        $dayOfWeek = $dateInTimezone->dayOfWeek;
        $eventType->loadMissing('availabilityRules');

        $rules = $eventType->availabilityRules
            ->filter(fn ($rule): bool => $rule->is_active && (int) $rule->day_of_week === $dayOfWeek)
            ->values();

        if ($rules->isEmpty()) {
            return [];
        }

        $hostRulesConfigured = BookingHostAvailabilityRule::query()
            ->where('host_user_id', $eventType->host_user_id)
            ->exists();

        $hostRules = BookingHostAvailabilityRule::query()
            ->where('host_user_id', $eventType->host_user_id)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->orderBy('start_time')
            ->get();

        if ($hostRulesConfigured && $hostRules->isEmpty()) {
            return [];
        }

        $candidateWindows = [];

        foreach ($rules as $rule) {
            $windowStart = CarbonImmutable::createFromFormat(
                'Y-m-d H:i:s',
                $dateInTimezone->format('Y-m-d').' '.$rule->start_time,
                $timezone
            );
            $windowEnd = CarbonImmutable::createFromFormat(
                'Y-m-d H:i:s',
                $dateInTimezone->format('Y-m-d').' '.$rule->end_time,
                $timezone
            );

            if (! $windowStart || ! $windowEnd || $windowEnd->lessThanOrEqualTo($windowStart)) {
                continue;
            }

            if (! $hostRulesConfigured) {
                $candidateWindows[] = [$windowStart, $windowEnd];

                continue;
            }

            foreach ($hostRules as $hostRule) {
                $hostWindowStart = CarbonImmutable::createFromFormat(
                    'Y-m-d H:i:s',
                    $dateInTimezone->format('Y-m-d').' '.$hostRule->start_time,
                    $timezone
                );
                $hostWindowEnd = CarbonImmutable::createFromFormat(
                    'Y-m-d H:i:s',
                    $dateInTimezone->format('Y-m-d').' '.$hostRule->end_time,
                    $timezone
                );

                if (! $hostWindowStart || ! $hostWindowEnd || $hostWindowEnd->lessThanOrEqualTo($hostWindowStart)) {
                    continue;
                }

                $intersectionStart = $windowStart->greaterThan($hostWindowStart) ? $windowStart : $hostWindowStart;
                $intersectionEnd = $windowEnd->lessThan($hostWindowEnd) ? $windowEnd : $hostWindowEnd;

                if ($intersectionEnd->lessThanOrEqualTo($intersectionStart)) {
                    continue;
                }

                $candidateWindows[] = [$intersectionStart, $intersectionEnd];
            }
        }

        return $candidateWindows;
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function bookingBoundsUtc(Booking $booking): array
    {
        $startsAt = CarbonImmutable::parse((string) $booking->getRawOriginal('starts_at'), 'UTC');
        $endsAt = CarbonImmutable::parse((string) $booking->getRawOriginal('ends_at'), 'UTC');

        return [$startsAt, $endsAt];
    }

    /**
     * @param  Collection<int, BookingAvailabilityOverride>  $overrides
     */
    private function isFullyBlockedByOverrides(Collection $overrides): bool
    {
        return $overrides
            ->where('is_available', false)
            ->contains(fn (BookingAvailabilityOverride $override): bool => $override->start_time === null || $override->end_time === null);
    }

    /**
     * @param  Collection<int, BookingAvailabilityOverride>  $overrides
     */
    private function isBlockedByOverrideRange(
        Collection $overrides,
        CarbonImmutable $hostDate,
        CarbonImmutable $slotStartUtc,
        CarbonImmutable $slotEndUtc,
        string $timezone
    ): bool {
        return $overrides
            ->where('is_available', false)
            ->contains(function (BookingAvailabilityOverride $override) use ($hostDate, $slotStartUtc, $slotEndUtc, $timezone): bool {
                if ($override->start_time === null || $override->end_time === null) {
                    return true;
                }

                $rangeStart = CarbonImmutable::createFromFormat(
                    'Y-m-d H:i:s',
                    $hostDate->format('Y-m-d').' '.$override->start_time,
                    $timezone
                )->utc();
                $rangeEnd = CarbonImmutable::createFromFormat(
                    'Y-m-d H:i:s',
                    $hostDate->format('Y-m-d').' '.$override->end_time,
                    $timezone
                )->utc();

                if ($rangeEnd->lessThanOrEqualTo($rangeStart)) {
                    return false;
                }

                return $rangeStart->lessThan($slotEndUtc) && $rangeEnd->greaterThan($slotStartUtc);
            });
    }
}
