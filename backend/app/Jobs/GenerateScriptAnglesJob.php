<?php

namespace App\Jobs;

use App\Models\ScriptGenerationBatch;
use App\Services\GeminiService;
use App\Services\OpenAIService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class GenerateScriptAnglesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [30, 120, 300];

    public int $timeout = 120;

    public function __construct(public ScriptGenerationBatch $batch) {}

    public function handle(OpenAIService $openAi, GeminiService $gemini): void
    {
        $lock = Cache::lock('generate-script-angles:'.$this->batch->id, 300);
        if (! $lock->get()) {
            return;
        }

        try {
            $this->batch->refresh();
            if (in_array($this->batch->status, ['awaiting_angle', 'generating_script', 'validating', 'completed'], true)) {
                return;
            }

            $this->batch->update(['status' => 'generating_angles', 'error_message' => null]);
            $data = $this->callWithFallback($openAi, $gemini);
            $angles = collect($data['angles'] ?? [])
                ->filter(fn (mixed $angle): bool => is_array($angle))
                ->map(fn (array $angle): array => [
                    'title' => trim((string) ($angle['title'] ?? '')),
                    'explanation' => trim((string) ($angle['explanation'] ?? '')),
                    'expected_outcome' => trim((string) ($angle['expected_outcome'] ?? '')),
                ])
                ->filter(fn (array $angle): bool => $angle['title'] !== ''
                    && $angle['explanation'] !== ''
                    && $angle['expected_outcome'] !== '')
                ->unique(fn (array $angle): string => mb_strtolower($angle['title']))
                ->values();

            $expectedCount = (int) config('script_engine.angle_count', 5);
            if ($angles->count() !== $expectedCount) {
                throw new RuntimeException("Angle generation must return exactly {$expectedCount} distinct angles.");
            }

            DB::transaction(function () use ($angles): void {
                $batch = ScriptGenerationBatch::query()->lockForUpdate()->findOrFail($this->batch->id);
                $batch->angles()->delete();

                foreach ($angles as $index => $angle) {
                    $batch->angles()->create([
                        ...$angle,
                        'position' => $index + 1,
                    ]);
                }

                $batch->forceFill([
                    'status' => 'awaiting_angle',
                    'angles_generated_at' => now(),
                    'error_message' => null,
                ])->save();
                $batch->scripts()->update([
                    'title' => 'Choose an angle',
                    'script' => 'Select one of the generated angles to continue.',
                    'status' => 'awaiting_angle',
                    'error_message' => null,
                ]);
            });
        } catch (Throwable $exception) {
            Log::warning('GenerateScriptAnglesJob attempt failed.', [
                'batch_id' => $this->batch->id,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        } finally {
            $lock->release();
        }
    }

    public function failed(Throwable $exception): void
    {
        $batch = ScriptGenerationBatch::query()->find($this->batch->id);
        if (! $batch || in_array($batch->status, ['awaiting_angle', 'generating_script', 'validating', 'completed'], true)) {
            return;
        }

        $batch->forceFill([
            'status' => 'failed',
            'error_message' => Str::limit($exception->getMessage(), 1000),
        ])->save();
        $batch->scripts()->update([
            'status' => 'failed',
            'error_message' => Str::limit($exception->getMessage(), 255),
        ]);
        $batch->refundBaseCost('script_angle_generation_refund_failed');
    }

    /**
     * @return array<string, mixed>
     */
    private function callWithFallback(OpenAIService $openAi, GeminiService $gemini): array
    {
        $context = [
            'topic' => $this->batch->original_topic,
            'audience' => $this->batch->audience,
            'primary_problem' => $this->batch->primary_problem,
            'objective' => $this->batch->objective,
            'platform' => $this->batch->platform,
            'language' => $this->batch->language,
            'content_mix' => $this->batch->content_mix,
            'research_evidence' => $this->batch->enriched_brief,
            'user_facts' => $this->batch->user_provided_facts,
            'supporting_information' => $this->batch->supporting_information,
        ];

        try {
            return $openAi->generateScriptAngles($context);
        } catch (Throwable $exception) {
            Log::warning('OpenAI angle generation failed; using Gemini fallback.', [
                'batch_id' => $this->batch->id,
                'error' => $exception->getMessage(),
            ]);

            return $gemini->generateScriptAngles($context);
        }
    }
}
