<?php

namespace App\Jobs;

use App\Models\GeneratedScript;
use App\Models\ScriptCtaType;
use App\Models\ScriptHookType;
use App\Models\ScriptObjective;
use App\Services\GeminiService;
use App\Services\OpenAIService;
use App\Services\ScriptEngine\ScriptContextBuilder;
use App\Services\ScriptRecreationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class GenerateScriptJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $script;

    protected $params;

    protected $cost;

    protected bool $chargedUpfront = false;

    public $tries = 3;

    public $backoff = [30, 120, 300];

    public $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(GeneratedScript $script, array $params, int $cost, bool $chargedUpfront = true)
    {
        $this->script = $script;
        $this->params = $params;
        $this->cost = $cost;
        $this->chargedUpfront = $chargedUpfront;
    }

    /**
     * Execute the job.
     */
    public function handle(
        OpenAIService $openAi,
        GeminiService $gemini,
        ScriptRecreationService $recreationService,
        ScriptContextBuilder $contextBuilder
    ): void {
        $lockKey = 'generate_script_lock_'.$this->script->id;
        $lock = Cache::lock($lockKey, 300); // 5 minute lock

        if (! $lock->get()) {
            Log::info('GenerateScriptJob skipping: Lock already held for Script ID '.$this->script->id);

            return;
        }

        try {
            // Re-check status inside lock
            $this->script->refresh();
            Log::debug('GenerateScriptJob handling script', [
                'script_id' => $this->script->id,
                'status' => $this->script->status,
            ]);

            if ($this->script->status === 'completed') {
                Log::info("GenerateScriptJob exiting: Script ID {$this->script->id} is already completed.");

                return;
            }

            $mode = (string) ($this->params['mode'] ?? 'fresh');
            $scriptOrigin = $this->resolveScriptOrigin();
            Log::info("Calling AI generation for ID {$this->script->id} in mode {$mode}...");
            $analysisBlueprintSnapshot = null;
            $engineOutput = [];

            if ($mode === 'viral_engine') {
                $batch = $this->script->generationBatch;
                if (! $batch || ! $batch->selected_angle_id) {
                    throw new \RuntimeException('A selected angle is required for viral script generation.');
                }

                $context = $contextBuilder->build($batch);
                $analysisBlueprintSnapshot = $context;
                $data = $this->callWithFallback($openAi, $gemini, 'generateViralScript', [$context]);
                $draftScript = trim((string) ($data['script'] ?? ''));
                $title = trim((string) ($data['title'] ?? 'Generated Script'));

                if ($draftScript === '') {
                    throw new \RuntimeException('AI response missing required "script" field.');
                }

                $batch->update(['status' => 'validating']);
                $polishData = $this->callWithFallback(
                    $openAi,
                    $gemini,
                    'critiqueAndPolish',
                    [
                        (array) ($context['selected_angle'] ?? []),
                        $draftScript,
                        [
                            'topic' => $context['topic'],
                            'language' => $context['language'],
                            'length' => $context['length'],
                            'platform' => $context['platform'],
                            'content_mix' => $context['content_mix'],
                            'selected_angle' => $context['selected_angle'],
                            'cta_type' => $context['cta'],
                            'objective' => $context['objective'],
                            'research_brief' => $context['evidence'],
                        ],
                    ]
                );
                $overallScore = (float) ($polishData['overallScore'] ?? 0);
                $criticalChecks = (array) ($polishData['criticalChecks'] ?? []);
                $criticalFailure = collect($criticalChecks)->contains(
                    fn (mixed $passed): bool => $passed !== true
                );
                $shouldRewrite = $criticalFailure
                    || $overallScore < (float) config('script_research.rewrite_threshold', 8);
                $scriptContent = $shouldRewrite
                    ? trim((string) ($polishData['revisedScript'] ?? $draftScript))
                    : $draftScript;
                $engineOutput = [
                    'draft_script' => $draftScript,
                    'suggested_hook' => trim((string) ($data['suggested_hook'] ?? '')) ?: null,
                    'suggested_cta' => trim((string) ($data['suggested_cta'] ?? '')) ?: null,
                    'angle_rationale' => trim((string) ($data['why_angle_works'] ?? '')) ?: null,
                    'quality_checks' => $criticalChecks,
                    'corrective_rewrite_applied' => $shouldRewrite,
                ];
            } elseif ($mode === 'recreate') {
                $sourceScriptId = (int) ($this->params['source_script_id'] ?? 0);
                $sourceScript = GeneratedScript::query()
                    ->where('id', $sourceScriptId)
                    ->where('user_id', $this->script->user_id)
                    ->with('contentAnalysis')
                    ->first();

                if (! $sourceScript || ! $sourceScript->contentAnalysis) {
                    throw new \RuntimeException('Recreation source blueprint is missing.');
                }

                $promptPayload = $recreationService->buildPromptPayload($sourceScript->contentAnalysis, $this->params);
                $analysisBlueprintSnapshot = $promptPayload;
                $data = $this->callWithFallback($openAi, $gemini, 'generateRecreatedScript', [$promptPayload]);

                $title = trim((string) ($data['title'] ?? 'Generated Script'));
                $scriptContent = trim((string) ($data['script'] ?? ''));
            } else {
                // Step 1: Lookup database options
                $hookType = ScriptHookType::where('slug', $this->params['hook_type'] ?? '')->first();
                $ctaType = ScriptCtaType::where('slug', $this->params['cta_type'] ?? '')->first();
                $objective = ScriptObjective::where('slug', $this->params['objective'] ?? '')->first();

                $pipelineParams = array_merge($this->params, [
                    'hook_instruction' => $hookType ? $hookType->prompt_instruction : 'Hook the viewer in the first 3 seconds.',
                    'cta_instruction' => $ctaType ? $ctaType->prompt_instruction : 'Include a strong call to action.',
                    'objective_instruction' => $objective ? $objective->prompt_instruction : 'Make the script engaging.',
                ]);

                // Step 2: Generate Outline
                Log::info("Generating outline for script ID {$this->script->id}...");
                $outline = $this->callWithFallback($openAi, $gemini, 'generateScriptOutline', [$pipelineParams]);
                $analysisBlueprintSnapshot = $outline;

                // Step 3: Generate Draft
                Log::info("Generating draft for script ID {$this->script->id}...");
                $variantIndex = (int) ($this->params['variant_index'] ?? 0);
                $temperature = 0.7 + ($variantIndex * 0.15); // e.g., 0.7, 0.85, 1.0
                $draftData = $this->callWithFallback($openAi, $gemini, 'generateScriptDraft', [$outline, $pipelineParams, $temperature]);
                $draftScript = trim((string) ($draftData['script'] ?? ''));
                $title = trim((string) ($draftData['title'] ?? 'Generated Script'));

                if ($draftScript === '') {
                    throw new \RuntimeException('AI response missing required "script" field during draft phase.');
                }

                // Step 4: Critique and Polish
                Log::info("Critiquing and polishing draft for script ID {$this->script->id}...");
                $polishData = $this->callWithFallback(
                    $openAi,
                    $gemini,
                    'critiqueAndPolish',
                    [$outline, $draftScript, $pipelineParams]
                );
                $overallScore = (float) ($polishData['overallScore'] ?? 0);
                $criticalChecks = (array) ($polishData['criticalChecks'] ?? []);
                $criticalFailure = collect($criticalChecks)->contains(
                    fn (mixed $passed): bool => $passed !== true
                );
                $shouldRewrite = $criticalFailure
                    || $overallScore < (float) config('script_research.rewrite_threshold', 8);
                $scriptContent = $shouldRewrite
                    ? trim((string) ($polishData['revisedScript'] ?? $draftScript))
                    : $draftScript;
            }

            Log::info("AI pipeline completed for script ID {$this->script->id}");

            if ($scriptContent === '') {
                throw new \RuntimeException('AI response missing required script content field.');
            }

            Log::info("Updating script record for ID {$this->script->id} to completed...");

            $review = isset($polishData) ? $polishData : [];
            $this->script->update([
                'title' => $title !== '' ? $title : 'Generated Script',
                'script' => $scriptContent,
                'status' => 'completed',
                'script_origin' => $scriptOrigin ?? (string) ($this->script->script_origin ?? 'script_page'),
                'analysis_blueprint_snapshot' => $analysisBlueprintSnapshot,
                'overall_score' => $review['overallScore'] ?? null,
                'scores' => $review['scores'] ?? null,
                'strengths' => $review['strengths'] ?? null,
                'improvements' => $review['improvements'] ?? null,
                'error_message' => null,
                ...$engineOutput,
            ]);
            $this->refreshBatchStatus();
        } catch (Throwable $e) {
            Log::warning('GenerateScriptJob attempt failed', [
                'script_id' => $this->script->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        } finally {
            $lock->release();
        }
    }

    /**
     * Final failure callback (called after all retry attempts fail).
     */
    public function failed(Throwable $e): void
    {
        $script = GeneratedScript::query()->find($this->script->id);
        if (! $script) {
            return;
        }

        if ($script->status !== 'completed') {
            $script->update([
                'status' => 'failed',
                'error_message' => Str::limit($e->getMessage(), 255),
            ]);
        }

        $user = $script->user;
        if ($this->chargedUpfront && $user && $script->status !== 'completed') {
            $batch = $script->generationBatch;
            if ($batch?->workflow_version === config('script_engine.workflow_version')) {
                $batch->refundBaseCost('generate_script_refund_failed');
            } else {
                $user->addCredits($this->cost, 'generate_script_refund_failed');
            }
        }

        $this->refreshBatchStatus();
    }

    private function resolveScriptOrigin(): ?string
    {
        $origin = trim((string) ($this->params['script_origin'] ?? ''));
        if ($origin === '') {
            return null;
        }

        return $origin;
    }

    private function refreshBatchStatus(): void
    {
        $batch = $this->script->generationBatch;
        if (! $batch) {
            return;
        }

        $statuses = $batch->scripts()->pluck('status');
        if ($statuses->every(fn (string $status): bool => $status === 'completed')) {
            $batch->update(['status' => 'completed']);

            return;
        }

        if ($statuses->every(fn (string $status): bool => in_array($status, ['completed', 'failed'], true))) {
            $batch->update(['status' => $statuses->contains('completed') ? 'partially_completed' : 'failed']);
        }
    }

    /**
     * Call an AI service method with OpenAI primary and Gemini fallback.
     *
     * @param  array<int, mixed>  $arguments
     * @return array<string, mixed>
     */
    private function callWithFallback(OpenAIService $openAi, GeminiService $gemini, string $method, array $arguments): array
    {
        try {
            return $openAi->{$method}(...$arguments);
        } catch (Throwable $e) {
            Log::warning('OpenAI method failed in GenerateScriptJob, falling back to Gemini.', [
                'method' => $method,
                'script_id' => $this->script->id,
                'error' => $e->getMessage(),
            ]);

            return $gemini->{$method}(...$arguments);
        }
    }
}
