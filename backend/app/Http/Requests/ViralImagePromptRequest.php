<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ViralImagePromptRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $prompt = $this->route('viralImagePrompt');
        $requiresImageUpload = $prompt === null || empty($prompt->image_path);

        return [
            'title' => ['required', 'string', 'max:255'],
            'prompt' => ['required', 'string'],
            'category' => ['required', 'string', 'max:100'],
            'image_file' => [$requiresImageUpload ? 'required' : 'nullable', 'mimes:jpeg,png,jpg,gif,svg,webp,avif', 'max:5120'],
        ];
    }
}
