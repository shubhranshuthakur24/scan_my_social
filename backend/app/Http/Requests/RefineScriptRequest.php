<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RefineScriptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('script'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => 'nullable|string|max:255',
            'script' => 'nullable|string',
            'revised_script' => 'nullable|string',
        ];
    }
}
