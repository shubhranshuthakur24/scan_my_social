<?php

namespace App\Services\ScriptResearch;

class ResearchConfidenceService
{
    /**
     * @param  array<int, array<string, mixed>>  $sources
     */
    public function score(array $sources, float $agreement = 1.0): int
    {
        if ($sources === []) {
            return 0;
        }

        $authority = collect($sources)->avg(
            fn (array $source): int => (int) ($source['authority_score'] ?? 50)
        ) / 100;
        $freshness = collect($sources)->avg(
            fn (array $source): float => (float) ($source['freshness_score'] ?? 0.5)
        );
        $sourceCount = min(1, count($sources) / 3);

        return (int) round(
            ($authority * 45)
            + (max(0, min(1, $agreement)) * 25)
            + ($freshness * 20)
            + ($sourceCount * 10)
        );
    }

    public function label(int $score): string
    {
        return match (true) {
            $score >= 80 => 'high',
            $score >= 60 => 'medium',
            default => 'low',
        };
    }
}
