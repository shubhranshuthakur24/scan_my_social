<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeadFormSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'data' => is_array($this->input('data')) ? $this->input('data') : [],
        ]);
    }

    public function rules(): array
    {
        return [
            'data' => ['required', 'array', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'data.required' => 'Please fill out the form before submitting.',
            'data.array' => 'Invalid form data structure.',
        ];
    }
}
