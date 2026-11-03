<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SelectScriptAngleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $batch = $this->route('batch');
        $angle = $this->route('angle');

        return $batch
            && $angle
            && $angle->script_generation_batch_id === $batch->id
            && $this->user()->can('update', $batch);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
