<?php

namespace App\Jobs;

use App\Models\Post;
use App\Services\ContentProcessingService;
use App\Services\PlanService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AnalyzePostJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 10;

    public int $timeout = 240;

    public array $backoff = [10, 30, 60, 120, 300];

    public function __construct(
        public int $postId,
        public int $userId,
        public string $analysisLanguage = 'English',
    ) {
        $this->onQueue('analysis');
    }

    public function handle(ContentProcessingService $processor): void
    {
        $post = Post::query()->with('contentAnalysis')->find($this->postId);

        if (! $post) {
            return;
        }

        $contentAnalysis = $post->contentAnalysis()->firstOrCreate(
            ['post_id' => $post->id],
            [
                'transcription' => $post->contentAnalysis?->transcription,
                'transcription_status' => 'idle',
                'analysis_status' => 'idle',
            ]
        );

        $lock = Cache::lock("analysis_lock:post:{$post->id}", 300);
        $lockAcquired = $lock->get();

        if (! $lockAcquired) {
            $contentAnalysis->refresh();
            $globalStatus = (string) ($contentAnalysis->analysis_status ?: 'idle');

            if ($this->hasCompletedGlobalAnalysis($contentAnalysis)) {
                $this->setGlobalStatus($contentAnalysis->id, 'completed');
                $this->syncPostProcessingFlags($post, $contentAnalysis);
                $this->upsertUserStatus($contentAnalysis->id, 'completed', null, true);

                return;
            }

            if (in_array($globalStatus, ['queued', 'processing'], true)) {
                $this->upsertUserStatus($contentAnalysis->id, $globalStatus);
                $this->release(5);

                return;
            }

            $this->upsertUserStatus($contentAnalysis->id, 'queued');
            $this->release(5);

            return;
        }

        try {
            if (! $this->hasCompletedGlobalTranscription($contentAnalysis)) {
                $this->upsertUserStatus($contentAnalysis->id, 'failed', 'Audio transcription is required to run the AI analysis.');
                if (! $this->hasCompletedGlobalAnalysis($contentAnalysis)) {
                    $this->setGlobalStatus($contentAnalysis->id, 'failed');
                }

                return;
            }

            $this->setGlobalStatus($contentAnalysis->id, 'processing');
            $this->upsertUserStatus($contentAnalysis->id, 'processing');

            $post->refresh();
            $post->load('contentAnalysis');
            $contentAnalysis = $post->contentAnalysis()->firstOrCreate(
                ['post_id' => $post->id],
                [
                    'transcription' => $post->contentAnalysis?->transcription,
                    'transcription_status' => 'idle',
                    'analysis_status' => 'idle',
                ]
            );

            if (! $this->hasCompletedGlobalAnalysis($contentAnalysis)) {
                $processor->analyze($post, $this->userId, $this->analysisLanguage);
                $contentAnalysis->refresh();
            }

            if ($this->hasPersistedRequiredAnalysisFields($contentAnalysis) && (string) ($contentAnalysis->analysis_status ?? 'idle') !== 'completed') {
                $this->setGlobalStatus($contentAnalysis->id, 'completed');
                $contentAnalysis->refresh();
            }

            if (! $this->hasCompletedGlobalAnalysis($contentAnalysis)) {
                $globalStatus = (string) ($contentAnalysis->analysis_status ?? 'idle');
                if (in_array($globalStatus, ['queued', 'processing'], true)) {
                    $this->upsertUserStatus($contentAnalysis->id, $globalStatus);
                    $this->release(5);

                    return;
                }

                $missingFields = $this->missingRequiredAnalysisFields($contentAnalysis);
                throw new \RuntimeException(
                    'Analysis missing required fields: '.implode(', ', $missingFields)
                );
            }

            $this->syncPostProcessingFlags($post, $contentAnalysis);
            $this->upsertUserStatus($contentAnalysis->id, 'completed', null, true);
            $this->setGlobalStatus($contentAnalysis->id, 'completed');
        } catch (\Throwable $e) {
            $this->upsertUserStatus($contentAnalysis->id, 'failed', $e->getMessage());
            $contentAnalysis->refresh();
            if (! $this->hasCompletedGlobalAnalysis($contentAnalysis)) {
                $this->setGlobalStatus($contentAnalysis->id, 'failed');
            }

            Log::error('AnalyzePostJob failed', [
                'post_id' => $this->postId,
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        } finally {
            if ($lockAcquired) {
                $lock->release();
            }
        }
    }

    private function hasCompletedGlobalTranscription(object $contentAnalysis): bool
    {
        $status = (string) ($contentAnalysis->transcription_status ?? 'idle');
        $transcription = trim((string) ($contentAnalysis->transcription ?? ''));

        return $status === 'completed' && $transcription !== '';
    }

    private function hasCompletedGlobalAnalysis(object $contentAnalysis): bool
    {
        if ((string) ($contentAnalysis->analysis_status ?? 'idle') !== 'completed') {
            return false;
        }

        return $this->hasPersistedRequiredAnalysisFields($contentAnalysis);
    }

    private function hasPersistedRequiredAnalysisFields(object $contentAnalysis): bool
    {
        return $this->missingRequiredAnalysisFields($contentAnalysis) === [];
    }

    /**
     * @return array<int, string>
     */
    private function missingRequiredAnalysisFields(object $contentAnalysis): array
    {
        $requiredFields = ['hook_text', 'topic_angle', 'script_type', 'script_flow', 'cta_type'];
        $missingFields = [];

        foreach ($requiredFields as $field) {
            if (trim((string) ($contentAnalysis->{$field} ?? '')) === '') {
                $missingFields[] = $field;
            }
        }

        return $missingFields;
    }

    private function syncPostProcessingFlags(Post $post, object $contentAnalysis): void
    {
        $updates = [];
        if (! $post->is_transcribed && $this->hasCompletedGlobalTranscription($contentAnalysis)) {
            $updates['is_transcribed'] = true;
        }

        if (! $post->is_analyzed && $this->hasCompletedGlobalAnalysis($contentAnalysis)) {
            $updates['is_analyzed'] = true;
        }

        if ($updates !== []) {
            $post->update($updates);
        }
    }

    private function setGlobalStatus(int $contentAnalysisId, string $status): void
    {
        DB::table('content_analyses')
            ->where('id', $contentAnalysisId)
            ->update([
                'analysis_status' => $status,
                'updated_at' => now(),
            ]);
    }

    private function upsertUserStatus(int $contentAnalysisId, string $status, ?string $error = null, bool $markCharged = false): bool
    {
        return DB::transaction(function () use ($contentAnalysisId, $status, $error, $markCharged): bool {
            $query = DB::table('content_analysis_by_user')
                ->where('user_id', $this->userId)
                ->where('content_analysis_id', $contentAnalysisId);

            $existing = $query->lockForUpdate()->first();
            $shouldChargeNow = $markCharged && empty($existing?->analysis_charged_at);

            if ($shouldChargeNow && ! $this->deductCreditsForAction('analyze_post')) {
                $insufficientMessage = 'Insufficient credits for analysis.';

                if ($existing) {
                    $query->update([
                        'analysis_status' => 'failed',
                        'analysis_error' => $insufficientMessage,
                        'updated_at' => now(),
                    ]);
                } else {
                    DB::table('content_analysis_by_user')->insert([
                        'user_id' => $this->userId,
                        'content_analysis_id' => $contentAnalysisId,
                        'analysis_charged_at' => null,
                        'analysis_status' => 'failed',
                        'analysis_error' => $insufficientMessage,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                return false;
            }

            if ($existing) {
                $updates = [
                    'analysis_status' => $status,
                    'analysis_error' => $error,
                    'updated_at' => now(),
                ];

                if ($shouldChargeNow) {
                    $updates['analysis_charged_at'] = now();
                }

                $query->update($updates);

                return true;
            }

            DB::table('content_analysis_by_user')->insert([
                'user_id' => $this->userId,
                'content_analysis_id' => $contentAnalysisId,
                'analysis_charged_at' => $shouldChargeNow ? now() : null,
                'analysis_status' => $status,
                'analysis_error' => $error,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return true;
        }, 3);
    }

    private function deductCreditsForAction(string $action): bool
    {
        $cost = PlanService::creditCost($action);
        if ($cost <= 0) {
            return true;
        }

        $updatedRows = DB::table('users')
            ->where('id', $this->userId)
            ->where('credits', '>=', $cost)
            ->decrement('credits', $cost);

        if ($updatedRows === 0) {
            return false;
        }

        DB::table('credit_ledger')->insert([
            'user_id' => $this->userId,
            'action' => $action,
            'amount' => -$cost,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return true;
    }
}
