<?php

namespace App\Services;

use App\Models\ContentAnalysis;
use App\Models\GeneratedScript;
use App\Models\Post;
use App\Models\User;
use App\Services\ScriptIntelligence\ScriptAnalysisOrchestrator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ContentProcessingService
{
    public function __construct(
        protected OpenRouterService $openrouter,
        protected OpenAIService $openAiContent,
        protected GeminiService $gemini,
        protected ElevenLabsService $elevenlabs,
        protected OpenAIWhisperService $openaiWhisper,
        protected InstagramScraperService $instagramScraper,
        protected ScriptAnalysisOrchestrator $scriptAnalysisOrchestrator,
    ) {}

    /**
     * Steps: Transcribe -> Analyze -> Generate Script -> Review Script
     * Audio generation is manual via controller
     */
    public function process(Post $post, int $userId): GeneratedScript
    {
        set_time_limit(180); // AI calls can take 30-60s total
        Log::info("Processing post: {$post->post_id} for user: {$userId}");

        // Step 1: Get or Create Global Content Analysis for this post
        $contentAnalysis = DB::transaction(function () use ($post) {
            return $post->contentAnalysis()->lockForUpdate()->first();
        });

        $transcription = $this->getOrCreateTranscription($post);

        if (! $contentAnalysis) {
            Log::info('No global analysis found, generating new one');
            $analysis = $this->runContentAiMethod('analyzeContent', [$transcription]);

            $contentAnalysis = ContentAnalysis::create([
                'post_id' => $post->id,
                'transcription' => $transcription,
                'script_origin' => 'video_details',
                'content_angle' => $analysis['contentAngle'] ?? '',
                'opening_pattern' => $analysis['openingPattern'] ?? '',
                'flow_structure' => $analysis['flowStructure'] ?? '',
                'retention_triggers' => $analysis['retentionTriggers'] ?? '',
                'emotional_arc' => $analysis['emotionalArc'] ?? '',
                'cta_formula' => $analysis['ctaFormula'] ?? '',
                'do_not_change' => $analysis['doNotChange'] ?? '',
                'language_style' => $analysis['languageStyle'] ?? '',
                'language_used' => $analysis['languageUsed'] ?? '',
            ]);
        }

        // Ensure user is linked to this analysis via pivot and has access flags set
        // Analysis and Transcription are considered "charged" once this process is triggered
        DB::table('content_analysis_by_user')->updateOrInsert(
            [
                'user_id' => $userId,
                'content_analysis_id' => $contentAnalysis->id,
            ],
            [
                'transcription_charged_at' => DB::raw('COALESCE(transcription_charged_at, NOW())'),
                'transcription_status' => 'completed',
                'transcription_error' => null,
                'analysis_charged_at' => DB::raw('COALESCE(analysis_charged_at, NOW())'),
                'updated_at' => now(),
            ]
        );

        // Step 2: Check if Script already exists for this specific user
        $generatedScript = GeneratedScript::where('content_analysis_id', $contentAnalysis->id)
            ->where('user_id', $userId)
            ->first();

        if ($generatedScript) {
            Log::info('Script already exists for user, returning existing');

            return $generatedScript;
        }

        // Step 3: Generate new script based on blueprint
        Log::info("Generating new script for user: {$userId}");
        // Re-construct analysis data if we retrieved an existing record
        $newScript = $this->runContentAiMethod('generateScript', [$contentAnalysis->toArray()]);

        // Step 4: Review and improve script
        Log::info('Reviewing and improving script');
        $review = $this->runContentAiMethod('reviewScript', [(string) ($newScript['script'] ?? '')]);

        // Save generated script (Private to User)
        $user = User::query()->findOrFail($userId);
        $generatedScript = $user->generatedScripts()->make([
            'title' => $newScript['title'] ?? ($newScript['suggestedTopic'] ?? 'Generated Script'),
            'script' => $newScript['script'],
            'script_origin' => 'video_details',
            'suggested_topic' => $newScript['suggestedTopic'] ?? null,
            'estimated_duration' => $newScript['estimatedDuration'] ?? null,
            'hook_type' => $newScript['hookType'] ?? null,
            'revised_script' => $review['revisedScript'] ?? $newScript['script'],
            'overall_score' => $review['overallScore'] ?? 0,
            'scores' => $review['scores'] ?? [],
            'strengths' => $review['strengths'] ?? [],
            'improvements' => $review['improvements'] ?? [],
        ]);
        $generatedScript->contentAnalysis()->associate($contentAnalysis);
        $generatedScript->save();

        Log::info("Processing complete for post: {$post->post_id}");

        return $generatedScript;
    }

    /**
     * Perform deep strategic analysis on a post
     */
    public function analyze(Post $post, int $userId, ?string $analysisLanguage = null): array
    {
        Log::info("Strategic analysis for post: {$post->id} for user: {$userId}");

        if (! $post->contentAnalysis || trim((string) $post->contentAnalysis->transcription) === '') {
            throw new \Exception('Audio transcription is required to run the AI analysis.');
        }

        if (! $post->is_transcribed) {
            $post->update(['is_transcribed' => true]);
        }

        /** @var ContentAnalysis|null $analysisRecord */
        $analysisRecord = $post->contentAnalysis;
        $transcription = $post->contentAnalysis->transcription;
        $transcriptHash = hash('sha256', mb_strtolower(trim((string) $transcription)));
        $analysisVersion = (string) config('script_intelligence.analysis_version', 'v2');

        $shouldRunAnalysis = ! $analysisRecord
            || $analysisRecord->analysis_version !== $analysisVersion
            || $analysisRecord->transcript_hash !== $transcriptHash
            || empty($analysisRecord->script_type)
            || empty($analysisRecord->script_flow)
            || empty($analysisRecord->hook_text);

        if ($shouldRunAnalysis) {
            Log::info('No complete Script Intelligence analysis found, generating v2 payload');

            $result = $this->runStrategicAnalysis($transcription, $analysisLanguage);
            $analysis = $result['analysis'] ?? [];
            $confidence = (float) ($analysis['analysis_confidence'] ?? 0.0);
            $exactHookText = $this->extractOpeningHookText((string) $transcription)
                ?: (string) ($analysis['hook_text'] ?? '');
            $insightShiftText = (string) ($analysis['insight_shift_text'] ?? '');
            $normalizedScriptType = $this->normalizeScriptType(
                (string) ($analysis['script_type'] ?? ''),
                (string) ($analysis['archetype'] ?? ''),
                (string) ($analysis['script_flow'] ?? '')
            );
            $normalizedKeyShift = $this->normalizeKeyShift(
                (string) ($analysis['key_shift'] ?? ''),
                $insightShiftText,
                (string) ($analysis['script_flow'] ?? '')
            );
            $normalizedInsightShiftPosition = $this->normalizeInsightShiftPosition(
                (string) ($analysis['insight_shift_position'] ?? ''),
                (string) $transcription,
                $insightShiftText
            );
            $normalizedAuthoritySignals = $this->normalizeAuthoritySignals($analysis['authority_signals'] ?? []);
            $normalizedCtaType = $this->normalizeCtaType(
                (string) ($analysis['cta_type'] ?? ''),
                (string) $transcription,
                (string) ($analysis['cta_text'] ?? ''),
                (string) ($analysis['script_flow'] ?? '')
            );
            $normalizedCtaText = $this->normalizeCtaText(
                (string) ($analysis['cta_text'] ?? ''),
                (string) $transcription,
                $normalizedCtaType
            );

            $payload = [
                'transcript_raw' => (string) ($result['transcript_raw'] ?? $transcription),
                'transcript_cleaned' => (string) ($result['transcript_cleaned'] ?? $transcription),
                'sentence_list' => $result['sentence_list'] ?? [],
                'transcript_hash' => (string) ($analysis['transcript_hash'] ?? $transcriptHash),
                'analysis_version' => (string) ($analysis['analysis_version'] ?? $analysisVersion),
                'analysis_confidence' => $confidence,

                'hook_text' => $exactHookText,
                'hook_type' => (string) ($analysis['hook_type'] ?? ''),
                'topic_angle' => (string) ($analysis['topic_angle'] ?? ''),
                'script_type' => $normalizedScriptType,
                'script_origin' => 'video_details',
                'script_flow' => (string) ($analysis['script_flow'] ?? ''),
                'mechanism_type' => (string) ($analysis['mechanism_type'] ?? ''),
                'psychological_driver' => (string) ($analysis['psychological_driver'] ?? ''),
                'insight_shift_text' => $insightShiftText,
                'insight_shift_position' => $normalizedInsightShiftPosition,
                'cta_text' => $normalizedCtaText,
                'cta_type' => $normalizedCtaType,
                'closure_type' => (string) ($analysis['closure_type'] ?? ''),
                'authority_signals' => $normalizedAuthoritySignals,
                'pattern_dna' => $result['pattern_dna'] ?? [],
                'signal_snapshot' => $result['signal_snapshot'] ?? [],
                'llm_raw_outputs' => $result['llm_raw_outputs'] ?? [],
                'rhythm_profile' => json_encode($analysis['rhythm_profile'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'key_shift' => $normalizedKeyShift,

                // Backward-compatible legacy aliases
                'hook' => (string) ($analysis['hook'] ?? $exactHookText),
                'content_angle' => (string) ($analysis['topic_angle'] ?? ''),
                'structure_model' => (string) ($analysis['script_flow'] ?? ''),
                'insight_shift' => $insightShiftText,
                'archetype' => (string) ($analysis['script_type'] ?? ''),

                // Compatibility with existing "has analysis" checks and scores UI
                'hook_score' => (int) round(max(1, min(10, ($confidence * 10) ?: 7))),
                'content_angle_score' => (int) round(max(1, min(10, ($confidence * 10) ?: 7))),
                'psychological_driver_score' => (int) round(max(1, min(10, ($confidence * 10) ?: 7))),
                'structure_model_score' => (int) round(max(1, min(10, ($confidence * 10) ?: 7))),
                'mechanism_type_score' => (int) round(max(1, min(10, ($confidence * 10) ?: 7))),
                'insight_shift_score' => (int) round(max(1, min(10, ($confidence * 10) ?: 7))),
                'rhythm_profile_score' => (int) round(max(1, min(10, ($confidence * 10) ?: 7))),
                'cta_type_score' => (int) round(max(1, min(10, ($confidence * 10) ?: 7))),
                'closure_type_score' => (int) round(max(1, min(10, ($confidence * 10) ?: 7))),
                'archetype_score' => (int) round(max(1, min(10, ($confidence * 10) ?: 7))),
            ];

            if ($analysisRecord) {
                $analysisRecord->update($payload);
            } else {
                $analysisRecord = ContentAnalysis::create(array_merge([
                    'post_id' => $post->id,
                    'transcription' => $transcription,
                    'transcription_status' => 'completed',
                    'analysis_status' => 'completed',
                ], $payload));
            }
        } else {
            Log::info('Reusing existing Script Intelligence analysis');
        }

        /** @var ContentAnalysis $analysisRecord */
        $analysisRecord = $analysisRecord->fresh();
        $this->applyStrategicFieldFallbacks($analysisRecord);
        $this->applyCtaFallbacks($analysisRecord);
        $strategy = $analysisRecord->fresh()->toArray();
        $strategy['title'] = $strategy['title'] ?? 'Baseline Script (Transcribed)';

        Log::debug('Strategic analysis completed.', [
            'post_id' => $post->id,
            'user_id' => $userId,
            'has_hook_score' => isset($strategy['hook_score']),
        ]);

        return $strategy;
    }

    /**
     * @return array<string, mixed>
     */
    private function runStrategicAnalysis(string $transcription, ?string $analysisLanguage = null): array
    {
        $primaryResult = $this->scriptAnalysisOrchestrator->analyze($transcription);
        $primaryAnalysis = $primaryResult['analysis'] ?? [];
        if (! $this->requiresStrategicFallback($primaryAnalysis)) {
            return $primaryResult;
        }

        Log::warning('Strategic analysis quality below threshold. Retrying via OpenAI strategic fallback.', [
            'confidence' => $primaryAnalysis['analysis_confidence'] ?? null,
            'script_flow' => $primaryAnalysis['script_flow'] ?? null,
            'closure_type' => $primaryAnalysis['closure_type'] ?? null,
        ]);

        try {
            return $this->buildOpenAiStrategicResult($transcription, $analysisLanguage);
        } catch (\Throwable $exception) {
            Log::warning('OpenAI strategic fallback failed. Returning primary analysis result.', [
                'error' => $exception->getMessage(),
            ]);

            return $primaryResult;
        }
    }

    /**
     * @param  array<string, mixed>  $analysis
     */
    private function requiresStrategicFallback(array $analysis): bool
    {
        $minimumConfidence = (float) config('script_intelligence.minimum_confidence', 0.60);
        $confidence = (float) ($analysis['analysis_confidence'] ?? 0.0);
        if ($confidence < $minimumConfidence) {
            return true;
        }

        $placeholderNeedles = [
            'none',
            'no obvious shift detected',
            'no clear closure',
            'questiondemocta',
            'announcementdemocta',
        ];

        $fieldsToInspect = [
            (string) ($analysis['script_flow'] ?? ''),
            (string) ($analysis['insight_shift_text'] ?? ''),
            (string) ($analysis['closure_type'] ?? ''),
            (string) ($analysis['key_shift'] ?? ''),
        ];

        foreach ($fieldsToInspect as $fieldValue) {
            $normalizedValue = mb_strtolower(trim($fieldValue));
            if ($normalizedValue === '') {
                return true;
            }

            foreach ($placeholderNeedles as $needle) {
                if (str_contains($normalizedValue, $needle)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildOpenAiStrategicResult(string $transcription, ?string $analysisLanguage = null): array
    {
        $openAiAnalysis = $this->runContentAiMethod('analyzeStrategy', [$transcription, $analysisLanguage]);
        $confidence = $this->deriveConfidenceFromLegacyScores($openAiAnalysis);
        $exactHookText = $this->extractOpeningHookText($transcription);
        $insightShiftText = (string) ($openAiAnalysis['insight_shift'] ?? '');
        $scriptFlow = (string) ($openAiAnalysis['structure_model'] ?? '');
        $topicAngle = (string) ($openAiAnalysis['content_angle'] ?? '');
        $scriptType = $this->normalizeScriptType(
            (string) ($openAiAnalysis['script_type'] ?? ''),
            (string) ($openAiAnalysis['archetype'] ?? ''),
            $scriptFlow
        );
        $authoritySignals = $this->normalizeAuthoritySignals($openAiAnalysis['authority_signals'] ?? []);

        $analysis = [
            'analysis_version' => (string) config('script_intelligence.analysis_version', 'v2'),
            'analysis_confidence' => $confidence,
            'hook' => (string) ($openAiAnalysis['hook'] ?? ''),
            'hook_text' => $exactHookText ?: (string) ($openAiAnalysis['hook_text'] ?? $openAiAnalysis['hook'] ?? ''),
            'hook_type' => (string) ($openAiAnalysis['hook_type'] ?? $this->inferHookType($exactHookText ?: (string) ($openAiAnalysis['hook'] ?? ''))),
            'topic_angle' => $topicAngle,
            'script_type' => $scriptType,
            'script_origin' => 'video_details',
            'script_flow' => $scriptFlow,
            'mechanism_type' => (string) ($openAiAnalysis['mechanism_type'] ?? ''),
            'psychological_driver' => (string) ($openAiAnalysis['psychological_driver'] ?? ''),
            'insight_shift_text' => $insightShiftText,
            'insight_shift_position' => $this->inferInsightShiftPosition($transcription, $insightShiftText),
            'cta_text' => '',
            'cta_type' => (string) ($openAiAnalysis['cta_type'] ?? ''),
            'closure_type' => (string) ($openAiAnalysis['closure_type'] ?? ''),
            'authority_signals' => $authoritySignals,
            'key_shift' => $this->normalizeKeyShift(
                (string) ($openAiAnalysis['key_shift'] ?? ''),
                $insightShiftText,
                $scriptFlow
            ),
            'transcript_hash' => hash('sha256', mb_strtolower(trim($transcription))),
            'rhythm_profile' => $openAiAnalysis['rhythm_profile'] ?? [],
        ];

        return [
            'analysis' => $analysis,
            'transcript_raw' => $transcription,
            'transcript_cleaned' => $transcription,
            'sentence_list' => [],
            'pattern_dna' => [],
            'signal_snapshot' => [],
            'llm_raw_outputs' => [
                'openai_strategy' => $openAiAnalysis,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $analysis
     */
    private function deriveConfidenceFromLegacyScores(array $analysis): float
    {
        $scoreKeys = [
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

        $scores = [];
        foreach ($scoreKeys as $scoreKey) {
            $rawScore = $analysis[$scoreKey] ?? null;
            if (is_numeric($rawScore)) {
                $scores[] = max(1, min(10, (float) $rawScore));
            }
        }

        if ($scores === []) {
            return 0.0;
        }

        $averageScore = array_sum($scores) / count($scores);

        return round(max(0.1, min(0.99, $averageScore / 10)), 2);
    }

    private function extractOpeningHookText(string $transcription): string
    {
        $cleaned = trim(preg_replace('/[ \t]+/u', ' ', $transcription) ?? $transcription);
        $cleaned = trim(preg_replace('/\R+/u', ' ', $cleaned) ?? $cleaned);

        if ($cleaned === '') {
            return '';
        }

        $sentences = preg_split('/(?<=[.!?।])\s+/u', $cleaned, 2, PREG_SPLIT_NO_EMPTY) ?: [];

        return trim((string) ($sentences[0] ?? $cleaned));
    }

    private function inferHookType(string $hookText): string
    {
        $normalized = mb_strtolower(trim($hookText));
        if ($normalized === '') {
            return '';
        }

        if (str_contains($normalized, '?')) {
            return 'Question Hook';
        }

        if (str_contains($normalized, 'problem') || str_contains($normalized, 'frustrat') || str_contains($normalized, 'struggle')) {
            return 'Pain-Led Hook';
        }

        return 'Statement Hook';
    }

    private function inferInsightShiftPosition(string $transcription, string $insightShiftText): string
    {
        $transcript = trim($transcription);
        $insightShift = trim($insightShiftText);
        if ($transcript === '' || $insightShift === '') {
            return '';
        }

        $index = mb_stripos($transcript, $insightShift);
        if (! is_int($index) || mb_strlen($transcript) === 0) {
            return 'middle';
        }

        $ratio = $index / mb_strlen($transcript);
        if ($ratio < 0.33) {
            return 'start';
        }

        if ($ratio > 0.66) {
            return 'end';
        }

        return 'middle';
    }

    private function applyCtaFallbacks(ContentAnalysis $analysisRecord): void
    {
        $normalizedCtaType = $this->normalizeCtaType(
            (string) ($analysisRecord->cta_type ?? ''),
            (string) ($analysisRecord->transcription ?? ''),
            (string) ($analysisRecord->cta_text ?? ''),
            (string) ($analysisRecord->script_flow ?? '')
        );
        $normalizedCtaText = $this->normalizeCtaText(
            (string) ($analysisRecord->cta_text ?? ''),
            (string) ($analysisRecord->transcription ?? ''),
            $normalizedCtaType
        );

        $updates = [];
        if ((string) ($analysisRecord->cta_type ?? '') !== $normalizedCtaType) {
            $updates['cta_type'] = $normalizedCtaType;
        }

        if ((string) ($analysisRecord->cta_text ?? '') !== $normalizedCtaText) {
            $updates['cta_text'] = $normalizedCtaText;
        }

        if ($updates !== []) {
            $analysisRecord->update($updates);
        }
    }

    private function applyStrategicFieldFallbacks(ContentAnalysis $analysisRecord): void
    {
        $normalizedKeyShift = $this->normalizeKeyShift(
            (string) ($analysisRecord->key_shift ?? ''),
            (string) ($analysisRecord->insight_shift_text ?? ''),
            (string) ($analysisRecord->script_flow ?? '')
        );
        $normalizedShiftPosition = $this->normalizeInsightShiftPosition(
            (string) ($analysisRecord->insight_shift_position ?? ''),
            (string) ($analysisRecord->transcription ?? ''),
            (string) ($analysisRecord->insight_shift_text ?? '')
        );
        $normalizedAuthoritySignals = $this->normalizeAuthoritySignals($analysisRecord->authority_signals ?? []);

        $updates = [];
        if ((string) ($analysisRecord->key_shift ?? '') !== $normalizedKeyShift) {
            $updates['key_shift'] = $normalizedKeyShift;
        }

        if ((string) ($analysisRecord->insight_shift_position ?? '') !== $normalizedShiftPosition) {
            $updates['insight_shift_position'] = $normalizedShiftPosition;
        }

        if (($analysisRecord->authority_signals ?? []) !== $normalizedAuthoritySignals) {
            $updates['authority_signals'] = $normalizedAuthoritySignals;
        }

        if ($updates !== []) {
            $analysisRecord->update($updates);
        }
    }

    private function normalizeCtaType(string $ctaType, string $transcription, string $ctaText, string $scriptFlow): string
    {
        $cleanType = trim($ctaType);
        if ($cleanType !== '' && ! $this->isNoCtaLabel($cleanType)) {
            return $cleanType;
        }

        $searchSpace = mb_strtolower(implode(' ', [$transcription, $ctaText, $scriptFlow]));

        $commentDmKeywords = [
            'comment', 'dm', 'direct message', 'inbox', 'message me', 'send dm',
            'कमेंट', 'कॉमेंट', 'comment में', 'कॉमेंट में', 'dm में', 'डीएम', 'इनबॉक्स', 'मैसेज',
        ];
        if ($this->containsAny($searchSpace, $commentDmKeywords)) {
            return 'Comment/DM CTA';
        }

        $engagementKeywords = [
            'follow', 'subscribe', 'share', 'save', 'like', 'tag', 'mention',
            'फॉलो', 'सब्सक्राइब', 'शेयर', 'सेव', 'लाइक', 'टैग', 'मेंशन',
        ];
        if ($this->containsAny($searchSpace, $engagementKeywords)) {
            return 'Engagement CTA';
        }

        $conversionKeywords = [
            'buy', 'book', 'register', 'signup', 'sign up', 'join', 'download', 'install',
            'link', 'bio', 'click', 'tap', 'try now', 'order', 'demo',
            'खरीद', 'बुक', 'रजिस्टर', 'जॉइन', 'डाउनलोड', 'लिंक', 'बायो', 'क्लिक',
        ];
        if ($this->containsAny($searchSpace, $conversionKeywords)) {
            return 'Conversion CTA';
        }

        return 'No CTA';
    }

    private function normalizeCtaText(string $ctaText, string $transcription, string $ctaType): string
    {
        $cleanText = trim($ctaText);
        if ($cleanText !== '') {
            return $cleanText;
        }

        if ($this->isNoCtaLabel($ctaType)) {
            return '';
        }

        $ctaKeywords = [
            'comment', 'dm', 'message', 'follow', 'subscribe', 'share', 'save',
            'link', 'bio', 'click', 'register', 'join', 'download',
            'कमेंट', 'कॉमेंट', 'डीएम', 'मैसेज', 'फॉलो', 'सब्सक्राइब', 'लिंक', 'डाउनलोड',
        ];

        $sentences = preg_split('/(?<=[\.\!\?\।])\s+/u', trim($transcription)) ?: [];
        foreach (array_reverse($sentences) as $sentence) {
            $normalizedSentence = mb_strtolower(trim((string) $sentence));
            if ($normalizedSentence !== '' && $this->containsAny($normalizedSentence, $ctaKeywords)) {
                return trim((string) $sentence);
            }
        }

        return '';
    }

    private function normalizeKeyShift(string $keyShift, string $insightShiftText, string $scriptFlow): string
    {
        $cleanKeyShift = trim($keyShift);
        if ($cleanKeyShift !== '' && ! $this->isPlaceholderLabel($cleanKeyShift)) {
            return $this->limitText($cleanKeyShift, 220);
        }

        $cleanInsightShift = trim($insightShiftText);
        if ($cleanInsightShift !== '' && ! $this->isPlaceholderLabel($cleanInsightShift)) {
            return $this->limitText($cleanInsightShift, 220);
        }

        return '';
    }

    private function normalizeInsightShiftPosition(string $position, string $transcription, string $insightShiftText): string
    {
        $normalizedPosition = mb_strtolower(trim($position));
        if (in_array($normalizedPosition, ['start', 'beginning'], true)) {
            return 'start';
        }

        if (in_array($normalizedPosition, ['middle', 'mid'], true)) {
            return 'middle';
        }

        if (in_array($normalizedPosition, ['end', 'ending'], true)) {
            return 'end';
        }

        if ($this->isPlaceholderLabel($normalizedPosition)) {
            return $this->inferInsightShiftPosition($transcription, $insightShiftText);
        }

        return $this->inferInsightShiftPosition($transcription, $insightShiftText);
    }

    /**
     * @return array<int, string>
     */
    private function normalizeAuthoritySignals(mixed $authoritySignals): array
    {
        if (is_array($authoritySignals)) {
            if (array_is_list($authoritySignals)) {
                $values = [];
                foreach ($authoritySignals as $signal) {
                    if (! is_scalar($signal)) {
                        continue;
                    }

                    $signalText = trim((string) $signal);
                    if ($signalText !== '' && ! $this->isPlaceholderLabel($signalText)) {
                        $values[] = $signalText;
                    }
                }

                return array_values(array_unique($values));
            }

            $examples = $authoritySignals['examples'] ?? [];
            if (is_array($examples)) {
                return $this->normalizeAuthoritySignals($examples);
            }
        }

        if (is_string($authoritySignals) && trim($authoritySignals) !== '' && ! $this->isPlaceholderLabel($authoritySignals)) {
            return [trim($authoritySignals)];
        }

        return [];
    }

    private function normalizeScriptType(string $scriptType, string $archetype, string $scriptFlow): string
    {
        $cleanScriptType = trim($scriptType);
        if ($cleanScriptType !== '' && ! $this->isPlaceholderLabel($cleanScriptType)) {
            return $this->limitText($cleanScriptType, 120);
        }

        $flow = mb_strtolower(trim($scriptFlow));
        if ($flow !== '') {
            if (str_contains($flow, 'problem-agitate-solution') || str_contains($flow, 'pas')) {
                return 'Problem-Solution';
            }

            if (str_contains($flow, 'story')) {
                return 'Storytelling';
            }

            if (str_contains($flow, 'list')) {
                return 'Listicle';
            }

            if (str_contains($flow, 'demo') || str_contains($flow, 'tool')) {
                return 'Tool Demo';
            }

            return $this->limitText($scriptFlow, 120);
        }

        $cleanArchetype = trim($archetype);
        if ($cleanArchetype !== '' && ! $this->isPlaceholderLabel($cleanArchetype)) {
            return $this->limitText($cleanArchetype, 120);
        }

        return '';
    }

    private function limitText(string $value, int $limit): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }

        if (mb_strlen($trimmed) <= $limit) {
            return $trimmed;
        }

        return rtrim(mb_substr($trimmed, 0, $limit - 1)).'...';
    }

    private function isNoCtaLabel(string $value): bool
    {
        $normalized = mb_strtolower(trim($value));

        return in_array($normalized, ['', 'none', 'n/a', 'na', 'no cta', 'no-cta', 'no_call_to_action'], true);
    }

    private function isPlaceholderLabel(string $value): bool
    {
        $normalized = mb_strtolower(trim($value));
        if ($normalized === '') {
            return true;
        }

        $placeholders = [
            'none',
            'n/a',
            'na',
            'no obvious shift detected',
            'shift position not available yet.',
            'shift position not available yet',
            'no authority signals detected.',
            'no authority signals detected',
            'no clear closure',
            'not available yet',
        ];

        return in_array($normalized, $placeholders, true);
    }

    /**
     * @param  array<int, string>  $needles
     */
    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, mb_strtolower($needle))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get existing transcription or create new one
     * Only transcribes if user has clicked transcribe button
     */
    public function getOrCreateTranscription(Post $post): string
    {
        $existingTranscription = trim((string) ($post->contentAnalysis?->transcription ?? ''));
        if ($existingTranscription !== '') {
            if ($post->contentAnalysis->transcription_status !== 'completed') {
                $post->contentAnalysis->update(['transcription_status' => 'completed']);
            }

            if (! $post->is_transcribed) {
                $post->update(['is_transcribed' => true]);
            }

            return $existingTranscription;
        }

        Log::info("Transcribing post: {$post->id}");

        if (! $post->audio_url) {
            throw new \Exception('No audio URL available for transcription');
        }

        return $this->executeTranscriptionWithRetry($post);
    }

    /**
     * Executes transcription and attempts to refresh the post if a 403 Forbidden error occurs (expired URL).
     */
    protected function executeTranscriptionWithRetry(Post $post, bool $isRetry = false): string
    {
        try {
            // Use configured provider
            $provider = config('ai.defaults.transcription', 'openai');
            Log::info("Using transcription provider: {$provider} (Retry: ".($isRetry ? 'Yes' : 'No').')');

            $transcription = $provider === 'openai'
                ? $this->openaiWhisper->transcribe($post->audio_url)
                : $this->elevenlabs->transcribe($post->audio_url);

            $this->persistTranscription($post, $transcription);

            return $transcription;
        } catch (\Throwable $e) {
            $message = $e->getMessage();
            Log::debug("Transcription catch block reached for post {$post->id}", [
                'message' => $message,
                'is_retry' => $isRetry,
                'has_403' => str_contains($message, '403'),
            ]);

            // Detect 403 Forbidden (Expired URL)
            if (! $isRetry && str_contains($message, '403')) {
                Log::warning("Self-healing: 403 detected for post {$post->id}. Triggering Apify refresh.");

                try {
                    if ($this->instagramScraper->refreshPostSync($post)) {
                        $post->refresh();
                        Log::info("Post {$post->id} refreshed successfully. New audio_url: ".($post->audio_url ?: 'NULL'));

                        return $this->executeTranscriptionWithRetry($post, true);
                    } else {
                        Log::error("Apify refreshPostSync returned false for post {$post->id}");
                    }
                } catch (\Throwable $refreshError) {
                    Log::error('Exception during refreshPostSync: '.$refreshError->getMessage());
                }

                Log::error("Self-healing failed: Post refresh failed for post {$post->id} after 403 error.");
            }

            throw $e;
        }
    }

    protected function persistTranscription(Post $post, string $transcription): void
    {
        $contentAnalysis = $post->contentAnalysis;
        if ($contentAnalysis) {
            $contentAnalysis->update([
                'transcription' => $transcription,
                'transcription_status' => 'completed',
            ]);
        } else {
            $post->contentAnalysis()->create([
                'post_id' => $post->id,
                'transcription' => $transcription,
                'transcription_status' => 'completed',
            ]);
        }

        $post->update(['is_transcribed' => true]);
    }

    /**
     * @param  array<int, mixed>  $arguments
     * @return array<string, mixed>
     */
    private function runContentAiMethod(string $method, array $arguments = []): array
    {
        try {
            return $this->openAiContent->{$method}(...$arguments);
        } catch (\Throwable $exception) {
            Log::warning('OpenAI content method failed, falling back to Gemini.', [
                'method' => $method,
                'error' => $exception->getMessage(),
            ]);

            return $this->gemini->{$method}(...$arguments);
        }
    }
}
