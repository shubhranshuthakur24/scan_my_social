<?php

namespace App\Services\ScriptResearch;

use App\Models\ScriptGenerationBatch;
use App\Models\ScriptResearch;
use App\Models\ScriptResearchClaim;
use App\Services\OpenAIService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ScriptResearchService
{
    public function __construct(
        private readonly OpenAIService $openAi,
        private readonly ResearchConfidenceService $confidence,
    ) {}

    public function cacheKey(ScriptGenerationBatch $batch): string
    {
        return hash('sha256', json_encode([
            'topic' => $batch->normalized_topic,
            'intent' => $batch->research_intent,
            'language' => Arr::get($batch->creative_brief, 'language', 'English'),
            'locale' => Arr::get($batch->creative_brief, 'locale', 'en-US'),
            'tier' => $batch->research_tier,
            'version' => config('script_research.version'),
        ], JSON_THROW_ON_ERROR));
    }

    public function findFreshArtifact(string $cacheKey): ?ScriptResearch
    {
        return ScriptResearch::query()
            ->reusable()
            ->where('cache_key', $cacheKey)
            ->with(['claims.sources', 'sources'])
            ->latest('researched_at')
            ->first();
    }

    public function researchPublic(ScriptGenerationBatch $batch, string $cacheKey): ScriptResearch
    {
        $startedAt = hrtime(true);
        $maxSources = (int) config("script_research.tiers.{$batch->research_tier}.max_sources", 6);
        $response = $this->openAi->researchTopic($this->publicPrompt($batch, $maxSources));
        $sourceRows = $this->normalizeSources($response['sources'], $maxSources);
        $data = $response['data'];

        return DB::transaction(function () use ($batch, $cacheKey, $response, $sourceRows, $data, $startedAt): ScriptResearch {
            $researchedAt = CarbonImmutable::now();
            $hours = (int) config("script_research.intents.{$batch->research_intent}.hours", 24);
            $claims = $this->normalizedClaims($data, $sourceRows);
            $usableScores = collect($claims)
                ->where('is_usable', true)
                ->pluck('confidence_score')
                ->filter()
                ->values();
            $overallScore = $usableScores->isEmpty() ? 0 : (int) round($usableScores->avg());

            $artifact = ScriptResearch::query()->create([
                'cache_key' => $cacheKey,
                'original_topic' => $batch->original_topic,
                'normalized_topic' => $batch->normalized_topic,
                'intent' => $batch->research_intent,
                'language' => Arr::get($batch->creative_brief, 'language', 'English'),
                'locale' => Arr::get($batch->creative_brief, 'locale', 'en-US'),
                'tier' => $batch->research_tier,
                'research_version' => config('script_research.version'),
                'state' => 'active',
                'confidence_score' => $overallScore,
                'confidence_label' => $this->confidence->label($overallScore),
                'summary' => [
                    'topic_summary' => (string) ($data['topic_summary'] ?? ''),
                    'suggested_angles' => array_values((array) ($data['suggested_angles'] ?? [])),
                    'prohibited_claims' => array_values((array) ($data['prohibited_claims'] ?? [])),
                    'unresolved_questions' => array_values((array) ($data['unresolved_questions'] ?? [])),
                ],
                'provider' => config('script_research.provider'),
                'provider_version' => config('script_research.provider_version'),
                'model' => $response['model'],
                'provider_response_id' => $response['response_id'],
                'usage' => $response['usage'],
                'duration_ms' => (int) round((hrtime(true) - $startedAt) / 1_000_000),
                'researched_at' => $researchedAt,
                'fresh_until' => $researchedAt->addHours($hours),
                'completed_at' => now(),
            ]);

            $sourcesByUrl = [];
            foreach ($sourceRows as $source) {
                $model = $artifact->sources()->create($source);
                $sourcesByUrl[$source['url']] = $model;
            }

            foreach ($claims as $claim) {
                $sourceUrls = $claim['source_urls'];
                unset($claim['source_urls']);
                $claimModel = $artifact->claims()->create($claim);
                $relationship = $this->relationshipForCategory($claimModel->category);
                $claimModel->sources()->attach(
                    collect($sourceUrls)
                        ->mapWithKeys(fn (string $url): array => isset($sourcesByUrl[$url])
                            ? [$sourcesByUrl[$url]->id => ['relationship' => $relationship]]
                            : [])
                        ->all()
                );
            }

            return $artifact->load(['claims.sources', 'sources']);
        });
    }

    /**
     * @return array<string, mixed>|null
     */
    public function researchSupplement(ScriptGenerationBatch $batch, ScriptResearch $artifact): ?array
    {
        if (! $this->needsSupplement($batch)) {
            return null;
        }

        $response = $this->openAi->researchTopic($this->supplementPrompt($batch, $artifact));
        $sourceRows = $this->normalizeSources(
            $response['sources'],
            (int) config('script_research.max_supplemental_sources', 5)
        );
        $claims = $this->normalizedClaims($response['data'], $sourceRows);

        DB::transaction(function () use ($batch, $sourceRows, $claims): void {
            $sourcesByUrl = [];
            foreach ($sourceRows as $source) {
                $model = $batch->supplementalSources()->create($source);
                $sourcesByUrl[$source['url']] = $model;
            }

            foreach ($claims as $claim) {
                $sourceUrls = $claim['source_urls'];
                unset($claim['source_urls']);
                $claimModel = $batch->supplementalClaims()->create($claim);
                $relationship = $this->relationshipForCategory($claimModel->category);
                $claimModel->sources()->attach(
                    collect($sourceUrls)
                        ->mapWithKeys(fn (string $url): array => isset($sourcesByUrl[$url])
                            ? [$sourcesByUrl[$url]->id => ['relationship' => $relationship]]
                            : [])
                        ->all()
                );
            }
        });

        return [
            'summary' => $response['data'],
            'source_count' => count($sourceRows),
            'claim_count' => count($claims),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function enrichedBrief(ScriptGenerationBatch $batch, ScriptResearch $artifact): array
    {
        $artifact->loadMissing(['claims.sources', 'sources']);
        $supplemental = $batch->supplementalClaims()->with('sources')->get();
        $userFacts = collect($batch->user_provided_facts ?? [])
            ->filter()
            ->map(fn (string $fact): array => [
                'claim' => $fact,
                'category' => 'user_provided_facts',
                'is_user_provided' => true,
                'confidence_score' => null,
            ]);

        return [
            'research' => [
                'topic_summary' => Arr::get($artifact->summary, 'topic_summary'),
                'suggested_angles' => Arr::get($artifact->summary, 'suggested_angles', []),
                'prohibited_claims' => Arr::get($artifact->summary, 'prohibited_claims', []),
                'claims' => $artifact->claims
                    ->where('is_usable', true)
                    ->concat($supplemental->where('is_usable', true))
                    ->map(fn (ScriptResearchClaim $claim): array => [
                        'id' => $claim->id,
                        'claim' => $claim->claim,
                        'category' => $claim->category,
                        'confidence_score' => $claim->confidence_score,
                        'source_ids' => $claim->sources->pluck('id')->all(),
                    ])
                    ->concat($userFacts)
                    ->values()
                    ->all(),
                'unresolved_questions' => Arr::get($artifact->summary, 'unresolved_questions', []),
            ],
            'creative_brief' => $batch->creative_brief,
            'comparison_topic' => $batch->comparison_topic,
        ];
    }

    /**
     * @return array<int, string>
     */
    public function unresolvedRequirements(ScriptGenerationBatch $batch, ScriptResearch $artifact): array
    {
        $required = trim((string) Arr::get($batch->creative_brief, 'proof_points'));
        if ($required === '') {
            return [];
        }

        $usableEvidence = (array) $batch->user_provided_facts !== []
            || $artifact->claims()
                ->where('is_usable', true)
                ->exists() || $batch->supplementalClaims()->where('is_usable', true)->exists();

        return $usableEvidence
            ? []
            : ['Provide a credible source URL or label the requested proof point as a user-provided fact.'];
    }

    private function needsSupplement(ScriptGenerationBatch $batch): bool
    {
        if ((int) $batch->supplemental_query_count >= (int) config('script_research.max_supplemental_queries', 1)) {
            return false;
        }

        return trim((string) Arr::get($batch->creative_brief, 'proof_points')) !== ''
            || (array) $batch->submitted_source_urls !== [];
    }

    private function publicPrompt(ScriptGenerationBatch $batch, int $maxSources): string
    {
        $intent = config("script_research.intents.{$batch->research_intent}.label", 'Educational');
        $language = Arr::get($batch->creative_brief, 'language', 'English');

        return <<<PROMPT
Research the public topic "{$batch->original_topic}" for a {$intent} short-form video.
Output language: {$language}.
Use current web search and no more than {$maxSources} strong sources.

Keep evidence layers separate:
- verified_facts: objectively supportable claims
- trend_signals: what people are discussing or what appears popular
- controversies: materially conflicting claims or viewpoints
- uncertainties: claims that cannot be established confidently

Trend, forum, and social sources may support trend_signals, but never independently support verified_facts.
Do not invent statistics, named studies, dates, product capabilities, testimonials, or authority claims.
Every item must list exact source URLs returned by web search.

Return only JSON:
{
  "topic_summary": "",
  "verified_facts": [{"claim": "", "source_urls": [], "agreement": 1.0}],
  "trend_signals": [{"claim": "", "source_urls": [], "agreement": 1.0}],
  "controversies": [{"claim": "", "source_urls": [], "agreement": 0.5}],
  "uncertainties": [{"claim": "", "source_urls": [], "agreement": 0.0}],
  "suggested_angles": [""],
  "prohibited_claims": [""],
  "unresolved_questions": [""]
}
PROMPT;
    }

    private function supplementPrompt(ScriptGenerationBatch $batch, ScriptResearch $artifact): string
    {
        $proofPoints = trim((string) Arr::get($batch->creative_brief, 'proof_points'));
        $urls = implode("\n", (array) $batch->submitted_source_urls);

        return <<<PROMPT
Run one narrowly targeted supplemental search for "{$batch->original_topic}".
The existing public research did not fully cover this requested evidence:
{$proofPoints}

User-submitted source URLs, if any:
{$urls}

Return only JSON using the same evidence-layer schema:
{
  "topic_summary": "",
  "verified_facts": [{"claim": "", "source_urls": [], "agreement": 1.0}],
  "trend_signals": [],
  "controversies": [],
  "uncertainties": [],
  "suggested_angles": [],
  "prohibited_claims": [],
  "unresolved_questions": []
}
PROMPT;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rawSources
     * @return array<int, array<string, mixed>>
     */
    private function normalizeSources(array $rawSources, int $limit): array
    {
        return collect($rawSources)
            ->filter(fn (array $source): bool => filter_var($source['url'] ?? null, FILTER_VALIDATE_URL) !== false)
            ->unique(fn (array $source): string => (string) $source['url'])
            ->take($limit)
            ->map(function (array $source): array {
                $url = (string) $source['url'];
                $host = mb_strtolower((string) parse_url($url, PHP_URL_HOST));
                $isPrimary = Str::endsWith($host, ['.gov', '.edu'])
                    || Str::contains($host, ['openai.com', 'google.com', 'microsoft.com', 'meta.com']);
                $authority = $isPrimary ? 90 : (Str::contains($host, ['reuters.com', 'apnews.com', 'bbc.']) ? 80 : 55);

                return [
                    'title' => (string) ($source['title'] ?? $host),
                    'publisher' => $host,
                    'url' => $url,
                    'url_hash' => hash('sha256', $url),
                    'published_at' => $source['published_at'] ?? null,
                    'source_type' => $this->sourceType($host),
                    'authority_score' => $authority,
                    'is_primary' => $isPrimary,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, array<string, mixed>>  $sources
     * @return array<int, array<string, mixed>>
     */
    private function normalizedClaims(array $data, array $sources): array
    {
        $available = collect($sources)->keyBy('url');
        $claims = [];

        foreach (['verified_facts', 'trend_signals', 'controversies', 'uncertainties'] as $category) {
            foreach ((array) ($data[$category] ?? []) as $item) {
                if (! is_array($item) || trim((string) ($item['claim'] ?? '')) === '') {
                    continue;
                }

                $sourceUrls = collect((array) ($item['source_urls'] ?? []))
                    ->filter(fn (string $url): bool => $available->has($url))
                    ->values()
                    ->all();
                $claimSources = collect($sourceUrls)->map(function (string $url) use ($available): array {
                    $source = $available->get($url);
                    $publishedAt = $source['published_at'] ?? null;
                    $freshness = $this->freshnessScore($publishedAt);

                    return [
                        'authority_score' => $source['authority_score'],
                        'freshness_score' => $freshness,
                    ];
                })->all();
                $score = $this->confidence->score(
                    $claimSources,
                    (float) ($item['agreement'] ?? ($category === 'verified_facts' ? 1 : 0.5))
                );

                $claims[] = [
                    'category' => $category,
                    'claim' => trim((string) $item['claim']),
                    'confidence_score' => $score,
                    'confidence_label' => $this->confidence->label($score),
                    'is_usable' => $category === 'trend_signals'
                        ? $sourceUrls !== []
                        : ($category === 'verified_facts' && $score >= 60),
                    'is_user_provided' => false,
                    'metadata' => ['agreement' => (float) ($item['agreement'] ?? 0)],
                    'source_urls' => $sourceUrls,
                ];
            }
        }

        return $claims;
    }

    private function sourceType(string $host): string
    {
        return match (true) {
            Str::contains($host, ['reddit.com', 'x.com', 'twitter.com', 'youtube.com', 'tiktok.com']) => 'social',
            Str::contains($host, ['reuters.com', 'apnews.com', 'bbc.', 'cnn.com']) => 'news',
            Str::endsWith($host, '.gov') => 'government',
            Str::endsWith($host, '.edu') => 'academic',
            default => 'web',
        };
    }

    private function relationshipForCategory(string $category): string
    {
        return match ($category) {
            'controversies' => 'contradicts',
            'trend_signals', 'uncertainties' => 'contextualizes',
            default => 'supports',
        };
    }

    private function freshnessScore(mixed $publishedAt): float
    {
        if (! is_string($publishedAt) || trim($publishedAt) === '') {
            return 0.5;
        }

        try {
            return max(
                0.2,
                1 - min(1, CarbonImmutable::parse($publishedAt)->diffInDays(now()) / 365)
            );
        } catch (\Throwable) {
            return 0.5;
        }
    }
}
