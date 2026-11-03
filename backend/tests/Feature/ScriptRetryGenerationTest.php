<?php

namespace Tests\Feature;

use App\Jobs\GenerateScriptAnglesJob;
use App\Jobs\ResearchScriptBatchJob;
use App\Models\GeneratedScript;
use App\Models\ScriptGenerationBatch;
use App\Models\User;
use Database\Seeders\ScriptOptionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ScriptRetryGenerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ScriptOptionsSeeder::class);
        config(['logging.default' => 'stderr']);
    }

    public function test_retry_requires_authentication(): void
    {
        $batch = ScriptGenerationBatch::query()->create([
            'user_id' => User::factory()->create()->id,
            'status' => 'failed',
            'original_topic' => 'Topic',
            'normalized_topic' => 'topic',
            'audience' => 'Audience',
            'primary_problem' => 'Problem',
            'objective' => 'go_viral',
            'platform' => 'instagram_reel',
            'language' => 'English',
            'output_length' => '30s',
            'content_mix' => ['educate' => 100, 'entertain' => 0, 'emotion' => 0],
            'tone_mode' => 'ai',
            'hook_mode' => 'ai',
            'cta_mode' => 'ai',
            'variant_count' => 1,
            'base_cost' => 50,
            'research_reserved_cost' => 0,
            'total_reserved_cost' => 50,
        ]);

        $response = $this->postJson("/api/script-batches/{$batch->id}/retry");
        $response->assertStatus(401);
    }

    public function test_retry_requires_ownership(): void
    {
        $userOne = $this->createUserWithActivePlan(100);
        $userTwo = $this->createUserWithActivePlan(100);

        $batch = ScriptGenerationBatch::query()->create([
            'user_id' => $userOne->id,
            'status' => 'failed',
            'original_topic' => 'Topic',
            'normalized_topic' => 'topic',
            'audience' => 'Audience',
            'primary_problem' => 'Problem',
            'objective' => 'go_viral',
            'platform' => 'instagram_reel',
            'language' => 'English',
            'output_length' => '30s',
            'content_mix' => ['educate' => 100, 'entertain' => 0, 'emotion' => 0],
            'tone_mode' => 'ai',
            'hook_mode' => 'ai',
            'cta_mode' => 'ai',
            'variant_count' => 1,
            'base_cost' => 50,
            'research_reserved_cost' => 0,
            'total_reserved_cost' => 50,
        ]);

        $response = $this->actingAs($userTwo)->postJson("/api/script-batches/{$batch->id}/retry");
        $response->assertStatus(403);
    }

    public function test_retry_requires_failed_batch(): void
    {
        $user = $this->createUserWithActivePlan(100);

        $batch = ScriptGenerationBatch::query()->create([
            'user_id' => $user->id,
            'status' => 'completed',
            'original_topic' => 'Topic',
            'normalized_topic' => 'topic',
            'audience' => 'Audience',
            'primary_problem' => 'Problem',
            'objective' => 'go_viral',
            'platform' => 'instagram_reel',
            'language' => 'English',
            'output_length' => '30s',
            'content_mix' => ['educate' => 100, 'entertain' => 0, 'emotion' => 0],
            'tone_mode' => 'ai',
            'hook_mode' => 'ai',
            'cta_mode' => 'ai',
            'variant_count' => 1,
            'base_cost' => 50,
            'research_reserved_cost' => 0,
            'total_reserved_cost' => 50,
        ]);

        $response = $this->actingAs($user)->postJson("/api/script-batches/{$batch->id}/retry");
        $response->assertStatus(422)
            ->assertJsonPath('message', 'This generation batch is not in a failed state.');
    }

    public function test_retry_deducts_credits_and_restarts_research_stage(): void
    {
        Queue::fake();
        $user = $this->createUserWithActivePlan(100);

        $batch = ScriptGenerationBatch::query()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'original_topic' => 'Topic',
            'normalized_topic' => 'topic',
            'audience' => 'Audience',
            'primary_problem' => 'Problem',
            'objective' => 'go_viral',
            'platform' => 'instagram_reel',
            'language' => 'English',
            'output_length' => '30s',
            'content_mix' => ['educate' => 100, 'entertain' => 0, 'emotion' => 0],
            'tone_mode' => 'ai',
            'hook_mode' => 'ai',
            'cta_mode' => 'ai',
            'research_enabled' => true,
            'variant_count' => 1,
            'base_cost' => 50,
            'research_reserved_cost' => 20,
            'total_reserved_cost' => 70,
            'credit_state' => 'refunded',
            'total_refunded_cost' => 70,
        ]);

        $script = GeneratedScript::query()->create([
            'batch_id' => $batch->id,
            'user_id' => $user->id,
            'title' => 'Failed Script',
            'script' => 'Error script.',
            'status' => 'failed',
            'suggested_topic' => 'Topic',
            'estimated_duration' => '30s',
        ]);

        $response = $this->actingAs($user)->postJson("/api/script-batches/{$batch->id}/retry");
        $response->assertOk()
            ->assertJsonPath('batch.status', 'researching')
            ->assertJsonPath('batch.credit_state', 'reserved');

        $this->assertSame(30, $user->fresh()->credits); // 100 - 70 = 30
        $this->assertSame(0, (int) $batch->fresh()->total_refunded_cost);

        $script->refresh();
        $this->assertSame('researching', $script->status);
        $this->assertSame('Researching...', $script->title);

        Queue::assertPushed(ResearchScriptBatchJob::class);
    }

    public function test_retry_deducts_credits_and_restarts_angle_generation_stage(): void
    {
        Queue::fake();
        $user = $this->createUserWithActivePlan(100);

        $batch = ScriptGenerationBatch::query()->create([
            'user_id' => $user->id,
            'status' => 'failed',
            'original_topic' => 'Topic',
            'normalized_topic' => 'topic',
            'audience' => 'Audience',
            'primary_problem' => 'Problem',
            'objective' => 'go_viral',
            'platform' => 'instagram_reel',
            'language' => 'English',
            'output_length' => '30s',
            'content_mix' => ['educate' => 100, 'entertain' => 0, 'emotion' => 0],
            'tone_mode' => 'ai',
            'hook_mode' => 'ai',
            'cta_mode' => 'ai',
            'research_enabled' => false,
            'variant_count' => 1,
            'base_cost' => 50,
            'research_reserved_cost' => 0,
            'total_reserved_cost' => 50,
            'credit_state' => 'refunded',
            'total_refunded_cost' => 50,
        ]);

        $script = GeneratedScript::query()->create([
            'batch_id' => $batch->id,
            'user_id' => $user->id,
            'title' => 'Failed Script',
            'script' => 'Error script.',
            'status' => 'failed',
            'suggested_topic' => 'Topic',
            'estimated_duration' => '30s',
        ]);

        $response = $this->actingAs($user)->postJson("/api/script-batches/{$batch->id}/retry");
        $response->assertOk()
            ->assertJsonPath('batch.status', 'generating_angles')
            ->assertJsonPath('batch.credit_state', 'settled');

        $this->assertSame(50, $user->fresh()->credits); // 100 - 50 = 50
        $this->assertSame(0, (int) $batch->fresh()->total_refunded_cost);

        $script->refresh();
        $this->assertSame('processing', $script->status);

        Queue::assertPushed(GenerateScriptAnglesJob::class);
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
