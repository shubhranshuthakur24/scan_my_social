<?php

namespace App\Services\ScriptIntelligence;

class PatternDnaBuilder
{
    /**
     * @param  array<string, mixed>  $analysis
     * @return array<string, mixed>
     */
    public function build(array $analysis): array
    {
        $ctaType = (string) ($analysis['cta_type'] ?? 'No CTA');

        return [
            'hook_pattern' => $this->normalizePattern((string) ($analysis['hook_type'] ?? 'problem_setup')),
            'flow_pattern' => $this->normalizePattern((string) ($analysis['script_flow'] ?? 'problem_steps_reinforcement')),
            'driver' => (string) ($analysis['psychological_driver'] ?? 'Curiosity'),
            'cta_goal' => $this->mapCtaGoal($ctaType),
            'key_shift_present' => ! empty($analysis['insight_shift_text']),
            'authority_usage' => [
                'count' => (int) (($analysis['authority_signals']['count'] ?? 0)),
            ],
            'rhythm_tendency' => [
                'avg_sentence_length' => (float) (($analysis['rhythm_profile']['avg_sentence_length'] ?? 0.0)),
                'micro_sentence_ratio' => (float) (($analysis['rhythm_profile']['micro_sentence_ratio'] ?? 0.0)),
            ],
        ];
    }

    private function normalizePattern(string $value): string
    {
        $normalized = mb_strtolower(trim($value));
        $normalized = preg_replace('/[^a-z0-9]+/u', '_', $normalized) ?? $normalized;

        return trim($normalized, '_');
    }

    private function mapCtaGoal(string $ctaType): string
    {
        return match ($ctaType) {
            'Comment CTA' => 'comments',
            'Follow CTA' => 'followers',
            'DM CTA' => 'dms',
            'External Action CTA' => 'clicks_or_leads',
            'Save/Share CTA' => 'saves_or_shares',
            'Soft CTA' => 'soft_engagement',
            default => 'none',
        };
    }
}
