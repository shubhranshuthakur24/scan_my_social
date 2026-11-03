<?php

namespace App\Services;

use App\Models\ContentAnalysis;

class ScriptRecreationService
{
    /**
     * @param  array<string, mixed>  $settings
     * @return array<string, mixed>
     */
    public function buildPromptPayload(ContentAnalysis $analysis, array $settings): array
    {
        $patternDna = $analysis->pattern_dna ?? [];
        $rhythmProfile = $analysis->rhythm_profile;

        if (is_string($rhythmProfile)) {
            $decoded = json_decode($rhythmProfile, true);
            $rhythmProfile = is_array($decoded) ? $decoded : [];
        }

        return [
            'original_hook_pattern' => $patternDna['hook_pattern'] ?? $analysis->hook_type ?? 'problem_setup',
            'original_topic_angle' => $analysis->topic_angle ?? $analysis->content_angle ?? '',
            'script_type' => $analysis->script_type ?? $analysis->archetype ?? 'Utility',
            'script_flow' => $analysis->script_flow ?? $analysis->structure_model ?? 'Problem Steps Reinforcement',
            'key_shift_pattern' => $analysis->insight_shift_text ?? $analysis->insight_shift ?? '',
            'rhythm_profile' => is_array($rhythmProfile) ? $rhythmProfile : [],
            'original_cta_type' => $analysis->cta_type ?? 'No CTA',
            'new_topic' => (string) ($settings['topic'] ?? ''),
            'brand_input' => (string) ($settings['brand_input'] ?? ''),
            'target_audience' => (string) ($settings['audience'] ?? ''),
            'objective' => (string) ($settings['objective'] ?? ''),
            'desired_cta_type' => (string) ($settings['desired_cta_type'] ?? ''),
            'offer' => (string) ($settings['offer'] ?? ''),
            'language' => (string) ($settings['language'] ?? 'English'),
            'tone' => (string) ($settings['tone'] ?? 'Informative'),
            'recreation_mode' => (string) ($settings['recreation_mode'] ?? 'balanced'),
            'source_transcript' => (string) ($analysis->transcript_cleaned ?? $analysis->transcription ?? ''),
        ];
    }
}
