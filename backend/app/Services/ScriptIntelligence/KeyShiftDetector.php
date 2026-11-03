<?php

namespace App\Services\ScriptIntelligence;

class KeyShiftDetector
{
    /**
     * @param  array{
     *   sentence_list: array<int, string>
     * }  $preprocessed
     * @param  array<string, mixed>  $signals
     * @return array{
     *   key_shift_text: string,
     *   key_shift_position: string,
     *   key_shift_score: float
     * }
     */
    public function detect(array $preprocessed, array $signals): array
    {
        $sentences = $preprocessed['sentence_list'] ?? [];
        $total = count($sentences);

        if ($total === 0) {
            return [
                'key_shift_text' => '',
                'key_shift_position' => 'none',
                'key_shift_score' => 0.0,
            ];
        }

        $bestIndex = null;
        $bestText = '';
        $bestScore = 0.0;

        foreach ($sentences as $index => $sentence) {
            $normalized = mb_strtolower((string) $sentence);
            $score = 0.0;

            if (preg_match('/\b(?:but|however|instead|actually|lekin|par|magar|balki)\b/ui', $normalized)) {
                $score += 2.0;
            }

            if (preg_match('/\bnot\b.+\bbut\b|\bnahi\b.+\bbalki\b/ui', $normalized)) {
                $score += 2.4;
            }

            if (preg_match('/\b(?:truth|real|actually|reality|sach)\b/ui', $normalized)) {
                $score += 1.1;
            }

            if (! isset($sentences[$index + 1])) {
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestText = (string) $sentence;
                    $bestIndex = $index;
                }

                continue;
            }

            $nextSentence = mb_strtolower((string) $sentences[$index + 1]);
            $pairScore = $score;

            if ($this->containsAny($normalized, ['everyone', 'most people', 'you think', 'lagta', 'assume'])
                && $this->containsAny($nextSentence, ['actually', 'but', 'instead', 'real'])) {
                $pairScore += 1.8;
            }

            if ($this->containsAny($normalized, ['problem', 'struggle', 'mistake'])
                && $this->containsAny($nextSentence, ['hidden cause', 'real reason', 'solution', 'fix'])) {
                $pairScore += 1.5;
            }

            if ($pairScore > $bestScore) {
                $bestScore = $pairScore;
                $bestText = trim($sentence.' '.$sentences[$index + 1]);
                $bestIndex = $index;
            }
        }

        if ($bestIndex === null || $bestScore < 1.5) {
            return [
                'key_shift_text' => '',
                'key_shift_position' => 'none',
                'key_shift_score' => 0.0,
            ];
        }

        $confidenceBoost = (($signals['contrast_word_count'] ?? 0) > 0 || ($signals['reversal_pattern_count'] ?? 0) > 0) ? 0.5 : 0.0;
        $finalScore = min(10.0, round(($bestScore + $confidenceBoost) * 1.6, 2));

        return [
            'key_shift_text' => $bestText,
            'key_shift_position' => $this->positionLabel($bestIndex, $total),
            'key_shift_score' => $finalScore,
        ];
    }

    /**
     * @param  array<int, string>  $needles
     */
    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function positionLabel(int $index, int $total): string
    {
        if ($total <= 0) {
            return 'none';
        }

        $ratio = ($index + 1) / $total;

        if ($ratio <= 0.33) {
            return 'opening';
        }

        if ($ratio <= 0.66) {
            return 'mid';
        }

        return 'closing';
    }
}
