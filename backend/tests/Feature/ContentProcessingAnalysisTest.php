<?php

namespace Tests\Feature;

use App\Models\ContentAnalysis;
use App\Models\Post;
use App\Models\User;
use App\Services\ContentProcessingService;
use App\Services\ElevenLabsService;
use App\Services\GeminiService;
use App\Services\InstagramScraperService;
use App\Services\OpenAIService;
use App\Services\OpenAIWhisperService;
use App\Services\OpenRouterService;
use App\Services\ScriptIntelligence\ScriptAnalysisOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class ContentProcessingAnalysisTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_preserves_original_language_opening_hook_for_new_fallback_analyses(): void
    {
        $transcript = 'तुम कोडिंग करते वक्त एआई एजेंट्स यूज तो करते हो, पर एक टाइम पे एक ही टास्क होने से तुम्हारा पूरा प्रोजेक्ट स्लो हो जाता है, राइट। और महंगे एआई मॉडल्स भी कांप्लेक्स बग्स आने पर अटक जाते हैं। अब इन नॉर्मल एआई टूल्स को भूल जाओ।';
        $expectedHook = 'तुम कोडिंग करते वक्त एआई एजेंट्स यूज तो करते हो, पर एक टाइम पे एक ही टास्क होने से तुम्हारा पूरा प्रोजेक्ट स्लो हो जाता है, राइट।';

        $user = User::factory()->create();
        $post = Post::create([
            'post_id' => 'analysis-hook-preserve-test',
            'platform' => 'instagram',
            'is_transcribed' => true,
        ]);

        ContentAnalysis::create([
            'post_id' => $post->id,
            'transcription' => $transcript,
            'transcription_status' => 'completed',
            'analysis_status' => 'idle',
        ]);

        $scriptAnalysisOrchestrator = Mockery::mock(ScriptAnalysisOrchestrator::class);
        $scriptAnalysisOrchestrator->shouldReceive('analyze')
            ->once()
            ->with($transcript)
            ->andReturn([
                'analysis' => [
                    'analysis_confidence' => 0.3,
                    'script_flow' => 'No clear closure',
                    'insight_shift_text' => '',
                    'closure_type' => 'No clear closure',
                    'key_shift' => '',
                ],
                'transcript_raw' => $transcript,
                'transcript_cleaned' => $transcript,
                'sentence_list' => [],
                'pattern_dna' => [],
                'signal_snapshot' => [],
                'llm_raw_outputs' => [],
            ]);

        $openAiContent = Mockery::mock(OpenAIService::class);
        $openAiContent->shouldReceive('analyzeStrategy')
            ->once()
            ->with($transcript, 'English')
            ->andReturn([
                'hook' => 'Pain-first contrast hook; opens with a real dev bottleneck.',
                'hook_text' => 'Pain-first contrast hook; opens with a real dev bottleneck.',
                'hook_type' => 'Pain-point / contrast hook',
                'content_angle' => 'Replace single-agent coding with parallel AI agents.',
                'topic_angle' => 'Replace single-agent coding with parallel AI agents.',
                'script_type' => 'Tool discovery / benchmark-backed recommendation',
                'structure_model' => 'Pain -> proof -> mechanism -> CTA',
                'mechanism_type' => 'Parallel AI agents coding, debugging, and testing together.',
                'psychological_driver' => 'Speed, efficiency, and FOMO.',
                'insight_shift' => 'Parallel agents unlock speed.',
                'key_shift' => 'Single-agent coding is enough -> parallel agents unlock speed',
                'cta_type' => 'Comment CTA',
                'cta_text' => 'Comment "वाइब" and I will send the link.',
                'closure_type' => 'Community keyword gate',
                'authority_signals' => ['SWE-bench score 76.1%'],
                'rhythm_profile' => [],
                'hook_score' => 8,
                'content_angle_score' => 8,
                'psychological_driver_score' => 8,
                'structure_model_score' => 8,
                'mechanism_type_score' => 8,
                'insight_shift_score' => 8,
                'rhythm_profile_score' => 8,
                'cta_type_score' => 8,
                'closure_type_score' => 8,
                'archetype_score' => 8,
            ]);

        $service = new ContentProcessingService(
            Mockery::mock(OpenRouterService::class),
            $openAiContent,
            Mockery::mock(GeminiService::class),
            Mockery::mock(ElevenLabsService::class),
            Mockery::mock(OpenAIWhisperService::class),
            Mockery::mock(InstagramScraperService::class),
            $scriptAnalysisOrchestrator,
        );

        $result = $service->analyze($post->fresh('contentAnalysis'), $user->id, 'English');

        $this->assertSame($expectedHook, $result['hook_text']);
        $this->assertDatabaseHas('content_analyses', [
            'post_id' => $post->id,
            'hook_text' => $expectedHook,
        ]);
    }
}
