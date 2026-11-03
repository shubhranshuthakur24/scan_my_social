<?php

namespace App\Services\ScriptIntelligence;

class FlowDetector
{
    public function __construct(private readonly LabelValidator $labelValidator) {}

    /**
     * @param  array<string, mixed>  $signals
     * @param  array<string, mixed>  $preprocessed
     * @return array{label: string, confidence: float}
     */
    public function detect(string $scriptType, array $signals, array $preprocessed): array
    {
        $flow = match ($scriptType) {
            'Tool' => $this->toolFlow($signals, $preprocessed),
            'Framework' => $this->frameworkFlow($signals, $preprocessed),
            'Emotional' => $this->emotionalFlow($signals, $preprocessed),
            'Experiential' => $this->experientialFlow($signals, $preprocessed),
            default => $this->utilityFlow($signals, $preprocessed),
        };

        $validated = $this->labelValidator->validateScriptFlow($scriptType, $flow);

        return [
            'label' => $validated,
            'confidence' => 0.72,
        ];
    }

    /**
     * @param  array<string, mixed>  $signals
     * @param  array<string, mixed>  $preprocessed
     */
    private function toolFlow(array $signals, array $preprocessed): string
    {
        $firstSentence = mb_strtolower((string) (($preprocessed['sentence_list'][0] ?? '')));

        if (($signals['comparison_word_count'] ?? 0) > 0) {
            return 'Comparison Demo CTA';
        }

        if (str_contains($firstSentence, '?')) {
            return 'Question Demo CTA';
        }

        if (($signals['contrast_word_count'] ?? 0) > 0 || ($signals['reversal_pattern_count'] ?? 0) > 0) {
            return 'Disruption Demo CTA';
        }

        return 'Announcement Demo CTA';
    }

    /**
     * @param  array<string, mixed>  $signals
     * @param  array<string, mixed>  $preprocessed
     */
    private function frameworkFlow(array $signals, array $preprocessed): string
    {
        if (count((array) ($preprocessed['markers']['numbered_structure'] ?? [])) >= 2) {
            return 'Numbered Steps';
        }

        $cleaned = mb_strtolower((string) ($preprocessed['transcript_cleaned'] ?? ''));

        if (preg_match('/\b(?:myth|truth|wrong|reframe)\b/ui', $cleaned)) {
            return 'Myth Reframe Model';
        }

        if (substr_count($cleaned, '?') >= 2) {
            return 'QA Authority';
        }

        return 'Problem Model Explanation';
    }

    /**
     * @param  array<string, mixed>  $signals
     * @param  array<string, mixed>  $preprocessed
     */
    private function emotionalFlow(array $signals, array $preprocessed): string
    {
        if (($signals['repetition_count'] ?? 0) >= 2) {
            return 'Repetition Escalation';
        }

        $cleaned = mb_strtolower((string) ($preprocessed['transcript_cleaned'] ?? ''));

        if (preg_match('/\b(?:identity|who you are|you are the)\b/ui', $cleaned)) {
            return 'Identity Reflection';
        }

        if (($signals['contrast_word_count'] ?? 0) > 0) {
            return 'Contrast Realization';
        }

        return 'Story Moral';
    }

    /**
     * @param  array<string, mixed>  $signals
     * @param  array<string, mixed>  $preprocessed
     */
    private function experientialFlow(array $signals, array $preprocessed): string
    {
        if (($signals['status_word_count'] ?? 0) > 0) {
            return 'Status Signal Closure';
        }

        $cleaned = mb_strtolower((string) ($preprocessed['transcript_cleaned'] ?? ''));

        if (preg_match('/\b(?:reveal|turns out|finally|then)\b/ui', $cleaned)) {
            return 'Reveal Experience';
        }

        return 'Immersion Detail Layering';
    }

    /**
     * @param  array<string, mixed>  $signals
     * @param  array<string, mixed>  $preprocessed
     */
    private function utilityFlow(array $signals, array $preprocessed): string
    {
        if (($signals['imperative_step_count'] ?? 0) >= 3) {
            return 'Problem Steps Reinforcement';
        }

        $cleaned = mb_strtolower((string) ($preprocessed['transcript_cleaned'] ?? ''));

        if (preg_match('/\b(?:if|when|whenever)\b/ui', $cleaned)) {
            return 'Situation Action Plan';
        }

        return 'Problem Outcome';
    }
}
