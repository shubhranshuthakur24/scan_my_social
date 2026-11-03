<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResumeScriptResearchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('batch'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'user_facts' => ['nullable', 'array', 'max:10'],
            'user_facts.*' => ['string', 'max:500'],
            'source_urls' => ['nullable', 'array', 'max:5'],
            'source_urls.*' => ['url:http,https', 'max:2048'],
        ];
    }
}
