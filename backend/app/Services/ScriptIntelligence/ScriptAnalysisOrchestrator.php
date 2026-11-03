<?php

namespace App\Services\ScriptIntelligence;

class ScriptAnalysisOrchestrator
{
    public function __construct(
        private readonly TranscriptPreprocessor $preprocessor,
        private readonly SignalExtractor $signalExtractor,
        private readonly ScriptTypeClassifier $scriptTypeClassifier,
        private readonly DriverDetector $driverDetector,
        private readonly FlowDetector $flowDetector,
        private readonly HookExtractor $hookExtractor,
        private readonly CtaDetector $ctaDetector,
        private readonly KeyShiftDetector $keyShiftDetector,
        private readonly AngleGenerator $angleGenerator,
        private readonly ClosureDetector $closureDetector,
        private readonly RhythmProfiler $rhythmProfiler,
        private readonly PatternDnaBuilder $patternDnaBuilder,
        private readonly LabelValidator $labelValidator,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function analyze(string $transcript): array
    {
        $preprocessed = $this->preprocessor->preprocess($transcript);
        $signals = $this->signalExtractor->extract($preprocessed);

        $scriptType = $this->scriptTypeClassifier->classify($preprocessed, $signals);
        $driver = $this->driverDetector->detect($preprocessed, $signals, $scriptType['label']);
        $scriptFlow = $this->flowDetector->detect($scriptType['label'], $signals, $preprocessed);

        $hook = $this->hookExtractor->extract($preprocessed, $signals);
        $cta = $this->ctaDetector->detect($preprocessed);
        $cta['cta_type'] = $this->labelValidator->validateCtaType($cta['cta_type'] ?? null);

        $keyShift = $this->keyShiftDetector->detect($preprocessed, $signals);
        $topicAngle = $this->angleGenerator->generate($preprocessed, $signals, $hook, $scriptType['label']);
        $closure = $this->closureDetector->detect($preprocessed, $cta);
        $rhythmProfile = $this->rhythmProfiler->profile($preprocessed, $signals, $cta);

        $authoritySignals = [
            'count' => count((array) ($preprocessed['markers']['authority_keywords'] ?? [])),
            'examples' => array_slice((array) ($preprocessed['markers']['authority_keywords'] ?? []), 0, 3),
        ];

        $analysisConfidence = $this->confidenceFromSignals(
            (float) ($scriptType['confidence'] ?? 0.0),
            (float) ($driver['confidence'] ?? 0.0),
            (float) ($scriptFlow['confidence'] ?? 0.0),
            (float) (($hook['hook_score'] ?? 0.0) / 10),
            (float) (($keyShift['key_shift_score'] ?? 0.0) / 10),
            (float) (($cta['cta_score'] ?? 0.0) / 10),
        );

        $analysis = [
            'hook_text' => (string) ($hook['hook_text'] ?? ''),
            'hook_type' => (string) ($hook['hook_type'] ?? 'Unknown'),
            'topic_angle' => $topicAngle,
            'script_type' => (string) ($scriptType['label'] ?? 'Utility'),
            'script_flow' => (string) ($scriptFlow['label'] ?? ''),
            'mechanism_type' => $this->deriveMechanismType((string) ($scriptType['label'] ?? 'Utility')),
            'psychological_driver' => (string) ($driver['label'] ?? 'Curiosity'),
            'insight_shift_text' => (string) ($keyShift['key_shift_text'] ?? ''),
            'insight_shift_position' => (string) ($keyShift['key_shift_position'] ?? 'none'),
            'cta_text' => (string) ($cta['cta_text'] ?? ''),
            'cta_type' => (string) ($cta['cta_type'] ?? 'No CTA'),
            'closure_type' => (string) ($closure['closure_type'] ?? 'No clear closure'),
            'rhythm_profile' => $rhythmProfile,
            'authority_signals' => $authoritySignals,
            'analysis_confidence' => $analysisConfidence,
            'transcript_hash' => hash('sha256', mb_strtolower(trim((string) ($preprocessed['transcript_cleaned'] ?? '')))),
            'analysis_version' => (string) config('script_intelligence.analysis_version', 'v2'),
        ];

        $analysis['pattern_dna'] = $this->patternDnaBuilder->build($analysis);

        return [
            'transcript_raw' => (string) ($preprocessed['transcript_raw'] ?? ''),
            'transcript_cleaned' => (string) ($preprocessed['transcript_cleaned'] ?? ''),
            'sentence_list' => $preprocessed['sentence_list'] ?? [],
            'dashboard' => [
                'hook' => $analysis['hook_text'],
                'topic_angle' => $analysis['topic_angle'],
                'script_type' => $analysis['script_type'],
                'script_flow' => $analysis['script_flow'],
                'key_shift' => $analysis['insight_shift_text'],
                'call_to_action' => $analysis['cta_type'],
            ],
            'analysis' => $analysis,
            'pattern_dna' => $analysis['pattern_dna'],
            'signal_snapshot' => [
                'markers' => $preprocessed['markers'] ?? [],
                'signals' => $signals,
            ],
            'llm_raw_outputs' => [],
        ];
    }

    private function confidenceFromSignals(float ...$scores): float
    {
        $validScores = array_filter($scores, fn (float $value): bool => $value >= 0.0);

        if ($validScores === []) {
            return 0.0;
        }

        return round(array_sum($validScores) / count($validScores), 2);
    }

    private function deriveMechanismType(string $scriptType): string
    {
        return match ($scriptType) {
            'Tool' => 'Tool explanation',
            'Framework' => 'Step framework',
            'Emotional' => 'Emotional persuasion',
            'Experiential' => 'Experience narrative',
            default => 'Utility walkthrough',
        };
    }
}
