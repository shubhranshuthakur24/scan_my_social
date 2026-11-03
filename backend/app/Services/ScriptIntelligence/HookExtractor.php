<?php

namespace App\Services\ScriptIntelligence;

class HookExtractor
{
    /**
     * @param  array{
     *   sentence_list: array<int, string>
     * }  $preprocessed
     * @param  array<string, mixed>  $signals
     * @return array{
     *   hook_text: string,
     *   hook_type: string,
     *   hook_position: int,
     *   hook_score: float
     * }
     */
    public function extract(array $preprocessed, array $signals): array
    {
        $sentences = array_slice($preprocessed['sentence_list'] ?? [], 0, 5);

        if ($sentences === []) {
            return [
                'hook_text' => '',
                'hook_type' => 'Unknown',
                'hook_position' => 0,
                'hook_score' => 0.0,
            ];
        }

        $bestCandidate = [
            'text' => (string) $sentences[0],
            'type' => $this->detectHookType((string) $sentences[0]),
            'position' => 0,
            'score' => $this->scoreSentence((string) $sentences[0], 0, $signals),
        ];

        foreach ($sentences as $index => $sentence) {
            $score = $this->scoreSentence((string) $sentence, $index, $signals);

            if ($score > $bestCandidate['score']) {
                $bestCandidate = [
                    'text' => (string) $sentence,
                    'type' => $this->detectHookType((string) $sentence),
                    'position' => $index,
                    'score' => $score,
                ];
            }

            if (! isset($sentences[$index + 1])) {
                continue;
            }

            $paired = trim($sentence.' '.$sentences[$index + 1]);
            $pairScore = $this->scoreSentence($paired, $index, $signals) + 0.6;

            if ($pairScore > $bestCandidate['score']) {
                $bestCandidate = [
                    'text' => $paired,
                    'type' => 'Sentence Pair',
                    'position' => $index,
                    'score' => $pairScore,
                ];
            }
        }

        return [
            'hook_text' => $bestCandidate['text'],
            'hook_type' => $bestCandidate['type'],
            'hook_position' => $bestCandidate['position'],
            'hook_score' => round((float) $bestCandidate['score'], 2),
        ];
    }

    /**
     * @param  array<string, mixed>  $signals
     */
    private function scoreSentence(string $sentence, int $position, array $signals): float
    {
        $normalized = mb_strtolower($sentence);
        $score = 0.0;

        if ($position === 0) {
            $score += 2.2;
        } elseif ($position === 1) {
            $score += 1.4;
        } elseif ($position === 2) {
            $score += 0.8;
        }

        if (preg_match('/\b(?:but|however|instead|actually|lekin|par|magar|balki)\b/ui', $normalized)) {
            $score += 1.8;
        }

        if (preg_match('/\bnot\b.+\bbut\b|\bnahi\b.+\bbalki\b/ui', $normalized)) {
            $score += 2.0;
        }

        if (preg_match('/\b(?:you|your|tum|aap)\b/ui', $normalized)) {
            $score += 1.2;
        }

        if (preg_match('/^\s*(?:\d+[\.\)]|first|second|third|pehla|pahla|doosra|dusra)\b/ui', $normalized)) {
            $score += 1.3;
        }

        if (preg_match('/\b(?:google|meta|expert|client|founder|data|research)\b/ui', $normalized)) {
            $score += 1.0;
        }

        if (preg_match('/\b(?:wrong|fail|stop|never|mistake|problem|struggle)\b/ui', $normalized)) {
            $score += 1.1;
        }

        if (($signals['problem_solution_count'] ?? 0) > 0 && preg_match('/\b(?:problem|solution|fix|answer)\b/ui', $normalized)) {
            $score += 0.6;
        }

        if (($signals['effort_failure_count'] ?? 0) > 0 && preg_match('/\b(?:try|worked|still|failed|result)\b/ui', $normalized)) {
            $score += 0.6;
        }

        return $score;
    }

    private function detectHookType(string $sentence): string
    {
        $normalized = mb_strtolower($sentence);

        if (preg_match('/^\s*(?:\d+[\.\)]|first|second|third|pehla|pahla|doosra|dusra)\b/ui', $normalized)) {
            return 'Number-led';
        }

        if (preg_match('/\bnot\b.+\bbut\b|\bnahi\b.+\bbalki\b/ui', $normalized)) {
            return 'Reversal';
        }

        if (preg_match('/\b(?:but|however|instead|actually|lekin|par|magar|balki)\b/ui', $normalized)) {
            return 'Contrast';
        }

        if (preg_match('/\b(?:you|your|tum|aap)\b/ui', $normalized)) {
            return 'Direct Address';
        }

        if (preg_match('/\b(?:google|meta|expert|client|founder|data|research)\b/ui', $normalized)) {
            return 'Authority';
        }

        return 'Problem Setup';
    }
}
