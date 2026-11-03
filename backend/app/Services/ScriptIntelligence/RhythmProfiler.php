<?php

namespace App\Services\ScriptIntelligence;

class RhythmProfiler
{
    /**
     * @param  array{
     *   sentence_list: array<int, string>,
     *   sentence_metrics: array{
     *     sentence_count: int,
     *     word_count: int,
     *     avg_sentence_length: float,
     *     micro_sentence_ratio: float
     *   }
     * }  $preprocessed
     * @param  array<string, mixed>  $signals
     * @param  array{
     *   cta_position?: string
     * }  $cta
     * @return array{
     *   sentence_count: int,
     *   avg_sentence_length: float,
     *   micro_sentence_ratio: float,
     *   repetition_count: int,
     *   opening_density: float,
     *   cta_position: string
     * }
     */
    public function profile(array $preprocessed, array $signals, array $cta): array
    {
        $sentences = $preprocessed['sentence_list'] ?? [];
        $metrics = $preprocessed['sentence_metrics'] ?? [];
        $wordCount = (int) ($metrics['word_count'] ?? 0);

        $openingSentences = array_slice($sentences, 0, 3);
        $openingWordCount = 0;

        foreach ($openingSentences as $sentence) {
            preg_match_all('/[\p{L}\p{N}\']+/u', (string) $sentence, $matches);
            $openingWordCount += count($matches[0] ?? []);
        }

        $openingDensity = $wordCount > 0 ? round($openingWordCount / $wordCount, 2) : 0.0;

        return [
            'sentence_count' => (int) ($metrics['sentence_count'] ?? 0),
            'avg_sentence_length' => (float) ($metrics['avg_sentence_length'] ?? 0.0),
            'micro_sentence_ratio' => (float) ($metrics['micro_sentence_ratio'] ?? 0.0),
            'repetition_count' => (int) ($signals['repetition_count'] ?? 0),
            'opening_density' => $openingDensity,
            'cta_position' => (string) ($cta['cta_position'] ?? 'none'),
        ];
    }
}
