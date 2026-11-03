<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\AnalyzePostJob;
use App\Jobs\TranscribePostJob;
use App\Models\Post;
use App\Services\ContentProcessingService;
use App\Services\ElevenLabsService;
use App\Services\MediaUrlService;
use App\Services\OpenAIWhisperService;
use App\Services\PlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PostController extends Controller
{
    /**
     * List all posts with filtering
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        // Channel IDs the user directly added
        $ownChannelIds = $user->channels()->pluck('channels.id');

        // Channel IDs from any of this user's watchlists (direct DB query   no N+1)
        $watchlistChannelIds = \DB::table('watchlist_channels')
            ->join('watchlists', 'watchlists.id', '=', 'watchlist_channels.watchlist_id')
            ->where('watchlists.user_id', $user->id)
            ->pluck('watchlist_channels.channel_id');

        // Union of both sets (deduplicated)
        $visibleChannelIds = $ownChannelIds->merge($watchlistChannelIds)->unique()->values();

        $query = Post::query()
            ->whereIn('channel_id', $visibleChannelIds)
            ->with([
                'channel',
                'contentAnalysis.generatedScripts' => function ($q) {
                    $q->where('user_id', auth()->id());
                },
                'projects' => function ($q) use ($user) {
                    $q->where('user_id', $user->id)->select('projects.id', 'projects.name');
                },
            ]);

        // Filter by approval status
        if ($request->has('approved')) {
            $query->where('is_approved', $request->boolean('approved'));
        }

        // Filter by transcription status
        if ($request->has('transcribed')) {
            $query->where('is_transcribed', $request->boolean('transcribed'));
        }

        // Filter by specific creators (multiple)
        if ($request->has('creator')) {
            $creators = is_array($request->query('creator')) ? $request->query('creator') : [$request->query('creator')];
            $query->whereIn('owner_username', $creators);
        }

        // Global search (caption, owner, hashtags) - Using Full-text for caption and owner
        if ($request->has('search')) {
            $search = $request->query('search');
            $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $search);
            $query->where(function ($q) use ($search, $escaped) {
                $q->whereFullText(['caption', 'owner_username'], $search)
                    ->orWhere('hashtags', 'like', "%{$escaped}%")
                    ->orWhere('caption', 'like', "%{$escaped}%")
                    ->orWhere('owner_username', 'like', "%{$escaped}%");
            });
        }

        // Filter by platforms (multiple)
        if ($request->has('platform')) {
            $platforms = is_array($request->query('platform')) ? $request->query('platform') : [$request->query('platform')];
            $query->whereIn('platform', $platforms);
        }

        // Engagement Rate Filters (uses stored engagement_rate   pre-computed by OutlierDetectionService)
        if ($request->filled('engagement_min')) {
            $query->where('engagement_rate', '>=', $request->query('engagement_min') / 100);
        }
        if ($request->filled('engagement_max')) {
            $query->where('engagement_rate', '<=', $request->query('engagement_max') / 100);
        }

        // Views Filters
        if ($request->has('views_min')) {
            $query->where('video_view_count', '>=', $request->query('views_min'));
        }
        if ($request->has('views_max')) {
            $query->where('video_view_count', '<=', $request->query('views_max'));
        }

        // Outlier / Multiplier Filters (uses stored breakout_multiplier   pre-computed by OutlierDetectionService)
        if ($request->filled('outlier_min')) {
            $query->where('breakout_multiplier', '>=', $request->query('outlier_min'));
        }
        if ($request->filled('outlier_max')) {
            $query->where('breakout_multiplier', '<=', $request->query('outlier_max'));
        }

        // Label Filter (e.g. ?label=Outlier or ?label=Breakout)
        if ($request->filled('label')) {
            $labels = is_array($request->query('label')) ? $request->query('label') : [$request->query('label')];
            $query->whereIn('breakout_label', $labels);
        }

        // Date Filters
        if ($request->has('date_value') && $request->query('date_value') != '0') {
            $value = (int) $request->query('date_value');
            $unit = $request->query('date_unit', 'Days');
            $date = now();

            switch (strtolower($unit)) {
                case 'days':
                    $date->subDays($value);
                    break;
                case 'weeks':
                    $date->subWeeks($value);
                    break;
                case 'months':
                    $date->subMonths($value);
                    break;
                case 'years':
                    $date->subYears($value);
                    break;
            }

            $query->where('post_timestamp', '>=', $date);
        }

        // Filter by Project (Curated collection of videos)
        if ($request->has('project')) {
            $projectIds = is_array($request->query('project')) ? $request->query('project') : [$request->query('project')];
            $query->whereHas('projects', function ($q) use ($projectIds) {
                $q->where('projects.user_id', auth()->id())
                    ->whereIn('projects.id', $projectIds);
            });
        }

        // Filter by Watchlist (Collection of channels)
        if ($request->has('watchlist')) {
            $watchlistIds = is_array($request->query('watchlist')) ? $request->query('watchlist') : [$request->query('watchlist')];
            $query->whereHas('channel.watchlists', function ($q) use ($watchlistIds) {
                $q->where('watchlists.user_id', auth()->id())
                    ->whereIn('watchlists.id', $watchlistIds);
            });
        }

        // Sorting
        $sortBy = $request->query('sort_by', 'posted_date');
        $sortDir = $request->query('sort_dir', 'desc');

        $allowedSortFields = [
            'outlier_score' => 'breakout_multiplier',
            'views' => 'video_view_count',
            'engagement_rate' => 'engagement_rate',
            'posted_date' => 'post_timestamp',
        ];

        if (array_key_exists($sortBy, $allowedSortFields)) {
            $query->orderBy($allowedSortFields[$sortBy], $sortDir === 'asc' ? 'asc' : 'desc');

            // Fallback sort to keep things stable
            if ($sortBy !== 'posted_date') {
                $query->orderBy('post_timestamp', 'desc');
            }
        } else {
            $query->latest('post_timestamp');
        }

        $perPage = (int) $request->query('per_page', 25);
        $perPage = max(1, min($perPage, 100));

        return $query->paginate($perPage);
    }

    /**
     * Transcribe audio (per-user billing model)
     */
    public function transcribe(Post $post)
    {
        $this->authorizePostAccess($post);

        if (! $post->audio_url) {
            return response()->json(['error' => 'No audio URL available'], 400);
        }

        $user = auth()->user();
        $userId = $user->id;
        $transcriptionCost = PlanService::creditCost('transcribe_post');

        $contentAnalysis = $post->contentAnalysis()->firstOrCreate(
            ['post_id' => $post->id],
            ['transcription_status' => 'idle']
        );
        $globalStatus = (string) ($contentAnalysis->transcription_status ?: 'idle');
        $globalCompleted = $this->hasCompletedGlobalTranscription($contentAnalysis);

        // Transcript already exists globally: unlock and return immediately.
        if ($globalCompleted) {
            $this->setGlobalTranscriptionStatus($contentAnalysis->id, 'completed');
            $this->syncPostProcessingFlags($post, $contentAnalysis);
            $charged = $this->upsertUserTranscriptionStatus($userId, $contentAnalysis->id, 'completed', null, true);
            if (! $charged) {
                return $this->insufficientCreditsResponse($userId, $transcriptionCost, 'transcription');
            }

            return response()->json([
                'message' => 'Transcription retrieved',
                'status' => 'completed',
                'global_status' => 'completed',
                'transcription' => $contentAnalysis->transcription,
            ]);
        }

        if (in_array($globalStatus, ['queued', 'processing'], true)) {
            $this->upsertUserTranscriptionStatus($userId, $contentAnalysis->id, $globalStatus);

            return response()->json([
                'status' => $globalStatus,
                'global_status' => $globalStatus,
            ], 202);
        }

        $pivot = $this->getUserTranscriptionPivot($userId, $contentAnalysis->id);

        if (empty($pivot?->transcription_charged_at) && ! $user->hasEnoughCredits($transcriptionCost)) {
            return $this->insufficientCreditsResponse($userId, $transcriptionCost, 'transcription');
        }

        $this->upsertUserTranscriptionStatus($userId, $contentAnalysis->id, 'queued');
        $this->setGlobalTranscriptionStatus($contentAnalysis->id, 'queued');
        TranscribePostJob::dispatch($post->id, $userId)->onQueue('transcription');

        return response()->json([
            'status' => 'queued',
            'global_status' => $contentAnalysis->transcription_status === 'processing' ? 'processing' : 'queued',
            'message' => 'Transcription queued',
        ], 202);
    }

    /**
     * Check transcription progress for the current user + post.
     */
    public function transcriptionStatus(Post $post)
    {
        $this->authorizePostAccess($post);

        if (! $post->audio_url) {
            return response()->json([
                'status' => 'idle',
                'global_status' => 'idle',
            ]);
        }

        $user = auth()->user();
        $userId = $user->id;
        $contentAnalysis = $post->contentAnalysis()->first();

        if (! $contentAnalysis) {
            return response()->json([
                'status' => 'idle',
                'global_status' => 'idle',
            ]);
        }

        $globalStatus = $contentAnalysis->transcription_status ?: 'idle';
        $globalCompleted = $this->hasCompletedGlobalTranscription($contentAnalysis);

        if ($globalCompleted && $globalStatus !== 'completed') {
            $this->setGlobalTranscriptionStatus($contentAnalysis->id, 'completed');
            $globalStatus = 'completed';
        }

        if ($globalCompleted) {
            $this->syncPostProcessingFlags($post, $contentAnalysis);
        }

        $pivot = $this->getUserTranscriptionPivot($userId, $contentAnalysis->id);
        $userStatus = $pivot->transcription_status ?? 'idle';

        if ($pivot && $globalCompleted) {
            $shouldCompleteFromCharge = ! empty($pivot->transcription_charged_at) && $userStatus !== 'completed';
            $shouldCompleteFromInProgress = in_array($userStatus, ['queued', 'processing'], true);

            if ($shouldCompleteFromCharge || $shouldCompleteFromInProgress) {
                $this->upsertUserTranscriptionStatus($userId, $contentAnalysis->id, 'completed', null, true);
                $pivot = $this->getUserTranscriptionPivot($userId, $contentAnalysis->id);
                $userStatus = $pivot->transcription_status ?? $userStatus;
            }
        }

        $response = [
            'status' => $userStatus,
            'global_status' => $globalStatus,
        ];

        if ($userStatus === 'failed' && ! empty($pivot?->transcription_error)) {
            $response['error'] = $pivot->transcription_error;
        }

        if ($userStatus === 'completed' && $globalCompleted) {
            $response['transcription'] = $contentAnalysis->transcription;
        }

        return response()->json($response);
    }

    /**
     * Process post through AI pipeline (manual trigger)
     */
    public function process(Post $post, ContentProcessingService $processor)
    {
        $this->authorizePostAccess($post);

        $user = auth()->user();
        $userId = $user->id;

        // Ensure we have a ContentAnalysis record to check charge status
        $contentAnalysis = $post->contentAnalysis()->firstOrCreate(
            ['post_id' => $post->id],
            [
                'transcription_status' => 'idle',
                'analysis_status' => 'idle',
            ]
        );

        // Check which actions need charging
        $pivot = $this->getUserAnalysisPivot($userId, $contentAnalysis->id);
        $needsTranscriptionCharge = empty($pivot?->transcription_charged_at);
        $needsAnalysisCharge = empty($pivot?->analysis_charged_at);

        $transcriptionCost = PlanService::creditCost('transcribe_post');
        $analysisCost = PlanService::creditCost('analyze_post');
        $scriptCost = PlanService::creditCost('generate_script');

        $totalRequired = $scriptCost;
        if ($needsTranscriptionCharge) {
            $totalRequired += $transcriptionCost;
        }
        if ($needsAnalysisCharge) {
            $totalRequired += $analysisCost;
        }

        if (! $user->hasEnoughCredits($totalRequired)) {
            return $this->insufficientCreditsResponse($userId, $totalRequired, 'video processing');
        }

        try {
            return DB::transaction(function () use ($post, $processor, $userId, $user, $needsTranscriptionCharge, $needsAnalysisCharge) {
                if ($needsTranscriptionCharge) {
                    $this->deductCreditsForUser($userId, 'transcribe_post');
                }

                if ($needsAnalysisCharge) {
                    $this->deductCreditsForUser($userId, 'analyze_post');
                }

                $this->deductCreditsForUser($userId, 'generate_script');

                $user->logActivity('video_processed', 'Processed video for script generation from '.$post->owner_username, '/Library/'.$post->id);

                $result = $processor->process($post, $userId);

                if (request()->header('X-Inertia')) {
                    return redirect()->back()->with([
                        'message' => 'Processing completed successfully',
                        'generated_script' => $result,
                    ]);
                }

                return response()->json([
                    'message' => 'Processing completed successfully',
                    'generated_script' => $result,
                ]);
            });
        } catch (\Exception $e) {
            Log::error($e);

            return response()->json(['error' => 'An unexpected error occurred during processing.'], 500);
        }
    }

    /**
     * Generate audio from revised script (manual trigger)
     */
    public function generateAudio(
        Post $post,
        ElevenLabsService $elevenlabs,
        OpenAIWhisperService $openai,
        MediaUrlService $mediaUrlService
    ) {
        $this->authorizePostAccess($post);

        $generatedScript = $post->contentAnalysis?->generatedScripts()
            ->where('user_id', auth()->id())
            ->first();

        if (! $generatedScript) {
            return response()->json(['error' => 'No generated script found'], 404);
        }

        if ($generatedScript->audio_file_path) {
            $audioPath = (string) $generatedScript->audio_file_path;

            return response()->json([
                'message' => 'Audio already generated',
                'audio_path' => $audioPath,
                'audio_url' => $mediaUrlService->previewUrl($audioPath),
            ]);
        }

        $user = auth()->user();
        $cost = PlanService::creditCost('generate_audio');

        if (! $user->hasEnoughCredits($cost)) {
            return response()->json([
                'error' => 'insufficient_credits',
                'message' => "You need {$cost} credits to generate audio. Please upgrade your plan.",
                'credits' => $user->credits,
                'required' => $cost,
            ], 402);
        }

        try {
            $provider = config('ai.defaults.tts', 'elevenlabs');
            $audioPath = $provider === 'openai'
                ? $openai->synthesize($generatedScript->revised_script)
                : $elevenlabs->synthesize($generatedScript->revised_script);

            $generatedScript->update(['audio_file_path' => $audioPath]);

            // Deduct credits after successful audio generation
            $user->deductCredits($cost, 'generate_audio');

            if (request()->header('X-Inertia')) {
                return redirect()->back()->with([
                    'message' => 'Audio generated successfully',
                    'audio_path' => $audioPath,
                    'audio_url' => $mediaUrlService->previewUrl($audioPath),
                ]);
            }

            return response()->json([
                'message' => 'Audio generated successfully',
                'audio_path' => $audioPath,
                'audio_url' => $mediaUrlService->previewUrl($audioPath),
            ]);
        } catch (\Exception $e) {
            Log::error($e);

            return response()->json(['error' => 'An unexpected error occurred during audio generation.'], 500);
        }
    }

    /**
     * Perform strategic content analysis (per-user billing model)
     *
     * Flow:
     * 1. User already charged for analysis → return cached (free repeat access)
     * 2. Global analysis exists but user not yet charged → charge user, return cached
     * 3. No global analysis → run Gemini, store globally, charge user
     */
    public function analyze(Request $request, Post $post)
    {
        $this->authorizePostAccess($post);

        $user = auth()->user();
        $userId = $user->id;
        $analysisLanguage = $this->normalizeAnalysisLanguage(
            $request->input('analysis_language', $request->header('X-Analysis-Language'))
        );
        $analysisCost = PlanService::creditCost('analyze_post');
        $contentAnalysis = $post->contentAnalysis()->firstOrCreate(
            ['post_id' => $post->id],
            [
                'transcription' => $post->contentAnalysis?->transcription,
                'transcription_status' => ! empty($post->contentAnalysis?->transcription) ? 'completed' : 'idle',
                'analysis_status' => 'idle',
            ]
        );
        $globalTranscriptionCompleted = $this->hasCompletedGlobalTranscription($contentAnalysis);

        if (! $globalTranscriptionCompleted) {
            return response()->json(['error' => 'Audio transcription is required to run the AI analysis.'], 422);
        }

        $this->syncPostProcessingFlags($post, $contentAnalysis);

        $globalCompleted = $this->hasCompletedGlobalAnalysis($contentAnalysis);
        $globalStatus = (string) ($contentAnalysis->analysis_status ?: 'idle');
        $pivot = $this->getUserAnalysisPivot($userId, $contentAnalysis->id);

        // User already unlocked and global analysis exists.
        if ($globalCompleted && $pivot && ! empty($pivot->analysis_charged_at)) {
            $this->setGlobalAnalysisStatus($contentAnalysis->id, 'completed');
            $this->upsertUserAnalysisStatus($userId, $contentAnalysis->id, 'completed', null, true);
            $post->update(['is_analyzed' => true]);

            return response()->json([
                'message' => 'Strategic analysis retrieved',
                'status' => 'completed',
                'global_status' => 'completed',
                'analysis' => $contentAnalysis->toArray(),
            ]);
        }

        // Global analysis exists but this user has not unlocked it yet.
        if ($globalCompleted) {
            $this->setGlobalAnalysisStatus($contentAnalysis->id, 'completed');
            $charged = $this->upsertUserAnalysisStatus($userId, $contentAnalysis->id, 'completed', null, true);
            if (! $charged) {
                return $this->insufficientCreditsResponse($userId, $analysisCost, 'analysis');
            }
            $post->update(['is_analyzed' => true]);
            $user->logActivity('video_analyzed', 'Analyzed video from '.$post->owner_username, '/Library/'.$post->id);

            return response()->json([
                'message' => 'Strategic analysis completed successfully',
                'status' => 'completed',
                'global_status' => 'completed',
                'analysis' => $contentAnalysis->toArray(),
            ]);
        }

        if (in_array($globalStatus, ['queued', 'processing'], true)) {
            $this->upsertUserAnalysisStatus($userId, $contentAnalysis->id, $globalStatus);

            return response()->json([
                'status' => $globalStatus,
                'global_status' => $globalStatus,
            ], 202);
        }

        if (empty($pivot?->analysis_charged_at) && ! $user->hasEnoughCredits($analysisCost)) {
            return $this->insufficientCreditsResponse($userId, $analysisCost, 'analysis');
        }

        $this->upsertUserAnalysisStatus($userId, $contentAnalysis->id, 'queued');
        $this->setGlobalAnalysisStatus($contentAnalysis->id, 'queued');

        AnalyzePostJob::dispatch($post->id, $userId, $analysisLanguage)->onQueue('analysis');

        return response()->json([
            'status' => 'queued',
            'global_status' => $contentAnalysis->analysis_status === 'processing' ? 'processing' : 'queued',
            'message' => 'Analysis queued',
        ], 202);
    }

    private function normalizeAnalysisLanguage(mixed $language): string
    {
        $normalized = strtolower(trim((string) $language));

        return match ($normalized) {
            'hindi' => 'Hindi',
            'hinglish' => 'Hinglish',
            default => 'English',
        };
    }

    /**
     * Check analysis progress for the current user + post.
     */
    public function analysisStatus(Post $post)
    {
        $this->authorizePostAccess($post);

        $userId = auth()->id();
        $contentAnalysis = $post->contentAnalysis()->first();

        if (! $contentAnalysis) {
            return response()->json([
                'status' => 'idle',
                'global_status' => 'idle',
            ]);
        }

        if (! $this->hasCompletedGlobalTranscription($contentAnalysis)) {
            return response()->json([
                'status' => 'idle',
                'global_status' => 'idle',
            ]);
        }

        $globalStatus = $contentAnalysis->analysis_status ?: 'idle';
        $globalCompleted = $this->hasCompletedGlobalAnalysis($contentAnalysis);

        if ($globalCompleted && $globalStatus !== 'completed') {
            $this->setGlobalAnalysisStatus($contentAnalysis->id, 'completed');
            $globalStatus = 'completed';
        }

        $this->syncPostProcessingFlags($post, $contentAnalysis);

        $pivot = $this->getUserAnalysisPivot($userId, $contentAnalysis->id);
        $userStatus = $pivot->analysis_status ?? 'idle';

        if ($pivot && $globalCompleted) {
            $shouldCompleteFromCharge = ! empty($pivot->analysis_charged_at) && $userStatus !== 'completed';
            $shouldCompleteFromInProgress = in_array($userStatus, ['queued', 'processing'], true);

            if ($shouldCompleteFromCharge || $shouldCompleteFromInProgress) {
                $this->upsertUserAnalysisStatus($userId, $contentAnalysis->id, 'completed', null, true);
                $pivot = $this->getUserAnalysisPivot($userId, $contentAnalysis->id);
                $userStatus = $pivot->analysis_status ?? $userStatus;
            }
        }

        $response = [
            'status' => $userStatus,
            'global_status' => $globalStatus,
        ];

        if ($userStatus === 'failed' && ! empty($pivot?->analysis_error)) {
            $response['error'] = $pivot->analysis_error;
        }

        if ($userStatus === 'completed' && $globalCompleted) {
            $response['analysis'] = $contentAnalysis->toArray();
        }

        return response()->json($response);
    }

    private function setGlobalTranscriptionStatus(int $contentAnalysisId, string $status): void
    {
        DB::table('content_analyses')
            ->where('id', $contentAnalysisId)
            ->update([
                'transcription_status' => $status,
                'updated_at' => now(),
            ]);
    }

    private function getUserTranscriptionPivot(int $userId, int $contentAnalysisId): ?object
    {
        return DB::table('content_analysis_by_user')
            ->where('user_id', $userId)
            ->where('content_analysis_id', $contentAnalysisId)
            ->first();
    }

    private function upsertUserTranscriptionStatus(
        int $userId,
        int $contentAnalysisId,
        string $status,
        ?string $error = null,
        bool $markCharged = false
    ): bool {
        return DB::transaction(function () use ($userId, $contentAnalysisId, $status, $error, $markCharged): bool {
            $query = DB::table('content_analysis_by_user')
                ->where('user_id', $userId)
                ->where('content_analysis_id', $contentAnalysisId);

            $existing = $query->lockForUpdate()->first();
            $shouldChargeNow = $markCharged && empty($existing?->transcription_charged_at);

            if ($shouldChargeNow && ! $this->deductCreditsForUser($userId, 'transcribe_post')) {
                $insufficientMessage = 'Insufficient credits for transcription.';

                if ($existing) {
                    $query->update([
                        'transcription_status' => 'failed',
                        'transcription_error' => $insufficientMessage,
                        'updated_at' => now(),
                    ]);
                } else {
                    DB::table('content_analysis_by_user')->insert([
                        'user_id' => $userId,
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
                'user_id' => $userId,
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

    private function setGlobalAnalysisStatus(int $contentAnalysisId, string $status): void
    {
        DB::table('content_analyses')
            ->where('id', $contentAnalysisId)
            ->update([
                'analysis_status' => $status,
                'updated_at' => now(),
            ]);
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

        $requiredFields = ['hook_text', 'topic_angle', 'script_type', 'script_flow', 'cta_type'];
        foreach ($requiredFields as $field) {
            if (! $this->hasFilledString($contentAnalysis->{$field} ?? null)) {
                return false;
            }
        }

        return true;
    }

    private function hasFilledString(mixed $value): bool
    {
        return trim((string) ($value ?? '')) !== '';
    }

    private function syncPostProcessingFlags(Post $post, ?object $contentAnalysis = null): void
    {
        $analysis = $contentAnalysis ?? $post->contentAnalysis;
        if (! $analysis) {
            return;
        }

        $updates = [];
        if (! $post->is_transcribed && $this->hasCompletedGlobalTranscription($analysis)) {
            $updates['is_transcribed'] = true;
        }

        if (! $post->is_analyzed && $this->hasCompletedGlobalAnalysis($analysis)) {
            $updates['is_analyzed'] = true;
        }

        if ($updates === []) {
            return;
        }

        $post->update($updates);
        $post->forceFill($updates);
    }

    private function getUserAnalysisPivot(int $userId, int $contentAnalysisId): ?object
    {
        return DB::table('content_analysis_by_user')
            ->where('user_id', $userId)
            ->where('content_analysis_id', $contentAnalysisId)
            ->first();
    }

    private function upsertUserAnalysisStatus(
        int $userId,
        int $contentAnalysisId,
        string $status,
        ?string $error = null,
        bool $markCharged = false
    ): bool {
        return DB::transaction(function () use ($userId, $contentAnalysisId, $status, $error, $markCharged): bool {
            $query = DB::table('content_analysis_by_user')
                ->where('user_id', $userId)
                ->where('content_analysis_id', $contentAnalysisId);

            $existing = $query->lockForUpdate()->first();
            $shouldChargeNow = $markCharged && empty($existing?->analysis_charged_at);

            if ($shouldChargeNow && ! $this->deductCreditsForUser($userId, 'analyze_post')) {
                $insufficientMessage = 'Insufficient credits for analysis.';

                if ($existing) {
                    $query->update([
                        'analysis_status' => 'failed',
                        'analysis_error' => $insufficientMessage,
                        'updated_at' => now(),
                    ]);
                } else {
                    DB::table('content_analysis_by_user')->insert([
                        'user_id' => $userId,
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
                'user_id' => $userId,
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

    private function deductCreditsForUser(int $userId, string $action): bool
    {
        $cost = PlanService::creditCost($action);
        if ($cost <= 0) {
            return true;
        }

        $updatedRows = DB::table('users')
            ->where('id', $userId)
            ->where('credits', '>=', $cost)
            ->decrement('credits', $cost);

        if ($updatedRows === 0) {
            return false;
        }

        DB::table('credit_ledger')->insert([
            'user_id' => $userId,
            'action' => $action,
            'amount' => -$cost,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return true;
    }

    private function insufficientCreditsResponse(int $userId, int $requiredCredits, string $feature): JsonResponse
    {
        $credits = (int) DB::table('users')->where('id', $userId)->value('credits');

        return response()->json([
            'error' => 'insufficient_credits',
            'message' => "You need {$requiredCredits} credits to unlock {$feature}. Please upgrade your plan.",
            'credits' => $credits,
            'required' => $requiredCredits,
        ], 402);
    }

    private function authorizePostAccess(Post $post): void
    {
        $user = auth()->user();

        $ownChannelIds = $user->channels()->pluck('channels.id');
        $watchlistChannelIds = DB::table('watchlist_channels')
            ->join('watchlists', 'watchlists.id', '=', 'watchlist_channels.watchlist_id')
            ->where('watchlists.user_id', $user->id)
            ->pluck('watchlist_channels.channel_id');

        $visibleChannelIds = $ownChannelIds->merge($watchlistChannelIds)->unique();

        abort_unless($visibleChannelIds->contains((int) $post->channel_id), 403);
    }
}
