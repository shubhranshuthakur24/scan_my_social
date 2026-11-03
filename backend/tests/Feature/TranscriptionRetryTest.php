<?php

namespace Tests\Feature;

use App\Models\Channel;
use App\Models\Post;
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

class TranscriptionRetryTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_retries_transcription_on_403()
    {
        $channel = Channel::create([
            'handle' => 'testuser',
            'platform' => 'instagram',
        ]);

        $post = Post::create([
            'channel_id' => $channel->id,
            'post_id' => '123',
            'short_code' => 'ABC',
            'audio_url' => 'https://expired.url/audio.mp3',
            'is_transcribed' => false,
        ]);

        $elevenLabs = Mockery::mock(ElevenLabsService::class);
        $scraper = Mockery::mock(InstagramScraperService::class);

        // Use defaults for others
        $openRouter = Mockery::mock(OpenRouterService::class);
        $openAiContent = Mockery::mock(OpenAIService::class);
        $gemini = Mockery::mock(GeminiService::class);
        $openai = Mockery::mock(OpenAIWhisperService::class);
        $scriptOrchestrator = Mockery::mock(ScriptAnalysisOrchestrator::class);

        config(['ai.defaults.transcription' => 'elevenlabs']);

        // First attempt fails with 403
        $elevenLabs->shouldReceive('transcribe')
            ->once()
            ->with($post->audio_url)
            ->andThrow(new \Exception('Failed to download audio for ElevenLabs transcription: 403'));

        // Scraper is called to refresh
        $scraper->shouldReceive('refreshPostSync')
            ->once()
            ->with(Mockery::on(fn ($p) => $p->id === $post->id))
            ->andReturn(true);

        // Second attempt succeeds
        $elevenLabs->shouldReceive('transcribe')
            ->once()
            ->with($post->audio_url)
            ->andReturn('Transcribed text');

        $service = new ContentProcessingService($openRouter, $openAiContent, $gemini, $elevenLabs, $openai, $scraper, $scriptOrchestrator);

        $result = $service->getOrCreateTranscription($post);

        $this->assertEquals('Transcribed text', $result);
        $this->assertTrue($post->fresh()->is_transcribed);
        $this->assertEquals('Transcribed text', $post->fresh()->contentAnalysis->transcription);
    }
}
