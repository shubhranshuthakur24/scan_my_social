<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GenerateFreshScriptRequest;
use App\Http\Requests\RefineScriptRequest;
use App\Http\Requests\ResumeScriptResearchRequest;
use App\Http\Requests\SelectScriptAngleRequest;
use App\Jobs\AutoRefineScriptJob;
use App\Jobs\GenerateScriptAnglesJob;
use App\Jobs\GenerateScriptJob;
use App\Jobs\ResearchScriptBatchJob;
use App\Models\GeneratedScript;
use App\Models\ScriptAngle;
use App\Models\ScriptGenerationBatch;
use App\Services\PlanService;
use App\Services\ScriptResearch\TopicNormalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ScriptController extends Controller
{
    /**
     * Display a listing of all generated scripts (both from posts and fresh).
     */
    public function index(Request $request)
    {
        $query = GeneratedScript::query()
            ->where('user_id', auth()->id())
            ->with([
                'contentAnalysis.post.channel',
                'generationBatch.research:id,confidence_score,confidence_label,researched_at,fresh_until',
            ]);

        // Filter by topic if provided
        if ($request->has('topic') && $request->topic !== 'All Topics') {
            $query->where('suggested_topic', $request->topic);
        }

        // Search in script or topic
        if ($request->has('search')) {
            $search = (string) $request->search;
            $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search);
            $query->where(function ($q) use ($escaped) {
                $q->where('script', 'like', "%{$escaped}%")
                    ->orWhere('suggested_topic', 'like', "%{$escaped}%")
                    ->orWhereHas('contentAnalysis.post', function ($sq) use ($escaped) {
                        $sq->where('caption', 'like', "%{$escaped}%")
                            ->orWhere('owner_username', 'like', "%{$escaped}%");
                    });
            });
        }

        $scripts = $query->latest()->paginate(20);

        return response()->json($scripts);
    }

    /**
     * Generate a fresh script from scratch using AI in the background.
     */
    public function generateFreshScript(
        GenerateFreshScriptRequest $request,
        TopicNormalizer $topicNormalizer
    ) {
        $validated = $request->validated();
        $validated['script_origin'] = 'script_page';
        Log::info('Script generation validation passed.');

        $user = auth()->user();
        $variants = (int) ($validated['variants'] ?? 1);
        $costPerScript = PlanService::creditCost('generate_script');
        $baseCost = $costPerScript * $variants;

        if (($validated['mode'] ?? 'fresh') === 'recreate') {
            $sourceScript = GeneratedScript::query()
                ->where('id', (int) $validated['source_script_id'])
                ->where('user_id', $user->id)
                ->with('contentAnalysis')
                ->first();

            if (! $sourceScript || ! $sourceScript->contentAnalysis) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selected source script does not have an analysis blueprint yet.',
                ], 422);
            }
        }

        if (($validated['mode'] ?? 'fresh') === 'recreate') {
            return $this->enqueueRecreation($user, $validated, $variants, $costPerScript, $baseCost);
        }

        $researchEnabled = (bool) ($validated['research_enabled'] ?? false);
        $researchTier = (string) ($validated['research_tier'] ?? 'lite');
        $tierConfig = (array) config("script_research.tiers.{$researchTier}");
        $researchReserve = $researchEnabled ? (int) ($tierConfig['live_cost'] ?? 20) : 0;
        $baseCost = $costPerScript;
        $totalCost = $baseCost + $researchReserve;

        if (! $user->hasEnoughCredits($totalCost)) {
            return response()->json([
                'success' => false,
                'error' => 'insufficient_credits',
                'message' => "Fuel your growth! This action requires {$totalCost} credits. Upgrade to keep creating.",
                'credits' => $user->credits,
                'required' => $totalCost,
            ], 402);
        }

        if (! $user->deductCredits($totalCost, 'generate_script')) {
            return response()->json([
                'success' => false,
                'error' => 'insufficient_credits',
                'message' => "Fuel your growth! This action requires {$totalCost} credits. Upgrade to keep creating.",
                'credits' => $user->credits,
                'required' => $totalCost,
            ], 402);
        }

        $topic = $topicNormalizer->normalize((string) $validated['topic']);
        $requestedIntent = (string) ($validated['research_intent'] ?? 'auto');
        $intentMode = $requestedIntent === 'auto' ? 'auto' : 'manual';
        $intent = $intentMode === 'auto'
            ? $topicNormalizer->suggestIntent((string) $validated['topic'], [
                'audience' => $validated['audience'] ?? null,
                'primary_problem' => $validated['primary_problem'] ?? null,
                'objective' => $validated['objective'] ?? null,
                'supporting_information' => $validated['supporting_information'] ?? null,
                'key_points' => $validated['key_points'] ?? null,
                'proof_points' => $validated['proof_points'] ?? null,
            ])
            : $requestedIntent;
        $createdScripts = [];
        $batch = null;

        try {
            $batch = DB::transaction(function () use (
                $user,
                $validated,
                $baseCost,
                $researchReserve,
                $totalCost,
                $researchEnabled,
                $researchTier,
                $intent,
                $intentMode,
                $topic,
                &$createdScripts
            ): ScriptGenerationBatch {
                $creativeBrief = [
                    'topic' => $validated['topic'],
                    'platform' => $validated['platform'],
                    'audience' => $validated['audience'],
                    'primary_problem' => $validated['primary_problem'],
                    'tone_mode' => $validated['tone_mode'],
                    'tone' => $validated['tone'] ?? null,
                    'length' => $validated['length'],
                    'language' => $validated['language'],
                    'locale' => $validated['locale'] ?? 'en-US',
                    'hook_mode' => $validated['hook_mode'],
                    'hook_type' => $validated['hook_type'] ?? null,
                    'cta_mode' => $validated['cta_mode'],
                    'cta_type' => $validated['cta_type'] ?? null,
                    'objective' => $validated['objective'],
                    'content_mix' => $validated['content_mix'],
                    'supporting_information' => $validated['supporting_information'] ?? null,
                    'key_points' => $validated['key_points'] ?? null,
                    'proof_points' => $validated['proof_points'] ?? null,
                    'research_intent_mode' => $researchEnabled ? $intentMode : null,
                    'script_origin' => 'script_page',
                ];
                $platform = (array) config("script_engine.platforms.{$validated['platform']}", []);

                $batch = $user->scriptGenerationBatches()->create([
                    'original_topic' => $validated['topic'],
                    'normalized_topic' => $topic['normalized_topic'],
                    'workflow_version' => config('script_engine.workflow_version'),
                    'audience' => $validated['audience'],
                    'primary_problem' => $validated['primary_problem'],
                    'objective' => $validated['objective'],
                    'platform' => $validated['platform'],
                    'language' => $validated['language'],
                    'output_length' => $validated['length'],
                    'content_mix' => $validated['content_mix'],
                    'supporting_information' => $validated['supporting_information'] ?? null,
                    'communication_style' => $platform['communication_style'] ?? 'single_viewer',
                    'tone_mode' => $validated['tone_mode'],
                    'tone' => $validated['tone'] ?? null,
                    'hook_mode' => $validated['hook_mode'],
                    'hook_type' => $validated['hook_type'] ?? null,
                    'cta_mode' => $validated['cta_mode'],
                    'cta_type' => $validated['cta_type'] ?? null,
                    'status' => $researchEnabled ? 'researching' : 'generating_angles',
                    'research_status' => $researchEnabled ? 'queued' : 'not_requested',
                    'research_enabled' => $researchEnabled,
                    'research_intent' => $researchEnabled ? $intent : null,
                    'research_intent_mode' => $researchEnabled ? $intentMode : null,
                    'research_tier' => $researchTier,
                    'comparison_topic' => $topic['comparison_topic'],
                    'creative_brief' => $creativeBrief,
                    'user_provided_facts' => $validated['user_facts'] ?? [],
                    'submitted_source_urls' => $validated['source_urls'] ?? [],
                    'variant_count' => 1,
                    'base_cost' => $baseCost,
                    'research_reserved_cost' => $researchReserve,
                    'total_reserved_cost' => $totalCost,
                    'credit_state' => $researchEnabled ? 'reserved' : 'settled',
                    'credits_settled_at' => $researchEnabled ? null : now(),
                ]);

                $createdScripts[] = $user->generatedScripts()->create([
                    'batch_id' => $batch->id,
                    'title' => $researchEnabled ? 'Researching...' : 'Generating angles...',
                    'script' => $researchEnabled
                        ? 'Please wait while the topic is researched...'
                        : 'Please wait while AI develops five distinct angles...',
                    'script_origin' => 'script_page',
                    'suggested_topic' => $validated['topic'],
                    'estimated_duration' => $validated['length'],
                    'hook_type' => $validated['hook_type'] ?? null,
                    'status' => $researchEnabled ? 'researching' : 'processing',
                    'generation_mode' => 'fresh',
                    'cta_type' => $validated['cta_type'] ?? null,
                    'cta_objective' => $validated['objective'],
                    'error_message' => null,
                ]);

                return $batch;
            });

            $user->logActivity('script_generated', 'Started generating script batch about '.substr($validated['topic'], 0, 50).'...');

            if ($researchEnabled) {
                ResearchScriptBatchJob::dispatch($batch);
            } else {
                GenerateScriptAnglesJob::dispatch($batch);
            }

            return response()->json([
                'success' => true,
                'message' => $researchEnabled
                    ? 'Research started. Five angles will be prepared next.'
                    : 'Five script angles are being prepared.',
                'scripts' => $createdScripts,
                'batch' => $batch,
                'workflow_url' => route('scripts.build', $batch),
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to start viral script workflow.', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            if ($batch) {
                $batch->forceFill([
                    'status' => 'failed',
                    'error_message' => Str::limit($e->getMessage(), 1000),
                ])->save();
                $batch->refundAll('generate_script_refund_enqueue_failed');
            } else {
                $user->addCredits($totalCost, 'generate_script_refund_enqueue_failed');
            }

            foreach ($createdScripts as $script) {
                $script->update([
                    'status' => 'failed',
                    'error_message' => Str::limit($e->getMessage(), 255),
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to start script generation. Please try again.',
            ], 500);
        }
    }

    public function batchStatus(ScriptGenerationBatch $batch)
    {
        $this->authorize('view', $batch);

        return response()->json([
            'success' => true,
            'batch' => $batch->load([
                'angles',
                'selectedAngle',
                'scripts',
                'research:id,confidence_score,confidence_label,researched_at,fresh_until',
            ]),
        ]);
    }

    public function selectAngle(
        SelectScriptAngleRequest $request,
        ScriptGenerationBatch $batch,
        ScriptAngle $angle
    ) {
        [$script, $shouldDispatch] = DB::transaction(function () use ($batch, $angle): array {
            $lockedBatch = ScriptGenerationBatch::query()->lockForUpdate()->findOrFail($batch->id);

            if ($lockedBatch->selected_angle_id === $angle->id
                && in_array($lockedBatch->status, ['generating_script', 'validating', 'completed'], true)) {
                return [$lockedBatch->scripts()->firstOrFail(), false];
            }

            if ($lockedBatch->status !== 'awaiting_angle') {
                abort(422, 'This batch is not waiting for an angle selection.');
            }

            $lockedBatch->angles()->update(['is_selected' => false]);
            $angle->forceFill(['is_selected' => true])->save();
            $lockedBatch->forceFill([
                'selected_angle_id' => $angle->id,
                'angle_selected_at' => now(),
                'status' => 'generating_script',
                'error_message' => null,
            ])->save();

            $script = $lockedBatch->scripts()->firstOrFail();
            $script->forceFill([
                'script_angle_id' => $angle->id,
                'title' => 'Generating script...',
                'script' => 'AI is writing the selected angle and validating the result...',
                'status' => 'processing',
                'error_message' => null,
            ])->save();

            return [$script, true];
        });

        if ($shouldDispatch) {
            GenerateScriptJob::dispatch(
                $script,
                ['mode' => 'viral_engine', 'script_origin' => 'script_page'],
                (int) $batch->base_cost
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Angle selected. Script generation started.',
            'script' => $script,
        ]);
    }

    public function resumeResearch(
        ResumeScriptResearchRequest $request,
        ScriptGenerationBatch $batch
    ) {
        $this->authorize('update', $batch);
        if ($batch->status !== 'needs_input' || (int) $batch->research_attempts >= 2) {
            return response()->json([
                'success' => false,
                'message' => 'This research batch cannot be resumed.',
            ], 422);
        }

        $facts = array_values(array_filter((array) $request->validated('user_facts')));
        $urls = array_values(array_filter((array) $request->validated('source_urls')));
        if ($facts === [] && $urls === []) {
            return response()->json([
                'success' => false,
                'message' => 'Add at least one new fact or source URL.',
            ], 422);
        }

        $tier = (array) config("script_research.tiers.{$batch->research_tier}");
        $researchReserve = (int) ($tier['live_cost'] ?? 20);
        $reserve = (int) $batch->base_cost + $researchReserve;
        if (! $batch->user->deductCredits($reserve, 'script_research_resume')) {
            return response()->json([
                'success' => false,
                'error' => 'insufficient_credits',
                'message' => "This research resume requires {$reserve} credits.",
            ], 402);
        }

        $batch->forceFill([
            'status' => 'researching',
            'research_status' => 'queued',
            'user_provided_facts' => array_values(array_unique([
                ...(array) $batch->user_provided_facts,
                ...$facts,
            ])),
            'submitted_source_urls' => array_values(array_unique([
                ...(array) $batch->submitted_source_urls,
                ...$urls,
            ])),
            'research_reserved_cost' => $researchReserve,
            'research_settled_cost' => 0,
            'total_reserved_cost' => (int) $batch->total_reserved_cost + $reserve,
            'credit_state' => 'reserved',
            'credits_refunded_at' => null,
            'error_message' => null,
        ])->save();
        $batch->scripts()->update([
            'status' => 'researching',
            'error_message' => null,
        ]);

        ResearchScriptBatchJob::dispatch($batch);

        return response()->json([
            'success' => true,
            'message' => 'Research resumed with the new evidence.',
            'batch' => $batch->fresh(),
        ]);
    }

    public function retryGeneration(ScriptGenerationBatch $batch)
    {
        $this->authorize('update', $batch);

        if ($batch->status !== 'failed' && $batch->status !== 'research_blocked') {
            return response()->json([
                'success' => false,
                'message' => 'This generation batch is not in a failed state.',
            ], 422);
        }

        $user = auth()->user();
        $costToCharge = 0;

        if ($batch->credit_state === 'refunded') {
            $costToCharge += (int) $batch->total_reserved_cost;
        } elseif ($batch->base_refunded_at !== null) {
            $costToCharge += (int) $batch->base_cost;
        }

        if ($costToCharge > 0) {
            if (! $user->deductCredits($costToCharge, 'script_generation_retry')) {
                return response()->json([
                    'success' => false,
                    'error' => 'insufficient_credits',
                    'message' => "Fuel your growth! This action requires {$costToCharge} credits. Upgrade to keep creating.",
                    'credits' => $user->credits,
                    'required' => $costToCharge,
                ], 402);
            }
        }

        if ($batch->credit_state === 'refunded') {
            $batch->forceFill([
                'total_refunded_cost' => max(0, (int) $batch->total_refunded_cost - $costToCharge),
                'credit_state' => $batch->research_enabled ? 'reserved' : 'settled',
                'credits_refunded_at' => null,
            ]);
        } elseif ($batch->base_refunded_at !== null) {
            $batch->forceFill([
                'total_refunded_cost' => max(0, (int) $batch->total_refunded_cost - $costToCharge),
                'base_refunded_at' => null,
            ]);
        }

        $researchEnabled = (bool) $batch->research_enabled;
        $researchCompleted = $batch->script_research_id !== null;

        if ($researchEnabled && ! $researchCompleted) {
            $batch->forceFill([
                'status' => 'researching',
                'research_status' => 'queued',
                'error_message' => null,
            ])->save();

            $batch->scripts()->update([
                'title' => 'Researching...',
                'script' => 'Please wait while the topic is researched...',
                'status' => 'researching',
                'error_message' => null,
            ]);

            ResearchScriptBatchJob::dispatch($batch);

            $message = 'Research restarted. Five angles will be prepared next.';
        } elseif ($batch->selected_angle_id === null) {
            $batch->forceFill([
                'status' => 'generating_angles',
                'error_message' => null,
            ])->save();

            $batch->scripts()->update([
                'title' => 'Generating angles...',
                'script' => 'Please wait while AI develops five distinct angles...',
                'status' => 'processing',
                'error_message' => null,
            ]);

            GenerateScriptAnglesJob::dispatch($batch);

            $message = 'Five script angles are being prepared.';
        } else {
            $batch->forceFill([
                'status' => 'generating_script',
                'error_message' => null,
            ])->save();

            $script = $batch->scripts()->firstOrFail();
            $script->forceFill([
                'title' => 'Generating script...',
                'script' => 'AI is writing the selected angle and validating the result...',
                'status' => 'processing',
                'error_message' => null,
            ])->save();

            GenerateScriptJob::dispatch(
                $script,
                ['mode' => 'viral_engine', 'script_origin' => 'script_page'],
                (int) $batch->base_cost
            );

            $message = 'Script writing restarted.';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'batch' => $batch->fresh(),
        ]);
    }

    /**
     * Refine an existing script with new content.
     */
    public function refine(RefineScriptRequest $request, GeneratedScript $script)
    {
        try {
            $script->update($request->validated());

            return response()->json([
                'success' => true,
                'message' => 'Script refined successfully',
                'script' => $script,
            ]);
        } catch (\Exception $e) {
            \Log::error($e);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred while refining the script.',
            ], 500);
        }
    }

    /**
     * Automatically refine a script using AI in the background.
     */
    public function autoRefine(Request $request, GeneratedScript $script)
    {
        $this->authorize('update', $script);

        $user = auth()->user();
        $cost = PlanService::creditCost('auto_refine');

        if (! $user->hasEnoughCredits($cost)) {
            return response()->json([
                'success' => false,
                'error' => 'insufficient_credits',
                'message' => "You need {$cost} credits to auto-refine a script. Please upgrade your plan.",
                'credits' => $user->credits,
                'required' => $cost,
            ], 402);
        }

        // Deduct at enqueue-time. Refunded by the job on terminal failure.
        if (! $user->deductCredits($cost, 'auto_refine')) {
            return response()->json([
                'success' => false,
                'error' => 'insufficient_credits',
                'message' => "You need {$cost} credits to auto-refine a script. Please upgrade your plan.",
                'credits' => $user->credits,
                'required' => $cost,
            ], 402);
        }

        $options = $request->only(['similarity', 'language', 'duration', 'platform', 'audience']);

        try {
            // Set status to 'processing'
            $script->update([
                'status' => 'processing',
                'error_message' => null,
            ]);

            AutoRefineScriptJob::dispatch($script, $options, $cost);

            return response()->json([
                'success' => true,
                'message' => 'Script refinement started in the background.',
                'script' => $script,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to enqueue AutoRefineScriptJob', [
                'script_id' => $script->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            $user->addCredits($cost, 'auto_refine_refund_enqueue_failed');
            $script->update([
                'status' => 'failed',
                'error_message' => Str::limit($e->getMessage(), 255),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to start script refinement. Please try again.',
            ], 500);
        }
    }

    /**
     * Return script processing status for resumable refine UX.
     */
    public function status(GeneratedScript $script)
    {
        $this->authorize('view', $script);

        return response()->json([
            'success' => true,
            'status' => $script->status ?? 'idle',
            'error' => $script->error_message,
            'script' => $script->load('generationBatch.research'),
        ]);
    }

    /**
     * Delete a generated script.
     */
    public function destroy(GeneratedScript $script)
    {
        $this->authorize('delete', $script);

        $batch = $script->generationBatch;
        DB::transaction(function () use ($script, $batch): void {
            $script->delete();

            if ($batch?->research) {
                $remaining = max(0, (int) $batch->research->reference_count - 1);
                $batch->research->forceFill([
                    'reference_count' => $remaining,
                    'is_historical' => $remaining > 0,
                ])->save();
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Script deleted successfully.',
        ]);
    }

    /**
     * Keep recreation generation behavior independent from research batches.
     *
     * @param  array<string, mixed>  $validated
     */
    private function enqueueRecreation(
        $user,
        array $validated,
        int $variants,
        int $costPerScript,
        int $totalCost
    ) {
        if (! $user->hasEnoughCredits($totalCost)
            || ! $user->deductCredits($totalCost, 'generate_script')) {
            return response()->json([
                'success' => false,
                'error' => 'insufficient_credits',
                'message' => "Fuel your growth! This action requires {$totalCost} credits. Upgrade to keep creating.",
                'credits' => $user->credits,
                'required' => $totalCost,
            ], 402);
        }

        $createdScripts = [];
        try {
            for ($i = 0; $i < $variants; $i++) {
                $script = $user->generatedScripts()->create([
                    'title' => 'Generating...',
                    'script' => 'Please wait while AI generates your script...',
                    'script_origin' => 'script_page',
                    'suggested_topic' => $validated['topic'],
                    'status' => 'processing',
                    'generation_mode' => 'recreate',
                    'recreation_mode' => $validated['recreation_mode'] ?? null,
                    'cta_objective' => $validated['objective'] ?? null,
                    'source_analysis_id' => GeneratedScript::query()
                        ->where('id', (int) $validated['source_script_id'])
                        ->value('content_analysis_id'),
                    'recreation_settings' => [
                        'objective' => $validated['objective'] ?? null,
                        'desired_cta_type' => $validated['desired_cta_type'] ?? null,
                        'brand_input' => $validated['brand_input'] ?? null,
                        'offer' => $validated['offer'] ?? null,
                        'audience' => $validated['audience'] ?? null,
                        'language' => $validated['language'] ?? null,
                    ],
                ]);
                GenerateScriptJob::dispatch(
                    $script,
                    array_merge($validated, ['variant_index' => $i]),
                    $costPerScript
                );
                $createdScripts[] = $script;
            }

            return response()->json([
                'success' => true,
                'message' => 'Recreated script generation started.',
                'scripts' => $createdScripts,
            ]);
        } catch (\Throwable $e) {
            $user->addCredits($totalCost, 'generate_script_refund_enqueue_failed');
            foreach ($createdScripts as $script) {
                $script->update([
                    'status' => 'failed',
                    'error_message' => Str::limit($e->getMessage(), 255),
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to start script generation. Please try again.',
            ], 500);
        }
    }
}
