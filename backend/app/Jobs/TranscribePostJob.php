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

class TranscribePostJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 10;

    public int $timeout = 180;

    public array $backoff = [10, 30, 60, 120, 300];

    public function __construct(
        public int $postId,
        public int $userId
    ) {
        $this->onQueue('transcription');
    }

    public function handle(ContentProcessingService $processor): void
    {
        $post = Post::query()->with('contentAnalysis')->find($this->postId);

        if (! $post) {
            return;
        }

        $contentAnalysis = $post->contentAnalysis()->firstOrCreate(
            ['post_id' => $post->id],
            ['transcription_status' => 'idle']
        );

        $lock = Cache::lock("transcription_lock:post:{$post->id}", 300);
        $lockAcquired = $lock->get();

        if (! $lockAcquired) {
            $contentAnalysis->refresh();
            $globalStatus = (string) ($contentAnalysis->transcription_status ?: 'idle');

            if ($this->hasCompletedGlobalTranscription($contentAnalysis)) {
                $this->setGlobalStatus($contentAnalysis->id, 'completed');
                $this->syncPostTranscribedFlag($post, $contentAnalysis);
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
            if (! $post->audio_url) {
                $this->upsertUserStatus($contentAnalysis->id, 'failed', 'No audio URL available.');
                if (empty($contentAnalysis->transcription)) {
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
                ['transcription_status' => 'idle']
            );

            if (! $this->hasCompletedGlobalTranscription($contentAnalysis)) {
                $processor->getOrCreateTranscription($post);
                $contentAnalysis->refresh();
            } else {
                $this->setGlobalStatus($contentAnalysis->id, 'completed');
            }

            if (! $this->hasCompletedGlobalTranscription($contentAnalysis)) {
                throw new \RuntimeException('Transcription completed but no text was persisted.');
            }

            $this->syncPostTranscribedFlag($post, $contentAnalysis);
            $this->upsertUserStatus($contentAnalysis->id, 'completed', null, true);
            $this->setGlobalStatus($contentAnalysis->id, 'completed');
        } catch (\Throwable $e) {
            $this->upsertUserStatus($contentAnalysis->id, 'failed', $e->getMessage());
            $contentAnalysis->refresh();
            if (! $this->hasCompletedGlobalTranscription($contentAnalysis)) {
                $this->setGlobalStatus($contentAnalysis->id, 'failed');
            }

            Log::error('TranscribePostJob failed', [
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

    private function setGlobalStatus(int $contentAnalysisId, string $status): void
    {
        DB::table('content_analyses')
            ->where('id', $contentAnalysisId)
            ->update([
                'transcription_status' => $status,
                'updated_at' => now(),
            ]);
    }

    private function hasCompletedGlobalTranscription(object $contentAnalysis): bool
    {
        $status = (string) ($contentAnalysis->transcription_status ?? 'idle');
        $transcription = trim((string) ($contentAnalysis->transcription ?? ''));

        return $status === 'completed' && $transcription !== '';
    }

    private function syncPostTranscribedFlag(Post $post, object $contentAnalysis): void
    {
        if ($post->is_transcribed || ! $this->hasCompletedGlobalTranscription($contentAnalysis)) {
            return;
        }

        $post->update(['is_transcribed' => true]);
    }

    private function upsertUserStatus(int $contentAnalysisId, string $status, ?string $error = null, bool $markCharged = false): bool
    {
        return DB::transaction(function () use ($contentAnalysisId, $status, $error, $markCharged): bool {
            $query = DB::table('content_analysis_by_user')
                ->where('user_id', $this->userId)
                ->where('content_analysis_id', $contentAnalysisId);

            $existing = $query->lockForUpdate()->first();
            $shouldChargeNow = $markCharged && empty($existing?->transcription_charged_at);

            if ($shouldChargeNow && ! $this->deductCreditsForAction('transcribe_post')) {
                $insufficientMessage = 'Insufficient credits for transcription.';

                if ($existing) {
                    $query->update([
                        'transcription_status' => 'failed',
                        'transcription_error' => $insufficientMessage,
                        'updated_at' => now(),
                    ]);
                } else {
                    DB::table('content_analysis_by_user')->insert([
                        'user_id' => $this->userId,
                        'content_analysis_id' => $contentAnalysisId,
                        'transcription_charged_at' => null,
                        'transcription_status' => 'failed',
                        'transcription_error' => $insufficientMessage,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                return false;
            }

            if ($existing) {
                $updates = [
                    'transcription_status' => $status,
                    'transcription_error' => $error,
                    'updated_at' => now(),
                ];

                if ($shouldChargeNow) {
                    $updates['transcription_charged_at'] = now();
                }

                $query->update($updates);

                return true;
            }

            DB::table('content_analysis_by_user')->insert([
                'user_id' => $this->userId,
                'content_analysis_id' => $contentAnalysisId,
                'transcription_charged_at' => $shouldChargeNow ? now() : null,
                'transcription_status' => $status,
                'transcription_error' => $error,
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
