<?php

namespace App\Services\ScriptResearch;

use Illuminate\Support\Str;

class TopicNormalizer
{
    /**
     * @return array{normalized_topic: string, comparison_topic: bool}
     */
    public function normalize(string $topic): array
    {
        $value = Str::of($topic)
            ->lower()
            ->replaceMatches('/[^\pL\pN\s\-&]+/u', ' ')
            ->squish()
            ->value();

        $comparison = (bool) preg_match(
            '/\b(vs|versus|compared (?:to|with)|difference between|better than|comparison)\b/i',
            $value
        );

        if ($comparison) {
            $suffixComparison = preg_match('/^(.+)\s+comparison$/i', $value, $matches) === 1;
            $value = preg_replace(
                '/\b(vs|versus|compared (?:to|with)|difference between|better than|comparison)\b/i',
                '|',
                $value
            ) ?? $value;
            $value = preg_replace('/\b(and|or)\b/i', '|', $value) ?? $value;

            if ($suffixComparison) {
                $words = preg_split('/\s+/', trim((string) $matches[1])) ?: [];
                if (count($words) === 2) {
                    $value = implode('|', $words);
                }
            }

            $subjects = collect(explode('|', $value))
                ->map(fn (string $subject): string => $this->normalizeSubject($subject))
                ->filter()
                ->unique()
                ->sort()
                ->values();

            if ($subjects->count() >= 2) {
                $value = $subjects->implode(' | ');
            }
        }

        return [
            'normalized_topic' => $this->normalizeSubject($value),
            'comparison_topic' => $comparison,
        ];
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function suggestIntent(string $topic, array $context = []): string
    {
        $fields = [
            $topic,
            $context['audience'] ?? null,
            $context['primary_problem'] ?? null,
            $context['supporting_information'] ?? null,
            $context['key_points'] ?? null,
            $context['proof_points'] ?? null,
        ];
        $brief = Str::lower(implode(' ', array_filter(
            $fields,
            fn (mixed $value): bool => is_string($value) && trim($value) !== ''
        )));
        $scores = [
            'educational' => 1,
            'news' => 0,
            'trend' => 0,
            'opinion' => 0,
            'investigative' => 0,
        ];

        $scores['news'] += $this->keywordScore($brief, [
            'latest', 'today', 'recent', 'announced', 'announcement', 'breaking',
            'launch', 'released', 'update', 'this week', 'this month',
        ], 3);
        $scores['trend'] += $this->keywordScore($brief, [
            'trend', 'trending', 'viral', 'popular', 'people are saying',
            'buzz', 'growing', 'surge', 'everyone is talking',
        ], 3);
        $scores['investigative'] += $this->keywordScore($brief, [
            'controversy', 'truth about', 'investigate', 'investigation',
            'evidence', 'verify', 'fact check', 'exposed', 'hidden', 'claim',
        ], 3);
        $scores['opinion'] += $this->keywordScore($brief, [
            'should', 'opinion', 'why i think', 'best', 'worst', 'hot take',
            'debate', 'agree', 'disagree', 'unpopular opinion',
        ], 3);
        $scores['educational'] += $this->keywordScore($brief, [
            'how to', 'guide', 'explain', 'learn', 'steps', 'framework',
            'tips', 'mistakes', 'beginner', 'what is',
        ], 2);

        $objective = (string) ($context['objective'] ?? '');
        match ($objective) {
            'go_viral' => $scores['trend']++,
            'increase_engagement' => $scores['opinion']++,
            'build_authority' => $scores['educational']++,
            default => null,
        };

        $priority = ['news', 'investigative', 'trend', 'opinion', 'educational'];

        return collect($priority)
            ->sortByDesc(fn (string $intent): int => $scores[$intent])
            ->first() ?? 'educational';
    }

    /**
     * @param  array<int, string>  $keywords
     */
    private function keywordScore(string $brief, array $keywords, int $weight): int
    {
        return collect($keywords)
            ->filter(fn (string $keyword): bool => Str::contains($brief, $keyword))
            ->count() * $weight;
    }

    private function normalizeSubject(string $subject): string
    {
        return Str::of($subject)
            ->replaceMatches('/\s+/', ' ')
            ->trim(" \t\n\r\0\x0B-|")
            ->value();
    }
}
