<?php

namespace App\Services\ScriptIntelligence;

class DriverDetector
{
    public function __construct(private readonly LabelValidator $labelValidator) {}

    /**
     * @param  array<string, mixed>  $preprocessed
     * @param  array<string, mixed>  $signals
     * @return array{label: string, confidence: float, scores: array<string, float>}
     */
    public function detect(array $preprocessed, array $signals, string $scriptType): array
    {
        $cleaned = mb_strtolower((string) ($preprocessed['transcript_cleaned'] ?? ''));

        $scores = [
            'Loss Avoidance' => 0.0,
            'Authority' => 0.0,
            'Belonging' => 0.0,
            'Status' => 0.0,
            'Curiosity' => 0.0,
            'Efficiency' => 0.0,
        ];

        $scores['Loss Avoidance'] += $this->countRegexMatches($cleaned, '/\b(?:risk|lose|mistake|avoid|failure|waste)\b/ui') * 1.0;
        $scores['Authority'] += count((array) ($preprocessed['markers']['authority_keywords'] ?? [])) * 1.4;
        $scores['Belonging'] += $this->countRegexMatches($cleaned, '/\b(?:we|together|community|everyone|people like us)\b/ui') * 0.9;
        $scores['Status'] += (float) ($signals['status_word_count'] ?? 0) * 1.1;
        $scores['Curiosity'] += $this->countRegexMatches($cleaned, '/\b(?:why|secret|unknown|nobody|actually|real reason)\b/ui') * 0.9;
        $scores['Efficiency'] += $this->countRegexMatches($cleaned, '/\b(?:quick|faster|easy|simple|shortcut|save time)\b/ui') * 1.0;

        if (in_array($scriptType, ['Tool', 'Framework', 'Utility'], true)) {
            $scores['Efficiency'] += 1.0;
        }

        if ($scriptType === 'Emotional') {
            $scores['Belonging'] += 0.8;
            $scores['Curiosity'] += 0.4;
        }

        if ($scriptType === 'Experiential') {
            $scores['Status'] += 0.6;
            $scores['Belonging'] += 0.5;
        }

        arsort($scores);
        $labels = array_keys($scores);
        $topLabel = $labels[0] ?? 'Curiosity';
        $topScore = (float) ($scores[$topLabel] ?? 0.0);
        $secondScore = isset($labels[1]) ? (float) ($scores[$labels[1]] ?? 0.0) : 0.0;
        $confidence = $topScore <= 0.0 ? 0.0 : round(max(0.1, min(1.0, ($topScore - $secondScore + 1.0) / ($topScore + 1.0))), 2);

        return [
            'label' => $this->labelValidator->validateDriver($topLabel),
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
