<?php

namespace App\Services\ScriptIntelligence;

class TranscriptPreprocessor
{
    /**
     * @return array{
     *   transcript_raw: string,
     *   transcript_cleaned: string,
     *   sentence_list: array<int, string>,
     *   sentence_metrics: array{
     *     sentence_count: int,
     *     word_count: int,
     *     avg_sentence_length: float,
     *     micro_sentence_ratio: float
     *   },
     *   markers: array{
     *     numbered_structure: array<int, string>,
     *     cta_keywords: array<int, string>,
     *     authority_keywords: array<int, string>,
     *     contrast_keywords: array<int, string>
     *   }
     * }
     */
    public function preprocess(string $transcript): array
    {
        $rawTranscript = trim($transcript);
        $cleanedTranscript = $this->normalizeWhitespace($rawTranscript);
        $sentenceList = $this->splitSentences($cleanedTranscript);

        $sentenceLengths = array_map(
            fn (string $sentence): int => $this->countWords($sentence),
            $sentenceList
        );

        $sentenceCount = count($sentenceList);
        $wordCount = array_sum($sentenceLengths);
        $avgSentenceLength = $sentenceCount > 0 ? round($wordCount / $sentenceCount, 2) : 0.0;
        $microSentenceCount = count(array_filter($sentenceLengths, fn (int $length): bool => $length > 0 && $length < 12));
        $microSentenceRatio = $sentenceCount > 0 ? round($microSentenceCount / $sentenceCount, 2) : 0.0;

        return [
            'transcript_raw' => $rawTranscript,
            'transcript_cleaned' => $cleanedTranscript,
            'sentence_list' => $sentenceList,
            'sentence_metrics' => [
                'sentence_count' => $sentenceCount,
                'word_count' => $wordCount,
                'avg_sentence_length' => $avgSentenceLength,
                'micro_sentence_ratio' => $microSentenceRatio,
            ],
            'markers' => [
                'numbered_structure' => $this->detectNumberedStructure($cleanedTranscript),
                'cta_keywords' => $this->detectKeywordMatches($cleanedTranscript, config('script_intelligence.keywords.cta', [])),
                'authority_keywords' => $this->detectKeywordMatches($cleanedTranscript, config('script_intelligence.keywords.authority', [])),
                'contrast_keywords' => $this->detectKeywordMatches($cleanedTranscript, config('script_intelligence.keywords.contrast', [])),
            ],
        ];
    }

    private function normalizeWhitespace(string $text): string
    {
        if ($text === '') {
            return '';
        }

        $singleSpaced = preg_replace('/[ \t]+/u', ' ', $text) ?? $text;
        $normalized = preg_replace('/\R+/u', ' ', $singleSpaced) ?? $singleSpaced;

        return trim($normalized);
    }

    /**
     * @return array<int, string>
     */
    private function splitSentences(string $text): array
    {
        if ($text === '') {
            return [];
        }

        $sentences = preg_split('/(?<=[.!?।])\s+|\R+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $trimmed = array_values(array_filter(array_map('trim', $sentences), fn (string $sentence): bool => $sentence !== ''));

        if ($trimmed !== []) {
            return $trimmed;
        }

        return [$text];
    }

    private function countWords(string $text): int
    {
        preg_match_all('/[\p{L}\p{N}\']+/u', $text, $matches);

        return count($matches[0] ?? []);
    }

    /**
     * @return array<int, string>
     */
    private function detectNumberedStructure(string $text): array
    {
        if ($text === '') {
            return [];
        }

        preg_match_all('/\b(?:\d+[\.\)]|first|second|third|fourth|pehla|pahla|doosra|dusra|tisra)\b/ui', $text, $matches);

        return array_values(array_unique(array_map(fn (string $match): string => mb_strtolower($match), $matches[0] ?? [])));
    }

    /**
     * @param  array<int, string>  $keywords
     * @return array<int, string>
     */
    private function detectKeywordMatches(string $text, array $keywords): array
    {
        if ($text === '' || $keywords === []) {
            return [];
        }

        $normalizedText = mb_strtolower($text);
        $matches = [];

        foreach ($keywords as $keyword) {
            $normalizedKeyword = mb_strtolower((string) $keyword);

            if ($normalizedKeyword !== '' && str_contains($normalizedText, $normalizedKeyword)) {
                $matches[] = $normalizedKeyword;
            }
        }

        return array_values(array_unique($matches));
    }
}
