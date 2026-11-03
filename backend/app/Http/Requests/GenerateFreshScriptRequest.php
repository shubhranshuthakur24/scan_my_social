<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class GenerateFreshScriptRequest extends FormRequest
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
        $isFresh = $this->input('mode', 'fresh') === 'fresh';

        return [
            'variants' => ['nullable', 'integer', 'min:1', 'max:3'],
            'mode' => ['nullable', 'string', Rule::in(['fresh', 'recreate'])],
            'topic' => ['required', 'string', 'max:500'],
            'platform' => [
                Rule::requiredIf($isFresh),
                'nullable',
                'string',
                Rule::in(array_keys(config('script_engine.platforms', []))),
            ],
            'audience' => [Rule::requiredIf($isFresh), 'nullable', 'string', 'max:500'],
            'primary_problem' => [Rule::requiredIf($isFresh), 'nullable', 'string', 'max:255'],
            'tone_mode' => [Rule::requiredIf($isFresh), 'nullable', 'string', Rule::in(['ai', 'manual'])],
            'tone' => [
                Rule::requiredIf($isFresh && $this->input('tone_mode') === 'manual'),
                'nullable',
                'string',
                Rule::in(config('script_engine.tones', [])),
            ],
            'length' => [Rule::requiredIf($isFresh), 'nullable', 'string', Rule::in(array_keys(config('script_engine.lengths', [])))],
            'language' => ['required', 'string', Rule::in(['English', 'Hindi', 'Hinglish'])],
            'hook_mode' => [Rule::requiredIf($isFresh), 'nullable', 'string', Rule::in(['ai', 'manual'])],
            'hook_type' => [
                Rule::requiredIf($isFresh && $this->input('hook_mode') === 'manual'),
                'nullable',
                'string',
                Rule::exists('script_hook_types', 'slug')->where('is_active', true),
            ],
            'cta_mode' => [Rule::requiredIf($isFresh), 'nullable', 'string', Rule::in(['ai', 'manual'])],
            'cta_type' => [
                Rule::requiredIf($isFresh && $this->input('cta_mode') === 'manual'),
                'nullable',
                'string',
                Rule::exists('script_cta_types', 'slug')->where('is_active', true),
            ],

            'source_script_id' => ['required_if:mode,recreate', 'nullable', 'integer', 'exists:generated_scripts,id'],
            'recreation_mode' => ['required_if:mode,recreate', 'nullable', 'string', Rule::in(config('script_intelligence.recreation_modes', []))],
            'objective' => [Rule::requiredIf($isFresh), 'nullable', 'string', 'max:64'],
            'desired_cta_type' => ['nullable', 'string', Rule::exists('script_cta_types', 'slug')->where('is_active', true)],
            'brand_input' => ['nullable', 'string', 'max:250'],
            'offer' => ['nullable', 'string', 'max:250'],
            'content_mix' => [Rule::requiredIf($isFresh), 'nullable', 'array:educate,entertain,emotion'],
            'content_mix.educate' => [Rule::requiredIf($isFresh), 'nullable', 'integer', 'between:0,100'],
            'content_mix.entertain' => [Rule::requiredIf($isFresh), 'nullable', 'integer', 'between:0,100'],
            'content_mix.emotion' => [Rule::requiredIf($isFresh), 'nullable', 'integer', 'between:0,100'],
            'supporting_information' => ['nullable', 'string', 'max:2000'],
            'research_enabled' => ['nullable', 'boolean'],
            'research_intent' => [
                'nullable',
                'string',
                Rule::in([
                    'auto',
                    ...array_keys(config('script_research.intents', [])),
                ]),
            ],
            'research_tier' => [
                'nullable',
                'string',
                Rule::in(config('script_research.deep_enabled') ? ['lite', 'deep'] : ['lite']),
            ],
            'locale' => ['nullable', 'string', 'max:16'],
            'proof_points' => ['nullable', 'string', 'max:1000'],
            'key_points' => ['nullable', 'string', 'max:1000'],
            'user_facts' => ['nullable', 'array', 'max:10'],
            'user_facts.*' => ['string', 'max:500'],
            'source_urls' => ['nullable', 'array', 'max:5'],
            'source_urls.*' => ['url:http,https', 'max:2048'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->input('mode', 'fresh') !== 'fresh') {
                    return;
                }

                if ((int) $this->input('variants', 1) !== 1) {
                    $validator->errors()->add('variants', 'The viral script workflow generates one script from the selected angle.');
                }

                if (! array_key_exists((string) $this->input('objective'), config('script_engine.objectives', []))) {
                    $validator->errors()->add('objective', 'Select a valid content objective.');
                }

                $platform = (string) $this->input('platform');
                $allowedLengths = (array) config("script_engine.platforms.{$platform}.lengths", []);
                if (! in_array($this->input('length'), $allowedLengths, true)) {
                    $validator->errors()->add('length', 'Select a valid length for the chosen platform.');
                }

                $mix = (array) $this->input('content_mix', []);
                $total = (int) ($mix['educate'] ?? 0)
                    + (int) ($mix['entertain'] ?? 0)
                    + (int) ($mix['emotion'] ?? 0);
                if ($total !== 100) {
                    $validator->errors()->add('content_mix', 'Educate, entertain, and emotion must total 100%.');
                }
            },
        ];
    }
}
