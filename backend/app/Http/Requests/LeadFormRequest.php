<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class LeadFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        if ($this->user() === null) {
            return false;
        }

        $formId = $this->route('id') ?: ($this->route('leadForm') instanceof \App\Models\LeadForm ? $this->route('leadForm')->id : $this->route('leadForm'));
        if ($formId) {
            return $this->user()->leadForms()->where('id', $formId)->exists();
        }

        return true;
    }

    protected function prepareForValidation(): void
    {
        $fields = $this->normalizeFields($this->input('fields', []));
        $settings = $this->normalizeSettings($this->input('settings', []));

        $this->merge([
            'title' => trim((string) $this->input('title', 'Untitled form')),
            'description' => trim((string) $this->input('description', '')),
            'cover_image_url' => trim((string) $this->input('cover_image_url', '')),
            'status' => trim((string) $this->input('status', 'draft')),
            'fields' => $fields,
            'settings' => $settings,
        ]);
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'cover_image_url' => ['nullable', 'string', 'max:2048'],
            'status' => ['required', Rule::in(['draft', 'published'])],
            'fields' => ['required', 'array', 'min:1', 'max:25'],
            'fields.*.id' => ['required', 'string', 'max:64'],
            'fields.*.key' => ['required', 'string', 'max:64', 'regex:/^[a-z][a-z0-9_]*$/'],
            'fields.*.type' => ['required', Rule::in([
                'text',
                'number',
                'email',
                'url',
                'phone',
                'location',
                'country',
                'date',
                'dropdown',
                'checkbox',
                'radio',
                'rating',
                'upload',
            ])],
            'fields.*.label' => ['required', 'string', 'max:80'],
            'fields.*.placeholder' => ['nullable', 'string', 'max:120'],
            'fields.*.required' => ['required', 'boolean'],
            'fields.*.options' => ['nullable', 'array', 'max:20'],
            'fields.*.options.*' => ['nullable', 'string', 'max:80'],
            'fields.*.max_rating' => ['nullable', 'integer', 'between:3,10'],
            'settings' => ['nullable', 'array'],
            'settings.redirect_enabled' => ['nullable', 'boolean'],
            'settings.redirect_url' => ['nullable', 'url', 'max:2048', 'required_if:settings.redirect_enabled,1'],
            'settings.submit_button_label' => ['nullable', 'string', 'max:40'],
            'settings.success_message' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function normalizeFields(mixed $rawFields): array
    {
        if (! is_array($rawFields)) {
            return [];
        }

        return collect($rawFields)
            ->map(function ($field, int $index): array {
                $raw = is_array($field) ? $field : [];
                $label = trim((string) ($raw['label'] ?? ''));
                $rawKey = trim((string) ($raw['key'] ?? ''));
                $generatedKey = Str::of($rawKey !== '' ? $rawKey : $label)
                    ->snake()
                    ->replaceMatches('/[^a-z0-9_]/', '')
                    ->trim('_')
                    ->value();

                return [
                    'id' => trim((string) ($raw['id'] ?? Str::lower(Str::random(8)).$index)),
                    'key' => $generatedKey !== '' ? $generatedKey : "field_{$index}",
                    'type' => trim((string) ($raw['type'] ?? 'text')),
                    'label' => $label !== '' ? $label : 'Untitled field',
                    'placeholder' => trim((string) ($raw['placeholder'] ?? '')),
                    'required' => (bool) ($raw['required'] ?? false),
                    'options' => $this->normalizeFieldOptions($raw['options'] ?? []),
                    'max_rating' => isset($raw['max_rating']) ? (int) $raw['max_rating'] : 5,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeSettings(mixed $rawSettings): array
    {
        $settings = is_array($rawSettings) ? $rawSettings : [];

        return [
            'redirect_enabled' => (bool) ($settings['redirect_enabled'] ?? false),
            'redirect_url' => trim((string) ($settings['redirect_url'] ?? '')),
            'submit_button_label' => trim((string) ($settings['submit_button_label'] ?? 'Submit')),
            'success_message' => trim((string) ($settings['success_message'] ?? 'Thanks, your response has been recorded.')),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function normalizeFieldOptions(mixed $rawOptions): array
    {
        if (is_string($rawOptions)) {
            $rawOptions = preg_split('/[,\r\n]+/', $rawOptions) ?: [];
        }

        if (! is_array($rawOptions)) {
            return [];
        }

        return collect($rawOptions)
            ->map(fn ($option) => trim((string) $option))
            ->filter()
            ->values()
            ->all();
    }
}
