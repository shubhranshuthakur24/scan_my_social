<?php

namespace App\Services\ScriptEngine;

use App\Models\ScriptCtaType;
use App\Models\ScriptGenerationBatch;
use App\Models\ScriptHookType;
use Illuminate\Support\Arr;

class ScriptContextBuilder
{
    /**
     * @return array<string, mixed>
     */
    public function build(ScriptGenerationBatch $batch): array
    {
        $batch->loadMissing([
            'selectedAngle',
            'research.claims.sources',
            'research.sources',
            'supplementalClaims.sources',
            'supplementalSources',
        ]);

        $platform = (array) config("script_engine.platforms.{$batch->platform}", []);
        $objective = (array) config("script_engine.objectives.{$batch->objective}", []);
        $hook = $batch->hook_mode === 'manual'
            ? ScriptHookType::query()->where('slug', $batch->hook_type)->first()
            : null;
        $cta = $batch->cta_mode === 'manual'
            ? ScriptCtaType::query()->where('slug', $batch->cta_type)->first()
            : null;

        return [
            'topic' => $batch->original_topic,
            'audience' => $batch->audience,
            'primary_problem' => $batch->primary_problem,
            'objective' => [
                'slug' => $batch->objective,
                'label' => Arr::get($objective, 'label', $batch->objective),
                'instruction' => Arr::get($objective, 'instruction'),
            ],
            'platform' => [
                'slug' => $batch->platform,
                'label' => Arr::get($platform, 'label', $batch->platform),
                'format' => Arr::get($platform, 'format', 'video'),
            ],
            'language' => $batch->language,
            'length' => [
                'value' => $batch->output_length,
                'label' => config("script_engine.lengths.{$batch->output_length}", $batch->output_length),
            ],
            'content_mix' => $batch->content_mix,
            'communication_style' => $batch->communication_style,
            'tone' => [
                'mode' => $batch->tone_mode,
                'value' => $batch->tone,
                'instruction' => $batch->tone_mode === 'manual'
                    ? "Use a {$batch->tone} tone."
                    : 'Choose the tone most likely to achieve the objective for this audience.',
            ],
            'hook' => [
                'mode' => $batch->hook_mode,
                'type' => $batch->hook_type,
                'instruction' => $hook?->prompt_instruction
                    ?? 'Choose the strongest evidence-safe hook for this angle.',
            ],
            'cta' => [
                'mode' => $batch->cta_mode,
                'type' => $batch->cta_type,
                'instruction' => $cta?->prompt_instruction
                    ?? 'Choose the CTA most aligned with the objective and platform.',
            ],
            'selected_angle' => [
                'id' => $batch->selectedAngle?->id,
                'title' => $batch->selectedAngle?->title,
                'explanation' => $batch->selectedAngle?->explanation,
                'expected_outcome' => $batch->selectedAngle?->expected_outcome,
            ],
            'supporting_information' => $batch->supporting_information,
            'evidence' => $batch->enriched_brief ?? [
                'research' => [
                    'claims' => collect($batch->user_provided_facts ?? [])
                        ->map(fn (string $fact): array => [
                            'claim' => $fact,
                            'category' => 'user_provided_facts',
                            'is_user_provided' => true,
                        ])
                        ->values()
                        ->all(),
                ],
            ],
        ];
    }
}
