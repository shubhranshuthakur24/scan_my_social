<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;

class StorePublicBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $guestTimezone = $this->normalizeTimezoneAlias($this->nullableString($this->input('guest_timezone')));
        if ($guestTimezone !== null && ! in_array($guestTimezone, timezone_identifiers_list(), true)) {
            $guestTimezone = null;
        }

        $this->merge([
            'guest_name' => trim((string) $this->input('guest_name')),
            'guest_email' => trim((string) $this->input('guest_email')),
            'guest_phone' => trim((string) $this->input('guest_phone')),
            'guest_timezone' => $guestTimezone,
            'guest_notes' => $this->nullableString($this->input('guest_notes')),
            'starts_at' => trim((string) $this->input('starts_at')),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'guest_name' => ['required', 'string', 'max:120'],
            'guest_email' => ['required', 'email:rfc', 'max:190'],
            'guest_phone' => ['required', 'string', 'max:30'],
            'guest_timezone' => ['nullable', 'timezone'],
            'guest_notes' => ['nullable', 'string', 'max:2000'],
            'starts_at' => ['required', 'date'],
        ];
    }

    private function nullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function normalizeTimezoneAlias(?string $timezone): ?string
    {
        if ($timezone === null) {
            return null;
        }

        $aliases = [
            'Asia/Calcutta' => 'Asia/Kolkata',
        ];

        return $aliases[$timezone] ?? $timezone;
    }
}
