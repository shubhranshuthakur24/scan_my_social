<?php

namespace Tests\Feature;

use App\Jobs\GenerateScriptAnglesJob;
use App\Jobs\GenerateScriptJob;
use App\Models\GeneratedScript;
use App\Models\ScriptGenerationBatch;
use App\Models\User;
use App\Services\GeminiService;
use App\Services\OpenAIService;
use App\Services\PlanService;
use App\Services\ScriptEngine\ScriptContextBuilder;
use App\Services\ScriptRecreationService;
use Database\Seeders\ScriptOptionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ViralScriptEngineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ScriptOptionsSeeder::class);
        config(['logging.default' => 'stderr']);
    }

    public function test_fresh_brief_requires_a_content_mix_total_of_one_hundred(): void
    {
        $user = $this->createUserWithActivePlan(100);
        $payload = $this->validPayload();
        $payload['content_mix']['emotion'] = 20;

        $this->actingAs($user)
            ->postJson(route('api.scripts.generate'), $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content_mix');
    }

    public function test_active_user_can_open_the_viral_script_create_page(): void
    {
        $user = $this->createUserWithActivePlan(100);

        $this->actingAs($user)
            ->get(route('scripts.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Scripts/Create')
                ->has('engineOptions.platforms', 5)
                ->has('engineOptions.objectives', 6)
                ->has('engineOptions.contentMixPresets', 5));
    }

    public function test_only_the_batch_owner_can_open_the_script_build_page(): void
    {
        $owner = $this->createUserWithActivePlan(100);
        $otherUser = $this->createUserWithActivePlan(100);
        $batch = $this->makeBatch($owner, ['status' => 'awaiting_angle']);
        $this->makeScript($batch, ['status' => 'awaiting_angle']);

        $this->actingAs($owner)
            ->get(route('scripts.build', $batch))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Scripts/Build')
                ->where('batch.id', $batch->id));

        $this->actingAs($otherUser)
            ->get(route('scripts.build', $batch))
            ->assertForbidden();
    }

    public function test_fresh_brief_creates_one_workflow_batch_and_queues_angle_generation(): void
    {
        Queue::fake();
        $cost = PlanService::creditCost('generate_script');
        $user = $this->createUserWithActivePlan($cost + 20);

        $response = $this->actingAs($user)
            ->postJson(route('api.scripts.generate'), $this->validPayload())
            ->assertOk()
            ->assertJsonPath('batch.status', 'generating_angles')
            ->assertJsonPath('batch.tone_mode', 'ai')
            ->assertJsonPath('batch.hook_mode', 'ai')
            ->assertJsonPath('batch.cta_mode', 'ai');

        $batchId = $response->json('batch.id');
        $this->assertDatabaseHas('script_generation_batches', [
            'id' => $batchId,
            'workflow_version' => 'viral-engine-v1',
            'audience' => 'Independent coaches',
            'primary_problem' => 'Low engagement',
            'objective' => 'go_viral',
            'platform' => 'instagram_reel',
            'variant_count' => 1,
        ]);
        $this->assertDatabaseCount('generated_scripts', 1);
        $this->assertSame(20, $user->fresh()->credits);
        Queue::assertPushed(GenerateScriptAnglesJob::class);
    }

    public function test_angle_job_persists_exactly_five_distinct_angles(): void
    {
        $batch = $this->makeBatch();
        $this->makeScript($batch);
        $angles = collect(range(1, 5))->map(fn (int $index): array => [
            'title' => "Angle {$index}",
            'explanation' => "Distinct framing {$index}",
            'expected_outcome' => "Outcome {$index}",
        ])->all();

        $openAi = $this->createMock(OpenAIService::class);
        $openAi->expects($this->once())
            ->method('generateScriptAngles')
            ->with($this->callback(fn (array $context): bool => $context['language'] === 'Hinglish'))
            ->willReturn(['angles' => $angles]);

        (new GenerateScriptAnglesJob($batch))->handle(
            $openAi,
            $this->createMock(GeminiService::class)
        );

        $this->assertDatabaseCount('script_angles', 5);
        $this->assertSame('awaiting_angle', $batch->fresh()->status);
        $this->assertSame('awaiting_angle', $batch->scripts()->firstOrFail()->status);
    }

    public function test_angle_provider_prompts_require_the_selected_language_for_every_visible_field(): void
    {
        $context = [
            'topic' => 'AI marketing for coaches',
            'audience' => 'Independent coaches',
            'primary_problem' => 'Low conversions',
            'objective' => 'generate_leads',
            'platform' => 'instagram_reel',
            'language' => 'Hinglish',
            'content_mix' => ['educate' => 40, 'entertain' => 30, 'emotion' => 30],
        ];

        $openAi = new class extends OpenAIService
        {
            public string $capturedPrompt = '';

            public function generateContent(string $prompt, bool $jsonMode = false, float $temperature = 0.7): array
            {
                $this->capturedPrompt = $prompt;

                return ['angles' => []];
            }
        };
        $gemini = new class extends GeminiService
        {
            public string $capturedPrompt = '';

            public function generateContent(string $prompt, bool $jsonMode = false, float $temperature = 0.7): array
            {
                $this->capturedPrompt = $prompt;

                return ['angles' => []];
            }
        };

        $openAi->generateScriptAngles($context);
        $gemini->generateScriptAngles($context);

        foreach ([$openAi->capturedPrompt, $gemini->capturedPrompt] as $prompt) {
            $this->assertStringContainsString('every user-visible angle field in Hinglish', $prompt);
            $this->assertStringContainsString('title, explanation, and expected_outcome', $prompt);
            $this->assertStringContainsString('natural conversational Hindi-English mix written in Roman script', $prompt);
            $this->assertStringContainsString('do not return English-only prose', $prompt);
        }
    }

    public function test_user_can_select_an_owned_angle_once_and_queue_script_generation(): void
    {
        Queue::fake();
        $user = $this->createUserWithActivePlan(100);
        $batch = $this->makeBatch($user, ['status' => 'awaiting_angle']);
        $script = $this->makeScript($batch, ['status' => 'awaiting_angle']);
        $angle = $batch->angles()->create([
            'title' => 'Contrarian diagnosis',
            'explanation' => 'Challenge the common assumption.',
            'expected_outcome' => 'More comments and shares.',
            'position' => 1,
        ]);

        $this->actingAs($user)
            ->postJson(route('api.script-batches.angles.select', [$batch, $angle]))
            ->assertOk();

        $this->assertTrue($angle->fresh()->is_selected);
        $this->assertSame($angle->id, $batch->fresh()->selected_angle_id);
        $this->assertSame('generating_script', $batch->fresh()->status);
        $this->assertSame($angle->id, $script->fresh()->script_angle_id);
        Queue::assertPushed(GenerateScriptJob::class, 1);

        $this->actingAs($user)
            ->postJson(route('api.script-batches.angles.select', [$batch, $angle]))
            ->assertOk();
        Queue::assertPushed(GenerateScriptJob::class, 1);
    }

    public function test_user_cannot_select_an_angle_from_another_users_batch(): void
    {
        $owner = $this->createUserWithActivePlan(100);
        $otherUser = $this->createUserWithActivePlan(100);
        $batch = $this->makeBatch($owner, ['status' => 'awaiting_angle']);
        $this->makeScript($batch, ['status' => 'awaiting_angle']);
        $angle = $batch->angles()->create([
            'title' => 'Owned angle',
            'explanation' => 'Only the owner can select this.',
            'expected_outcome' => 'Secure ownership.',
            'position' => 1,
        ]);

        $this->actingAs($otherUser)
            ->postJson(route('api.script-batches.angles.select', [$batch, $angle]))
            ->assertForbidden();
    }

    public function test_manual_creative_controls_are_included_in_the_script_context(): void
    {
        $batch = $this->makeBatch(overrides: [
            'tone_mode' => 'manual',
            'tone' => 'Authoritative',
            'hook_mode' => 'manual',
            'hook_type' => 'problem_setup',
            'cta_mode' => 'manual',
            'cta_type' => 'dm_cta',
        ]);
        $angle = $batch->angles()->create([
            'title' => 'Manual strategy',
            'explanation' => 'Use the selected manual controls.',
            'expected_outcome' => 'Qualified direct messages.',
            'position' => 1,
            'is_selected' => true,
        ]);
        $batch->update(['selected_angle_id' => $angle->id]);

        $context = app(ScriptContextBuilder::class)->build($batch->fresh());

        $this->assertSame('manual', $context['tone']['mode']);
        $this->assertSame('Authoritative', $context['tone']['value']);
        $this->assertSame('problem_setup', $context['hook']['type']);
        $this->assertStringContainsString('pain point', $context['hook']['instruction']);
        $this->assertSame('dm_cta', $context['cta']['type']);
        $this->assertStringContainsString('DM', $context['cta']['instruction']);
    }

    public function test_quality_gate_applies_one_corrective_rewrite_and_saves_structured_output(): void
    {
        $batch = $this->makeBatch(overrides: ['status' => 'generating_script']);
        $angle = $batch->angles()->create([
            'title' => 'Retention gap',
            'explanation' => 'Show why useful content still loses attention.',
            'expected_outcome' => 'Higher saves and shares.',
            'position' => 1,
            'is_selected' => true,
        ]);
        $batch->update(['selected_angle_id' => $angle->id]);
        $script = $this->makeScript($batch, [
            'script_angle_id' => $angle->id,
            'status' => 'processing',
        ]);

        $openAi = $this->createMock(OpenAIService::class);
        $openAi->expects($this->once())
            ->method('generateViralScript')
            ->willReturn([
                'title' => 'Stop Losing Attention',
                'script' => 'Original draft.',
                'suggested_hook' => 'Your useful content is still losing viewers.',
                'suggested_cta' => 'Save this and audit your next post.',
                'why_angle_works' => 'It reframes the audience problem as a retention issue.',
            ]);
        $openAi->expects($this->once())
            ->method('critiqueAndPolish')
            ->willReturn([
                'overallScore' => 7.5,
                'scores' => ['hookStrength' => 8, 'retention' => 7],
                'criticalChecks' => [
                    'supportedFacts' => true,
                    'correctLanguage' => true,
                    'validDuration' => true,
                    'allowedFormatting' => true,
                    'safeContent' => true,
                    'ctaPresent' => true,
                    'platformCompliant' => true,
                    'contentMixAligned' => true,
                ],
                'strengths' => ['Clear problem framing.'],
                'improvements' => ['Tighten the middle.'],
                'revisedScript' => 'Corrected final script.',
            ]);

        (new GenerateScriptJob($script, ['mode' => 'viral_engine'], 50, false))->handle(
            $openAi,
            $this->createMock(GeminiService::class),
            app(ScriptRecreationService::class),
            app(ScriptContextBuilder::class)
        );

        $script->refresh();
        $this->assertSame('completed', $script->status);
        $this->assertSame('Original draft.', $script->draft_script);
        $this->assertSame('Corrected final script.', $script->script);
        $this->assertTrue($script->corrective_rewrite_applied);
        $this->assertSame('Your useful content is still losing viewers.', $script->suggested_hook);
        $this->assertSame('Save this and audit your next post.', $script->suggested_cta);
        $this->assertSame('completed', $batch->fresh()->status);
    }

    /**
     * @return array<string, mixed>
     */
    private function validPayload(): array
    {
        return [
            'mode' => 'fresh',
            'topic' => 'Why useful content still loses attention',
            'audience' => 'Independent coaches',
            'primary_problem' => 'Low engagement',
            'objective' => 'go_viral',
            'platform' => 'instagram_reel',
            'language' => 'Hinglish',
            'length' => '45s',
            'content_mix' => [
                'educate' => 40,
                'entertain' => 30,
                'emotion' => 30,
            ],
            'tone_mode' => 'ai',
            'hook_mode' => 'ai',
            'cta_mode' => 'ai',
            'research_enabled' => false,
        ];
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeBatch(?User $user = null, array $overrides = []): ScriptGenerationBatch
    {
        $user ??= $this->createUserWithActivePlan(100);

        return $user->scriptGenerationBatches()->create(array_merge([
            'original_topic' => 'Why useful content still loses attention',
            'normalized_topic' => 'why useful content still loses attention',
            'workflow_version' => 'viral-engine-v1',
            'audience' => 'Independent coaches',
            'primary_problem' => 'Low engagement',
            'objective' => 'go_viral',
            'platform' => 'instagram_reel',
            'language' => 'Hinglish',
            'output_length' => '45s',
            'content_mix' => ['educate' => 40, 'entertain' => 30, 'emotion' => 30],
            'communication_style' => 'single_viewer',
            'tone_mode' => 'ai',
            'hook_mode' => 'ai',
            'cta_mode' => 'ai',
            'status' => 'generating_angles',
            'research_status' => 'not_requested',
            'research_enabled' => false,
            'research_tier' => 'lite',
            'comparison_topic' => false,
            'creative_brief' => [],
            'variant_count' => 1,
            'base_cost' => 50,
            'total_reserved_cost' => 50,
            'credit_state' => 'settled',
            'credits_settled_at' => now(),
        ], $overrides));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeScript(ScriptGenerationBatch $batch, array $overrides = []): GeneratedScript
    {
        return $batch->user->generatedScripts()->create(array_merge([
            'batch_id' => $batch->id,
            'title' => 'Generating angles...',
            'script' => 'Please wait.',
            'suggested_topic' => $batch->original_topic,
            'estimated_duration' => $batch->output_length,
            'status' => 'processing',
            'generation_mode' => 'fresh',
            'script_origin' => 'script_page',
        ], $overrides));
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
}
