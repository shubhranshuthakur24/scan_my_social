<?php

namespace Tests\Feature;

use App\Jobs\ExecuteAutomationActionJob;
use App\Models\AutomationFlow;
use App\Models\AutomationLog;
use App\Models\InstagramAccount;
use App\Models\User;
use App\Services\MetaApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AutoDmRetriggerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private InstagramAccount $account;

    private AutomationFlow $flow;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->account = InstagramAccount::create([
            'user_id' => $this->user->id,
            'ig_account_id' => 'ig-retrigger-test-1',
            'fb_page_id' => 'page-retrigger-test-1',
            'access_token' => 'token-retrigger-test',
            'status' => 'active',
        ]);

        $this->flow = AutomationFlow::create([
            'user_id' => $this->user->id,
            'instagram_account_id' => $this->account->id,
            'name' => 'Retrigger Test Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-retrigger-test-1',
            'keywords' => ['link', 'info'],
            'status' => 'active',
        ]);
    }

    public function test_retrigger_requires_authentication(): void
    {
        $response = $this->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(401);
    }

    public function test_retrigger_returns_403_for_another_users_flow(): void
    {
        $otherUser = User::factory()->create();

        $response = $this->actingAs($otherUser)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(403);
    }

    public function test_retrigger_returns_422_when_flow_is_paused(): void
    {
        $this->flow->update(['status' => 'paused']);

        $response = $this->actingAs($this->user)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Flow must be active before re-triggering.']);
    }

    public function test_retrigger_returns_422_for_story_flow(): void
    {
        $this->flow->update(['trigger_type' => 'story']);

        $response = $this->actingAs($this->user)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Re-trigger is only available for post and reel flows.']);
    }

    public function test_create_flow_with_retrigger_existing_flag_dispatches_existing_comment_jobs(): void
    {
        Queue::fake();

        $this->mockMetaApiComments([
            ['id' => 'comment-create-1', 'text' => 'link please', 'from' => ['id' => 'user-create-1']],
        ]);

        $response = $this->actingAs($this->user)
            ->post(route('autodm.flows.store'), [
                'instagram_account_id' => $this->account->id,
                'name' => 'Create + retrigger',
                'trigger_type' => 'post',
                'trigger_value' => 'media-create-retrigger-1',
                'keywords' => 'link,info',
                'reply_messages' => [
                    ['message_text' => 'Thanks, sent in DM.', 'media_url' => ''],
                ],
                'public_reply_enabled' => true,
                'public_comment_reply' => ['Check your inbox, I just sent details.'],
                'retrigger_existing' => 1,
            ]);

        $response->assertRedirect(route('autodm.index'));

        Queue::assertPushed(ExecuteAutomationActionJob::class, function (ExecuteAutomationActionJob $job): bool {
            return $job->triggerSourceId === 'comment-create-1'
                && $job->recipientIgId === 'user-create-1';
        });
    }

    public function test_retrigger_queues_jobs_for_eligible_commenters(): void
    {
        Queue::fake();

        $this->mockMetaApiComments([
            ['id' => 'comment-1', 'text' => 'I want the link', 'from' => ['id' => 'user-1']],
            ['id' => 'comment-2', 'text' => 'Send me info please', 'from' => ['id' => 'user-2']],
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(200)
            ->assertJsonFragment(['queued' => 2]);

        Queue::assertPushed(ExecuteAutomationActionJob::class, 2);
    }

    public function test_retrigger_skips_already_processed_comments(): void
    {
        Queue::fake();

        AutomationLog::create([
            'automation_flow_id' => $this->flow->id,
            'trigger_source_id' => 'comment-1',
            'recipient_ig_id' => 'user-1',
            'status' => 'sent',
        ]);

        $this->mockMetaApiComments([
            ['id' => 'comment-1', 'text' => 'link please', 'from' => ['id' => 'user-1']],
            ['id' => 'comment-2', 'text' => 'I need info', 'from' => ['id' => 'user-2']],
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(200)
            ->assertJsonFragment(['queued' => 1]);

        Queue::assertPushed(ExecuteAutomationActionJob::class, function (ExecuteAutomationActionJob $job): bool {
            return $job->triggerSourceId === 'comment-2'
                && $job->recipientIgId === 'user-2';
        });
    }

    public function test_retrigger_uses_word_boundaries_for_keyword_matching(): void
    {
        Queue::fake();

        $this->flow->update(['keywords' => ['pro']]);

        $this->mockMetaApiComments([
            ['id' => 'comment-1', 'text' => 'This is a problem', 'from' => ['id' => 'user-1']],
            ['id' => 'comment-2', 'text' => 'pro', 'from' => ['id' => 'user-2']],
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(200)
            ->assertJsonFragment(['queued' => 1]);

        Queue::assertPushed(ExecuteAutomationActionJob::class, function (ExecuteAutomationActionJob $job): bool {
            return $job->triggerSourceId === 'comment-2'
                && $job->recipientIgId === 'user-2';
        });
    }

    public function test_retrigger_filters_by_keywords(): void
    {
        Queue::fake();

        $this->mockMetaApiComments([
            ['id' => 'comment-1', 'text' => 'link please', 'from' => ['id' => 'user-1']],
            ['id' => 'comment-2', 'text' => 'just a random comment', 'from' => ['id' => 'user-2']],
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(200)
            ->assertJsonFragment(['queued' => 1]);

        Queue::assertPushed(ExecuteAutomationActionJob::class, 1);
    }

    public function test_retrigger_ignores_keyword_filter_when_any_comment_mode_is_enabled(): void
    {
        Queue::fake();

        $this->flow->update([
            'keywords' => ['price'],
            'match_all_comments' => true,
        ]);

        $this->mockMetaApiComments([
            ['id' => 'comment-any-1', 'text' => 'hello there', 'from' => ['id' => 'user-1']],
            ['id' => 'comment-any-2', 'text' => 'completely unrelated', 'from' => ['id' => 'user-2']],
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(200)
            ->assertJsonFragment(['queued' => 2]);

        Queue::assertPushed(ExecuteAutomationActionJob::class, 2);
    }

    public function test_retrigger_sends_to_all_when_no_keywords_configured(): void
    {
        Queue::fake();

        $this->flow->update(['keywords' => []]);

        $this->mockMetaApiComments([
            ['id' => 'comment-1', 'text' => 'some random text', 'from' => ['id' => 'user-1']],
            ['id' => 'comment-2', 'text' => 'another comment', 'from' => ['id' => 'user-2']],
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(200)
            ->assertJsonFragment(['queued' => 2]);

        Queue::assertPushed(ExecuteAutomationActionJob::class, 2);
    }

    public function test_retrigger_deduplicates_by_sender(): void
    {
        Queue::fake();

        $this->mockMetaApiComments([
            ['id' => 'comment-1', 'text' => 'link please', 'from' => ['id' => 'user-1']],
            ['id' => 'comment-2', 'text' => 'link again', 'from' => ['id' => 'user-1']], // same sender
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(200)
            ->assertJsonFragment(['queued' => 1]);

        Queue::assertPushed(ExecuteAutomationActionJob::class, 1);
    }

    public function test_retrigger_skips_self_comments(): void
    {
        Queue::fake();

        $this->mockMetaApiComments([
            // The account itself commenting on its own post
            ['id' => 'comment-1', 'text' => 'link please', 'from' => ['id' => 'ig-retrigger-test-1']],
            ['id' => 'comment-2', 'text' => 'I need info', 'from' => ['id' => 'user-2']],
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(200)
            ->assertJsonFragment(['queued' => 1]);

        Queue::assertPushed(ExecuteAutomationActionJob::class, 1);
    }

    public function test_retrigger_returns_zero_when_no_comments(): void
    {
        Queue::fake();

        $this->mockMetaApiComments([]);

        $response = $this->actingAs($this->user)
            ->postJson(route('autodm.flows.retrigger', $this->flow->id));

        $response->assertStatus(200)
            ->assertJsonFragment(['queued' => 0]);

        Queue::assertNothingPushed();
    }

    /** @param  array<int, array{id: string, text: string, from: array{id: string}}>  $comments */
    private function mockMetaApiComments(array $comments): void
    {
        $mock = $this->mock(MetaApiService::class);
        $mock->shouldReceive('fetchMediaComments')
            ->once()
            ->andReturn([
                'data' => $comments,
                'paging' => ['next_cursor' => null, 'has_next_page' => false],
            ]);
    }
}
