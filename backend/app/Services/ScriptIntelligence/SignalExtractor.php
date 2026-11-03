<?php

namespace App\Services\ScriptIntelligence;

class SignalExtractor
{
    /**
     * @param  array{
     *   transcript_cleaned: string,
     *   sentence_list: array<int, string>,
     *   markers: array{
     *     numbered_structure: array<int, string>,
     *     cta_keywords: array<int, string>,
     *     authority_keywords: array<int, string>,
     *     contrast_keywords: array<int, string>
     *   }
     * }  $preprocessed
     * @return array<string, mixed>
     */
    public function extract(array $preprocessed): array
    {
        $cleaned = mb_strtolower((string) ($preprocessed['transcript_cleaned'] ?? ''));
        $sentences = $preprocessed['sentence_list'] ?? [];
        $markers = $preprocessed['markers'] ?? [];

        $contrastKeywords = $markers['contrast_keywords'] ?? [];
        $contrastWordCount = $this->countKeywordMentions($cleaned, $contrastKeywords);
        $directAddressCount = $this->countRegexMatches($cleaned, '/\b(?:you|your|u|tum|aap|tumhara|aapka)\b/ui');
        $reversalPatternCount = $this->countRegexMatches($cleaned, '/\bnot\b.+\bbut\b|\bnahi\b.+\bbalki\b/ui');

        $effortFailureCount = 0;
        $problemSolutionCount = 0;
        $repetitionCount = $this->countRepeatedSentences($sentences);
        $imperativeStepCount = 0;
        $emotionWordCount = 0;
        $instructionWordCount = 0;
        $comparisonWordCount = 0;
        $statusWordCount = 0;

        foreach ($sentences as $index => $sentence) {
            $normalizedSentence = mb_strtolower($sentence);

            if ($this->looksImperative($normalizedSentence)) {
                $imperativeStepCount++;
            }

            $emotionWordCount += $this->countRegexMatches($normalizedSentence, '/\b(?:feel|fear|frustrat|excit|hurt|pain|love|sad|happy)\w*\b/ui');
            $instructionWordCount += $this->countRegexMatches($normalizedSentence, '/\b(?:step|method|framework|how to|guide|tips?|process)\b/ui');
            $comparisonWordCount += $this->countRegexMatches($normalizedSentence, '/\b(?:vs|versus|better|worse|compare|instead)\b/ui');
            $statusWordCount += $this->countRegexMatches($normalizedSentence, '/\b(?:premium|elite|pro|status|top|best|exclusive)\b/ui');

            if (! isset($sentences[$index + 1])) {
                continue;
            }

            $nextSentence = mb_strtolower((string) $sentences[$index + 1]);

            if ($this->containsAny($normalizedSentence, ['try', 'tried', 'mehnat', 'worked hard', 'effort'])
                && $this->containsAny($nextSentence, ['failed', 'didn', 'did not', 'no result', 'waste', 'still'])) {
                $effortFailureCount++;
            }

            if ($this->containsAny($normalizedSentence, ['problem', 'issue', 'stuck', 'struggle', 'mistake'])
                && $this->containsAny($nextSentence, ['solution', 'fix', 'do this', 'use this', 'answer'])) {
                $problemSolutionCount++;
            }
        }

        $numberLedOpener = false;

        if (($sentences[0] ?? '') !== '') {
            $numberLedOpener = (bool) preg_match('/^\s*(?:\d+[\.\)]|first|second|third|pehla|pahla|doosra|dusra)\b/ui', (string) $sentences[0]);
        }

        return [
            'contrast_word_count' => $contrastWordCount,
            'reversal_pattern_count' => $reversalPatternCount,
            'effort_failure_count' => $effortFailureCount,
            'problem_solution_count' => $problemSolutionCount,
            'repetition_count' => $repetitionCount,
            'imperative_step_count' => $imperativeStepCount,
            'direct_address_count' => $directAddressCount,
            'number_led_opener' => $numberLedOpener,
            'emotion_word_count' => $emotionWordCount,
            'instruction_word_count' => $instructionWordCount,
            'comparison_word_count' => $comparisonWordCount,
            'status_word_count' => $statusWordCount,
        ];
    }

    /**
     * @param  array<int, string>  $keywords
     */
    private function countKeywordMentions(string $text, array $keywords): int
    {
        if ($text === '' || $keywords === []) {
            return 0;
        }

        $total = 0;

        foreach ($keywords as $keyword) {
            $quoted = preg_quote((string) $keyword, '/');
            $total += $this->countRegexMatches($text, "/{$quoted}/ui");
        }

        return $total;
    }

    private function countRegexMatches(string $text, string $pattern): int
    {
        if ($text === '') {
            return 0;
        }

        preg_match_all($pattern, $text, $matches);

        return count($matches[0] ?? []);
    }

    /**
     * @param  array<int, string>  $sentences
     */
    private function countRepeatedSentences(array $sentences): int
    {
        if ($sentences === []) {
            return 0;
        }

        $normalizedSentences = array_map(
            fn (string $sentence): string => trim(mb_strtolower(preg_replace('/\s+/u', ' ', $sentence) ?? $sentence)),
            $sentences
        );

        $occurrences = array_count_values(array_filter($normalizedSentences, fn (string $sentence): bool => $sentence !== ''));
        $repetitionCount = 0;

        foreach ($occurrences as $count) {
            if ($count > 1) {
                $repetitionCount += $count - 1;
            }
        }

        return $repetitionCount;
    }

    private function looksImperative(string $sentence): bool
    {
        return (bool) preg_match('/^\s*(?:do|use|try|start|stop|follow|watch|save|share|comment|click|register|join|ab|karo|karna)\b/ui', $sentence);
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
}
