<?php

namespace App\Http\Requests\LinkPage;

use App\Models\ShortLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShortLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $shortLink = $this->route('shortLink');
        $shortLinkId = $shortLink instanceof ShortLink ? $shortLink->id : null;

        return [
            'title' => ['required', 'string', 'max:120'],
            'destination_url' => ['required', 'url', 'max:2048', 'starts_with:http://,https://'],
            'code' => [
                'nullable',
                'string',
                'max:80',
                'regex:/^[a-z0-9-]+$/',
                Rule::notIn(ShortLink::reservedCodes()),
                Rule::unique('short_links', 'code')->ignore($shortLinkId),
            ],
            'description' => ['nullable', 'string', 'max:240'],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $code = trim((string) $this->input('code', ''));

        $this->merge([
            'code' => $code === '' ? null : strtolower($code),
            'description' => trim((string) $this->input('description', '')),
            'is_active' => $this->boolean('is_active'),
            'starts_at' => $this->emptyToNull($this->input('starts_at')),
            'ends_at' => $this->emptyToNull($this->input('ends_at')),
        ]);
    }

    private function emptyToNull(mixed $value): mixed
    {
        return $value === '' ? null : $value;
    }
}
