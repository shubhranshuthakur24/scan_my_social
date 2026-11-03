<?php

namespace App\Http\Requests\LinkPage;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LinkPageLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'title' => trim((string) $this->input('title')),
            'url' => trim((string) $this->input('url')),
            'description' => $this->nullableString($this->input('description')),
            'icon' => $this->nullableString($this->input('icon')),
            'is_active' => $this->boolean('is_active', true),
            'starts_at' => $this->nullableString($this->input('starts_at')),
            'ends_at' => $this->nullableString($this->input('ends_at')),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'url' => ['required', 'url:http,https', 'max:2048'],
            'description' => ['nullable', 'string', 'max:240'],
            'icon' => ['nullable', 'string', 'max:40', 'alpha_dash:ascii'],
            'is_active' => ['required', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', Rule::when($this->filled('starts_at'), ['after:starts_at'])],
        ];
    }

    private function nullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }
}
