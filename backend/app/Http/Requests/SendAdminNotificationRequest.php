<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendAdminNotificationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isSuperAdmin() === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'target_type' => ['required', Rule::in(['individual', 'plan', 'all'])],
            'user_ids' => [
                Rule::excludeIf(fn () => $this->input('target_type') !== 'individual'),
                'required',
                'array',
                'min:1',
            ],
            'user_ids.*' => [
                Rule::excludeIf(fn () => $this->input('target_type') !== 'individual'),
                'integer',
                'exists:users,id',
            ],
            'plan_name' => [
                Rule::excludeIf(fn () => $this->input('target_type') !== 'plan'),
                'required',
                'string',
            ],
            'title' => ['required', 'string', 'max:100'],
            'message' => ['required', 'string', 'max:500'],
            'type' => ['required', Rule::in(['info', 'success', 'warning', 'error'])],
            'action_url' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Get custom messages for validation errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'user_ids.required' => 'Please select at least one user.',
            'plan_name.required' => 'Please select a plan.',
            'title.required' => 'A notification title is required.',
            'message.required' => 'A notification message is required.',
        ];
    }
}
