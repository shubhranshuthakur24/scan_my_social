<?php

namespace App\Services\ScriptIntelligence;

class CtaDetector
{
    /**
     * @param  array{
     *   sentence_list: array<int, string>
     * }  $preprocessed
     * @return array{
     *   cta_text: string,
     *   cta_type: string,
     *   cta_position: string,
     *   cta_score: float
     * }
     */
    public function detect(array $preprocessed): array
    {
        $sentences = $preprocessed['sentence_list'] ?? [];
        $total = count($sentences);

        if ($total === 0) {
            return [
                'cta_text' => '',
                'cta_type' => 'No CTA',
                'cta_position' => 'none',
                'cta_score' => 0.0,
            ];
        }

        $patterns = [
            'Comment CTA' => ['comment', 'drop', 'tell me', 'let me know'],
            'Follow CTA' => ['follow', 'follow for', 'follow me'],
            'DM CTA' => ['dm', 'message me', 'inbox me'],
            'External Action CTA' => ['link in bio', 'click', 'register', 'join', 'subscribe', 'sign up', 'buy'],
            'Save/Share CTA' => ['save this', 'share this', 'send this', 'bookmark'],
            'Soft CTA' => ['what do you think', 'try this', 'check this out'],
        ];

        $best = [
            'cta_text' => '',
            'cta_type' => 'No CTA',
            'cta_position' => 'none',
            'cta_score' => 0.0,
        ];

        foreach ($sentences as $index => $sentence) {
            $normalized = mb_strtolower((string) $sentence);

            foreach ($patterns as $type => $keywords) {
                foreach ($keywords as $keyword) {
                    if (! str_contains($normalized, $keyword)) {
                        continue;
                    }

                    $positionBoost = ($index >= max(0, $total - 3)) ? 1.2 : 0.4;
                    $score = 2.0 + $positionBoost;

                    if ($score <= $best['cta_score']) {
                        continue;
                    }

                    $best = [
                        'cta_text' => (string) $sentence,
                        'cta_type' => $type,
                        'cta_position' => $this->positionLabel($index, $total),
                        'cta_score' => round($score, 2),
                    ];
                }
            }
        }

        return $best;
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
