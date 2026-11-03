<?php

namespace App\Jobs;

use App\Models\GeneratedScript;
use App\Services\GeminiService;
use App\Services\OpenAIService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class AutoRefineScriptJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $script;

    protected $options;

    protected $cost;

    protected bool $chargedUpfront = false;

    public $tries = 3;

    public $backoff = [30, 120, 300];

    public $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(GeneratedScript $script, array $options, int $cost, bool $chargedUpfront = true)
    {
        $this->script = $script;
        $this->options = $options;
        $this->cost = $cost;
        $this->chargedUpfront = $chargedUpfront;
    }

    /**
     * Execute the job.
     */
    public function handle(OpenAIService $openAi, GeminiService $gemini): void
    {
        $lockKey = 'auto_refine_lock_'.$this->script->id;
        $lock = Cache::lock($lockKey, 300);

        if (! $lock->get()) {
            Log::info('AutoRefineScriptJob skipping: Lock already held for Script ID '.$this->script->id);

            return;
        }

        try {
            $this->script->refresh();
            if ($this->script->status === 'completed') {
                return;
            }

            $review = $this->callWithFallback($openAi, $gemini, $this->script->script, $this->options);

            $this->script->update([
                'revised_script' => $review['revisedScript'] ?? $this->script->revised_script,
                'overall_score' => $review['overallScore'] ?? $this->script->overall_score,
                'scores' => $review['scores'] ?? $this->script->scores,
                'strengths' => $review['strengths'] ?? $this->script->strengths,
                'improvements' => $review['improvements'] ?? $this->script->improvements,
                'status' => 'completed',
                'error_message' => null,
            ]);
        } catch (Throwable $e) {
            Log::warning('AutoRefineScriptJob attempt failed', [
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
            $user->addCredits($this->cost, 'auto_refine_refund_failed');
        }
    }

    /**
     * Call reviewScript with OpenAI primary and Gemini fallback.
     *
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    private function callWithFallback(OpenAIService $openAi, GeminiService $gemini, string $script, array $options): array
    {
        try {
            return $openAi->reviewScript($script, $options);
        } catch (Throwable $e) {
            Log::warning('OpenAI reviewScript failed in AutoRefineScriptJob, falling back to Gemini.', [
                'script_id' => $this->script->id,
                'error' => $e->getMessage(),
            ]);

            return $gemini->reviewScript($script, $options);
        }
    }
}
