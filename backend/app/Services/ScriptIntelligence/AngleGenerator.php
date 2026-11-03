<?php

namespace App\Services\ScriptIntelligence;

class AngleGenerator
{
    /**
     * @param  array<string, mixed>  $preprocessed
     * @param  array<string, mixed>  $signals
     * @param  array<string, mixed>  $hook
     */
    public function generate(array $preprocessed, array $signals, array $hook, string $scriptType): string
    {
        $topic = $this->extractTopicKeywords((string) ($preprocessed['transcript_cleaned'] ?? ''));
        $hookText = mb_strtolower((string) ($hook['hook_text'] ?? ''));

        if (($signals['reversal_pattern_count'] ?? 0) > 0 || ($signals['contrast_word_count'] ?? 0) > 0) {
            return "Expectation vs reality lens on {$topic}";
        }

        if (($signals['problem_solution_count'] ?? 0) > 0) {
            return "{$topic} solved through a problem-solution lens";
        }

        if (($signals['imperative_step_count'] ?? 0) > 0) {
            return "Actionable {$topic} playbook for quick results";
        }

        if ($scriptType === 'Emotional' || preg_match('/\b(?:feel|fear|story|identity)\b/ui', $hookText)) {
            return "Emotional reframing of {$topic}";
        }

        return "Practical angle on {$topic}";
    }

    private function extractTopicKeywords(string $text): string
    {
        if ($text === '') {
            return 'the topic';
        }

        preg_match_all('/[\p{L}\p{N}]{3,}/u', mb_strtolower($text), $matches);
        $tokens = $matches[0] ?? [];

        $stopWords = [
            'this', 'that', 'with', 'from', 'your', 'you', 'and', 'for', 'the', 'are', 'was', 'have', 'has',
            'into', 'about', 'what', 'when', 'where', 'will', 'just', 'they', 'them', 'then', 'here', 'there',
            'karo', 'hai', 'nahi', 'but', 'lekin', 'par', 'magar',
        ];

        $filtered = array_filter(
            $tokens,
            fn (string $token): bool => ! in_array($token, $stopWords, true)
        );

        if ($filtered === []) {
            return 'the topic';
        }

        $counts = array_count_values($filtered);
        arsort($counts);
        $top = array_slice(array_keys($counts), 0, 2);

        return implode(' + ', $top);
    }
}
