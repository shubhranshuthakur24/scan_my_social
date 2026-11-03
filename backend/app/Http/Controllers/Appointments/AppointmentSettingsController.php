<?php

namespace App\Http\Controllers\Appointments;

use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\ManageBookingEventTypeRequest;
use App\Models\Booking;
use App\Models\BookingAvailabilityOverride;
use App\Models\BookingEventType;
use App\Models\BookingHostAvailabilityRule;
use App\Models\User;
use App\Services\BookingAvailabilityService;
use App\Services\LeadCaptureService;
use App\Services\LinkPageUsernameService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AppointmentSettingsController extends Controller
{
    public function index(Request $request, LinkPageUsernameService $usernameService): Response
    {
        $user = $this->ensureHostUsername($request->user(), $usernameService);

        $eventTypes = BookingEventType::query()
            ->where('host_user_id', $user->id)
            ->with([
                'bookings' => fn ($query) => $query
                    ->where('status', Booking::STATUS_CONFIRMED)
                    ->where('starts_at', '>=', now()->utc())
                    ->orderBy('starts_at')
                    ->limit(1),
            ])
            ->withCount([
                'bookings as upcoming_bookings_count' => fn ($query) => $query
                    ->where('status', Booking::STATUS_CONFIRMED)
                    ->where('starts_at', '>=', now()->utc()),
            ])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return Inertia::render('Appointments/Index', [
            'host' => [
                'id' => $user->id,
                'username' => $user->username,
            ],
            'app_timezone' => $user->booking_timezone ?: config('app.timezone', 'UTC'),
            'event_types' => $eventTypes
                ->map(fn (BookingEventType $eventType): array => [
                    ...$this->formatEventType($eventType),
                    'upcoming_bookings_count' => (int) $eventType->upcoming_bookings_count,
                    'next_booking' => $eventType->bookings->isNotEmpty()
                        ? $this->formatBooking($eventType->bookings->first(), $user->booking_timezone ?: config('app.timezone', 'UTC'))
                        : null,
                ])
                ->values(),
        ]);
    }

    public function calendar(Request $request, LinkPageUsernameService $usernameService): Response
    {
        $user = $this->ensureHostUsername($request->user(), $usernameService);
        $timezone = (string) ($user->booking_timezone ?: config('app.timezone', 'UTC'));
        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $calendarMonth = isset($validated['month'])
            ? CarbonImmutable::createFromFormat('Y-m', $validated['month'], $timezone)->startOfMonth()
            : now($timezone)->toImmutable()->startOfMonth();

        $monthStartUtc = $calendarMonth->startOfMonth()->utc();
        $monthEndUtc = $calendarMonth->endOfMonth()->endOfDay()->utc();

        $selectedDate = isset($validated['date'])
            ? CarbonImmutable::createFromFormat('Y-m-d', $validated['date'], $timezone)
            : now($timezone)->toImmutable();

        if (! $selectedDate->betweenIncluded($calendarMonth->startOfMonth(), $calendarMonth->endOfMonth())) {
            $selectedDate = $calendarMonth->startOfMonth();
        }

        $bookings = Booking::query()
            ->where('host_user_id', $user->id)
            ->where('status', Booking::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [$monthStartUtc, $monthEndUtc])
            ->with([
                'eventType' => fn ($query) => $query->withTrashed()->select(['id', 'name']),
            ])
            ->orderBy('starts_at')
            ->get();

        $dailyCounts = [];
        foreach ($bookings as $booking) {
            $dateKey = CarbonImmutable::instance($booking->starts_at)->setTimezone($timezone)->toDateString();
            $dailyCounts[$dateKey] = ($dailyCounts[$dateKey] ?? 0) + 1;
        }
        ksort($dailyCounts);

        $selectedDateKey = $selectedDate->toDateString();
        $selectedDayBookings = $bookings
            ->filter(fn (Booking $booking): bool => CarbonImmutable::instance($booking->starts_at)->setTimezone($timezone)->toDateString() === $selectedDateKey)
            ->map(fn (Booking $booking): array => $this->formatCalendarBooking($booking, $timezone))
            ->values();

        return Inertia::render('Appointments/Calendar', [
            'host' => [
                'id' => $user->id,
                'username' => $user->username,
            ],
            'app_timezone' => $timezone,
            'calendar_month' => $calendarMonth->format('Y-m'),
            'selected_date' => $selectedDateKey,
            'daily_counts' => $dailyCounts,
            'selected_day_bookings' => $selectedDayBookings,
        ]);
    }

    public function upcoming(Request $request, LinkPageUsernameService $usernameService): Response
    {
        $user = $this->ensureHostUsername($request->user(), $usernameService);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'event_type' => [
                'nullable',
                'integer',
                Rule::exists('booking_event_types', 'id')->where(
                    fn ($query) => $query->where('host_user_id', $user->id)
                ),
            ],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
            'sort_by' => ['nullable', 'string', 'in:starts_at_asc,starts_at_desc'],
        ]);

        $search = isset($validated['search']) ? trim($validated['search']) : '';
        $hostTimezone = (string) ($user->booking_timezone ?: config('app.timezone', 'UTC'));
        $dateFromUtc = isset($validated['date_from'])
            ? CarbonImmutable::createFromFormat('Y-m-d', $validated['date_from'], $hostTimezone)?->startOfDay()->utc()
            : null;
        $dateToUtc = isset($validated['date_to'])
            ? CarbonImmutable::createFromFormat('Y-m-d', $validated['date_to'], $hostTimezone)?->endOfDay()->utc()
            : null;
        $sortBy = $validated['sort_by'] ?? 'starts_at_asc';

        $bookings = Booking::query()
            ->where('host_user_id', $user->id)
            ->where('status', Booking::STATUS_CONFIRMED)
            ->where('starts_at', '>=', $dateFromUtc ?: now($hostTimezone)->startOfDay()->utc())
            ->when($validated['event_type'] ?? null, fn ($query, $eventTypeId) => $query->where('booking_event_type_id', $eventTypeId))
            ->when($dateToUtc, fn ($query) => $query->where('starts_at', '<=', $dateToUtc))
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($nested) use ($search): void {
                    $nested
                        ->where('guest_name', 'like', '%'.$search.'%')
                        ->orWhere('guest_email', 'like', '%'.$search.'%')
                        ->orWhere('guest_phone', 'like', '%'.$search.'%')
                        ->orWhere('guest_notes', 'like', '%'.$search.'%')
                        ->orWhereHas('eventType', fn ($eventTypeQuery) => $eventTypeQuery->where('name', 'like', '%'.$search.'%'));
                });
            })
            ->with([
                'eventType' => fn ($query) => $query->withTrashed()->select(['id', 'name', 'slug', 'host_user_id', 'schedule_type', 'deleted_at']),
            ])
            ->orderBy('starts_at', $sortBy === 'starts_at_desc' ? 'desc' : 'asc')
            ->paginate(20)
            ->withQueryString();

        $eventTypeOptions = BookingEventType::query()
            ->where('host_user_id', $user->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (BookingEventType $eventType): array => [
                'id' => $eventType->id,
                'name' => $eventType->name,
            ])
            ->values();

        $todayStartUtc = now($hostTimezone)->startOfDay()->utc();
        $todayEndUtc = now($hostTimezone)->endOfDay()->utc();
        $todayCount = Booking::query()
            ->where('host_user_id', $user->id)
            ->where('status', Booking::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [$todayStartUtc, $todayEndUtc])
            ->count();

        $uniqueClientsCount = Booking::query()
            ->where('host_user_id', $user->id)
            ->where('status', Booking::STATUS_CONFIRMED)
            ->where('starts_at', '>=', now($hostTimezone)->startOfDay()->utc())
            ->distinct('guest_email')
            ->count('guest_email');

        $thirtyDaysEndUtc = now($hostTimezone)->addDays(30)->endOfDay()->utc();
        $next30DaysCount = Booking::query()
            ->where('host_user_id', $user->id)
            ->where('status', Booking::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [now()->utc(), $thirtyDaysEndUtc])
            ->count();

        $popularEventRecord = Booking::query()
            ->where('bookings.host_user_id', $user->id)
            ->where('bookings.status', Booking::STATUS_CONFIRMED)
            ->where('bookings.starts_at', '>=', now()->utc())
            ->select('booking_event_type_id', DB::raw('count(*) as count'))
            ->groupBy('booking_event_type_id')
            ->orderByDesc('count')
            ->first();

        $popularEventName = 'N/A';
        $popularEventCount = 0;
        if ($popularEventRecord) {
            $eventType = BookingEventType::find($popularEventRecord->booking_event_type_id);
            if ($eventType) {
                $popularEventName = $eventType->name;
                $popularEventCount = $popularEventRecord->count;
            }
        }

        return Inertia::render('Appointments/Upcoming', [
            'host' => [
                'id' => $user->id,
                'username' => $user->username,
            ],
            'app_timezone' => $hostTimezone,
            'filters' => [
                'search' => $search,
                'event_type' => isset($validated['event_type']) ? (string) $validated['event_type'] : '',
                'date_from' => $validated['date_from'] ?? '',
                'date_to' => $validated['date_to'] ?? '',
                'sort_by' => $sortBy,
            ],
            'event_type_options' => $eventTypeOptions,
            'bookings' => [
                ...$bookings->toArray(),
                'data' => $bookings->getCollection()->map(
                    fn (Booking $booking): array => $this->formatBooking($booking, $hostTimezone)
                )->values(),
            ],
            'kpis' => [
                'today_count' => $todayCount,
                'unique_clients' => $uniqueClientsCount,
                'next_30_days' => $next30DaysCount,
                'popular_event' => [
                    'name' => $popularEventName,
                    'count' => $popularEventCount,
                ],
            ],
        ]);
    }

    public function exportUpcoming(Request $request, LinkPageUsernameService $usernameService): StreamedResponse
    {
        $user = $this->ensureHostUsername($request->user(), $usernameService);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'event_type' => [
                'nullable',
                'integer',
                Rule::exists('booking_event_types', 'id')->where(
                    fn ($query) => $query->where('host_user_id', $user->id)
                ),
            ],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
            'sort_by' => ['nullable', 'string', 'in:starts_at_asc,starts_at_desc'],
        ]);

        $search = isset($validated['search']) ? trim($validated['search']) : '';
        $hostTimezone = (string) ($user->booking_timezone ?: config('app.timezone', 'UTC'));
        $dateFromUtc = isset($validated['date_from'])
            ? CarbonImmutable::createFromFormat('Y-m-d', $validated['date_from'], $hostTimezone)?->startOfDay()->utc()
            : null;
        $dateToUtc = isset($validated['date_to'])
            ? CarbonImmutable::createFromFormat('Y-m-d', $validated['date_to'], $hostTimezone)?->endOfDay()->utc()
            : null;
        $sortBy = $validated['sort_by'] ?? 'starts_at_asc';

        $fileName = 'upcoming_appointments_'.now()->format('Ymd_His').'.csv';

        return response()->streamDownload(function () use ($user, $search, $validated, $dateFromUtc, $dateToUtc, $hostTimezone, $sortBy): void {
            $output = fopen('php://output', 'w');

            if ($output === false) {
                return;
            }

            fputcsv($output, [
                'Guest Name',
                'Guest Email',
                'Guest Phone',
                'Event Type',
                'Starts At ('.$hostTimezone.')',
                'Duration (Min)',
                'Status',
                'Guest Notes',
            ]);

            Booking::query()
                ->where('host_user_id', $user->id)
                ->where('status', Booking::STATUS_CONFIRMED)
                ->where('starts_at', '>=', $dateFromUtc ?: now($hostTimezone)->startOfDay()->utc())
                ->when($validated['event_type'] ?? null, fn ($query, $eventTypeId) => $query->where('booking_event_type_id', $eventTypeId))
                ->when($dateToUtc, fn ($query) => $query->where('starts_at', '<=', $dateToUtc))
                ->when($search !== '', function ($query) use ($search): void {
                    $query->where(function ($nested) use ($search): void {
                        $nested
                            ->where('guest_name', 'like', '%'.$search.'%')
                            ->orWhere('guest_email', 'like', '%'.$search.'%')
                            ->orWhere('guest_phone', 'like', '%'.$search.'%')
                            ->orWhere('guest_notes', 'like', '%'.$search.'%')
                            ->orWhereHas('eventType', fn ($eventTypeQuery) => $eventTypeQuery->where('name', 'like', '%'.$search.'%'));
                    });
                })
                ->with([
                    'eventType' => fn ($query) => $query->withTrashed()->select(['id', 'name', 'deleted_at']),
                ])
                ->orderBy('starts_at', $sortBy === 'starts_at_desc' ? 'desc' : 'asc')
                ->chunk(100, function ($bookings) use ($output, $hostTimezone): void {
                    foreach ($bookings as $booking) {
                        $localStartsAt = $booking->starts_at?->setTimezone($hostTimezone)?->toDateTimeString();

                        fputcsv($output, [
                            $booking->guest_name,
                            $booking->guest_email,
                            $booking->guest_phone ?: '',
                            $booking->eventType?->name ?: ($booking->event_type_name ?: 'Event type removed'),
                            $localStartsAt,
                            $booking->duration,
                            $booking->status,
                            $booking->guest_notes ?: '',
                        ]);
                    }
                });

            fclose($output);
        }, $fileName, [
            'Content-Type' => 'text/csv',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    public function settings(Request $request, LinkPageUsernameService $usernameService): Response
    {
        $user = $this->ensureHostUsername($request->user(), $usernameService);
        $this->ensureHostAvailabilityRules($user);

        return Inertia::render('Appointments/Settings', [
            'host' => [
                'id' => $user->id,
                'username' => $user->username,
            ],
            'app_timezone' => $user->booking_timezone ?: config('app.timezone', 'UTC'),
            'bookingAvailability' => [
                'global_availability_rules' => $this->formatHostAvailabilityRules($user),
                'availability_overrides' => $this->formatHostAvailabilityOverrides($user),
                'lock_time_slots_across_event_types' => (bool) $user->lock_time_slots_across_event_types,
                'booking_timezone' => $user->booking_timezone,
                'booking_welcome_message' => $user->booking_welcome_message,
                'default_minimum_booking_notice_minutes' => (int) ($user->default_minimum_booking_notice_minutes ?? 120),
                'default_booking_window_days' => (int) ($user->default_booking_window_days ?? 60),
            ],
        ]);
    }

    public function updateGeneralSettings(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'booking_timezone' => ['nullable', 'string', 'max:80', 'timezone:all'],
            'booking_welcome_message' => ['nullable', 'string', 'max:1000'],
            'default_minimum_booking_notice_minutes' => ['required', 'integer', 'min:0', 'max:14400'],
            'default_booking_window_days' => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        $user->update([
            'booking_timezone' => $validated['booking_timezone'],
            'booking_welcome_message' => $validated['booking_welcome_message'],
            'default_minimum_booking_notice_minutes' => $validated['default_minimum_booking_notice_minutes'],
            'default_booking_window_days' => $validated['default_booking_window_days'],
        ]);

        return back()->with('success', 'General booking settings updated.');
    }

    public function create(Request $request, LinkPageUsernameService $usernameService): Response
    {
        $user = $this->ensureHostUsername($request->user(), $usernameService);
        $this->ensureHostAvailabilityRules($user);

        return Inertia::render('Appointments/Create', [
            'host' => [
                'id' => $user->id,
                'username' => $user->username,
            ],
            'app_timezone' => $user->booking_timezone ?: config('app.timezone', 'UTC'),
            'global_availability_rules' => $this->formatHostAvailabilityRules($user),
            'lock_time_slots_across_event_types' => (bool) $user->lock_time_slots_across_event_types,
        ]);
    }

    public function edit(Request $request, BookingEventType $eventType, LinkPageUsernameService $usernameService): Response
    {
        $user = $this->ensureHostUsername($request->user(), $usernameService);
        $this->authorizeEventType($user, $eventType);
        $eventType->loadMissing('availabilityRules');

        return Inertia::render('Appointments/Edit', [
            'host' => [
                'id' => $user->id,
                'username' => $user->username,
            ],
            'app_timezone' => $user->booking_timezone ?: config('app.timezone', 'UTC'),
            'event_type' => $this->formatEventType($eventType, true),
            'lock_time_slots_across_event_types' => (bool) $user->lock_time_slots_across_event_types,
        ]);
    }

    public function store(ManageBookingEventTypeRequest $request)
    {
        $user = $request->user();
        $validated = $request->validated();

        $eventType = BookingEventType::query()->create([
            'host_user_id' => $user->id,
            'name' => $validated['name'],
            'slug' => $this->generateUniqueSlug($user->id, $validated['name']),
            'description' => $validated['description'] ?? null,
            'duration_minutes' => $validated['duration_minutes'],
            'buffer_minutes' => $validated['buffer_minutes'],
            'timezone' => $validated['timezone'],
            'schedule_type' => $validated['schedule_type'],
            'one_time_date' => $validated['one_time_date'] ?? null,
            'one_time_start_time' => $validated['one_time_start_time'] ?? null,
            'one_time_end_time' => $validated['one_time_end_time'] ?? null,
            'location_type' => $validated['location_type'] ?? null,
            'location_value' => $validated['location_value'] ?? null,
            'location_label' => $validated['location_label'] ?? null,
            'allows_multi_seat_booking' => $validated['allows_multi_seat_booking'],
            'seat_capacity' => $validated['allows_multi_seat_booking'] && $validated['seat_limit_mode'] === 'limited'
                ? $validated['seat_capacity']
                : null,
            'exclude_from_global_slot_lock' => $validated['exclude_from_global_slot_lock'],
            'is_active' => $validated['is_active'],
            'minimum_booking_notice_minutes' => $validated['minimum_booking_notice_minutes'] ?? null,
            'booking_window_days' => $validated['booking_window_days'] ?? null,
            'sort_order' => ((int) BookingEventType::query()->where('host_user_id', $user->id)->max('sort_order')) + 1,
        ]);

        $this->replaceAvailabilityRules($eventType, $validated['availability_rules']);

        return redirect()->route('appointments.index')->with('success', 'Booking type created.');
    }

    public function update(ManageBookingEventTypeRequest $request, BookingEventType $eventType)
    {
        $this->authorizeEventType($request->user(), $eventType);
        $validated = $request->validated();

        $eventType->update([
            'name' => $validated['name'],
            'slug' => $this->generateUniqueSlug((int) $eventType->host_user_id, $validated['name'], $eventType->id),
            'description' => $validated['description'] ?? null,
            'duration_minutes' => $validated['duration_minutes'],
            'buffer_minutes' => $validated['buffer_minutes'],
            'timezone' => $validated['timezone'],
            'schedule_type' => $validated['schedule_type'],
            'one_time_date' => $validated['one_time_date'] ?? null,
            'one_time_start_time' => $validated['one_time_start_time'] ?? null,
            'one_time_end_time' => $validated['one_time_end_time'] ?? null,
            'location_type' => $validated['location_type'] ?? null,
            'location_value' => $validated['location_value'] ?? null,
            'location_label' => $validated['location_label'] ?? null,
            'allows_multi_seat_booking' => $validated['allows_multi_seat_booking'],
            'seat_capacity' => $validated['allows_multi_seat_booking'] && $validated['seat_limit_mode'] === 'limited'
                ? $validated['seat_capacity']
                : null,
            'exclude_from_global_slot_lock' => $validated['exclude_from_global_slot_lock'],
            'is_active' => $validated['is_active'],
            'minimum_booking_notice_minutes' => $validated['minimum_booking_notice_minutes'] ?? null,
            'booking_window_days' => $validated['booking_window_days'] ?? null,
        ]);

        $this->replaceAvailabilityRules($eventType, $validated['availability_rules']);

        return redirect()->route('appointments.index')->with('success', 'Booking type updated.');
    }

    public function destroy(Request $request, BookingEventType $eventType)
    {
        $this->authorizeEventType($request->user(), $eventType);
        $eventType->delete();

        return back()->with('success', 'Booking type deleted.');
    }

    public function cancelBooking(Request $request, Booking $booking, LeadCaptureService $leadCaptureService)
    {
        $this->authorizeBooking($request->user(), $booking);

        if ($booking->status !== Booking::STATUS_CONFIRMED) {
            return back();
        }

        $booking->update([
            'status' => Booking::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancelled_by_host_id' => $request->user()->id,
            'cancellation_reason' => 'Cancelled by host',
        ]);

        $leadCaptureService->syncBookingStatus($booking);

        return back()->with('success', 'Booking cancelled.');
    }

    public function rescheduleAvailability(Request $request, Booking $booking, BookingAvailabilityService $availabilityService): JsonResponse
    {
        $this->authorizeBooking($request->user(), $booking);

        if ($booking->status !== Booking::STATUS_CONFIRMED) {
            return response()->json([
                'message' => 'Only confirmed bookings can be rescheduled.',
            ], 422);
        }

        $eventType = $booking->eventType()->withTrashed()->with(['host', 'availabilityRules'])->first();

        if (! $eventType) {
            return response()->json([
                'message' => 'Event type not found.',
            ], 404);
        }

        if ($eventType->trashed()) {
            return response()->json([
                'message' => 'Cannot reschedule bookings for deleted event types.',
            ], 422);
        }

        $timezone = (string) ($eventType->timezone ?: config('app.timezone', 'UTC'));
        $currentDate = CarbonImmutable::parse((string) $booking->getRawOriginal('starts_at'), 'UTC')
            ->setTimezone($timezone)
            ->startOfDay();

        $validated = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $selectedDate = isset($validated['date'])
            ? CarbonImmutable::createFromFormat('Y-m-d', $validated['date'], $timezone)
            : $currentDate;

        if (! $selectedDate) {
            $selectedDate = $currentDate;
        }

        $calendarMonth = $this->resolveAvailabilityCalendarMonth(
            isset($validated['month']) ? (string) $validated['month'] : '',
            $selectedDate,
            $timezone
        );

        $availableDateKeys = $this->buildAvailableDateKeysForEventType(
            $eventType,
            $availabilityService,
            $calendarMonth,
            (int) $booking->id
        );

        $slots = $availabilityService->generateDailySlots($eventType, $selectedDate, (int) $booking->id);

        return response()->json([
            'timezone' => $timezone,
            'selected_date' => $selectedDate->toDateString(),
            'calendar_month' => $calendarMonth->format('Y-m'),
            'schedule_type' => $eventType->schedule_type,
            'one_time_date' => $eventType->one_time_date?->toDateString(),
            'available_dates' => $availableDateKeys->values()->all(),
            'slots' => $slots,
        ]);
    }

    public function rescheduleBooking(Request $request, Booking $booking, BookingAvailabilityService $availabilityService)
    {
        $this->authorizeBooking($request->user(), $booking);

        $payload = $request->validate([
            'starts_at' => ['required', 'date'],
        ]);

        if ($booking->status !== Booking::STATUS_CONFIRMED) {
            return back()->withErrors(['starts_at' => 'Only confirmed bookings can be rescheduled.'], 'bookingReschedule');
        }

        $eventType = $booking->eventType()->withTrashed()->first();

        if (! $eventType) {
            return back()->withErrors(['starts_at' => 'Event type not found.'], 'bookingReschedule');
        }

        if ($eventType->trashed()) {
            return back()->withErrors(['starts_at' => 'Cannot reschedule bookings for deleted event types.'], 'bookingReschedule');
        }

        $startsAtUtc = CarbonImmutable::parse($payload['starts_at'])->utc();

        if ($startsAtUtc->lessThanOrEqualTo(now()->utc()->toImmutable())) {
            return back()->withErrors(['starts_at' => 'Please select a future time slot.'], 'bookingReschedule');
        }

        $hostDate = $startsAtUtc->setTimezone($eventType->timezone)->startOfDay();
        $availableSlots = $availabilityService->generateDailySlots($eventType, $hostDate, (int) $booking->id);
        $isListedSlot = collect($availableSlots)->contains(fn (array $slot): bool => $slot['starts_at'] === $startsAtUtc->toIso8601String());

        if (! $isListedSlot) {
            return back()->withErrors(['starts_at' => 'This time slot is no longer available.'], 'bookingReschedule');
        }

        $lockKey = $this->bookingLockKey($eventType, $startsAtUtc);

        try {
            Cache::lock($lockKey, 10)->block(5, function () use ($booking, $eventType, $startsAtUtc, $availabilityService): void {
                DB::transaction(function () use ($booking, $eventType, $startsAtUtc, $availabilityService): void {
                    $eventType->refresh();
                    $endsAtUtc = $startsAtUtc->addMinutes((int) $eventType->duration_minutes);

                    if (! $availabilityService->isSlotStillAvailable($eventType, $startsAtUtc, $endsAtUtc, (int) $booking->id)) {
                        throw ValidationException::withMessages([
                            'starts_at' => 'This time slot is no longer available.',
                        ]);
                    }

                    $booking->update([
                        'starts_at' => $startsAtUtc,
                        'ends_at' => $endsAtUtc,
                    ]);
                });
            });
        } catch (LockTimeoutException) {
            return back()->withErrors(['starts_at' => 'This time slot is currently being updated. Please try again.'], 'bookingReschedule');
        }

        return back()->with('success', 'Booking rescheduled.');
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     */
    private function replaceAvailabilityRules(BookingEventType $eventType, array $rules): void
    {
        $eventType->availabilityRules()->delete();

        foreach ($rules as $rule) {
            $eventType->availabilityRules()->create([
                'day_of_week' => (int) $rule['day_of_week'],
                'start_time' => (string) $rule['start_time'].':00',
                'end_time' => (string) $rule['end_time'].':00',
                'is_active' => (bool) $rule['is_active'],
            ]);
        }
    }

    private function generateUniqueSlug(int $hostUserId, string $name, ?int $ignoreEventTypeId = null): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'appointment';
        }

        $slug = $base;
        $suffix = 2;

        while (BookingEventType::query()
            ->where('host_user_id', $hostUserId)
            ->when($ignoreEventTypeId, fn ($query) => $query->whereKeyNot($ignoreEventTypeId))
            ->where('slug', $slug)
            ->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }

    private function authorizeEventType(User $user, BookingEventType $eventType): void
    {
        if ((int) $eventType->host_user_id !== (int) $user->id) {
            abort(403);
        }
    }

    private function authorizeBooking(User $user, Booking $booking): void
    {
        if ((int) $booking->host_user_id !== (int) $user->id) {
            abort(403);
        }
    }

    private function ensureHostUsername(User $user, LinkPageUsernameService $usernameService): User
    {
        if (! $user->username) {
            $user->forceFill([
                'username' => $usernameService->generate($user->name, (int) $user->id),
            ])->save();
        }

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function formatBooking(Booking $booking, ?string $timezone = null): array
    {
        $tz = $timezone ?: config('app.timezone', 'UTC');
        $startsAtLocal = $booking->starts_at ? CarbonImmutable::instance($booking->starts_at)->setTimezone($tz) : null;
        $endsAtLocal = $booking->ends_at ? CarbonImmutable::instance($booking->ends_at)->setTimezone($tz) : null;

        return [
            'id' => $booking->id,
            'guest_name' => $booking->guest_name,
            'guest_email' => $booking->guest_email,
            'guest_phone' => $booking->guest_phone,
            'guest_notes' => $booking->guest_notes,
            'starts_at' => $booking->starts_at?->toIso8601String(),
            'ends_at' => $booking->ends_at?->toIso8601String(),
            'starts_at_formatted' => $startsAtLocal?->translatedFormat('M j, Y, g:i A'),
            'ends_at_formatted' => $endsAtLocal?->translatedFormat('M j, Y, g:i A'),
            'starts_at_date_key' => $startsAtLocal?->toDateString(),
            'starts_at_date_label' => $startsAtLocal?->translatedFormat('D, M j, Y'),
            'slot_time_label' => $startsAtLocal && $endsAtLocal
                ? $startsAtLocal->translatedFormat('g:i A').' - '.$endsAtLocal->translatedFormat('g:i A')
                : ($startsAtLocal ? $startsAtLocal->translatedFormat('g:i A') : ''),
            'event_type' => $booking->relationLoaded('eventType') && $booking->eventType
                ? [
                    'id' => $booking->eventType->id,
                    'name' => $booking->eventType->name,
                    'slug' => $booking->eventType->slug,
                    'schedule_type' => $booking->eventType->schedule_type,
                    'deleted_at' => $booking->eventType->deleted_at?->toIso8601String(),
                ]
                : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatCalendarBooking(Booking $booking, string $timezone): array
    {
        $startsAtLocal = $booking->starts_at ? CarbonImmutable::instance($booking->starts_at)->setTimezone($timezone) : null;
        $endsAtLocal = $booking->ends_at ? CarbonImmutable::instance($booking->ends_at)->setTimezone($timezone) : null;

        return [
            'id' => $booking->id,
            'guest_name' => $booking->guest_name,
            'guest_email' => $booking->guest_email,
            'guest_phone' => $booking->guest_phone,
            'event_type_name' => $booking->relationLoaded('eventType') ? $booking->eventType?->name : null,
            'starts_at' => $booking->starts_at?->toIso8601String(),
            'ends_at' => $booking->ends_at?->toIso8601String(),
            'starts_at_local' => $startsAtLocal?->format('h:i A'),
            'ends_at_local' => $endsAtLocal?->format('h:i A'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatEventType(BookingEventType $eventType, bool $includeRules = false): array
    {
        $payload = [
            'id' => $eventType->id,
            'name' => $eventType->name,
            'slug' => $eventType->slug,
            'description' => $eventType->description,
            'duration_minutes' => $eventType->duration_minutes,
            'buffer_minutes' => $eventType->buffer_minutes,
            'timezone' => $eventType->timezone,
            'schedule_type' => $eventType->schedule_type,
            'one_time_date' => $eventType->one_time_date?->toDateString(),
            'one_time_start_time' => $eventType->one_time_start_time ? substr((string) $eventType->one_time_start_time, 0, 5) : null,
            'one_time_end_time' => $eventType->one_time_end_time ? substr((string) $eventType->one_time_end_time, 0, 5) : null,
            'location_type' => $eventType->location_type,
            'location_value' => $eventType->location_value,
            'location_label' => $eventType->location_label,
            'allows_multi_seat_booking' => $eventType->allows_multi_seat_booking,
            'seat_capacity' => $eventType->seat_capacity,
            'exclude_from_global_slot_lock' => $eventType->exclude_from_global_slot_lock,
            'is_active' => $eventType->is_active,
            'minimum_booking_notice_minutes' => $eventType->minimum_booking_notice_minutes,
            'booking_window_days' => $eventType->booking_window_days,
        ];

        if (! $includeRules) {
            return $payload;
        }

        return [
            ...$payload,
            'availability_rules' => $eventType->availabilityRules
                ->map(fn ($rule): array => [
                    'id' => $rule->id,
                    'day_of_week' => $rule->day_of_week,
                    'start_time' => substr((string) $rule->start_time, 0, 5),
                    'end_time' => substr((string) $rule->end_time, 0, 5),
                    'is_active' => $rule->is_active,
                ])
                ->values(),
        ];
    }

    private function bookingLockKey(BookingEventType $eventType, CarbonImmutable $startsAtUtc): string
    {
        return "booking:host:{$eventType->host_user_id}:slot:{$startsAtUtc->timestamp}";
    }

    private function resolveAvailabilityCalendarMonth(string $monthKey, CarbonImmutable $selectedDate, string $timezone): CarbonImmutable
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
    private function buildAvailableDateKeysForEventType(
        BookingEventType $eventType,
        BookingAvailabilityService $availabilityService,
        CarbonImmutable $calendarMonth,
        ?int $ignoreBookingId = null
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
            if ($date->lessThan($today) && ! $date->isSameDay($today)) {
                continue;
            }
            if ($date->greaterThan($latestAllowedDate)) {
                continue;
            }

            $slots = $availabilityService->generateDailySlots($eventType, $date, $ignoreBookingId);
            if ($slots !== []) {
                $availableDateKeys->push($date->toDateString());
            }
        }

        return $availableDateKeys;
    }

    private function ensureHostAvailabilityRules(User $user): void
    {
        $existingDays = BookingHostAvailabilityRule::query()
            ->where('host_user_id', $user->id)
            ->pluck('day_of_week')
            ->map(fn ($day): int => (int) $day)
            ->all();

        $defaultRules = [
            ['day_of_week' => 0, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => false],
            ['day_of_week' => 1, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => true],
            ['day_of_week' => 2, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => true],
            ['day_of_week' => 3, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => true],
            ['day_of_week' => 4, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => true],
            ['day_of_week' => 5, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => true],
            ['day_of_week' => 6, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => false],
        ];

        foreach ($defaultRules as $rule) {
            if (in_array($rule['day_of_week'], $existingDays, true)) {
                continue;
            }

            BookingHostAvailabilityRule::query()->create([
                'host_user_id' => $user->id,
                'day_of_week' => $rule['day_of_week'],
                'start_time' => $rule['start_time'],
                'end_time' => $rule['end_time'],
                'is_active' => $rule['is_active'],
            ]);
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function formatHostAvailabilityRules(User $user): array
    {
        return BookingHostAvailabilityRule::query()
            ->where('host_user_id', $user->id)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->map(fn (BookingHostAvailabilityRule $rule): array => [
                'day_of_week' => (int) $rule->day_of_week,
                'start_time' => substr((string) $rule->start_time, 0, 5),
                'end_time' => substr((string) $rule->end_time, 0, 5),
                'is_active' => (bool) $rule->is_active,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function formatHostAvailabilityOverrides(User $user): array
    {
        return BookingAvailabilityOverride::query()
            ->where('host_user_id', $user->id)
            ->whereNull('booking_event_type_id')
            ->orderBy('override_date')
            ->orderBy('id')
            ->get()
            ->map(fn (BookingAvailabilityOverride $override): array => [
                'override_date' => $override->override_date?->toDateString(),
                'is_full_day' => $override->start_time === null || $override->end_time === null,
                'start_time' => $override->start_time ? substr((string) $override->start_time, 0, 5) : '09:00',
                'end_time' => $override->end_time ? substr((string) $override->end_time, 0, 5) : '17:00',
                'reason' => $override->reason,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     */
    private function replaceHostAvailabilityRules(User $user, array $rules): void
    {
        foreach ($rules as $rule) {
            BookingHostAvailabilityRule::query()->updateOrCreate(
                [
                    'host_user_id' => $user->id,
                    'day_of_week' => (int) $rule['day_of_week'],
                ],
                [
                    'start_time' => (string) $rule['start_time'].':00',
                    'end_time' => (string) $rule['end_time'].':00',
                    'is_active' => (bool) $rule['is_active'],
                ]
            );
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $overrides
     */
    private function replaceHostAvailabilityOverrides(User $user, array $overrides): void
    {
        BookingAvailabilityOverride::query()
            ->where('host_user_id', $user->id)
            ->whereNull('booking_event_type_id')
            ->delete();

        foreach ($overrides as $override) {
            if (! isset($override['override_date'])) {
                continue;
            }

            $isFullDay = (bool) ($override['is_full_day'] ?? false);

            BookingAvailabilityOverride::query()->create([
                'host_user_id' => $user->id,
                'booking_event_type_id' => null,
                'override_date' => (string) $override['override_date'],
                'start_time' => $isFullDay ? null : (string) $override['start_time'].':00',
                'end_time' => $isFullDay ? null : (string) $override['end_time'].':00',
                'is_available' => false,
                'reason' => isset($override['reason']) ? trim((string) $override['reason']) : null,
            ]);
        }
    }
}
