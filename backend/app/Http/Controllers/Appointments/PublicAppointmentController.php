<?php

namespace App\Http\Controllers\Appointments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\StorePublicBookingRequest;
use App\Mail\BookingGuestConfirmationMail;
use App\Mail\BookingHostNotificationMail;
use App\Models\Booking;
use App\Models\BookingEventType;
use App\Models\User;
use App\Services\BookingAvailabilityService;
use App\Services\LeadCaptureService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PublicAppointmentController extends Controller
{
    public function index(string $username)
    {
        $host = $this->findHost($username);
        $referenceTime = now(config('app.timezone', 'UTC'))->toImmutable();

        $eventTypes = BookingEventType::query()
            ->where('host_user_id', $host->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->filter(fn (BookingEventType $eventType): bool => $eventType->isPubliclyBookable($referenceTime))
            ->map(fn (BookingEventType $eventType): array => [
                'id' => $eventType->id,
                'name' => $eventType->name,
                'slug' => $eventType->slug,
                'description' => $eventType->description,
                'duration_minutes' => $eventType->duration_minutes,
                'timezone' => $eventType->timezone,
                'schedule_type' => $eventType->schedule_type,
                'one_time_date' => $eventType->one_time_date?->toDateString(),
                'one_time_start_time' => $eventType->one_time_start_time ? substr((string) $eventType->one_time_start_time, 0, 5) : null,
                'one_time_end_time' => $eventType->one_time_end_time ? substr((string) $eventType->one_time_end_time, 0, 5) : null,
                'location_type' => $eventType->location_type,
                'location_value' => $eventType->location_value,
                'location_label' => $eventType->location_label,
            ])
            ->values();

        return Inertia::render('Appointments/PublicIndex', [
            'host' => [
                'name' => $host->name,
                'username' => $host->username,
                'avatar_url' => $this->resolveAvatarUrl($host),
                'welcome_message' => $host->booking_welcome_message,
            ],
            'event_types' => $eventTypes,
        ]);
    }

    public function show(Request $request, string $username, string $eventType, BookingAvailabilityService $availabilityService)
    {
        $resolvedEventType = $this->findEventType($username, $eventType);
        $timezone = (string) ($resolvedEventType->timezone ?: config('app.timezone', 'UTC'));
        $defaultSelectedDate = $resolvedEventType->isOneTime()
            ? ($resolvedEventType->one_time_date?->toDateString() ?? now($timezone)->toDateString())
            : now($timezone)->toDateString();
        $selectedDateString = trim((string) $request->query('date', $defaultSelectedDate));
        $monthKey = trim((string) $request->query('month', ''));

        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $selectedDateString)) {
            $selectedDateString = now($timezone)->toDateString();
        }

        $selectedDate = CarbonImmutable::createFromFormat('Y-m-d', $selectedDateString, $timezone);
        if (! $selectedDate) {
            $selectedDate = now($timezone)->startOfDay()->toImmutable();
            $selectedDateString = $selectedDate->toDateString();
        }

        $calendarMonth = $this->resolveCalendarMonth($monthKey, $selectedDate, $timezone);
        $availableDateKeys = $this->buildAvailableDateKeys($resolvedEventType, $availabilityService, $calendarMonth);

        $slots = $availabilityService->generateDailySlots($resolvedEventType, $selectedDate);
        if ($slots === []) {
            $replacementDate = $this->resolveReplacementDate($selectedDate, $availableDateKeys);
            if ($replacementDate !== null) {
                $selectedDate = CarbonImmutable::createFromFormat('Y-m-d', $replacementDate, $timezone) ?: $selectedDate;
                $selectedDateString = $selectedDate->toDateString();
                $slots = $availabilityService->generateDailySlots($resolvedEventType, $selectedDate);
            }
        }

        return Inertia::render('Appointments/Public', [
            'host' => [
                'name' => $resolvedEventType->host->name,
                'username' => $resolvedEventType->host->username,
                'avatar_url' => $this->resolveAvatarUrl($resolvedEventType->host),
            ],
            'event_type' => [
                'id' => $resolvedEventType->id,
                'name' => $resolvedEventType->name,
                'slug' => $resolvedEventType->slug,
                'description' => $resolvedEventType->description,
                'duration_minutes' => $resolvedEventType->duration_minutes,
                'timezone' => $resolvedEventType->timezone,
                'location_type' => $resolvedEventType->location_type,
                'location_value' => $resolvedEventType->location_value,
                'location_label' => $resolvedEventType->location_label,
            ],
            'selected_date' => $selectedDateString,
            'calendar_month' => $calendarMonth->format('Y-m'),
            'available_dates' => $availableDateKeys->values(),
            'slots' => $slots,
        ]);
    }

    public function store(
        StorePublicBookingRequest $request,
        string $username,
        string $eventType,
        BookingAvailabilityService $availabilityService,
        LeadCaptureService $leadCaptureService
    ) {
        $resolvedEventType = $this->findEventType($username, $eventType);
        $validated = $request->validated();
        $normalizedGuestEmail = strtolower($validated['guest_email']);

        $startsAtUtc = CarbonImmutable::parse($validated['starts_at'])->utc();
        if ($startsAtUtc->lessThanOrEqualTo(now()->utc()->toImmutable())) {
            return back()->withErrors(['starts_at' => 'Please select a future time slot.']);
        }

        $hostDate = $startsAtUtc->setTimezone($resolvedEventType->timezone)->startOfDay();
        $availableSlots = $availabilityService->generateDailySlots($resolvedEventType, $hostDate);
        $isListedSlot = collect($availableSlots)->contains(fn (array $slot): bool => $slot['starts_at'] === $startsAtUtc->toIso8601String());

        if (! $isListedSlot) {
            return back()->withErrors(['starts_at' => 'This time slot is no longer available.']);
        }

        $lockKey = $this->bookingLockKey($resolvedEventType, $startsAtUtc);

        try {
            $booking = Cache::lock($lockKey, 10)->block(5, function () use ($resolvedEventType, $validated, $startsAtUtc, $availabilityService, $normalizedGuestEmail): Booking {
                return DB::transaction(function () use ($resolvedEventType, $validated, $startsAtUtc, $availabilityService, $normalizedGuestEmail): Booking {
                    $resolvedEventType->refresh();
                    $endsAtUtc = $startsAtUtc->addMinutes((int) $resolvedEventType->duration_minutes);

                    if (! $availabilityService->isSlotStillAvailable($resolvedEventType, $startsAtUtc, $endsAtUtc)) {
                        throw ValidationException::withMessages([
                            'starts_at' => 'This time slot is no longer available.',
                        ]);
                    }

                    $guestHasUpcomingBooking = Booking::query()
                        ->where('booking_event_type_id', $resolvedEventType->id)
                        ->where('status', Booking::STATUS_CONFIRMED)
                        ->whereRaw('LOWER(guest_email) = ?', [$normalizedGuestEmail])
                        ->where('starts_at', '>=', now()->utc())
                        ->exists();

                    if ($guestHasUpcomingBooking) {
                        throw ValidationException::withMessages([
                            'guest_email' => 'You already have an upcoming booking for this event.',
                        ]);
                    }

                    return Booking::query()->create([
                        'booking_event_type_id' => $resolvedEventType->id,
                        'host_user_id' => $resolvedEventType->host_user_id,
                        'guest_name' => $validated['guest_name'],
                        'guest_email' => $normalizedGuestEmail,
                        'guest_phone' => $validated['guest_phone'],
                        'guest_timezone' => $validated['guest_timezone'] ?? null,
                        'guest_notes' => $validated['guest_notes'] ?? null,
                        'status' => Booking::STATUS_CONFIRMED,
                        'starts_at' => $startsAtUtc,
                        'ends_at' => $endsAtUtc,
                    ]);
                });
            });
        } catch (LockTimeoutException) {
            return back()->withErrors(['starts_at' => 'This time slot is currently being booked. Please try again.']);
        }

        $booking->loadMissing('eventType.host', 'host');
        $leadCaptureService->fromBooking($booking);

        Mail::to($booking->guest_email)->queue(new BookingGuestConfirmationMail($booking));
        Mail::to($booking->host->email)->queue(new BookingHostNotificationMail($booking));

        return redirect()->route('bookings.public.thanks', [
            'username' => $username,
            'eventType' => $resolvedEventType->slug,
            'booking' => $booking->id,
        ]);
    }

    public function thanks(string $username, string $eventType, Booking $booking)
    {
        $resolvedEventType = $this->findEventType($username, $eventType);

        $booking->loadMissing('eventType.host');
        if ((int) $booking->booking_event_type_id !== (int) $resolvedEventType->id) {
            abort(404);
        }

        if ($booking->status !== Booking::STATUS_CONFIRMED) {
            abort(404);
        }

        $startsAtInEventTimezone = $booking->starts_at
            ? CarbonImmutable::parse((string) $booking->getRawOriginal('starts_at'), 'UTC')->setTimezone($resolvedEventType->timezone)
            : null;
        $endsAtInEventTimezone = $booking->ends_at
            ? CarbonImmutable::parse((string) $booking->getRawOriginal('ends_at'), 'UTC')->setTimezone($resolvedEventType->timezone)
            : null;

        return Inertia::render('Appointments/PublicThanks', [
            'host' => [
                'name' => $resolvedEventType->host->name,
                'username' => $resolvedEventType->host->username,
                'avatar_url' => $this->resolveAvatarUrl($resolvedEventType->host),
            ],
            'event_type' => [
                'name' => $resolvedEventType->name,
                'slug' => $resolvedEventType->slug,
                'duration_minutes' => $resolvedEventType->duration_minutes,
                'timezone' => $resolvedEventType->timezone,
                'location_type' => $resolvedEventType->location_type,
                'location_value' => $resolvedEventType->location_value,
                'location_label' => $this->resolveLocationLabel($resolvedEventType),
            ],
            'booking' => [
                'id' => $booking->id,
                'guest_name' => $booking->guest_name,
                'guest_email' => $booking->guest_email,
                'guest_phone' => $booking->guest_phone,
                'guest_notes' => $booking->guest_notes,
                'starts_at' => $booking->starts_at?->toIso8601String(),
                'ends_at' => $booking->ends_at?->toIso8601String(),
                'date_label' => $startsAtInEventTimezone?->format('D, M j, Y'),
                'time_label' => $startsAtInEventTimezone && $endsAtInEventTimezone
                    ? $startsAtInEventTimezone->format('g:i A').' - '.$endsAtInEventTimezone->format('g:i A')
                    : null,
            ],
        ]);
    }

    private function findEventType(string $username, string $eventType): BookingEventType
    {
        $resolvedEventType = BookingEventType::query()
            ->where('slug', $eventType)
            ->where('is_active', true)
            ->whereHas('host', fn ($query) => $query->where('username', $username))
            ->with(['host', 'availabilityRules'])
            ->firstOrFail();

        abort_unless($resolvedEventType->isPubliclyBookable(now((string) ($resolvedEventType->timezone ?: config('app.timezone', 'UTC')))->toImmutable()), 404);

        return $resolvedEventType;
    }

    private function findHost(string $username): User
    {
        return User::query()
            ->where('username', $username)
            ->firstOrFail();
    }

    private function resolveCalendarMonth(string $monthKey, CarbonImmutable $selectedDate, string $timezone): CarbonImmutable
    {
        if (preg_match('/^\d{4}-\d{2}$/', $monthKey) === 1) {
            $monthStart = CarbonImmutable::createFromFormat('Y-m-d', $monthKey.'-01', $timezone);
            if ($monthStart) {
                return $monthStart->startOfMonth();
            }
        }

        return $selectedDate->startOfMonth();
    }

    /**
     * @return Collection<int, string>
     */
    private function buildAvailableDateKeys(
        BookingEventType $eventType,
        BookingAvailabilityService $availabilityService,
        CarbonImmutable $calendarMonth
    ): Collection {
        $eventType->loadMissing('host');
        $monthStart = $calendarMonth->startOfMonth();
        $monthEnd = $calendarMonth->endOfMonth();
        $timezone = $eventType->timezone ?: ($eventType->host->booking_timezone ?: (string) config('app.timezone', 'UTC'));
        $today = now($timezone)->startOfDay()->toImmutable();

        $windowDays = (int) ($eventType->booking_window_days
            ?? $eventType->host->default_booking_window_days
            ?? 60);
        $latestAllowedDate = $today->addDays($windowDays);

        $availableDateKeys = collect();
        for ($date = $monthStart; $date->lessThanOrEqualTo($monthEnd); $date = $date->addDay()) {
            if ($date->lessThan($today)) {
                continue;
            }
            if ($date->greaterThan($latestAllowedDate)) {
                continue;
            }

            $slots = $availabilityService->generateDailySlots($eventType, $date);
            if ($slots !== []) {
                $availableDateKeys->push($date->toDateString());
            }
        }

        return $availableDateKeys;
    }

    private function resolveReplacementDate(CarbonImmutable $selectedDate, Collection $availableDateKeys): ?string
    {
        if ($availableDateKeys->isEmpty()) {
            return null;
        }

        return $availableDateKeys
            ->first(fn (string $dateKey): bool => $dateKey >= $selectedDate->toDateString())
            ?? $availableDateKeys->first();
    }

    private function resolveAvatarUrl(User $host): ?string
    {
        $avatarUrl = data_get($host, 'avatar_url');
        if (is_string($avatarUrl) && trim($avatarUrl) !== '') {
            return $avatarUrl;
        }

        $avatar = data_get($host, 'avatar');
        if (is_string($avatar) && trim($avatar) !== '') {
            return $avatar;
        }

        return null;
    }

    private function bookingLockKey(BookingEventType $eventType, CarbonImmutable $startsAtUtc): string
    {
        return "booking:host:{$eventType->host_user_id}:slot:{$startsAtUtc->timestamp}";
    }

    private function resolveLocationLabel(BookingEventType $eventType): string
    {
        if (is_string($eventType->location_label) && trim($eventType->location_label) !== '') {
            return trim($eventType->location_label);
        }

        return match ($eventType->location_type) {
            'google_meet' => 'Google Meet',
            'zoom_call' => 'Zoom Call',
            'in_person' => 'In Person',
            'phone' => 'Phone Call',
            'custom' => 'Custom',
            default => '',
        };
    }
}
