<?php

namespace App\Jobs;

use App\Models\ScriptGenerationBatch;
use App\Services\ScriptResearch\ScriptResearchService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ResearchScriptBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries;

    public int $timeout = 110;

    public function __construct(public ScriptGenerationBatch $batch)
    {
        $this->tries = (int) config('script_research.lock_max_attempts', 3);
    }

    public function handle(ScriptResearchService $researchService): void
    {
        $this->batch->refresh();
        if (in_array($this->batch->research_status, ['completed', 'blocked'], true)) {
            return;
        }

        $cacheKey = $researchService->cacheKey($this->batch);
        $artifact = $researchService->findFreshArtifact($cacheKey);
        $usedLiveSearch = false;

        if (! $artifact) {
            $lock = Cache::lock(
                'script-research:'.$cacheKey,
                (int) config('script_research.lock_ttl_seconds', 120)
            );

            if (! $lock->get()) {
                if ($this->attempts() < $this->tries) {
                    $this->release((int) config('script_research.lock_retry_seconds', 10));

                    return;
                }

                throw new RuntimeException('Research cache lock retries were exhausted.');
            }

            try {
                $artifact = $researchService->findFreshArtifact($cacheKey);
                if (! $artifact) {
                    $artifact = $researchService->researchPublic($this->batch, $cacheKey);
                    $usedLiveSearch = true;
                }
            } finally {
                $lock->release();
            }
        }

        $supplement = $researchService->researchSupplement($this->batch, $artifact);
        $usedSupplement = $supplement !== null;
        $strategy = match (true) {
            $usedLiveSearch && $usedSupplement => 'live_search_plus_supplement',
            $usedLiveSearch => 'live_search',
            $usedSupplement => 'cache_plus_supplement',
            default => 'cache_only',
        };
        $unresolved = $researchService->unresolvedRequirements($this->batch, $artifact);

        if ($unresolved !== []) {
            $this->handleUnresolvedEvidence($unresolved);

            return;
        }

        $scriptCount = $this->batch->scripts()->count();
        $artifact->forceFill([
            'reference_count' => (int) $artifact->reference_count + $scriptCount,
            'is_historical' => true,
        ])->save();

        $this->batch->forceFill([
            'script_research_id' => $artifact->id,
            'cache_key' => $cacheKey,
            'cache_hit_at' => $usedLiveSearch ? null : now(),
            'research_strategy' => $strategy,
            'research_status' => 'completed',
            'status' => $this->batch->workflow_version === config('script_engine.workflow_version')
                ? 'generating_angles'
                : 'generating',
            'supplemental_research' => $supplement,
            'supplemental_query_count' => $usedSupplement ? 1 : 0,
            'enriched_brief' => $researchService->enrichedBrief($this->batch, $artifact),
            'unresolved_questions' => [],
            'error_message' => null,
        ])->save();

        $tier = (array) config("script_research.tiers.{$this->batch->research_tier}");
        $researchCost = ($usedLiveSearch || $usedSupplement)
            ? (int) ($tier['live_cost'] ?? 20)
            : (int) ($tier['cache_cost'] ?? 10);
        $this->batch->settleResearchCost($researchCost);

        if ($this->batch->workflow_version === config('script_engine.workflow_version')) {
            $this->batch->scripts()->update([
                'title' => 'Generating angles...',
                'script' => 'Research is complete. AI is developing five distinct angles...',
                'status' => 'processing',
                'error_message' => null,
            ]);
            GenerateScriptAnglesJob::dispatch($this->batch);

            return;
        }

        foreach ($this->batch->scripts as $index => $script) {
            $params = array_merge(
                (array) $this->batch->creative_brief,
                [
                    'mode' => 'fresh',
                    'variant_index' => $index,
                    'comparison_topic' => $this->batch->comparison_topic,
                    'research_brief' => $this->batch->enriched_brief,
                ]
            );
            $script->update(['status' => 'processing', 'error_message' => null]);
            GenerateScriptJob::dispatch($script, $params, (int) config('script_research.generation_cost', 50));
        }
    }

    public function failed(Throwable $exception): void
    {
        $batch = ScriptGenerationBatch::query()->find($this->batch->id);
        if (! $batch || in_array($batch->status, ['completed', 'research_blocked'], true)) {
            return;
        }

        Log::error('Script research batch failed.', [
            'batch_id' => $batch->id,
            'error' => $exception->getMessage(),
        ]);

        $batch->forceFill([
            'status' => 'failed',
            'research_status' => 'failed',
            'error_message' => Str::limit($exception->getMessage(), 1000),
        ])->save();
        $batch->scripts()->update([
            'status' => 'failed',
            'error_message' => Str::limit($exception->getMessage(), 255),
        ]);
        $batch->refundAll('script_research_refund_operational_failure');
    }

    /**
     * @param  array<int, string>  $unresolved
     */
    private function handleUnresolvedEvidence(array $unresolved): void
    {
        $attempts = (int) $this->batch->research_attempts + 1;
        $blocked = $attempts >= 2;

        $this->batch->forceFill([
            'research_attempts' => $attempts,
            'research_status' => $blocked ? 'blocked' : 'needs_input',
            'status' => $blocked ? 'research_blocked' : 'needs_input',
            'unresolved_questions' => $unresolved,
            'error_message' => $blocked
                ? 'Research could not verify the required evidence after two attempts.'
                : 'More facts or source URLs are required before generation can continue.',
        ])->save();
        $this->batch->scripts()->update([
            'status' => $blocked ? 'research_blocked' : 'needs_input',
            'error_message' => $this->batch->error_message,
        ]);
        $this->batch->refundAll(
            $blocked
                ? 'script_research_refund_blocked'
                : 'script_research_refund_needs_input'
        );
    }
}
