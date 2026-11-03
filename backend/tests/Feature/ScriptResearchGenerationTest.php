<?php

namespace Tests\Feature;

use App\Jobs\ResearchScriptBatchJob;
use App\Models\ScriptGenerationBatch;
use App\Models\ScriptResearch;
use App\Models\User;
use App\Services\OpenAIService;
use App\Services\PlanService;
use App\Services\ScriptResearch\ResearchConfidenceService;
use App\Services\ScriptResearch\ScriptResearchService;
use App\Services\ScriptResearch\TopicNormalizer;
use Database\Seeders\ScriptOptionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use LogicException;
use Tests\TestCase;

class ScriptResearchGenerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ScriptOptionsSeeder::class);
        config(['logging.default' => 'stderr']);
    }

    public function test_researched_generation_reserves_live_price_and_queues_research(): void
    {
        Queue::fake();
        $baseCost = PlanService::creditCost('generate_script');
        $user = $this->createUserWithActivePlan($baseCost + 50);

        $response = $this->actingAs($user)->postJson('/api/scripts/generate', [
            'mode' => 'fresh',
            'topic' => 'ChatGPT vs Gemini',
            'platform' => 'instagram_reel',
            'audience' => 'Creators',
            'primary_problem' => 'Choosing the right AI tool',
            'objective' => 'build_authority',
            'tone_mode' => 'manual',
            'tone' => 'Informative',
            'hook_mode' => 'manual',
            'cta_mode' => 'manual',
            'content_mix' => [
                'educate' => 80,
                'entertain' => 10,
                'emotion' => 10,
            ],
            'length' => '45s',
            'language' => 'English',
            'hook_type' => 'problem_setup',
            'cta_type' => 'follow_cta',
            'research_enabled' => true,
            'research_intent' => 'opinion',
            'research_tier' => 'lite',
        ]);

        $response->assertOk()
            ->assertJsonPath('batch.research_intent', 'opinion')
            ->assertJsonPath('batch.research_intent_mode', 'manual')
            ->assertJsonPath('batch.comparison_topic', true)
            ->assertJsonPath('scripts.0.status', 'researching');

        $batchId = $response->json('batch.id');
        $this->assertDatabaseHas('script_generation_batches', [
            'id' => $batchId,
            'normalized_topic' => 'chatgpt | gemini',
            'research_reserved_cost' => 20,
            'status' => 'researching',
        ]);
        $this->assertSame(30, $user->fresh()->credits);
        Queue::assertPushed(ResearchScriptBatchJob::class);
    }

    public function test_auto_research_intent_uses_the_complete_brief_and_persists_its_mode(): void
    {
        Queue::fake();
        $baseCost = PlanService::creditCost('generate_script');
        $user = $this->createUserWithActivePlan($baseCost + 20);

        $payload = [
            'mode' => 'fresh',
            'topic' => 'AI coaching tools',
            'platform' => 'instagram_reel',
            'audience' => 'Independent coaches',
            'primary_problem' => 'Unverified performance claims',
            'objective' => 'build_authority',
            'tone_mode' => 'ai',
            'hook_mode' => 'ai',
            'cta_mode' => 'ai',
            'content_mix' => [
                'educate' => 80,
                'entertain' => 10,
                'emotion' => 10,
            ],
            'length' => '45s',
            'language' => 'English',
            'research_enabled' => true,
            'research_intent' => 'auto',
            'research_tier' => 'lite',
            'proof_points' => 'Fact check the evidence behind these claims.',
        ];

        $response = $this->actingAs($user)
            ->postJson(route('api.scripts.generate'), $payload)
            ->assertOk()
            ->assertJsonPath('batch.research_intent', 'investigative')
            ->assertJsonPath('batch.research_intent_mode', 'auto');

        $this->assertDatabaseHas('script_generation_batches', [
            'id' => $response->json('batch.id'),
            'research_intent' => 'investigative',
            'research_intent_mode' => 'auto',
        ]);
        Queue::assertPushed(ResearchScriptBatchJob::class);
    }

    public function test_cache_key_uses_canonical_topic_and_excludes_comparison_metadata(): void
    {
        $user = User::factory()->create();
        $normalizer = new TopicNormalizer;
        $firstTopic = $normalizer->normalize('ChatGPT vs Gemini');
        $secondTopic = $normalizer->normalize('Difference between Gemini and ChatGPT');

        $first = $this->makeBatch($user, $firstTopic['normalized_topic'], true);
        $second = $this->makeBatch($user, $secondTopic['normalized_topic'], false);
        $service = new ScriptResearchService(
            $this->createMock(OpenAIService::class),
            new ResearchConfidenceService
        );

        $currentKey = $service->cacheKey($first);
        $this->assertSame($currentKey, $service->cacheKey($second));

        config(['script_research.version' => 99]);
        $this->assertNotSame($currentKey, $service->cacheKey($first));
    }

    public function test_public_research_content_is_immutable_but_lifecycle_is_mutable(): void
    {
        $artifact = $this->makeResearch();

        $artifact->update(['state' => 'expired']);
        $this->assertSame('expired', $artifact->fresh()->state);

        $this->expectException(LogicException::class);
        $artifact->update(['summary' => ['topic_summary' => 'Rewritten']]);
    }

    public function test_cleanup_expires_freshness_and_preserves_referenced_evidence(): void
    {
        $user = User::factory()->create();
        $artifact = $this->makeResearch([
            'fresh_until' => now()->subDays(100),
            'researched_at' => now()->subDays(101),
        ]);
        $batch = $this->makeBatch($user, 'stable topic', false, $artifact);
        $user->generatedScripts()->create([
            'batch_id' => $batch->id,
            'title' => 'Historical script',
            'script' => 'Historical evidence.',
            'status' => 'completed',
            'generation_mode' => 'fresh',
        ]);

        $this->artisan('script-research:cleanup')->assertSuccessful();

        $this->assertDatabaseHas('script_researches', [
            'id' => $artifact->id,
            'state' => 'expired',
            'is_historical' => true,
            'reference_count' => 1,
        ]);
    }

    public function test_resume_requires_new_evidence_and_cannot_resume_a_blocked_batch(): void
    {
        Queue::fake();
        $user = $this->createUserWithActivePlan(100);
        $batch = $this->makeBatch($user, 'semiconductor restrictions', false);
        $batch->update([
            'status' => 'needs_input',
            'research_status' => 'needs_input',
            'research_attempts' => 1,
        ]);

        $this->actingAs($user)
            ->postJson("/api/script-batches/{$batch->id}/resume", [])
            ->assertUnprocessable();

        $this->actingAs($user)
            ->postJson("/api/script-batches/{$batch->id}/resume", [
                'user_facts' => ['Our internal survey found a change.'],
            ])
            ->assertOk();

        Queue::assertPushed(ResearchScriptBatchJob::class);

        $batch->refresh()->update([
            'status' => 'research_blocked',
            'research_status' => 'blocked',
            'research_attempts' => 2,
        ]);

        $this->actingAs($user)
            ->postJson("/api/script-batches/{$batch->id}/resume", [
                'source_urls' => ['https://example.com/evidence'],
            ])
            ->assertUnprocessable();
    }

    private function createUserWithActivePlan(int $credits): User
    {
        $user = User::factory()->create(['credits' => $credits]);
        $user->subscriptions()->create([
            'name' => 'pro',
            'razorpay_id' => 'sub_test_'.uniqid(),
            'razorpay_plan_id' => 'plan_test_pro',
            'status' => 'active',
        ]);

        return $user->fresh();
    }

    private function makeBatch(
        User $user,
        string $normalizedTopic,
        bool $comparison,
        ?ScriptResearch $research = null
    ): ScriptGenerationBatch {
        return $user->scriptGenerationBatches()->create([
            'script_research_id' => $research?->id,
            'original_topic' => 'ChatGPT vs Gemini',
            'normalized_topic' => $normalizedTopic,
            'status' => 'researching',
            'research_status' => 'queued',
            'research_enabled' => true,
            'research_intent' => 'educational',
            'research_tier' => 'lite',
            'comparison_topic' => $comparison,
            'creative_brief' => [
                'language' => 'English',
                'locale' => 'en-US',
                'proof_points' => null,
            ],
            'variant_count' => 1,
            'base_cost' => 50,
            'research_reserved_cost' => 20,
            'total_reserved_cost' => 70,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeResearch(array $overrides = []): ScriptResearch
    {
        return ScriptResearch::query()->create(array_merge([
            'cache_key' => str_repeat('a', 64),
            'original_topic' => 'Topic',
            'normalized_topic' => 'topic',
            'intent' => 'educational',
            'language' => 'English',
            'locale' => 'en-US',
            'tier' => 'lite',
            'research_version' => 1,
            'state' => 'active',
            'confidence_score' => 84,
            'confidence_label' => 'high',
            'summary' => ['topic_summary' => 'Original'],
            'provider' => 'openai',
            'provider_version' => 'responses-web-search-v1',
            'model' => 'test-model',
            'usage' => ['input_tokens' => 10],
            'duration_ms' => 100,
            'researched_at' => now(),
            'fresh_until' => now()->addDay(),
            'completed_at' => now(),
        ], $overrides));
    }
}
