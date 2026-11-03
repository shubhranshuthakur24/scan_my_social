<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class VideoController extends Controller
{
    /**
     * Display a listing of the videos.
     */
    public function index()
    {
        return Inertia::render('Videos/Index', [
            'savedVideoFilters' => auth()->user()
                ->savedVideoFilters()
                ->latest('id')
                ->get(['id', 'name', 'filters', 'created_at', 'updated_at']),
            'channelsCount' => auth()->user()->channels()->count(),
        ]);
    }

    /**
     * Scope the contentAnalysis on a post to only expose fields
     * the current user has unlocked via the billing pivot table.
     *
     * Backward compatibility:
     * - if pivot row is missing, only trust user-owned legacy artifacts
     *   (generated script), never global post flags.
     */
    protected function scopeContentAnalysisForUser(Post $post, int $userId): Post
    {
        $isRefineRequest = request()->is('videos/*/refine');

        if (! $post->contentAnalysis) {
            if ($isRefineRequest) {
                Log::info('videos.refine.scope.no_content_analysis', [
                    'user_id' => $userId,
                    'post_id' => $post->id,
                ]);
            }

            return $post;
        }

        $user = auth()->user();
        $userAnalysis = $user->contentAnalyses()->where('content_analysis_id', $post->contentAnalysis->id)->first();

        // No pivot row: fall back to strict user-owned legacy unlock signals.
        if (! $userAnalysis) {
            $legacy = $this->getLegacyUnlockFlags($post, $userId);
            if ($isRefineRequest) {
                Log::info('videos.refine.scope.no_pivot_legacy', [
                    'user_id' => $userId,
                    'post_id' => $post->id,
                    'legacy_transcription' => (bool) $legacy['user_has_transcription'],
                    'legacy_analysis' => (bool) $legacy['user_has_analysis'],
                ]);
            }

            if ($legacy['user_has_analysis']) {
                if ($isRefineRequest) {
                    Log::info('videos.refine.scope.allow_full_via_legacy', [
                        'user_id' => $userId,
                        'post_id' => $post->id,
                    ]);
                }

                return $post;
            }

            if ($legacy['user_has_transcription']) {
                $this->stripAnalysisFields($post);
                if ($isRefineRequest) {
                    Log::info('videos.refine.scope.allow_transcription_only_via_legacy', [
                        'user_id' => $userId,
                        'post_id' => $post->id,
                    ]);
                }

                return $post;
            }

            $post->setRelation('contentAnalysis', null);
            if ($isRefineRequest) {
                Log::info('videos.refine.scope.no_unlock_hide_analysis', [
                    'user_id' => $userId,
                    'post_id' => $post->id,
                ]);
            }

            return $post;
        }

        // Full analysis unlock.
        if ($userAnalysis->pivot->analysis_charged_at !== null || $userAnalysis->pivot->analysis_status === 'completed') {
            if ($isRefineRequest) {
                Log::info('videos.refine.scope.allow_full_via_pivot', [
                    'user_id' => $userId,
                    'post_id' => $post->id,
                    'analysis_status' => $userAnalysis->pivot->analysis_status,
                    'analysis_charged_at' => $userAnalysis->pivot->analysis_charged_at,
                ]);
            }

            return $post;
        }

        // Transcription-only unlock: strip analysis fields.
        if ($userAnalysis->pivot->transcription_charged_at !== null || $userAnalysis->pivot->transcription_status === 'completed') {
            $this->stripAnalysisFields($post);
            if ($isRefineRequest) {
                Log::info('videos.refine.scope.allow_transcription_only_via_pivot', [
                    'user_id' => $userId,
                    'post_id' => $post->id,
                    'transcription_status' => $userAnalysis->pivot->transcription_status,
                    'transcription_charged_at' => $userAnalysis->pivot->transcription_charged_at,
                ]);
            }

            return $post;
        }

        // Pivot row exists but no unlock signals.
        $post->setRelation('contentAnalysis', null);
        if ($isRefineRequest) {
            Log::info('videos.refine.scope.pivot_no_unlock_hide_analysis', [
                'user_id' => $userId,
                'post_id' => $post->id,
                'transcription_status' => $userAnalysis->pivot->transcription_status,
                'analysis_status' => $userAnalysis->pivot->analysis_status,
            ]);
        }

        return $post;
    }

    /**
     * Resolve per-user unlock flags from billing pivot.
     * Falls back to legacy signals when pivot row is missing.
     */
    protected function getUserUnlockFlags(Post $post, int $userId): array
    {
        $isRefineRequest = request()->is('videos/*/refine');
        $hasTranscription = false;
        $hasAnalysis = false;

        if ($post->contentAnalysis) {
            $user = auth()->user();
            $userAnalysis = $user->contentAnalyses()
                ->where('content_analysis_id', $post->contentAnalysis->id)
                ->first();

            if ($userAnalysis) {
                $hasTranscription = $userAnalysis->pivot->transcription_charged_at !== null
                    || $userAnalysis->pivot->transcription_status === 'completed';
                $hasAnalysis = $userAnalysis->pivot->analysis_charged_at !== null
                    || $userAnalysis->pivot->analysis_status === 'completed';
                if ($isRefineRequest) {
                    Log::info('videos.refine.flags.from_pivot', [
                        'user_id' => $userId,
                        'post_id' => $post->id,
                        'content_analysis_id' => $post->contentAnalysis->id,
                        'transcription_status' => $userAnalysis->pivot->transcription_status,
                        'analysis_status' => $userAnalysis->pivot->analysis_status,
                        'transcription_charged_at' => $userAnalysis->pivot->transcription_charged_at,
                        'analysis_charged_at' => $userAnalysis->pivot->analysis_charged_at,
                    ]);
                }
            } else {
                $legacyFlags = $this->getLegacyUnlockFlags($post, $userId);
                $hasTranscription = $legacyFlags['user_has_transcription'];
                $hasAnalysis = $legacyFlags['user_has_analysis'];
                if ($isRefineRequest) {
                    Log::info('videos.refine.flags.from_legacy', [
                        'user_id' => $userId,
                        'post_id' => $post->id,
                        'content_analysis_id' => $post->contentAnalysis->id,
                        'user_has_transcription' => (bool) $hasTranscription,
                        'user_has_analysis' => (bool) $hasAnalysis,
                    ]);
                }
            }
        } elseif ($isRefineRequest) {
            Log::info('videos.refine.flags.no_content_analysis', [
                'user_id' => $userId,
                'post_id' => $post->id,
            ]);
        }

        return [
            'user_has_transcription' => $hasTranscription,
            'user_has_analysis' => $hasAnalysis,
        ];
    }

    /**
     * Legacy unlock resolution for posts created before
     * per-user billing pivots were consistently populated.
     *
     * IMPORTANT: Only trust user-owned artifacts. Global post flags are not
     * per-user billing evidence and must not unlock access.
     */
    private function getLegacyUnlockFlags(Post $post, int $userId): array
    {
        if (! $post->contentAnalysis) {
            return [
                'user_has_transcription' => false,
                'user_has_analysis' => false,
            ];
        }

        $hasGeneratedScript = $post->contentAnalysis->relationLoaded('generatedScripts')
            ? $post->contentAnalysis->generatedScripts->isNotEmpty()
            : $post->contentAnalysis->generatedScripts()->where('user_id', $userId)->exists();

        $hasLegacyTranscription = $hasGeneratedScript;
        $hasLegacyAnalysis = $hasGeneratedScript;

        return [
            'user_has_transcription' => $hasLegacyTranscription,
            'user_has_analysis' => $hasLegacyAnalysis,
        ];
    }

    private function stripAnalysisFields(Post $post): void
    {
        if (! $post->contentAnalysis) {
            return;
        }

        $analysisFields = [
            'hook',
            'hook_text',
            'hook_type',
            'content_angle',
            'topic_angle',
            'psychological_driver',
            'structure_model',
            'script_flow',
            'mechanism_type',
            'insight_shift',
            'insight_shift_text',
            'insight_shift_position',
            'rhythm_profile',
            'authority_signals',
            'pattern_dna',
            'signal_snapshot',
            'llm_raw_outputs',
            'cta_type',
            'cta_text',
            'closure_type',
            'archetype',
            'script_type',
            'language_style',
            'language_used',
            'analysis_confidence',
            'analysis_version',
            'transcript_hash',
            'hook_score',
            'content_angle_score',
            'psychological_driver_score',
            'structure_model_score',
            'mechanism_type_score',
            'insight_shift_score',
            'rhythm_profile_score',
            'cta_type_score',
            'closure_type_score',
            'archetype_score',
        ];

        foreach ($analysisFields as $field) {
            $post->contentAnalysis->$field = null;
        }
    }

    /**
     * Display the specified video details page.
     */
    public function show($id)
    {
        $post = Post::with([
            'channel',
            'contentAnalysis.generatedScripts' => function ($q) {
                $q->where('user_id', auth()->id());
            },
        ])->findOrFail($id);

        $redirect = $this->authorizePostAccess($post);
        if ($redirect) {
            return $redirect;
        }

        $flags = $this->getUserUnlockFlags($post, auth()->id());
        $post = $this->scopeContentAnalysisForUser($post, auth()->id());

        return Inertia::render('Videos/Show', array_merge(['post' => $post], $flags));
    }

    /**
     * Display the video script refinement page.
     */
    public function refine($id)
    {
        $userId = auth()->id();
        Log::info('videos.refine.enter', [
            'user_id' => $userId,
            'post_id' => (int) $id,
            'path' => request()->path(),
            'host' => request()->getHost(),
            'url' => request()->fullUrl(),
        ]);

        $post = Post::with([
            'channel',
            'contentAnalysis.generatedScripts' => function ($q) {
                $q->where('user_id', auth()->id());
            },
        ])->findOrFail($id);

        Log::info('videos.refine.post_loaded', [
            'user_id' => $userId,
            'post_id' => (int) $id,
            'channel_id' => $post->channel_id,
            'has_content_analysis' => $post->contentAnalysis !== null,
            'content_analysis_id' => $post->contentAnalysis?->id,
        ]);

        $redirect = $this->authorizePostAccess($post);
        if ($redirect) {
            Log::warning('videos.refine.redirect.channel_access_denied', [
                'user_id' => $userId,
                'post_id' => (int) $id,
                'target' => method_exists($redirect, 'getTargetUrl') ? $redirect->getTargetUrl() : null,
            ]);

            return $redirect;
        }

        // Check per-user unlock flags first, then scope response payload.
        $flags = $this->getUserUnlockFlags($post, $userId);
        Log::info('videos.refine.unlock_flags', [
            'user_id' => $userId,
            'post_id' => (int) $id,
            'user_has_transcription' => (bool) $flags['user_has_transcription'],
            'user_has_analysis' => (bool) $flags['user_has_analysis'],
        ]);

        if (! $flags['user_has_transcription'] || ! $flags['user_has_analysis']) {
            Log::warning('videos.refine.redirect.unlock_required', [
                'user_id' => $userId,
                'post_id' => (int) $id,
                'user_has_transcription' => (bool) $flags['user_has_transcription'],
                'user_has_analysis' => (bool) $flags['user_has_analysis'],
                'reason' => ! $flags['user_has_transcription'] && ! $flags['user_has_analysis']
                    ? 'missing_transcription_and_analysis_unlock'
                    : (! $flags['user_has_transcription']
                        ? 'missing_transcription_unlock'
                        : 'missing_analysis_unlock'),
                'target_route' => 'videos.show',
            ]);

            return redirect()->route('videos.show', $id)
                ->with('error', 'Please unlock transcription and analysis first.');
        }

        $post = $this->scopeContentAnalysisForUser($post, $userId);
        Log::info('videos.refine.scope_applied', [
            'user_id' => $userId,
            'post_id' => (int) $id,
            'has_content_analysis_after_scope' => $post->contentAnalysis !== null,
            'has_transcription_after_scope' => ! empty($post->contentAnalysis?->transcription),
            'has_analysis_signal_after_scope' => $this->hasAnyAnalysisSignal($post),
        ]);

        Log::info('videos.refine.render', [
            'user_id' => $userId,
            'post_id' => (int) $id,
            'component' => 'Videos/Refine',
        ]);

        return Inertia::render('Videos/Refine', array_merge(['post' => $post], $flags));
    }

    /**
     * Verify the current user has access to the post's channel.
     * Returns a redirect response if unauthorized, null if authorized.
     */
    private function authorizePostAccess(Post $post): ?RedirectResponse
    {
        $user = auth()->user();

        $ownChannelIds = $user->channels()->pluck('channels.id');
        $watchlistChannelIds = DB::table('watchlist_channels')
            ->join('watchlists', 'watchlists.id', '=', 'watchlist_channels.watchlist_id')
            ->where('watchlists.user_id', $user->id)
            ->pluck('watchlist_channels.channel_id');

        $visibleChannelIds = $ownChannelIds->merge($watchlistChannelIds)->unique();

        if (! $visibleChannelIds->contains($post->channel_id)) {
            Log::warning('videos.post_access.denied', [
                'user_id' => $user->id,
                'post_id' => $post->id,
                'post_channel_id' => $post->channel_id,
                'visible_channel_ids' => $visibleChannelIds->values()->all(),
            ]);

            return redirect()->route('videos')
                ->with('error', 'You don\'t have access to this video. Add the channel to your watchlist first.');
        }

        return null;
    }

    private function hasAnyAnalysisSignal(Post $post): bool
    {
        if (! $post->contentAnalysis) {
            return false;
        }

        $analysis = $post->contentAnalysis;
        $keys = [
            'hook',
            'hook_text',
            'content_angle',
            'topic_angle',
            'psychological_driver',
            'structure_model',
            'script_flow',
            'mechanism_type',
            'insight_shift',
            'insight_shift_text',
            'rhythm_profile',
            'cta_type',
            'cta_text',
            'closure_type',
            'archetype',
            'script_type',
            'hook_score',
            'content_angle_score',
            'psychological_driver_score',
            'structure_model_score',
            'mechanism_type_score',
            'insight_shift_score',
            'rhythm_profile_score',
            'cta_type_score',
            'closure_type_score',
            'archetype_score',
        ];

        foreach ($keys as $key) {
            $value = $analysis->{$key} ?? null;
            if ($value !== null && $value !== '') {
                return true;
            }
        }

        return false;
    }
}
