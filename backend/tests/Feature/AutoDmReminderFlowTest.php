<?php

namespace Tests\Feature;

use App\Jobs\ExecuteAutomationActionJob;
use App\Jobs\ProcessMetaWebhookJob;
use App\Jobs\SendAutodmReminderJob;
use App\Models\AutodmReminderEvent;
use App\Models\AutomationFlow;
use App\Models\AutomationFlowMessage;
use App\Models\InstagramAccount;
use App\Models\User;
use App\Services\AutodmDeeplinkService;
use App\Services\MediaUrlService;
use App\Services\MetaApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;

class AutoDmReminderFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_flow_creation_persists_reminder_settings_when_enabled(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-reminder-create-1',
            'fb_page_id' => 'page-reminder-create-1',
            'access_token' => 'token-reminder-create',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->post(route('autodm.flows.store'), [
            'instagram_account_id' => $account->id,
            'name' => 'Reminder Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-reminder-create-1',
            'trigger_media_url' => 'https://example.com/trigger.jpg',
            'keywords' => 'price,info',
            'reply_messages' => ['Here you go'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox, I just sent details.'],
            'reminder_enabled' => true,
            'reminder_delay_hours' => 21,
            'reminder_messages' => [
                'Hey, did this help? Reply and I can send more.',
                'Want more examples? Reply below and I will share.',
            ],
            'reminder_primary_button_text' => 'Show me more',
            'reminder_secondary_button_text' => 'Not now',
            'reminder_more_message' => 'Amazing. Tell me what you need next.',
            'reminder_offer_url' => 'https://example.com/premium',
            'reminder_offer_button_text' => 'Get Premium',
        ]);

        $response->assertRedirect(route('autodm.index'));

        $flow = AutomationFlow::query()
            ->where('user_id', $user->id)
            ->where('instagram_account_id', $account->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($flow);
        $this->assertTrue((bool) $flow->reminder_enabled);
        $this->assertSame(21, (int) $flow->reminder_delay_hours);
        $this->assertSame([
            'Hey, did this help? Reply and I can send more.',
            'Want more examples? Reply below and I will share.',
        ], $flow->reminder_messages);
        $this->assertSame('Show me more', $flow->reminder_primary_button_text);
        $this->assertSame('Not now', $flow->reminder_secondary_button_text);
        $this->assertSame('Amazing. Tell me what you need next.', $flow->reminder_more_message);
        $this->assertSame('https://example.com/premium', $flow->reminder_offer_url);
        $this->assertSame('Get Premium', $flow->reminder_offer_button_text);
    }

    public function test_execute_action_schedules_reminder_event_after_successful_send(): void
    {
        Queue::fake([SendAutodmReminderJob::class]);

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-reminder-exec-1',
            'fb_page_id' => 'page-reminder-exec-1',
            'access_token' => 'token-reminder-exec',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Reminder Exec Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-reminder-exec-1',
            'keywords' => ['price'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your DMs!'],
            'reminder_enabled' => true,
            'reminder_delay_hours' => 20,
            'reminder_messages' => ['Hope this helped. Want more?'],
            'reminder_primary_button_text' => 'Show me more',
            'reminder_secondary_button_text' => 'Not now',
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Thanks for commenting.',
            'is_active' => true,
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('sendPublicCommentReply')
            ->once()
            ->with('token-reminder-exec', '791827491', 'Check your DMs!')
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['comment_id' => 'c-1'],
            ]);

        $service->shouldReceive('sendCommentPrivateReply')
            ->once()
            ->with('token-reminder-exec', 'ig-reminder-exec-1', '791827491', 'Thanks for commenting.')
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['message_id' => 'm-1'],
            ]);

        $mediaUrlService = Mockery::mock(MediaUrlService::class);
        $mediaUrlService->shouldNotReceive('deliveryUrl');
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        $deeplinkService->shouldReceive('rewriteLinksInText')
            ->once()
            ->andReturnUsing(fn ($text) => (string) $text);

        $job = new ExecuteAutomationActionJob(
            $flow->id,
            '791827491',
            'recipient-reminder-1',
            $account->id
        );

        Cache::put(
            "autodm:window_last_inbound:{$account->id}:recipient-reminder-1",
            now()->toIso8601String(),
            now()->addHours(24)
        );

        $job->handle($service, $mediaUrlService, $deeplinkService);

        $event = AutodmReminderEvent::query()
            ->where('automation_flow_id', $flow->id)
            ->where('recipient_ig_id', 'recipient-reminder-1')
            ->where('trigger_source_id', '791827491')
            ->first();

        $this->assertNotNull($event);
        $this->assertSame('scheduled', $event->status);
        $this->assertNotNull($event->scheduled_for);

        Queue::assertPushed(SendAutodmReminderJob::class, 1);
    }

    public function test_reminder_more_quick_reply_sends_follow_up_message(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-reminder-more-1',
            'fb_page_id' => 'page-reminder-more-1',
            'access_token' => 'token-reminder-more',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Reminder More Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-reminder-more-1',
            'keywords' => ['price'],
            'reminder_enabled' => true,
            'reminder_more_message' => 'Great. Tell me what topic you want next.',
            'reminder_offer_url' => 'https://example.com/premium',
            'reminder_offer_button_text' => 'Get Premium',
            'status' => 'active',
        ]);

        $event = AutodmReminderEvent::create([
            'automation_flow_id' => $flow->id,
            'recipient_ig_id' => 'recipient-reminder-more-1',
            'trigger_source_id' => 'trigger-reminder-more-1',
            'status' => 'sent',
            'processed_at' => now(),
        ]);

        $payload = [
            'field' => 'messaging_postbacks',
            'value' => [
                'sender' => ['id' => 'recipient-reminder-more-1'],
                'postback' => [
                    'mid' => 'mid-reminder-more-1',
                    'title' => 'Show me more',
                    'payload' => 'AUTODM_REMINDER_MORE_'.$event->id,
                ],
            ],
        ];

        $metaApiService = Mockery::mock(MetaApiService::class);
        $metaApiService->shouldReceive('sendMessage')
            ->once()
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['message_id' => 'm-2'],
            ]);

        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        $deeplinkService->shouldReceive('rewriteLinksInText')
            ->once()
            ->andReturnUsing(fn ($text) => (string) $text);

        (new ProcessMetaWebhookJob($payload, 'ig-reminder-more-1'))
            ->handle($metaApiService, $deeplinkService);

        $this->assertDatabaseHas('autodm_reminder_events', [
            'id' => $event->id,
            'status' => 'sent',
        ]);
    }
}
