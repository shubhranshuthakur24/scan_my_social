<?php

namespace Tests\Feature;

use App\Jobs\GenerateScriptAnglesJob;
use App\Jobs\GenerateScriptJob;
use App\Models\ContentAnalysis;
use App\Models\GeneratedScript;
use App\Models\User;
use App\Services\PlanService;
use Database\Seeders\ScriptOptionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ScriptGenerationModesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ScriptOptionsSeeder::class);

        config(['logging.default' => 'stderr']);
    }

    public function test_fresh_script_generation_enqueues_job_with_fresh_mode(): void
    {
        Queue::fake();

        $cost = PlanService::creditCost('generate_script');
        $user = $this->createUserWithActivePlan($cost + 20);

        $response = $this->actingAs($user)->postJson('/api/scripts/generate', [
            'mode' => 'fresh',
            'topic' => 'AI hooks for coaches',
            'platform' => 'instagram_reel',
            'audience' => 'Coaches in India',
            'primary_problem' => 'Low engagement',
            'objective' => 'go_viral',
            'tone_mode' => 'ai',
            'hook_mode' => 'ai',
            'cta_mode' => 'ai',
            'content_mix' => [
                'educate' => 40,
                'entertain' => 30,
                'emotion' => 30,
            ],
            'length' => '45s',
            'language' => 'Hinglish',
        ]);

        $response->assertOk()->assertJson(['success' => true]);
        $scriptId = $response->json('scripts.0.id');

        $this->assertNotNull($scriptId);
        $this->assertDatabaseHas('generated_scripts', [
            'id' => $scriptId,
            'user_id' => $user->id,
            'generation_mode' => 'fresh',
            'status' => 'processing',
        ]);

        Queue::assertPushed(GenerateScriptAnglesJob::class);
    }

    public function test_recreate_script_generation_enqueues_job_with_recreate_mode(): void
    {
        Queue::fake();

        $cost = PlanService::creditCost('generate_script');
        $user = $this->createUserWithActivePlan($cost + 20);
        $analysis = ContentAnalysis::create([
            'transcription' => 'Original transcript',
            'hook_score' => 8,
            'script_type' => 'Framework',
            'script_flow' => 'Numbered Steps',
            'cta_type' => 'Comment CTA',
            'analysis_version' => 'v2',
        ]);

        $sourceScript = GeneratedScript::create([
            'title' => 'Source Script',
            'script' => 'Source script content',
            'status' => 'completed',
        ]);
        $sourceScript->forceFill([
            'user_id' => $user->id,
            'content_analysis_id' => $analysis->id,
        ])->save();

        $response = $this->actingAs($user)->postJson('/api/scripts/generate', [
            'mode' => 'recreate',
            'topic' => 'AI hooks for founders',
            'source_script_id' => $sourceScript->id,
            'recreation_mode' => 'balanced',
            'objective' => 'get_more_followers',
            'desired_cta_type' => 'follow_cta',
            'brand_input' => 'Scan My Social',
            'offer' => 'Free audit',
            'audience' => 'Founders',
            'language' => 'English',
        ]);

        $response->assertOk()->assertJson(['success' => true]);
        $scriptId = $response->json('scripts.0.id');

        $this->assertNotNull($scriptId);
        $this->assertDatabaseHas('generated_scripts', [
            'id' => $scriptId,
            'user_id' => $user->id,
            'generation_mode' => 'recreate',
            'recreation_mode' => 'balanced',
            'source_analysis_id' => $analysis->id,
            'cta_objective' => 'get_more_followers',
            'status' => 'processing',
        ]);

        Queue::assertPushed(GenerateScriptJob::class);
    }

    public function test_fresh_script_generation_rejects_multiple_variants(): void
    {
        Queue::fake();

        $cost = PlanService::creditCost('generate_script');
        $variants = 2;
        $initialCredits = ($cost * $variants) + 20;
        $user = $this->createUserWithActivePlan($initialCredits);

        $response = $this->actingAs($user)->postJson('/api/scripts/generate', [
            'mode' => 'fresh',
            'topic' => 'AI hooks for coaches',
            'platform' => 'instagram_reel',
            'audience' => 'Coaches in India',
            'primary_problem' => 'Low engagement',
            'objective' => 'go_viral',
            'tone_mode' => 'ai',
            'hook_mode' => 'ai',
            'cta_mode' => 'ai',
            'content_mix' => [
                'educate' => 40,
                'entertain' => 30,
                'emotion' => 30,
            ],
            'length' => '45s',
            'language' => 'Hinglish',
            'variants' => $variants,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('variants');
        $this->assertSame($initialCredits, $user->fresh()->credits);
        Queue::assertNothingPushed();
    }

    private function createUserWithActivePlan(int $credits): User
    {
        $user = User::factory()->create();
        $user->forceFill(['credits' => $credits])->save();
        $user->subscriptions()->create([
            'name' => 'pro',
            'razorpay_id' => 'sub_test_'.uniqid(),
            'razorpay_plan_id' => 'plan_test_pro',
            'status' => 'active',
            'ends_at' => null,
        ]);

        return $user->fresh();
    }
}
