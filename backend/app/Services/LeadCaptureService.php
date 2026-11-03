<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Lead;
use App\Models\LeadFormSubmission;
use App\Models\WebPageSubmission;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class LeadCaptureService
{
    public function fromLeadFormSubmission(LeadFormSubmission $submission): Lead
    {
        $submission->loadMissing('leadForm');
        $leadForm = $submission->leadForm;
        $data = is_array($submission->data) ? $submission->data : [];
        $fields = is_array($leadForm?->fields) ? $leadForm->fields : [];

        return Lead::query()->updateOrCreate(
            [
                'source_type' => Lead::SOURCE_FORM_SUBMISSION,
                'source_id' => $submission->id,
            ],
            [
                'user_id' => (int) $leadForm->user_id,
                'source_label' => $leadForm->title,
                'name' => $this->extractName($data, $fields),
                'email' => $this->extractTypedValue($data, $fields, 'email', ['email']),
                'phone' => $this->extractTypedValue($data, $fields, 'phone', ['phone', 'mobile', 'whatsapp']),
                'status' => Lead::STATUS_NEW,
                'payload' => [
                    'form_id' => $leadForm->id,
                    'form_title' => $leadForm->title,
                    'data' => $data,
                    'metadata' => $submission->metadata ?? [],
                ],
                'captured_at' => $submission->submitted_at ?? $submission->created_at ?? now(),
            ]
        );
    }

    public function fromWebPageSubmission(WebPageSubmission $submission): Lead
    {
        $submission->loadMissing('webPage');
        $webPage = $submission->webPage;
        $data = is_array($submission->data) ? $submission->data : [];
        $section = $webPage?->findSection($submission->block_id) ?? [];
        $fields = Arr::get($section, 'content.fields', []);

        return Lead::query()->updateOrCreate(
            [
                'source_type' => Lead::SOURCE_WEB_PAGE_SUBMISSION,
                'source_id' => $submission->id,
            ],
            [
                'user_id' => (int) $webPage->user_id,
                'source_label' => $webPage->title,
                'name' => $this->extractName($data, is_array($fields) ? $fields : []),
                'email' => $this->extractTypedValue($data, is_array($fields) ? $fields : [], 'email', ['email']),
                'phone' => $this->extractTypedValue($data, is_array($fields) ? $fields : [], 'phone', ['phone', 'mobile', 'whatsapp']),
                'status' => Lead::STATUS_NEW,
                'payload' => [
                    'web_page_id' => $webPage->id,
                    'web_page_title' => $webPage->title,
                    'block_id' => $submission->block_id,
                    'data' => $data,
                    'metadata' => $submission->metadata ?? [],
                ],
                'captured_at' => $submission->submitted_at ?? $submission->created_at ?? now(),
            ]
        );
    }

    public function fromBooking(Booking $booking): Lead
    {
        $booking->loadMissing('eventType');
        $eventType = $booking->eventType;

        return Lead::query()->updateOrCreate(
            [
                'source_type' => Lead::SOURCE_APPOINTMENT_BOOKING,
                'source_id' => $booking->id,
            ],
            [
                'user_id' => (int) $booking->host_user_id,
                'source_label' => $eventType?->name,
                'name' => $booking->guest_name,
                'email' => $booking->guest_email,
                'phone' => $booking->guest_phone,
                'status' => $booking->status === Booking::STATUS_CANCELLED ? Lead::STATUS_CANCELLED : Lead::STATUS_BOOKED,
                'payload' => [
                    'booking_id' => $booking->id,
                    'event_type_id' => $booking->booking_event_type_id,
                    'event_type_name' => $eventType?->name,
                    'guest_notes' => $booking->guest_notes,
                    'starts_at' => $booking->starts_at?->toIso8601String(),
                    'ends_at' => $booking->ends_at?->toIso8601String(),
                    'guest_timezone' => $booking->guest_timezone,
                    'booking_status' => $booking->status,
                    'cancelled_at' => $booking->cancelled_at?->toIso8601String(),
                    'cancellation_reason' => $booking->cancellation_reason,
                ],
                'captured_at' => $booking->created_at ?? now(),
            ]
        );
    }

    public function syncBookingStatus(Booking $booking): ?Lead
    {
        $lead = Lead::query()
            ->where('source_type', Lead::SOURCE_APPOINTMENT_BOOKING)
            ->where('source_id', $booking->id)
            ->first();

        if (! $lead) {
            return $this->fromBooking($booking);
        }

        $payload = is_array($lead->payload) ? $lead->payload : [];
        $payload['booking_status'] = $booking->status;
        $payload['cancelled_at'] = $booking->cancelled_at?->toIso8601String();
        $payload['cancellation_reason'] = $booking->cancellation_reason;
        $payload['starts_at'] = $booking->starts_at?->toIso8601String();
        $payload['ends_at'] = $booking->ends_at?->toIso8601String();

        $lead->update([
            'status' => $booking->status === Booking::STATUS_CANCELLED ? Lead::STATUS_CANCELLED : Lead::STATUS_BOOKED,
            'payload' => $payload,
        ]);

        return $lead;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, array<string, mixed>>  $fields
     */
    private function extractName(array $data, array $fields): ?string
    {
        $firstName = $this->valueForKey($data, 'first_name');
        $lastName = $this->valueForKey($data, 'last_name');
        $combinedName = trim(implode(' ', array_filter([$firstName, $lastName])));

        if ($combinedName !== '') {
            return $combinedName;
        }

        return $this->extractTypedValue($data, $fields, 'text', ['name', 'full_name', 'first_name']);
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, array<string, mixed>>  $fields
     * @param  array<int, string>  $keyHints
     */
    private function extractTypedValue(array $data, array $fields, string $fieldType, array $keyHints): ?string
    {
        foreach ($fields as $field) {
            $key = trim((string) Arr::get($field, 'key'));
            $type = trim((string) Arr::get($field, 'type'));

            if ($key !== '' && $type === $fieldType) {
                $value = $this->valueForKey($data, $key);
                if ($value !== null) {
                    return $value;
                }
            }
        }

        foreach ($keyHints as $key) {
            $value = $this->valueForKey($data, $key);
            if ($value !== null) {
                return $value;
            }
        }

        foreach ($data as $key => $value) {
            $normalizedKey = Str::of((string) $key)->lower()->replace(['-', ' '], '_')->toString();
            foreach ($keyHints as $hint) {
                if (str_contains($normalizedKey, $hint)) {
                    return $this->stringValue($value);
                }
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function valueForKey(array $data, string $key): ?string
    {
        foreach ($data as $dataKey => $value) {
            if (Str::of((string) $dataKey)->lower()->replace(['-', ' '], '_')->toString() === $key) {
                return $this->stringValue($value);
            }
        }

        return null;
    }

    private function stringValue(mixed $value): ?string
    {
        if (is_array($value) || is_object($value) || $value === null) {
            return null;
        }

        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}
