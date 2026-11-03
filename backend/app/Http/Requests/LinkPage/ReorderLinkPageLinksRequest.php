<?php

namespace App\Http\Requests\LinkPage;

use Illuminate\Foundation\Http\FormRequest;

class ReorderLinkPageLinksRequest extends FormRequest
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
        return [
            'links' => ['required', 'array', 'min:1'],
            'links.*' => ['required', 'integer', 'distinct'],
        ];
    }
}
