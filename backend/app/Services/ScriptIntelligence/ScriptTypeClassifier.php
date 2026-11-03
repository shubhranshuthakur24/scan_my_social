<?php

namespace App\Services\ScriptIntelligence;

class ScriptTypeClassifier
{
    public function __construct(private readonly LabelValidator $labelValidator) {}

    /**
     * @param  array<string, mixed>  $preprocessed
     * @param  array<string, mixed>  $signals
     * @return array{label: string, confidence: float, scores: array<string, float>}
     */
    public function classify(array $preprocessed, array $signals): array
    {
        $cleaned = mb_strtolower((string) ($preprocessed['transcript_cleaned'] ?? ''));

        $scores = [
            'Tool' => 0.0,
            'Framework' => 0.0,
            'Emotional' => 0.0,
            'Experiential' => 0.0,
            'Utility' => 0.0,
        ];

        $scores['Framework'] += ((int) ($signals['number_led_opener'] ?? false) ? 2.0 : 0.0);
        $scores['Framework'] += (float) count((array) ($preprocessed['markers']['numbered_structure'] ?? [])) * 1.1;
        $scores['Framework'] += (float) ($signals['instruction_word_count'] ?? 0) * 0.5;

        $scores['Tool'] += (float) count((array) ($preprocessed['markers']['cta_keywords'] ?? [])) * 0.6;
        $scores['Tool'] += (float) ($signals['comparison_word_count'] ?? 0) * 0.8;
        $scores['Tool'] += $this->countRegexMatches($cleaned, '/\b(?:tool|app|software|platform|feature)\b/ui') * 0.9;

        $scores['Emotional'] += (float) ($signals['repetition_count'] ?? 0) * 1.2;
        $scores['Emotional'] += (float) ($signals['emotion_word_count'] ?? 0) * 0.6;

        $scores['Utility'] += (float) ($signals['imperative_step_count'] ?? 0) * 1.1;
        $scores['Utility'] += (float) ($signals['problem_solution_count'] ?? 0) * 0.7;

        $scores['Experiential'] += $this->countRegexMatches($cleaned, '/\b(?:i|my|we|experience|journey|story|when i)\b/ui') * 0.7;
        $scores['Experiential'] += (float) ($signals['status_word_count'] ?? 0) * 0.4;

        arsort($scores);
        $labels = array_keys($scores);
        $topLabel = $labels[0] ?? 'Utility';
        $topScore = (float) ($scores[$topLabel] ?? 0.0);
        $secondScore = isset($labels[1]) ? (float) ($scores[$labels[1]] ?? 0.0) : 0.0;
        $confidence = $topScore <= 0.0 ? 0.0 : round(max(0.1, min(1.0, ($topScore - $secondScore + 1.0) / ($topScore + 1.0))), 2);

        return [
            'label' => $this->labelValidator->validateScriptType($topLabel),
            'confidence' => $confidence,
            'scores' => $scores,
        ];
    }

    private function countRegexMatches(string $text, string $pattern): int
    {
        preg_match_all($pattern, $text, $matches);

        return count($matches[0] ?? []);
    }
}
