<?php

namespace App\Services\ScriptIntelligence;

class ClosureDetector
{
    public function __construct(private readonly LabelValidator $labelValidator) {}

    /**
     * @param  array{
     *   sentence_list: array<int, string>
     * }  $preprocessed
     * @param  array<string, mixed>  $cta
     * @return array{closure_type: string, closure_text: string}
     */
    public function detect(array $preprocessed, array $cta): array
    {
        $sentences = $preprocessed['sentence_list'] ?? [];
        $lastSentence = trim((string) ($sentences !== [] ? end($sentences) : ''));
        $normalized = mb_strtolower($lastSentence);
        $closureType = 'No clear closure';

        if (($cta['cta_type'] ?? 'No CTA') !== 'No CTA') {
            $closureType = 'Direct instruction';
        } elseif (preg_match('/\b(?:today|now|limited|before it is gone)\b/ui', $normalized)) {
            $closureType = 'Scarcity push';
        } elseif (preg_match('/\b(?:you are|become|your identity|you can be)\b/ui', $normalized)) {
            $closureType = 'Identity uplift';
        } elseif (preg_match('/\b(?:proof|data|research|years|client|expert)\b/ui', $normalized)) {
            $closureType = 'Authority reinforcement';
        } elseif (preg_match('/\?$/u', $lastSentence)) {
            $closureType = 'Open loop';
        } elseif (preg_match('/\b(?:remember|never forget|this changes everything)\b/ui', $normalized)) {
            $closureType = 'Emotional punch';
        }

        return [
            'closure_type' => $this->labelValidator->validateClosureType($closureType),
            'closure_text' => $lastSentence,
        ];
    }
}
