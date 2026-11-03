<?php

namespace Tests\Feature;

use App\Jobs\AnalyzePostJob;
use App\Jobs\TranscribePostJob;
use App\Models\Channel;
use App\Models\GeneratedScript;
use App\Models\Post;
use App\Models\User;
use App\Services\ContentProcessingService;
use App\Services\PlanService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PostCreditBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_transcribe_deducts_credits_once_when_global_transcription_exists(): void
    {
        $cost = PlanService::creditCost('transcribe_post');
        $user = $this->createUserWithActivePlan($cost + 20);
        $post = $this->createAccessiblePost($user, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
        ], [
            'transcription' => 'Existing transcript',
            'transcription_status' => 'completed',
        ]);

        $initialCredits = (int) $user->credits;

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/transcribe")
            ->assertOk()
            ->assertJson(['status' => 'completed']);

        $user->refresh();
        $this->assertSame($initialCredits - $cost, (int) $user->credits);

        $chargedAt = DB::table('content_analysis_by_user')
            ->where('user_id', $user->id)
            ->where('content_analysis_id', $post->contentAnalysis->id)
            ->value('transcription_charged_at');
        $this->assertNotNull($chargedAt);

        $creditsAfterFirstCall = (int) $user->credits;

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/transcribe")
            ->assertOk();

        $user->refresh();
        $this->assertSame($creditsAfterFirstCall, (int) $user->credits);
    }

    public function test_analyze_deducts_credits_once_when_global_analysis_exists(): void
    {
        $cost = PlanService::creditCost('analyze_post');
        $user = $this->createUserWithActivePlan($cost + 20);
        $post = $this->createAccessiblePost($user, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
        ], $this->completeAnalysisPayload());

        $initialCredits = (int) $user->credits;

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/analyze")
            ->assertOk()
            ->assertJson(['status' => 'completed']);

        $user->refresh();
        $this->assertSame($initialCredits - $cost, (int) $user->credits);

        $chargedAt = DB::table('content_analysis_by_user')
            ->where('user_id', $user->id)
            ->where('content_analysis_id', $post->contentAnalysis->id)
            ->value('analysis_charged_at');
        $this->assertNotNull($chargedAt);

        $creditsAfterFirstCall = (int) $user->credits;

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/analyze")
            ->assertOk();

        $user->refresh();
        $this->assertSame($creditsAfterFirstCall, (int) $user->credits);
    }

    public function test_transcribe_returns_402_and_does_not_queue_when_credits_are_insufficient(): void
    {
        Queue::fake();

        $user = $this->createUserWithActivePlan(0);
        $post = $this->createAccessiblePost($user, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
        ]);

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/transcribe")
            ->assertStatus(402)
            ->assertJson(['error' => 'insufficient_credits']);

        Queue::assertNotPushed(TranscribePostJob::class);
    }

    public function test_analyze_returns_402_and_does_not_queue_when_credits_are_insufficient(): void
    {
        Queue::fake();

        $user = $this->createUserWithActivePlan(0);
        $post = $this->createAccessiblePost($user, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
            'is_transcribed' => true,
        ], [
            'transcription' => 'Existing transcript',
            'transcription_status' => 'completed',
            'analysis_status' => 'idle',
        ]);

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/analyze")
            ->assertStatus(402)
            ->assertJson(['error' => 'insufficient_credits']);

        Queue::assertNotPushed(AnalyzePostJob::class);
    }

    public function test_second_user_gets_cached_transcription_and_is_charged_once_without_dispatching_job(): void
    {
        Queue::fake();

        $cost = PlanService::creditCost('transcribe_post');
        $userOne = $this->createUserWithActivePlan($cost + 20);
        $userTwo = $this->createUserWithActivePlan($cost + 20);

        $post = $this->createAccessiblePost($userOne, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
            'is_transcribed' => false,
        ], [
            'transcription' => 'Existing transcript',
            'transcription_status' => 'completed',
        ]);
        $userTwo->channels()->syncWithoutDetaching([$post->channel_id]);

        $initialCredits = (int) $userTwo->credits;

        $this->actingAs($userTwo)
            ->postJson("/api/posts/{$post->id}/transcribe")
            ->assertOk()
            ->assertJson(['status' => 'completed']);

        Queue::assertNotPushed(TranscribePostJob::class);
        $this->assertTrue((bool) $post->fresh()->is_transcribed);

        $userTwo->refresh();
        $this->assertSame($initialCredits - $cost, (int) $userTwo->credits);

        $creditsAfterFirstCall = (int) $userTwo->credits;
        $this->actingAs($userTwo)->postJson("/api/posts/{$post->id}/transcribe")->assertOk();
        $userTwo->refresh();
        $this->assertSame($creditsAfterFirstCall, (int) $userTwo->credits);
    }

    public function test_transcribe_joins_in_progress_global_run_without_dispatching_duplicate_job(): void
    {
        Queue::fake();

        $cost = PlanService::creditCost('transcribe_post');
        $userOne = $this->createUserWithActivePlan($cost + 20);
        $userTwo = $this->createUserWithActivePlan($cost + 20);

        $post = $this->createAccessiblePost($userOne, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
        ], [
            'transcription_status' => 'processing',
            'transcription' => null,
        ]);
        $userTwo->channels()->syncWithoutDetaching([$post->channel_id]);

        $this->actingAs($userTwo)
            ->postJson("/api/posts/{$post->id}/transcribe")
            ->assertStatus(202)
            ->assertJson([
                'status' => 'processing',
                'global_status' => 'processing',
            ]);

        Queue::assertNotPushed(TranscribePostJob::class);

        $this->assertDatabaseHas('content_analysis_by_user', [
            'user_id' => $userTwo->id,
            'content_analysis_id' => $post->contentAnalysis->id,
            'transcription_status' => 'processing',
        ]);
    }

    public function test_analyze_does_not_block_on_stale_post_transcribed_flag_and_syncs_it(): void
    {
        Queue::fake();

        $cost = PlanService::creditCost('analyze_post');
        $user = $this->createUserWithActivePlan($cost + 20);
        $post = $this->createAccessiblePost($user, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
            'is_transcribed' => false,
        ], [
            'transcription' => 'Existing transcript',
            'transcription_status' => 'completed',
            'analysis_status' => 'idle',
        ]);

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/analyze")
            ->assertStatus(202)
            ->assertJson([
                'status' => 'queued',
                'global_status' => 'queued',
            ]);

        $this->assertTrue((bool) $post->fresh()->is_transcribed);
        Queue::assertPushed(AnalyzePostJob::class);
    }

    public function test_analyze_retries_when_global_analysis_previously_failed(): void
    {
        Queue::fake();

        $cost = PlanService::creditCost('analyze_post');
        $user = $this->createUserWithActivePlan($cost + 20);
        $post = $this->createAccessiblePost($user, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
        ], [
            'transcription' => 'Existing transcript',
            'transcription_status' => 'completed',
            'analysis_status' => 'failed',
        ]);

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/analyze")
            ->assertStatus(202)
            ->assertJson([
                'status' => 'queued',
                'global_status' => 'queued',
            ]);

        Queue::assertPushed(AnalyzePostJob::class);
        $this->assertSame('queued', DB::table('content_analyses')->where('id', $post->contentAnalysis->id)->value('analysis_status'));
    }

    public function test_analyze_treats_completed_status_with_missing_required_fields_as_incomplete(): void
    {
        Queue::fake();

        $cost = PlanService::creditCost('analyze_post');
        $user = $this->createUserWithActivePlan($cost + 20);
        $post = $this->createAccessiblePost($user, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
        ], $this->completeAnalysisPayload([
            'hook_text' => '',
            'analysis_status' => 'completed',
        ]));

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/analyze")
            ->assertStatus(202)
            ->assertJson([
                'status' => 'queued',
                'global_status' => 'queued',
            ]);

        Queue::assertPushed(AnalyzePostJob::class);
    }

    public function test_second_user_gets_cached_analysis_and_is_charged_once_without_dispatching_job(): void
    {
        Queue::fake();

        $cost = PlanService::creditCost('analyze_post');
        $userOne = $this->createUserWithActivePlan($cost + 20);
        $userTwo = $this->createUserWithActivePlan($cost + 20);
        $post = $this->createAccessiblePost($userOne, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
            'is_analyzed' => false,
        ], $this->completeAnalysisPayload());
        $userTwo->channels()->syncWithoutDetaching([$post->channel_id]);

        $initialCredits = (int) $userTwo->credits;

        $this->actingAs($userTwo)
            ->postJson("/api/posts/{$post->id}/analyze")
            ->assertOk()
            ->assertJson([
                'status' => 'completed',
                'global_status' => 'completed',
            ]);

        Queue::assertNotPushed(AnalyzePostJob::class);
        $this->assertTrue((bool) $post->fresh()->is_analyzed);

        $userTwo->refresh();
        $this->assertSame($initialCredits - $cost, (int) $userTwo->credits);

        $creditsAfterFirstCall = (int) $userTwo->credits;
        $this->actingAs($userTwo)->postJson("/api/posts/{$post->id}/analyze")->assertOk();
        $userTwo->refresh();
        $this->assertSame($creditsAfterFirstCall, (int) $userTwo->credits);
    }

    public function test_cached_global_analysis_returns_402_when_user_has_no_credits_and_does_not_unlock(): void
    {
        Queue::fake();

        $userOne = $this->createUserWithActivePlan(20);
        $userTwo = $this->createUserWithActivePlan(0);
        $post = $this->createAccessiblePost($userOne, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
        ], $this->completeAnalysisPayload());
        $userTwo->channels()->syncWithoutDetaching([$post->channel_id]);

        $this->actingAs($userTwo)
            ->postJson("/api/posts/{$post->id}/analyze")
            ->assertStatus(402)
            ->assertJson(['error' => 'insufficient_credits']);

        Queue::assertNotPushed(AnalyzePostJob::class);
        $this->assertNull(
            DB::table('content_analysis_by_user')
                ->where('user_id', $userTwo->id)
                ->where('content_analysis_id', $post->contentAnalysis->id)
                ->value('analysis_charged_at')
        );
    }

    public function test_analysis_status_uses_global_transcription_state_not_stale_post_flag(): void
    {
        $cost = PlanService::creditCost('analyze_post');
        $user = $this->createUserWithActivePlan($cost + 20);
        $post = $this->createAccessiblePost($user, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
            'is_transcribed' => false,
        ], [
            'transcription' => 'Existing transcript',
            'transcription_status' => 'completed',
            'analysis_status' => 'processing',
        ]);

        DB::table('content_analysis_by_user')->insert([
            'user_id' => $user->id,
            'content_analysis_id' => $post->contentAnalysis->id,
            'analysis_status' => 'processing',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user)
            ->getJson("/api/posts/{$post->id}/analysis-status")
            ->assertOk()
            ->assertJson([
                'status' => 'processing',
                'global_status' => 'processing',
            ]);
    }

    public function test_analysis_status_unlocks_and_charges_user_joined_to_in_progress_run_when_global_completes(): void
    {
        $cost = PlanService::creditCost('analyze_post');
        $user = $this->createUserWithActivePlan($cost + 20);
        $post = $this->createAccessiblePost($user, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
            'is_analyzed' => false,
        ], $this->completeAnalysisPayload());

        DB::table('content_analysis_by_user')->insert([
            'user_id' => $user->id,
            'content_analysis_id' => $post->contentAnalysis->id,
            'analysis_status' => 'processing',
            'analysis_charged_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $initialCredits = (int) $user->credits;

        $this->actingAs($user)
            ->getJson("/api/posts/{$post->id}/analysis-status")
            ->assertOk()
            ->assertJson([
                'status' => 'completed',
                'global_status' => 'completed',
            ]);

        $user->refresh();
        $this->assertSame($initialCredits - $cost, (int) $user->credits);
    }

    public function test_transcription_status_unlocks_and_charges_user_joined_to_in_progress_run_when_global_completes(): void
    {
        $cost = PlanService::creditCost('transcribe_post');
        $user = $this->createUserWithActivePlan($cost + 20);
        $post = $this->createAccessiblePost($user, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
            'is_transcribed' => false,
        ], [
            'transcription' => 'Existing transcript',
            'transcription_status' => 'completed',
        ]);

        DB::table('content_analysis_by_user')->insert([
            'user_id' => $user->id,
            'content_analysis_id' => $post->contentAnalysis->id,
            'transcription_status' => 'processing',
            'transcription_charged_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $initialCredits = (int) $user->credits;

        $this->actingAs($user)
            ->getJson("/api/posts/{$post->id}/transcription-status")
            ->assertOk()
            ->assertJson([
                'status' => 'completed',
                'global_status' => 'completed',
                'transcription' => 'Existing transcript',
            ]);

        $user->refresh();
        $this->assertSame($initialCredits - $cost, (int) $user->credits);
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

    private function createAccessiblePost(User $user, array $postOverrides = [], array $analysisOverrides = []): Post
    {
        $channel = Channel::create([
            'handle' => 'channel_'.uniqid(),
            'name' => 'Billing Test Channel',
            'platform' => 'instagram',
        ]);
        $user->channels()->syncWithoutDetaching([$channel->id]);

        $post = Post::create(array_merge([
            'channel_id' => $channel->id,
            'platform' => 'instagram',
            'post_id' => 'post_'.uniqid(),
            'audio_url' => null,
            'is_transcribed' => false,
            'is_analyzed' => false,
        ], $postOverrides));

        if (! empty($analysisOverrides)) {
            $post->contentAnalysis()->create($analysisOverrides);
        }

        return $post->fresh();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function completeAnalysisPayload(array $overrides = []): array
    {
        return array_merge([
            'transcription' => 'Existing transcript',
            'transcription_status' => 'completed',
            'analysis_status' => 'completed',
            'hook_text' => 'Stop making this hook mistake.',
            'topic_angle' => 'Retention-first editing',
            'script_type' => 'Utility',
            'script_flow' => 'Problem Steps Reinforcement',
            'cta_type' => 'Follow CTA',
            'hook_score' => 9,
        ], $overrides);
    }

    public function test_process_deducts_credits_for_all_components_separately(): void
    {
        $transcribeCost = PlanService::creditCost('transcribe_post');
        $analyzeCost = PlanService::creditCost('analyze_post');
        $scriptCost = PlanService::creditCost('generate_script');
        $totalCost = $transcribeCost + $analyzeCost + $scriptCost;

        $user = $this->createUserWithActivePlan($totalCost + 100);
        $post = $this->createAccessiblePost($user, [
            'audio_url' => 'https://cdn.example.com/audio.mp3',
        ]);

        $initialCredits = (int) $user->credits;

        // Mock the processor to avoid real AI calls failing in test
        $mockProcessor = \Mockery::mock(ContentProcessingService::class);
        $mockProcessor->shouldReceive('process')
            ->andReturn(new GeneratedScript);
        $this->app->instance(ContentProcessingService::class, $mockProcessor);

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/process")
            ->assertOk();

        $user->refresh();
        $this->assertSame($initialCredits - $totalCost, (int) $user->credits);

        // Verify ledger entries
        $this->assertDatabaseHas('credit_ledger', ['user_id' => $user->id, 'action' => 'transcribe_post', 'amount' => -$transcribeCost]);
        $this->assertDatabaseHas('credit_ledger', ['user_id' => $user->id, 'action' => 'analyze_post', 'amount' => -$analyzeCost]);
        $this->assertDatabaseHas('credit_ledger', ['user_id' => $user->id, 'action' => 'generate_script', 'amount' => -$scriptCost]);

        $creditsAfterFirstCall = (int) $user->credits;

        // Manually mark pivot as charged because the mock didn't do it
        DB::table('content_analysis_by_user')
            ->updateOrInsert(
                [
                    'user_id' => $user->id,
                    'content_analysis_id' => $post->contentAnalysis->id,
                ],
                [
                    'transcription_charged_at' => now(),
                    'analysis_charged_at' => now(),
                    'transcription_status' => 'completed',
                    'analysis_status' => 'completed',
                ]
            );

        $this->actingAs($user)
            ->postJson("/api/posts/{$post->id}/process")
            ->assertOk();

        $user->refresh();
        $this->assertSame($creditsAfterFirstCall - $scriptCost, (int) $user->credits);
    }
}
