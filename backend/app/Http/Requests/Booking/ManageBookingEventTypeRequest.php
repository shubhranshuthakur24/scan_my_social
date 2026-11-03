<?php

namespace App\Http\Requests\Booking;

use App\Models\BookingEventType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ManageBookingEventTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $applicationTimezone = $this->normalizeTimezoneAlias((string) config('app.timezone', 'UTC'));
        if (! in_array($applicationTimezone, timezone_identifiers_list(), true)) {
            $applicationTimezone = 'UTC';
        }

        $this->merge([
            'name' => trim((string) $this->input('name')),
            'description' => $this->nullableString($this->input('description')),
            'timezone' => $applicationTimezone,
            'schedule_type' => $this->normalizeScheduleType($this->nullableString($this->input('schedule_type'))),
            'one_time_date' => $this->nullableString($this->input('one_time_date')),
            'one_time_start_time' => $this->nullableString($this->input('one_time_start_time')),
            'one_time_end_time' => $this->nullableString($this->input('one_time_end_time')),
            'duration_minutes' => (int) $this->input('duration_minutes', 30),
            'buffer_minutes' => (int) $this->input('buffer_minutes', 0),
            'location_type' => $this->normalizeLocationType($this->nullableString($this->input('location_type'))),
            'location_value' => $this->nullableString($this->input('location_value')),
            'location_label' => $this->nullableString($this->input('location_label')),
            'allows_multi_seat_booking' => $this->boolean('allows_multi_seat_booking', false),
            'seat_limit_mode' => $this->normalizeSeatLimitMode($this->nullableString($this->input('seat_limit_mode'))),
            'seat_capacity' => $this->nullableInteger($this->input('seat_capacity')),
            'exclude_from_global_slot_lock' => $this->boolean('exclude_from_global_slot_lock', false),
            'is_active' => $this->boolean('is_active', true),
            'minimum_booking_notice_minutes' => $this->nullableInteger($this->input('minimum_booking_notice_minutes')),
            'booking_window_days' => $this->nullableInteger($this->input('booking_window_days')),
        ]);

        if (! $this->boolean('allows_multi_seat_booking', false)) {
            $this->merge([
                'seat_limit_mode' => 'limited',
                'seat_capacity' => 1,
            ]);
        }

        if ($this->input('seat_limit_mode') === 'unlimited') {
            $this->merge([
                'seat_capacity' => null,
            ]);
        }

        if ($this->input('schedule_type') !== BookingEventType::SCHEDULE_TYPE_ONE_TIME) {
            $this->merge([
                'one_time_date' => null,
                'one_time_start_time' => null,
                'one_time_end_time' => null,
            ]);
        }

        if ($this->input('schedule_type') === BookingEventType::SCHEDULE_TYPE_ONE_TIME) {
            $this->merge([
                'availability_rules' => [],
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:300'],
            'timezone' => ['required', 'timezone'],
            'schedule_type' => ['required', 'string', Rule::in([
                BookingEventType::SCHEDULE_TYPE_WEEKLY,
                BookingEventType::SCHEDULE_TYPE_ONE_TIME,
            ])],
            'one_time_date' => ['nullable', 'date_format:Y-m-d', 'required_if:schedule_type,'.BookingEventType::SCHEDULE_TYPE_ONE_TIME],
            'one_time_start_time' => ['nullable', 'date_format:H:i', 'required_if:schedule_type,'.BookingEventType::SCHEDULE_TYPE_ONE_TIME],
            'one_time_end_time' => ['nullable', 'date_format:H:i', 'required_if:schedule_type,'.BookingEventType::SCHEDULE_TYPE_ONE_TIME],
            'duration_minutes' => ['required', 'integer', Rule::in(range(15, 480, 15))],
            'buffer_minutes' => ['required', 'integer', 'min:0', 'max:60'],
            'location_type' => ['nullable', 'string', 'in:google_meet,zoom_call,in_person,phone,custom'],
            'location_value' => ['nullable', 'string', 'max:255'],
            'location_label' => ['nullable', 'string', 'max:120'],
            'allows_multi_seat_booking' => ['required', 'boolean'],
            'seat_limit_mode' => ['required_if:allows_multi_seat_booking,true', 'string', 'in:limited,unlimited'],
            'seat_capacity' => ['nullable', 'integer', 'min:1', 'max:500'],
            'exclude_from_global_slot_lock' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'minimum_booking_notice_minutes' => ['nullable', 'integer', 'min:0', 'max:14400'],
            'booking_window_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'availability_rules' => ['nullable', 'array'],
            'availability_rules.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'availability_rules.*.start_time' => ['required', 'date_format:H:i'],
            'availability_rules.*.end_time' => ['required', 'date_format:H:i'],
            'availability_rules.*.is_active' => ['required', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $rules = $this->input('availability_rules', []);
            $scheduleType = $this->input('schedule_type');

            if ($scheduleType === BookingEventType::SCHEDULE_TYPE_WEEKLY) {
                if ($rules === []) {
                    $validator->errors()->add('availability_rules', 'Add at least one weekly availability slot.');
                }

                $this->validateWeeklyRules($validator, $rules, 'availability_rules');
                $this->validateOverlappingRangesByDay($validator, $rules, 'availability_rules');
            }

            if ($scheduleType === BookingEventType::SCHEDULE_TYPE_ONE_TIME) {
                $this->validateOneTimeWindow($validator);
            }

            $allowsMultiSeatBooking = $this->boolean('allows_multi_seat_booking', false);
            if ($allowsMultiSeatBooking && $this->input('seat_limit_mode') === 'limited' && $this->input('seat_capacity') === null) {
                $validator->errors()->add('seat_capacity', 'Seat capacity is required when limited booking is enabled.');
            }
        });
    }

    private function nullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function normalizeScheduleType(?string $scheduleType): string
    {
        if ($scheduleType === null) {
            return BookingEventType::SCHEDULE_TYPE_WEEKLY;
        }

        $normalized = strtolower(trim($scheduleType));

        return in_array($normalized, [
            BookingEventType::SCHEDULE_TYPE_WEEKLY,
            BookingEventType::SCHEDULE_TYPE_ONE_TIME,
        ], true)
            ? $normalized
            : BookingEventType::SCHEDULE_TYPE_WEEKLY;
    }

    private function normalizeTimezoneAlias(string $timezone): string
    {
        $aliases = [
            'Asia/Calcutta' => 'Asia/Kolkata',
        ];

        return $aliases[$timezone] ?? $timezone;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     */
    private function validateWeeklyRules(Validator $validator, array $rules, string $path): void
    {
        foreach ($rules as $index => $rule) {
            $isActive = filter_var($rule['is_active'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
            if (! $isActive) {
                continue;
            }

            $start = (string) ($rule['start_time'] ?? '');
            $end = (string) ($rule['end_time'] ?? '');

            if ($start !== '' && $end !== '' && $end <= $start) {
                $validator->errors()->add("{$path}.{$index}.end_time", 'End time must be after start time.');
            }
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     */
    private function validateOverlappingRangesByDay(Validator $validator, array $rules, string $path): void
    {
        $activeRangesByDay = [];

        foreach ($rules as $index => $rule) {
            $isActive = filter_var($rule['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
            if (! $isActive) {
                continue;
            }

            $dayOfWeek = isset($rule['day_of_week']) ? (int) $rule['day_of_week'] : -1;
            if ($dayOfWeek < 0 || $dayOfWeek > 6) {
                continue;
            }

            $start = (string) ($rule['start_time'] ?? '');
            $end = (string) ($rule['end_time'] ?? '');
            if ($start === '' || $end === '' || $end <= $start) {
                continue;
            }

            $activeRangesByDay[$dayOfWeek][] = [
                'index' => $index,
                'start' => $start,
                'end' => $end,
            ];
        }

        foreach ($activeRangesByDay as $ranges) {
            usort(
                $ranges,
                fn (array $left, array $right): int => [$left['start'], $left['end']] <=> [$right['start'], $right['end']]
            );

            for ($position = 1, $length = count($ranges); $position < $length; $position++) {
                $previous = $ranges[$position - 1];
                $current = $ranges[$position];

                if ($current['start'] < $previous['end']) {
                    $validator->errors()->add("{$path}.{$current['index']}.start_time", 'Time slots for the same day cannot overlap.');
                }
            }
        }
    }

    private function validateOneTimeWindow(Validator $validator): void
    {
        $start = (string) $this->input('one_time_start_time', '');
        $end = (string) $this->input('one_time_end_time', '');

        if ($start === '' || $end === '') {
            return;
        }

        if ($end <= $start) {
            $validator->errors()->add('one_time_end_time', 'End time must be after start time.');

            return;
        }

        $startMinutes = $this->minutesFromTime($start);
        $endMinutes = $this->minutesFromTime($end);
        if ($startMinutes === null || $endMinutes === null) {
            return;
        }

        $windowMinutes = $endMinutes - $startMinutes;
        $durationMinutes = (int) $this->input('duration_minutes', 0);

        if ($windowMinutes < $durationMinutes) {
            $validator->errors()->add('one_time_end_time', 'The time window must be long enough to fit the event duration.');
        }
    }

    private function normalizeLocationType(?string $locationType): ?string
    {
        if ($locationType === null) {
            return null;
        }

        $normalized = strtolower(trim($locationType));

        return $normalized === '' ? null : $normalized;
    }

    private function normalizeSeatLimitMode(?string $seatLimitMode): string
    {
        if ($seatLimitMode === null) {
            return 'limited';
        }

        $normalized = strtolower(trim($seatLimitMode));

        return in_array($normalized, ['limited', 'unlimited'], true) ? $normalized : 'limited';
    }

    private function nullableInteger(mixed $value): ?int
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim((string) $value);
        if ($normalized === '') {
            return null;
        }

        if (! is_numeric($normalized)) {
            return null;
        }

        return (int) $normalized;
    }

    private function minutesFromTime(string $time): ?int
    {
        [$hours, $minutes] = array_pad(explode(':', $time), 2, null);
        if ($hours === null || $minutes === null || ! is_numeric($hours) || ! is_numeric($minutes)) {
            return null;
        }

        return (((int) $hours) * 60) + (int) $minutes;
    }
}
