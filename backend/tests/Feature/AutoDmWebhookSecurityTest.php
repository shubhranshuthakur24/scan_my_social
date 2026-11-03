<?php

namespace Tests\Feature;

use App\Jobs\ExecuteAutomationActionJob;
use App\Jobs\ProcessMetaWebhookJob;
use App\Jobs\RetryInstagramLongLivedTokenExchangeJob;
use App\Jobs\SyncInstagramAccountAnalyticsJob;
use App\Models\AutomationFlow;
use App\Models\AutomationFlowMessage;
use App\Models\AutomationLog;
use App\Models\InstagramAccount;
use App\Models\InstagramAccountMediaAnalytics;
use App\Models\InstagramWelcomeDmDelivery;
use App\Models\User;
use App\Services\AutodmDeeplinkService;
use App\Services\ImageCompressionService;
use App\Services\MediaUrlService;
use App\Services\MetaApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class AutoDmWebhookSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function fakeInstagramCallbackJobs(): void
    {
        Queue::fake([
            RetryInstagramLongLivedTokenExchangeJob::class,
            SyncInstagramAccountAnalyticsJob::class,
        ]);
    }

    public function test_flow_creation_rejects_foreign_instagram_account_id(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();

        $foreignAccount = InstagramAccount::create([
            'user_id' => $owner->id,
            'ig_account_id' => 'ig-owner-1',
            'fb_page_id' => 'page-owner-1',
            'access_token' => 'token-owner',
            'status' => 'active',
        ]);

        $attackerAccount = InstagramAccount::create([
            'user_id' => $attacker->id,
            'ig_account_id' => 'ig-attacker-1',
            'fb_page_id' => 'page-attacker-1',
            'access_token' => 'token-attacker',
            'status' => 'active',
        ]);

        $response = $this->actingAs($attacker)->post(route('autodm.flows.store'), [
            'instagram_account_id' => $foreignAccount->id,
            'name' => 'Injected Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-123',
            'keywords' => 'price,info',
            'reply_messages' => ['Thanks! Check your DM.'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox, I just sent details.'],
            'opening_message_enabled' => true,
            'opening_message' => 'Hey there! Sending details now.',
            'opening_button_text' => 'Continue',
        ]);

        $response->assertStatus(302);
        $response->assertSessionHasErrors(['instagram_account_id']);

        $this->assertDatabaseCount('automation_flows', 0);

        // Ensure the attacker still has their own account, but no flow was written.
        $this->assertDatabaseHas('instagram_accounts', [
            'id' => $attackerAccount->id,
            'user_id' => $attacker->id,
        ]);
    }

    public function test_flow_creation_uses_selected_owned_instagram_account_id(): void
    {
        $user = User::factory()->create();

        $selectedAccount = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-user-selected',
            'fb_page_id' => 'page-user-selected',
            'access_token' => 'token-user-selected',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->post(route('autodm.flows.store'), [
            'instagram_account_id' => $selectedAccount->id,
            'name' => 'Second Account Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-234',
            'keywords' => 'price,info',
            'reply_messages' => ['Thanks! Check your DM.'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox, I just sent details.'],
            'opening_message_enabled' => true,
            'opening_message' => 'Hey there! Sending details now.',
            'opening_button_text' => 'Continue',
        ]);

        $response->assertRedirect(route('autodm.index'));

        $this->assertDatabaseHas('automation_flows', [
            'user_id' => $user->id,
            'instagram_account_id' => $selectedAccount->id,
            'trigger_type' => 'post',
            'trigger_value' => 'media-234',
        ]);
    }

    public function test_story_flow_creation_ignores_public_reply_configuration(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-story-create-1',
            'fb_page_id' => 'page-story-create-1',
            'access_token' => 'token-story-create-1',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->post(route('autodm.flows.store'), [
            'instagram_account_id' => $account->id,
            'name' => 'Story Flow',
            'trigger_type' => 'story',
            'trigger_value' => 'story-123',
            'keywords' => 'price,info',
            'reply_messages' => ['Story reply variant'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Should not be stored for story'],
        ]);

        $response->assertRedirect(route('autodm.index'));

        $flow = AutomationFlow::query()
            ->where('user_id', $user->id)
            ->where('instagram_account_id', $account->id)
            ->latest('id')
            ->firstOrFail();

        $this->assertSame('story', $flow->trigger_type);
        $this->assertFalse((bool) $flow->public_reply_enabled);
        $this->assertSame([], $flow->public_comment_reply ?? []);
    }

    public function test_post_flow_creation_requires_public_reply_messages(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-post-create-1',
            'fb_page_id' => 'page-post-create-1',
            'access_token' => 'token-post-create-1',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->post(route('autodm.flows.store'), [
            'instagram_account_id' => $account->id,
            'name' => 'Invalid Post Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-post-1',
            'keywords' => 'price,info',
            'reply_messages' => ['Reply variant'],
            'public_reply_enabled' => false,
            'public_comment_reply' => [],
        ]);

        $response->assertStatus(302);
        $response->assertSessionHasErrors(['public_reply_enabled', 'public_comment_reply']);
    }

    public function test_post_flow_creation_allows_empty_keywords_when_any_comment_mode_is_enabled(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-post-any-comment-1',
            'fb_page_id' => 'page-post-any-comment-1',
            'access_token' => 'token-post-any-comment-1',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->post(route('autodm.flows.store'), [
            'instagram_account_id' => $account->id,
            'name' => 'Any Comment Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-any-comment-1',
            'keywords' => '',
            'match_all_comments' => 1,
            'reply_messages' => ['Reply variant'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox, I just sent details.'],
        ]);

        $response->assertRedirect(route('autodm.index'));

        $this->assertDatabaseHas('automation_flows', [
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_value' => 'media-any-comment-1',
            'match_all_comments' => 1,
        ]);
    }

    public function test_flow_creation_rejects_multiple_reply_messages(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-post-single-reply-1',
            'fb_page_id' => 'page-post-single-reply-1',
            'access_token' => 'token-post-single-reply-1',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->post(route('autodm.flows.store'), [
            'instagram_account_id' => $account->id,
            'name' => 'Single Reply Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-single-reply-1',
            'keywords' => 'price,info',
            'reply_messages' => [
                ['message_text' => 'Reply one', 'media_url' => ''],
                ['message_text' => 'Reply two', 'media_url' => ''],
            ],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox, I just sent details.'],
        ]);

        $response->assertStatus(302);
        $response->assertSessionHasErrors(['reply_messages']);
    }

    public function test_flow_creation_allows_image_only_reply_upload(): void
    {
        Storage::fake('public');
        config()->set('filesystems.upload_disk', 'public');
        $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5Wn9kAAAAASUVORK5CYII=');

        $compressionService = Mockery::mock(ImageCompressionService::class);
        $compressionService->shouldReceive('compressToAvifOrWebp')
            ->once()
            ->andReturn([
                'bytes' => 'compressed-image-binary',
                'extension' => 'jpg',
            ]);
        $this->app->instance(ImageCompressionService::class, $compressionService);

        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-image-only-reply-1',
            'fb_page_id' => 'page-image-only-reply-1',
            'access_token' => 'token-image-only-reply-1',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->post(route('autodm.flows.store'), [
            'instagram_account_id' => $account->id,
            'name' => 'Image Only Reply Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-image-only-reply-1',
            'keywords' => 'price,info',
            'reply_messages' => [
                ['message_text' => '', 'media_url' => ''],
            ],
            'reply_images' => [
                UploadedFile::fake()->createWithContent('resource.png', $tinyPng),
            ],
            'reply_message_indexes' => [0],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox, I just sent details.'],
        ]);

        $response->assertRedirect(route('autodm.index'));

        $flow = AutomationFlow::query()
            ->where('user_id', $user->id)
            ->where('trigger_value', 'media-image-only-reply-1')
            ->firstOrFail();

        $variant = AutomationFlowMessage::query()
            ->where('automation_flow_id', $flow->id)
            ->where('message_type', 'reply')
            ->firstOrFail();

        $this->assertSame('', (string) $variant->message_text);
        $this->assertNotNull($variant->media_url);
        Storage::disk('public')->assertExists((string) $variant->media_url);
    }

    public function test_flow_creation_rejects_duplicate_trigger_even_without_trigger_media_url(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-duplicate-trigger-1',
            'fb_page_id' => 'page-duplicate-trigger-1',
            'access_token' => 'token-duplicate-trigger-1',
            'status' => 'active',
        ]);

        $firstResponse = $this->actingAs($user)->post(route('autodm.flows.store'), [
            'instagram_account_id' => $account->id,
            'name' => 'First Duplicate Candidate',
            'trigger_type' => 'post',
            'trigger_value' => 'media-duplicate-without-url-1',
            'trigger_media_url' => '',
            'keywords' => 'price,info',
            'reply_messages' => ['Reply one'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox, I just sent details.'],
        ]);

        $firstResponse->assertRedirect(route('autodm.index'));

        $secondResponse = $this->actingAs($user)->post(route('autodm.flows.store'), [
            'instagram_account_id' => $account->id,
            'name' => 'Second Duplicate Candidate',
            'trigger_type' => 'post',
            'trigger_value' => 'media-duplicate-without-url-1',
            'trigger_media_url' => '',
            'keywords' => 'price,info',
            'reply_messages' => ['Reply two'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox, I just sent details.'],
        ]);

        $secondResponse->assertStatus(302);
        $secondResponse->assertSessionHasErrors(['trigger_value']);

        $this->assertSame(
            1,
            AutomationFlow::query()
                ->where('user_id', $user->id)
                ->where('instagram_account_id', $account->id)
                ->where('trigger_type', 'post')
                ->where('trigger_value', 'media-duplicate-without-url-1')
                ->count()
        );
    }

    public function test_flow_update_rejects_foreign_instagram_account_id(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();

        $foreignAccount = InstagramAccount::create([
            'user_id' => $owner->id,
            'ig_account_id' => 'ig-owner-edit',
            'fb_page_id' => 'page-owner-edit',
            'access_token' => 'token-owner-edit',
            'status' => 'active',
        ]);

        $attackerAccount = InstagramAccount::create([
            'user_id' => $attacker->id,
            'ig_account_id' => 'ig-attacker-edit',
            'fb_page_id' => 'page-attacker-edit',
            'access_token' => 'token-attacker-edit',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $attacker->id,
            'instagram_account_id' => $attackerAccount->id,
            'name' => 'Original Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-edit-1',
            'keywords' => ['price'],
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Original reply',
            'is_active' => true,
        ]);

        $response = $this->actingAs($attacker)->patch(route('autodm.flows.update', $flow), [
            'instagram_account_id' => $foreignAccount->id,
            'name' => 'Updated Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-edit-1',
            'trigger_media_url' => 'https://example.com/media-edit-1.jpg',
            'keywords' => 'price',
            'reply_messages' => [['message_text' => 'Updated reply', 'media_url' => '']],
            'opening_message_enabled' => false,
            'opening_message' => '',
            'opening_button_text' => '',
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Updated comment reply'],
            'public_reply_limit_enabled' => false,
            'ask_to_follow_enabled' => false,
            'ask_to_follow_strict' => false,
            'ask_to_follow_message' => '',
            'reminder_enabled' => false,
            'reminder_messages' => [],
            'reminder_delay_hours' => 20,
        ]);

        $response->assertStatus(302);
        $response->assertSessionHasErrors(['instagram_account_id']);

        $flow->refresh();
        $this->assertSame($attackerAccount->id, $flow->instagram_account_id);
    }

    public function test_user_can_toggle_own_flow_status(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-toggle-1',
            'fb_page_id' => 'page-toggle-1',
            'access_token' => 'token-toggle',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'post',
            'trigger_value' => 'media-toggle-1',
            'keywords' => ['price'],
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->patch(route('autodm.flows.toggle-status', $flow));
        $response->assertStatus(302);

        $this->assertDatabaseHas('automation_flows', [
            'id' => $flow->id,
            'status' => 'paused',
        ]);

        $response = $this->actingAs($user)->patch(route('autodm.flows.toggle-status', $flow));
        $response->assertStatus(302);

        $this->assertDatabaseHas('automation_flows', [
            'id' => $flow->id,
            'status' => 'active',
        ]);
    }

    public function test_duplicate_clones_flow_and_reply_variants_as_paused(): void
    {
        $user = User::factory()->create();

        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-dup-flow-1',
            'fb_page_id' => 'page-dup-flow-1',
            'access_token' => 'token-dup-flow',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'reel',
            'trigger_value' => 'media-dup-flow-1',
            'trigger_media_url' => 'https://example.com/media.jpg',
            'keywords' => ['price', 'tool'],
            'opening_message_enabled' => true,
            'opening_message' => 'Hey there! Sending details now.',
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Reply variant 1',
            'is_active' => true,
        ]);
        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Reply variant 2',
            'is_active' => false,
        ]);

        $response = $this->actingAs($user)->post(route('autodm.flows.duplicate', $flow));
        $response->assertStatus(302);

        $this->assertSame(2, AutomationFlow::where('user_id', $user->id)->count());

        $clone = AutomationFlow::where('user_id', $user->id)
            ->where('id', '!=', $flow->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($clone);
        $this->assertSame('reel', $clone->trigger_type);
        $this->assertSame('media-dup-flow-1', $clone->trigger_value);
        $this->assertSame('https://example.com/media.jpg', $clone->trigger_media_url);
        $this->assertSame('paused', $clone->status);
        $this->assertTrue((bool) $clone->opening_message_enabled);
        $this->assertSame('Hey there! Sending details now.', $clone->opening_message);

        $this->assertDatabaseHas('automation_flow_messages', [
            'automation_flow_id' => $clone->id,
            'message_type' => 'reply',
            'message_text' => 'Reply variant 1',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('automation_flow_messages', [
            'automation_flow_id' => $clone->id,
            'message_type' => 'reply',
            'message_text' => 'Reply variant 2',
            'is_active' => false,
        ]);
    }

    public function test_meta_webhook_verification_returns_challenge_for_valid_token(): void
    {
        config()->set('services.meta.verify_token', 'verify-me');

        $response = $this->get('/api/webhooks/meta?hub_mode=subscribe&hub_verify_token=verify-me&hub_challenge=123456');

        $response->assertStatus(200);
        $response->assertSeeText('123456');
    }

    public function test_meta_webhook_verification_rejects_invalid_token(): void
    {
        config()->set('services.meta.verify_token', 'verify-me');

        $response = $this->get('/api/webhooks/meta?hub_mode=subscribe&hub_verify_token=wrong&hub_challenge=123456');

        $response->assertStatus(403);
    }

    public function test_meta_webhook_rejects_missing_signature(): void
    {
        config()->set('services.meta.app_secret', 'secret-key');

        $payload = ['object' => 'instagram', 'entry' => []];
        $rawPayload = json_encode($payload, JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            '/api/webhooks/meta',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            $rawPayload
        );

        $response->assertStatus(403);
    }

    public function test_meta_webhook_rejects_invalid_signature(): void
    {
        config()->set('services.meta.app_secret', 'secret-key');

        $payload = ['object' => 'instagram', 'entry' => []];
        $rawPayload = json_encode($payload, JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            '/api/webhooks/meta',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_HUB_SIGNATURE_256' => 'sha256=invalid',
            ],
            $rawPayload
        );

        $response->assertStatus(403);
    }

    public function test_meta_webhook_accepts_valid_signature_and_dispatches_events(): void
    {
        Queue::fake();
        config()->set('services.meta.app_secret', 'secret-key');

        $payload = [
            'object' => 'instagram',
            'entry' => [
                [
                    'id' => 'ig-account-1',
                    'changes' => [
                        [
                            'field' => 'comments',
                            'value' => [
                                'id' => 'comment-1',
                                'verb' => 'add',
                                'text' => 'price?',
                                'from' => ['id' => 'sender-1'],
                                'media' => ['id' => 'media-1'],
                            ],
                        ],
                    ],
                    'messaging' => [
                        [
                            'sender' => ['id' => 'sender-2'],
                            'message' => [
                                'mid' => 'message-1',
                                'text' => 'hello',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $rawPayload = json_encode($payload, JSON_THROW_ON_ERROR);
        $signature = 'sha256='.hash_hmac('sha256', $rawPayload, 'secret-key');

        $response = $this->call(
            'POST',
            '/api/webhooks/meta',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_HUB_SIGNATURE_256' => $signature,
            ],
            $rawPayload
        );

        $response->assertStatus(200);
        $response->assertSeeText('EVENT_RECEIVED');

        Queue::assertPushed(ProcessMetaWebhookJob::class, 2);
    }

    public function test_instagram_connect_redirect_uses_social_integration_meta_config_and_all_business_scopes(): void
    {
        config()->set('services.meta.client_id', 'meta-client-id');
        config()->set('services.meta.redirect', 'https://app.scanmysocial.com/social-integrations/instagram/callback');

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'starter',
            'status' => 'active',
            'razorpay_id' => 'sub-connect-redirect',
            'razorpay_plan_id' => 'plan-connect-redirect',
        ]);

        $response = $this->actingAs($user)->get(route('social-integrations.instagram.connect', [
            'source' => 'settings_integration',
        ]));

        $response->assertRedirect();

        $location = (string) $response->headers->get('Location');
        $parts = parse_url($location);
        parse_str((string) ($parts['query'] ?? ''), $query);

        $this->assertSame('www.instagram.com', $parts['host'] ?? null);
        $this->assertSame('/oauth/authorize', $parts['path'] ?? null);
        $this->assertSame('true', $query['force_reauth'] ?? null);
        $this->assertSame('0', $query['enable_fb_login'] ?? null);
        $this->assertSame('meta-client-id', $query['client_id'] ?? null);
        $this->assertSame('https://app.scanmysocial.com/social-integrations/instagram/callback', $query['redirect_uri'] ?? null);
        $this->assertSame('code', $query['response_type'] ?? null);
        $this->assertNotEmpty($query['state'] ?? null);
        $this->assertSame(
            'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights',
            $query['scope'] ?? null
        );
        $this->assertSame($query['state'], session('social_integrations_instagram_oauth_state'));
    }

    public function test_callback_saves_account_and_enables_subscriptions(): void
    {
        $this->fakeInstagramCallbackJobs();

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'starter',
            'status' => 'active',
            'razorpay_id' => 'sub-callback-success',
            'razorpay_plan_id' => 'plan-callback-success',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn('long-token');
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('long-token')->andReturn([
            ['ig_id' => 'ig-123', 'username' => 'creator123', 'page_id' => 'page-123', 'profile_picture_url' => 'https://example.com/pic.jpg'],
        ]);
        $service->shouldReceive('enableWebhookSubscriptions')
            ->once()
            ->with('long-token', 'ig-123', ['comments', 'messages', 'messaging_postbacks'])
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['success' => true],
            ]);

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession(['social_integrations_instagram_oauth_state' => 'state-token'])
            ->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('autodm.index'));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('instagram_accounts', [
            'user_id' => $user->id,
            'ig_account_id' => 'ig-123',
            'username' => 'creator123',
            'profile_url' => 'https://www.instagram.com/creator123/',
            'profile_picture_url' => null,
            'profile_picture_synced_at' => null,
            'token_type' => InstagramAccount::TOKEN_TYPE_LONG_LIVED,
            'long_lived_exchange_failed_at' => null,
            'webhook_subscriptions_status' => 'enabled',
            'webhook_subscriptions_error' => null,
        ]);

        $account = InstagramAccount::query()->where('ig_account_id', 'ig-123')->firstOrFail();
        $this->assertSame('long-token', $account->access_token);
    }

    public function test_callback_redirects_to_settings_integration_when_oauth_started_from_settings(): void
    {
        $this->fakeInstagramCallbackJobs();

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'starter',
            'status' => 'active',
            'razorpay_id' => 'sub-callback-settings',
            'razorpay_plan_id' => 'plan-callback-settings',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn('long-token');
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('long-token')->andReturn([
            ['ig_id' => 'ig-settings-123', 'username' => 'settingscreator', 'page_id' => 'page-settings-123'],
        ]);
        $service->shouldReceive('enableWebhookSubscriptions')
            ->once()
            ->with('long-token', 'ig-settings-123', ['comments', 'messages', 'messaging_postbacks'])
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['success' => true],
            ]);

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession([
            'social_integrations_instagram_oauth_state' => 'state-token',
            'social_integrations_oauth_return_to' => 'settings_integration',
        ])->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('settings', ['tab' => 'integration']));
        $response->assertSessionHas('success');
    }

    public function test_create_uses_live_instagram_profile_image_without_persisting_it(): void
    {
        Cache::flush();

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-live-123',
            'fb_page_id' => 'page-live-123',
            'username' => 'creatorlive',
            'profile_url' => 'https://www.instagram.com/creatorlive/',
            'profile_picture_url' => null,
            'profile_picture_synced_at' => null,
            'access_token' => 'token-live',
            'status' => 'active',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('fetchInstagramAccountsFromToken')
            ->once()
            ->with('token-live', (int) $account->id)
            ->andReturn([
                [
                    'ig_id' => 'ig-live-123',
                    'username' => 'creatorlive',
                    'profile_picture_url' => 'https://example.com/live-pic.jpg',
                ],
            ]);
        $this->app->instance(MetaApiService::class, $service);

        $response = $this->actingAs($user)->get(route('autodm.create'));

        $response->assertStatus(200);
        $response->assertSee('live-pic.jpg');

        $cacheKey = "autodm:live-profile-picture-url:{$account->id}";
        $this->assertSame('https://example.com/live-pic.jpg', Cache::get($cacheKey));

        $account->refresh();
        $this->assertNull($account->profile_picture_url);
        $this->assertNull($account->profile_picture_synced_at);
    }

    public function test_callback_marks_subscription_sync_failure_without_failing_connection(): void
    {
        $this->fakeInstagramCallbackJobs();

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'starter',
            'status' => 'active',
            'razorpay_id' => 'sub-callback-warning-1',
            'razorpay_plan_id' => 'plan-callback-warning-1',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn('long-token');
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('long-token')->andReturn([
            ['ig_id' => 'ig-123', 'username' => 'creator123', 'page_id' => 'page-123', 'profile_picture_url' => 'https://example.com/pic.jpg'],
        ]);
        $service->shouldReceive('enableWebhookSubscriptions')
            ->once()
            ->with('long-token', 'ig-123', ['comments', 'messages', 'messaging_postbacks'])
            ->andReturn([
                'success' => false,
                'status' => 400,
                'payload' => [
                    'error' => ['message' => 'invalid fields'],
                ],
            ]);

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession(['social_integrations_instagram_oauth_state' => 'state-token'])
            ->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('autodm.index'));
        $response->assertSessionHas('warning');

        $this->assertDatabaseHas('instagram_accounts', [
            'user_id' => $user->id,
            'ig_account_id' => 'ig-123',
            'profile_url' => 'https://www.instagram.com/creator123/',
            'webhook_subscriptions_status' => 'failed',
            'webhook_subscriptions_error' => 'invalid fields',
        ]);
    }

    public function test_callback_handles_subscription_response_missing_success_key(): void
    {
        $this->fakeInstagramCallbackJobs();

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'starter',
            'status' => 'active',
            'razorpay_id' => 'sub-callback-warning-2',
            'razorpay_plan_id' => 'plan-callback-warning-2',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn('long-token');
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('long-token')->andReturn([
            ['ig_id' => 'ig-123', 'username' => 'creator123', 'page_id' => 'page-123', 'profile_picture_url' => 'https://example.com/pic.jpg'],
        ]);
        $service->shouldReceive('enableWebhookSubscriptions')
            ->once()
            ->with('long-token', 'ig-123', ['comments', 'messages', 'messaging_postbacks'])
            ->andReturn([
                'status' => 500,
                'payload' => ['unexpected' => 'shape'],
            ]);

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession(['social_integrations_instagram_oauth_state' => 'state-token'])
            ->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('autodm.index'));
        $response->assertSessionHas('warning');

        $this->assertDatabaseHas('instagram_accounts', [
            'user_id' => $user->id,
            'ig_account_id' => 'ig-123',
            'webhook_subscriptions_status' => 'failed',
            'webhook_subscriptions_error' => 'subscription_enable_failed',
        ]);
    }

    public function test_callback_handles_subscription_failure_without_nested_error_message(): void
    {
        $this->fakeInstagramCallbackJobs();

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'starter',
            'status' => 'active',
            'razorpay_id' => 'sub-callback-warning-3',
            'razorpay_plan_id' => 'plan-callback-warning-3',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn('long-token');
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('long-token')->andReturn([
            ['ig_id' => 'ig-123', 'username' => 'creator123', 'page_id' => 'page-123', 'profile_picture_url' => 'https://example.com/pic.jpg'],
        ]);
        $service->shouldReceive('enableWebhookSubscriptions')
            ->once()
            ->with('long-token', 'ig-123', ['comments', 'messages', 'messaging_postbacks'])
            ->andReturn([
                'success' => false,
                'status' => 400,
                'payload' => ['error' => []],
            ]);

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession(['social_integrations_instagram_oauth_state' => 'state-token'])
            ->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('autodm.index'));
        $response->assertSessionHas('warning');

        $this->assertDatabaseHas('instagram_accounts', [
            'user_id' => $user->id,
            'ig_account_id' => 'ig-123',
            'webhook_subscriptions_status' => 'failed',
            'webhook_subscriptions_error' => 'subscription_enable_failed',
        ]);
    }

    public function test_callback_with_multiple_accounts_shows_picker_and_connects_selected_account(): void
    {
        $this->fakeInstagramCallbackJobs();

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'pro',
            'status' => 'active',
            'razorpay_id' => 'sub-pro-picker',
            'razorpay_plan_id' => 'plan-pro-picker',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn('long-token');
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('long-token')->andReturn([
            ['ig_id' => 'ig-123', 'username' => 'firstaccount', 'page_id' => 'page-123', 'profile_picture_url' => 'https://example.com/pic.jpg'],
            ['ig_id' => 'ig-456', 'username' => 'secondaccount', 'page_id' => 'page-456', 'profile_picture_url' => 'https://example.com/pic2.jpg'],
        ]);
        $service->shouldReceive('enableWebhookSubscriptions')
            ->once()
            ->with('long-token', 'ig-456', ['comments', 'messages', 'messaging_postbacks'])
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['success' => true],
            ]);

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession(['social_integrations_instagram_oauth_state' => 'state-token'])
            ->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('social-integrations.instagram.select.show'));

        $this->assertDatabaseCount('instagram_accounts', 0);

        $pickerResponse = $this->actingAs($user)->get(route('social-integrations.instagram.select.show'));
        $pickerResponse->assertInertia(fn (Assert $page) => $page
            ->component('AutoDM/AccountPicker')
            ->has('candidates', 2)
            ->where('candidates.0.ig_account_id', 'ig-123')
            ->where('candidates.1.ig_account_id', 'ig-456')
        );

        $selectResponse = $this->actingAs($user)->post(route('social-integrations.instagram.select.store'), [
            'ig_account_id' => 'ig-456',
        ]);
        $selectResponse->assertRedirect(route('autodm.index'));
        $selectResponse->assertSessionHas('success');

        $this->assertDatabaseCount('instagram_accounts', 1);
        $this->assertDatabaseHas('instagram_accounts', [
            'user_id' => $user->id,
            'ig_account_id' => 'ig-456',
            'username' => 'secondaccount',
            'profile_url' => 'https://www.instagram.com/secondaccount/',
        ]);
    }

    public function test_multi_account_selection_redirects_to_settings_integration_when_started_from_settings(): void
    {
        $this->fakeInstagramCallbackJobs();

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'pro',
            'status' => 'active',
            'razorpay_id' => 'sub-pro-picker-settings',
            'razorpay_plan_id' => 'plan-pro-picker-settings',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn('long-token');
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('long-token')->andReturn([
            ['ig_id' => 'ig-picker-settings-123', 'username' => 'firstpick', 'page_id' => 'page-picker-settings-123'],
            ['ig_id' => 'ig-picker-settings-456', 'username' => 'secondpick', 'page_id' => 'page-picker-settings-456'],
        ]);
        $service->shouldReceive('enableWebhookSubscriptions')
            ->once()
            ->with('long-token', 'ig-picker-settings-456', ['comments', 'messages', 'messaging_postbacks'])
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['success' => true],
            ]);

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession([
            'social_integrations_instagram_oauth_state' => 'state-token',
            'social_integrations_oauth_return_to' => 'settings_integration',
        ])->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('social-integrations.instagram.select.show'));

        $selectResponse = $this->actingAs($user)->post(route('social-integrations.instagram.select.store'), [
            'ig_account_id' => 'ig-picker-settings-456',
        ]);
        $selectResponse->assertRedirect(route('settings', ['tab' => 'integration']));
        $selectResponse->assertSessionHas('success');
    }

    public function test_callback_auto_reconnects_target_account_when_multiple_candidates_are_returned(): void
    {
        Queue::fake([RetryInstagramLongLivedTokenExchangeJob::class, SyncInstagramAccountAnalyticsJob::class]);

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'pro',
            'status' => 'active',
            'razorpay_id' => 'sub-pro-reconnect-target',
            'razorpay_plan_id' => 'plan-pro-reconnect-target',
        ]);

        $disconnectedAccount = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-target-456',
            'fb_page_id' => 'page-target-456',
            'username' => 'targetaccount',
            'access_token' => 'old-token-target',
            'status' => 'disconnected',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn(null);
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('short-token')->andReturn([
            ['ig_id' => 'ig-123', 'username' => 'firstaccount', 'page_id' => 'page-123'],
            ['ig_id' => 'ig-target-456', 'username' => 'targetaccount', 'page_id' => 'page-target-456'],
        ]);
        $service->shouldReceive('enableWebhookSubscriptions')
            ->once()
            ->with('short-token', 'ig-target-456', ['comments', 'messages', 'messaging_postbacks'])
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['success' => true],
            ]);

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession([
            'social_integrations_instagram_oauth_state' => 'state-token',
            'social_integrations_instagram_reconnect_account_id' => $disconnectedAccount->id,
        ])->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('autodm.index'));
        $response->assertSessionHas('warning');
        $response->assertSessionMissing('success');

        $this->assertDatabaseHas('instagram_accounts', [
            'id' => $disconnectedAccount->id,
            'status' => 'active',
            'token_type' => InstagramAccount::TOKEN_TYPE_SHORT_LIVED,
            'webhook_subscriptions_status' => 'enabled',
        ]);

        $disconnectedAccount->refresh();
        $this->assertSame('short-token', $disconnectedAccount->access_token);
        $this->assertNotNull($disconnectedAccount->long_lived_exchange_failed_at);

        Queue::assertPushed(RetryInstagramLongLivedTokenExchangeJob::class, function (RetryInstagramLongLivedTokenExchangeJob $job) use ($disconnectedAccount) {
            return $job->instagramAccountId === $disconnectedAccount->id;
        });
    }

    public function test_callback_short_token_fallback_connects_and_schedules_long_lived_retry(): void
    {
        Queue::fake([RetryInstagramLongLivedTokenExchangeJob::class, SyncInstagramAccountAnalyticsJob::class]);
        $this->travelTo(now()->setTime(2, 0));

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'starter',
            'status' => 'active',
            'razorpay_id' => 'sub-callback-short-fallback',
            'razorpay_plan_id' => 'plan-callback-short-fallback',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn(null);
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('short-token')->andReturn([
            ['ig_id' => 'ig-short-123', 'username' => 'shortfallback', 'page_id' => 'page-short-123'],
        ]);
        $service->shouldReceive('enableWebhookSubscriptions')
            ->once()
            ->with('short-token', 'ig-short-123', ['comments', 'messages', 'messaging_postbacks'])
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['success' => true],
            ]);

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession(['social_integrations_instagram_oauth_state' => 'state-token'])
            ->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('autodm.index'));
        $response->assertSessionHas('warning');

        $account = InstagramAccount::query()->where('ig_account_id', 'ig-short-123')->firstOrFail();
        $this->assertSame('short-token', $account->access_token);
        $this->assertSame(InstagramAccount::TOKEN_TYPE_SHORT_LIVED, $account->token_type);
        $this->assertTrue($account->token_expires_at->equalTo(now()->addHour()));
        $this->assertNotNull($account->long_lived_exchange_failed_at);

        Queue::assertPushed(RetryInstagramLongLivedTokenExchangeJob::class, function (RetryInstagramLongLivedTokenExchangeJob $job) use ($account) {
            return $job->instagramAccountId === $account->id;
        });
        Queue::assertPushed(SyncInstagramAccountAnalyticsJob::class, function (SyncInstagramAccountAnalyticsJob $job) use ($user, $account): bool {
            $reflection = new \ReflectionClass($job);
            $userIdProperty = $reflection->getProperty('userId');
            $accountIdProperty = $reflection->getProperty('instagramAccountId');
            $lifetimeProperty = $reflection->getProperty('lifetime');
            $startDateProperty = $reflection->getProperty('startDate');
            $endDateProperty = $reflection->getProperty('endDate');

            $userIdProperty->setAccessible(true);
            $accountIdProperty->setAccessible(true);
            $lifetimeProperty->setAccessible(true);
            $startDateProperty->setAccessible(true);
            $endDateProperty->setAccessible(true);

            return $userIdProperty->getValue($job) === $user->id
                && $accountIdProperty->getValue($job) === $account->id
                && $lifetimeProperty->getValue($job) === true
                && $startDateProperty->getValue($job) === null
                && $endDateProperty->getValue($job) === null
                && $job->queue === 'instagram-analytics';
        });

        $this->travelBack();
    }

    public function test_short_token_metadata_survives_multi_account_selection(): void
    {
        Queue::fake([RetryInstagramLongLivedTokenExchangeJob::class, SyncInstagramAccountAnalyticsJob::class]);
        $this->travelTo(now()->setTime(3, 0));

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'pro',
            'status' => 'active',
            'razorpay_id' => 'sub-pro-short-picker',
            'razorpay_plan_id' => 'plan-pro-short-picker',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn(null);
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('short-token')->andReturn([
            ['ig_id' => 'ig-short-123', 'username' => 'firstshort', 'page_id' => 'page-short-123'],
            ['ig_id' => 'ig-short-456', 'username' => 'secondshort', 'page_id' => 'page-short-456'],
        ]);
        $service->shouldReceive('enableWebhookSubscriptions')
            ->once()
            ->with('short-token', 'ig-short-456', ['comments', 'messages', 'messaging_postbacks'])
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['success' => true],
            ]);

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession(['social_integrations_instagram_oauth_state' => 'state-token'])
            ->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('social-integrations.instagram.select.show'));
        $this->assertDatabaseCount('instagram_accounts', 0);

        $selectResponse = $this->actingAs($user)->post(route('social-integrations.instagram.select.store'), [
            'ig_account_id' => 'ig-short-456',
        ]);
        $selectResponse->assertRedirect(route('autodm.index'));
        $selectResponse->assertSessionHas('warning');

        $account = InstagramAccount::query()->where('ig_account_id', 'ig-short-456')->firstOrFail();
        $this->assertSame('short-token', $account->access_token);
        $this->assertSame(InstagramAccount::TOKEN_TYPE_SHORT_LIVED, $account->token_type);
        $this->assertTrue($account->token_expires_at->equalTo(now()->addHour()));
        $this->assertNotNull($account->long_lived_exchange_failed_at);

        Queue::assertPushed(RetryInstagramLongLivedTokenExchangeJob::class, function (RetryInstagramLongLivedTokenExchangeJob $job) use ($account) {
            return $job->instagramAccountId === $account->id;
        });

        $this->travelBack();
    }

    public function test_callback_blocks_new_connection_when_no_active_paid_plan_exists(): void
    {
        $user = User::factory()->create();

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn('long-token');
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('long-token')->andReturn([
            ['ig_id' => 'ig-new-no-plan', 'username' => 'noplanuser', 'page_id' => 'page-new-no-plan'],
        ]);
        $service->shouldNotReceive('enableWebhookSubscriptions');

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession(['social_integrations_instagram_oauth_state' => 'state-token'])
            ->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('autodm.index'));
        $response->assertSessionHasErrors(['error']);

        $this->assertDatabaseCount('instagram_accounts', 0);
    }

    public function test_callback_allows_reconnecting_existing_account_even_when_plan_cap_is_reached(): void
    {
        $this->fakeInstagramCallbackJobs();

        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'starter',
            'status' => 'active',
            'razorpay_id' => 'sub-starter-cap',
            'razorpay_plan_id' => 'plan-starter-cap',
        ]);

        InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-reconnect-1',
            'fb_page_id' => 'page-reconnect-1',
            'username' => 'reconnectuser',
            'access_token' => 'old-token',
            'status' => 'active',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('exchangeCodeForToken')->once()->with('oauth-code')->andReturn('short-token');
        $service->shouldReceive('getLongLivedToken')->once()->with('short-token')->andReturn('long-token');
        $service->shouldReceive('fetchInstagramAccountsFromToken')->once()->with('long-token')->andReturn([
            ['ig_id' => 'ig-reconnect-1', 'username' => 'reconnectuser', 'page_id' => 'page-reconnect-1'],
        ]);
        $service->shouldReceive('enableWebhookSubscriptions')
            ->once()
            ->with('long-token', 'ig-reconnect-1', ['comments', 'messages', 'messaging_postbacks'])
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['success' => true],
            ]);

        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession(['social_integrations_instagram_oauth_state' => 'state-token'])
            ->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=state-token');

        $response->assertRedirect(route('autodm.index'));
        $response->assertSessionHas('success');

        $this->assertDatabaseCount('instagram_accounts', 1);
        $this->assertDatabaseHas('instagram_accounts', [
            'user_id' => $user->id,
            'ig_account_id' => 'ig-reconnect-1',
            'status' => 'active',
            'webhook_subscriptions_status' => 'enabled',
        ]);
    }

    public function test_callback_rejects_when_oauth_state_is_invalid(): void
    {
        $user = User::factory()->create();

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldNotReceive('exchangeCodeForToken');
        $this->app->instance(MetaApiService::class, $service);

        $response = $this->withSession(['social_integrations_instagram_oauth_state' => 'expected-state'])
            ->actingAs($user)
            ->get('/social-integrations/instagram/callback?code=oauth-code&state=wrong-state');

        $response->assertRedirect(route('autodm.index'));
        $response->assertSessionHasErrors(['error']);
    }

    public function test_fetch_media_supports_story_source_with_story_trigger_metadata(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-fetch-story-1',
            'fb_page_id' => 'page-fetch-story-1',
            'access_token' => 'token-fetch-story-1',
            'status' => 'active',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('fetchUserStories')
            ->once()
            ->with('token-fetch-story-1', 'ig-fetch-story-1', null, 20)
            ->andReturn([
                'data' => [
                    [
                        'id' => 'story-1',
                        'media_type' => 'IMAGE',
                        'media_url' => 'https://example.com/story-1.jpg',
                    ],
                ],
                'paging' => [
                    'next_cursor' => null,
                    'has_next_page' => false,
                ],
            ]);
        $this->app->instance(MetaApiService::class, $service);

        $response = $this->actingAs($user)
            ->getJson(route('autodm.fetch-media', $account->id).'?source=story');

        $response->assertOk()
            ->assertJsonPath('source', 'story')
            ->assertJsonPath('media.0.id', 'story-1')
            ->assertJsonPath('media.0.autodm_source', 'story')
            ->assertJsonPath('media.0.autodm_trigger_type', 'story')
            ->assertJsonPath('media.0.autodm_media_label', 'Story');
    }

    public function test_fetch_media_assigns_post_and_reel_trigger_metadata_for_media_source(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-fetch-media-1',
            'fb_page_id' => 'page-fetch-media-1',
            'access_token' => 'token-fetch-media-1',
            'status' => 'active',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('fetchUserMedia')
            ->once()
            ->with('token-fetch-media-1', 'ig-fetch-media-1', null, 20)
            ->andReturn([
                'data' => [
                    [
                        'id' => 'media-1',
                        'media_type' => 'VIDEO',
                        'media_url' => 'https://example.com/reel-1.mp4',
                    ],
                    [
                        'id' => 'media-2',
                        'media_type' => 'IMAGE',
                        'media_url' => 'https://example.com/post-1.jpg',
                    ],
                ],
                'paging' => [
                    'next_cursor' => null,
                    'has_next_page' => false,
                ],
            ]);
        $this->app->instance(MetaApiService::class, $service);

        $response = $this->actingAs($user)
            ->getJson(route('autodm.fetch-media', $account->id).'?source=media');

        $response->assertOk()
            ->assertJsonPath('source', 'media')
            ->assertJsonPath('media.0.autodm_source', 'media')
            ->assertJsonPath('media.0.autodm_trigger_type', 'reel')
            ->assertJsonPath('media.0.autodm_media_label', 'Reel')
            ->assertJsonPath('media.1.autodm_trigger_type', 'post')
            ->assertJsonPath('media.1.autodm_media_label', 'Post');
    }

    public function test_fetch_media_can_lookup_specific_media_id_directly(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-fetch-single-1',
            'fb_page_id' => 'page-fetch-single-1',
            'access_token' => 'token-fetch-single-1',
            'status' => 'active',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('fetchMediaById')
            ->once()
            ->with('token-fetch-single-1', 'ig-fetch-single-1', 'media-single-1')
            ->andReturn([
                'id' => 'media-single-1',
                'media_type' => 'VIDEO',
                'media_url' => 'https://example.com/reel-single.mp4',
                'thumbnail_url' => 'https://example.com/reel-single-thumb.jpg',
            ]);
        $this->app->instance(MetaApiService::class, $service);

        $response = $this->actingAs($user)
            ->getJson(route('autodm.fetch-media', $account->id).'?source=media&media_id=media-single-1');

        $response->assertOk()
            ->assertJsonPath('source', 'media')
            ->assertJsonPath('paging.has_next_page', false)
            ->assertJsonPath('media.0.id', 'media-single-1')
            ->assertJsonPath('media.0.autodm_trigger_type', 'reel')
            ->assertJsonPath('media.0.autodm_media_label', 'Reel');
    }

    public function test_fetch_media_uses_cached_analytics_row_when_direct_lookup_misses(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-fetch-cached-1',
            'fb_page_id' => 'page-fetch-cached-1',
            'access_token' => 'token-fetch-cached-1',
            'status' => 'active',
        ]);

        InstagramAccountMediaAnalytics::factory()->create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'instagram_media_id' => 'media-cached-1',
            'media_type' => 'IMAGE',
            'format' => 'image',
            'media_url' => 'https://example.com/cached-post.jpg',
            'thumbnail_url' => 'https://example.com/cached-post-thumb.jpg',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('fetchMediaById')
            ->once()
            ->with('token-fetch-cached-1', 'ig-fetch-cached-1', 'media-cached-1')
            ->andReturnNull();
        $this->app->instance(MetaApiService::class, $service);

        $response = $this->actingAs($user)
            ->getJson(route('autodm.fetch-media', $account->id).'?source=media&media_id=media-cached-1');

        $response->assertOk()
            ->assertJsonPath('source', 'media')
            ->assertJsonPath('media.0.id', 'media-cached-1')
            ->assertJsonPath('media.0.media_url', 'https://example.com/cached-post.jpg')
            ->assertJsonPath('media.0.autodm_trigger_type', 'post')
            ->assertJsonPath('media.0.autodm_media_label', 'Post');
    }

    public function test_post_flow_does_not_trigger_on_media_less_dm_event(): void
    {
        Queue::fake([ExecuteAutomationActionJob::class]);
        Cache::flush();

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-post-1',
            'fb_page_id' => 'page-post-1',
            'access_token' => 'token-post',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'post',
            'trigger_value' => 'media-post-1',
            'keywords' => ['price'],
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'DM sent.',
            'is_active' => true,
        ]);

        $payload = [
            'field' => 'messages',
            'value' => [
                'sender' => ['id' => 'external-user-1'],
                'message' => [
                    'mid' => 'mid-no-media',
                    'text' => 'price please',
                ],
            ],
        ];

        $metaApiService = Mockery::mock(MetaApiService::class);
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        (new ProcessMetaWebhookJob($payload, 'ig-post-1'))->handle($metaApiService, $deeplinkService);

        Queue::assertNothingPushed();
    }

    public function test_post_flow_with_any_comment_mode_triggers_without_keyword_match(): void
    {
        Queue::fake([ExecuteAutomationActionJob::class]);
        Cache::flush();

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-post-any-1',
            'fb_page_id' => 'page-post-any-1',
            'access_token' => 'token-post-any',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'post',
            'trigger_value' => 'media-post-any-1',
            'keywords' => ['price'],
            'match_all_comments' => true,
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'DM sent.',
            'is_active' => true,
        ]);

        $payload = [
            'field' => 'comments',
            'value' => [
                'id' => 'comment-any-trigger-1',
                'verb' => 'add',
                'text' => 'totally unrelated text',
                'from' => ['id' => 'external-user-any-1'],
                'media' => ['id' => 'media-post-any-1'],
            ],
        ];

        $metaApiService = Mockery::mock(MetaApiService::class);
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        (new ProcessMetaWebhookJob($payload, 'ig-post-any-1'))->handle($metaApiService, $deeplinkService);

        Queue::assertPushed(ExecuteAutomationActionJob::class, 1);
    }

    public function test_story_flow_requires_story_reply_context_and_matching_story_id(): void
    {
        Queue::fake([ExecuteAutomationActionJob::class]);
        Cache::flush();

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-story-1',
            'fb_page_id' => 'page-story-1',
            'access_token' => 'token-story',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'story',
            'trigger_value' => 'story-123',
            'keywords' => ['info'],
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Story reply DM.',
            'is_active' => true,
        ]);

        $payload = [
            'messaging' => [
                'sender' => ['id' => 'external-user-2'],
                'message' => [
                    'mid' => 'mid-story',
                    'text' => 'info please',
                    'reply_to' => [
                        'story' => ['id' => 'story-123'],
                    ],
                ],
            ],
        ];

        $metaApiService = Mockery::mock(MetaApiService::class);
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        (new ProcessMetaWebhookJob($payload, 'ig-story-1'))->handle($metaApiService, $deeplinkService);

        Queue::assertPushed(ExecuteAutomationActionJob::class, 1);
    }

    public function test_duplicate_event_is_deduplicated_before_dispatching_action(): void
    {
        Queue::fake([ExecuteAutomationActionJob::class]);
        Cache::flush();

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-dup-1',
            'fb_page_id' => 'page-dup-1',
            'access_token' => 'token-dup',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'post',
            'trigger_value' => 'media-dup-1',
            'keywords' => ['buy'],
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Duplicate check.',
            'is_active' => true,
        ]);

        $payload = [
            'field' => 'comments',
            'value' => [
                'id' => 'comment-dup-1',
                'verb' => 'add',
                'text' => 'buy now',
                'from' => ['id' => 'external-user-3'],
                'media' => ['id' => 'media-dup-1'],
            ],
        ];

        $metaApiService = Mockery::mock(MetaApiService::class);
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        (new ProcessMetaWebhookJob($payload, 'ig-dup-1'))->handle($metaApiService, $deeplinkService);
        (new ProcessMetaWebhookJob($payload, 'ig-dup-1'))->handle($metaApiService, $deeplinkService);

        Queue::assertPushed(ExecuteAutomationActionJob::class, 1);
    }

    public function test_welcome_dm_is_sent_once_per_sender_for_enabled_account(): void
    {
        Cache::flush();

        $user = User::factory()->create();
        InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-welcome-1',
            'fb_page_id' => 'page-welcome-1',
            'access_token' => 'token-welcome',
            'status' => 'active',
            'welcome_dm_enabled' => true,
            'welcome_dm_variants' => [
                'Welcome message A',
                'Welcome message B',
                'Welcome message C',
            ],
        ]);

        $payloadOne = [
            'field' => 'messages',
            'value' => [
                'sender' => ['id' => 'sender-welcome-1'],
                'message' => [
                    'mid' => 'mid-welcome-1',
                    'text' => 'Hey there!',
                ],
            ],
        ];

        $payloadTwo = [
            'field' => 'messages',
            'value' => [
                'sender' => ['id' => 'sender-welcome-1'],
                'message' => [
                    'mid' => 'mid-welcome-2',
                    'text' => 'Checking in again',
                ],
            ],
        ];

        $metaApiService = Mockery::mock(MetaApiService::class);
        $metaApiService->shouldReceive('sendMessage')
            ->once()
            ->withArgs(function (string $accessToken, string $igAccountId, string $recipientIgId, string $messageText) {
                return $accessToken === 'token-welcome'
                    && $igAccountId === 'ig-welcome-1'
                    && $recipientIgId === 'sender-welcome-1'
                    && in_array($messageText, ['Welcome message A', 'Welcome message B', 'Welcome message C'], true);
            })
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['message_id' => 'welcome-1'],
            ]);

        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);

        (new ProcessMetaWebhookJob($payloadOne, 'ig-welcome-1'))->handle($metaApiService, $deeplinkService);
        (new ProcessMetaWebhookJob($payloadTwo, 'ig-welcome-1'))->handle($metaApiService, $deeplinkService);

        $this->assertSame(1, InstagramWelcomeDmDelivery::count());
        $this->assertDatabaseHas('instagram_welcome_dm_deliveries', [
            'recipient_ig_id' => 'sender-welcome-1',
        ]);
    }

    public function test_welcome_dm_is_not_sent_when_disabled(): void
    {
        Cache::flush();

        $user = User::factory()->create();
        InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-welcome-off-1',
            'fb_page_id' => 'page-welcome-off-1',
            'access_token' => 'token-welcome-off',
            'status' => 'active',
            'welcome_dm_enabled' => false,
            'welcome_dm_variants' => [
                'Welcome message A',
                'Welcome message B',
                'Welcome message C',
            ],
        ]);

        $payload = [
            'field' => 'messages',
            'value' => [
                'sender' => ['id' => 'sender-welcome-off-1'],
                'message' => [
                    'mid' => 'mid-welcome-off-1',
                    'text' => 'hello',
                ],
            ],
        ];

        $metaApiService = Mockery::mock(MetaApiService::class);
        $metaApiService->shouldNotReceive('sendMessage');
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);

        (new ProcessMetaWebhookJob($payload, 'ig-welcome-off-1'))->handle($metaApiService, $deeplinkService);

        $this->assertDatabaseCount('instagram_welcome_dm_deliveries', 0);
    }

    public function test_execute_action_marks_failed_when_no_active_reply_variant_exists(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-exec-1',
            'fb_page_id' => 'page-exec-1',
            'access_token' => 'token-exec',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'post',
            'trigger_value' => 'media-exec-1',
            'keywords' => ['price'],
            'opening_message_enabled' => true,
            'opening_message' => 'Hello first',
            'status' => 'active',
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldNotReceive('sendMessage');
        $mediaUrlService = Mockery::mock(MediaUrlService::class);
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);

        $job = new ExecuteAutomationActionJob(
            $flow->id,
            'trigger-no-reply-1',
            'recipient-1',
            $account->id
        );

        $job->handle($service, $mediaUrlService, $deeplinkService);

        $this->assertDatabaseHas('automation_logs', [
            'automation_flow_id' => $flow->id,
            'trigger_source_id' => 'trigger-no-reply-1',
            'recipient_ig_id' => 'recipient-1',
            'status' => 'failed',
            'error_message' => 'No active reply message (text/image) configured.',
        ]);

        $this->assertSame(1, AutomationLog::where('automation_flow_id', $flow->id)->count());
    }

    public function test_execute_action_fails_without_retry_when_meta_window_error_subcode_is_2534022(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-window-1',
            'fb_page_id' => 'page-window-1',
            'access_token' => 'token-window-1',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Window Error Flow',
            'trigger_type' => 'story',
            'trigger_value' => 'story-window-1',
            'keywords' => ['price'],
            'public_reply_enabled' => false,
            'public_comment_reply' => [],
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Thanks for your comment.',
            'is_active' => true,
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldNotReceive('sendPublicCommentReply');
        $service->shouldNotReceive('sendCommentPrivateReply');
        $service->shouldReceive('sendMessage')
            ->once()
            ->andReturn([
                'success' => false,
                'status' => 403,
                'payload' => [
                    'error' => [
                        'message' => 'Message sent outside allowed window.',
                        'code' => 10,
                        'error_subcode' => 2534022,
                    ],
                ],
            ]);
        $mediaUrlService = Mockery::mock(MediaUrlService::class);
        $mediaUrlService->shouldNotReceive('deliveryUrl');
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        $deeplinkService->shouldReceive('rewriteLinksInText')
            ->once()
            ->andReturnUsing(fn ($text) => (string) $text);

        $job = new ExecuteAutomationActionJob(
            $flow->id,
            '18201702973346602',
            'recipient-window-1',
            $account->id
        );

        $job->handle($service, $mediaUrlService, $deeplinkService);

        $this->assertDatabaseHas('automation_logs', [
            'automation_flow_id' => $flow->id,
            'trigger_source_id' => '18201702973346602',
            'recipient_ig_id' => 'recipient-window-1',
            'status' => 'failed',
            'error_code' => 403,
            'error_message' => 'Meta send blocked: outside allowed window (error_subcode=2534022).',
        ]);
    }

    public function test_execute_action_stops_before_dm_when_public_reply_fails_for_comment_flow(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-public-fail-1',
            'fb_page_id' => 'page-public-fail-1',
            'access_token' => 'token-public-fail-1',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'post',
            'trigger_value' => 'media-public-fail-1',
            'keywords' => ['price'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox.'],
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Thanks for your comment.',
            'is_active' => true,
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('sendPublicCommentReply')
            ->once()
            ->andReturn([
                'success' => false,
                'status' => 500,
                'payload' => [
                    'error' => ['message' => 'Temporary public reply failure.'],
                ],
            ]);
        $service->shouldNotReceive('sendMessage');

        $mediaUrlService = Mockery::mock(MediaUrlService::class);
        $mediaUrlService->shouldNotReceive('deliveryUrl');
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        $deeplinkService->shouldNotReceive('rewriteLinksInText');

        (new ExecuteAutomationActionJob(
            $flow->id,
            '18201702973346603',
            'recipient-public-fail-1',
            $account->id
        ))->handle($service, $mediaUrlService, $deeplinkService);

        $this->assertDatabaseHas('automation_logs', [
            'automation_flow_id' => $flow->id,
            'trigger_source_id' => '18201702973346603',
            'recipient_ig_id' => 'recipient-public-fail-1',
            'status' => 'failed',
            'error_code' => 500,
            'error_message' => 'Temporary public reply failure.',
        ]);
    }

    public function test_story_flow_skips_public_reply_and_sends_dm_directly(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-story-1',
            'fb_page_id' => 'page-story-1',
            'access_token' => 'token-story-1',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'story',
            'trigger_value' => 'story-media-1',
            'keywords' => ['price'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['This should be ignored for story flows.'],
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Story DM reply.',
            'is_active' => true,
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldNotReceive('sendPublicCommentReply');
        $service->shouldReceive('sendMessage')
            ->once()
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['message_id' => 'mid-story-1'],
            ]);

        $mediaUrlService = Mockery::mock(MediaUrlService::class);
        $mediaUrlService->shouldNotReceive('deliveryUrl');
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        $deeplinkService->shouldReceive('rewriteLinksInText')
            ->once()
            ->andReturnUsing(fn ($text) => (string) $text);

        (new ExecuteAutomationActionJob(
            $flow->id,
            'story-mid-1',
            'recipient-story-1',
            $account->id
        ))->handle($service, $mediaUrlService, $deeplinkService);

        $this->assertDatabaseHas('automation_logs', [
            'automation_flow_id' => $flow->id,
            'trigger_source_id' => 'story-mid-1',
            'recipient_ig_id' => 'recipient-story-1',
            'status' => 'sent',
        ]);
    }

    public function test_comment_flow_uses_private_reply_first_and_pauses_when_window_is_inactive(): void
    {
        Cache::flush();

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-private-first-1',
            'fb_page_id' => 'page-private-first-1',
            'access_token' => 'token-private-first-1',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'post',
            'trigger_value' => 'media-private-first-1',
            'keywords' => ['price'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox.'],
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Thanks for your comment.',
            'is_active' => true,
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('sendPublicCommentReply')
            ->once()
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['id' => 'public-reply-private-first-1'],
            ]);
        $service->shouldReceive('sendCommentPrivateReply')
            ->once()
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['message_id' => 'private-first-1'],
            ]);
        $service->shouldNotReceive('sendMessage');

        $mediaUrlService = Mockery::mock(MediaUrlService::class);
        $mediaUrlService->shouldNotReceive('deliveryUrl');
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        $deeplinkService->shouldReceive('rewriteLinksInText')
            ->once()
            ->andReturnUsing(fn ($text) => (string) $text);

        (new ExecuteAutomationActionJob(
            $flow->id,
            '18201702973346609',
            'recipient-private-first-1',
            $account->id
        ))->handle($service, $mediaUrlService, $deeplinkService);

        $this->assertDatabaseHas('automation_logs', [
            'automation_flow_id' => $flow->id,
            'trigger_source_id' => '18201702973346609',
            'recipient_ig_id' => 'recipient-private-first-1',
            'status' => 'awaiting_user_dm',
        ]);
    }

    public function test_bootstrap_postback_continuation_dispatches_reply_only_sequence(): void
    {
        Queue::fake([ExecuteAutomationActionJob::class]);
        Cache::flush();

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-bootstrap-reply-only-1',
            'fb_page_id' => 'page-bootstrap-reply-only-1',
            'access_token' => 'token-bootstrap-reply-only-1',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'post',
            'trigger_value' => 'media-bootstrap-reply-only-1',
            'keywords' => ['ebook'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['It is in your messages now.'],
            'opening_message_enabled' => true,
            'opening_message' => 'Tap below and I will send it.',
            'opening_button_text' => 'Send me',
            'status' => 'active',
        ]);

        Cache::put(
            "autodm:pending_bootstrap:{$account->id}:recipient-bootstrap-reply-only-1",
            [
                'flow_id' => $flow->id,
                'comment_trigger_id' => '18050680766546689',
                'stage' => 'awaiting_user_dm',
                'source' => 'private_reply_first',
                'created_at' => now()->toIso8601String(),
            ],
            now()->addHours(24)
        );

        $payload = [
            'messaging' => [
                'sender' => ['id' => 'recipient-bootstrap-reply-only-1'],
                'postback' => [
                    'mid' => 'aWdfZAG1faXRlbToxOklHTWVzc2FnZD',
                    'title' => 'Send me',
                    'payload' => "AUTODM_FLOW_{$flow->id}_CTA",
                ],
            ],
        ];

        $metaApiService = Mockery::mock(MetaApiService::class);
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);

        (new ProcessMetaWebhookJob($payload, 'ig-bootstrap-reply-only-1'))->handle($metaApiService, $deeplinkService);

        Queue::assertPushed(ExecuteAutomationActionJob::class, function (ExecuteAutomationActionJob $job) use ($account, $flow): bool {
            return $job->flowId === $flow->id
                && $job->triggerSourceId === 'aWdfZAG1faXRlbToxOklHTWVzc2FnZD'
                && $job->recipientIgId === 'recipient-bootstrap-reply-only-1'
                && $job->accountId === $account->id
                && $job->sequenceMode === 'reply_only';
        });
    }

    public function test_reply_only_post_flow_sends_final_dm_after_bootstrap_postback(): void
    {
        Cache::flush();

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-reply-only-post-1',
            'fb_page_id' => 'page-reply-only-post-1',
            'access_token' => 'token-reply-only-post-1',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'post',
            'trigger_value' => 'media-reply-only-post-1',
            'keywords' => ['ebook'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['It is in your messages now.'],
            'opening_message_enabled' => true,
            'opening_message' => 'Tap below and I will send it.',
            'opening_button_text' => 'Send me',
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Here is the ebook.',
            'is_active' => true,
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldNotReceive('sendPublicCommentReply');
        $service->shouldNotReceive('sendCommentPrivateReply');
        $service->shouldReceive('sendMessage')
            ->once()
            ->with('token-reply-only-post-1', 'ig-reply-only-post-1', 'recipient-reply-only-post-1', 'Here is the ebook.')
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['message_id' => 'reply-only-post-message-1'],
            ]);

        $mediaUrlService = Mockery::mock(MediaUrlService::class);
        $mediaUrlService->shouldNotReceive('deliveryUrl');
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        $deeplinkService->shouldReceive('rewriteLinksInText')
            ->twice()
            ->andReturnUsing(fn ($text) => (string) $text);

        (new ExecuteAutomationActionJob(
            $flow->id,
            'aWdfZAG1faXRlbToxOklHTWVzc2FnZD',
            'recipient-reply-only-post-1',
            $account->id,
            'reply_only'
        ))->handle($service, $mediaUrlService, $deeplinkService);

        $this->assertDatabaseHas('automation_logs', [
            'automation_flow_id' => $flow->id,
            'trigger_source_id' => 'aWdfZAG1faXRlbToxOklHTWVzc2FnZD',
            'recipient_ig_id' => 'recipient-reply-only-post-1',
            'status' => 'sent',
        ]);
    }

    public function test_full_flow_sends_opening_message_before_ask_to_follow_when_enabled(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-open-ask-1',
            'fb_page_id' => 'page-open-ask-1',
            'access_token' => 'token-open-ask-1',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'story',
            'trigger_value' => 'story-open-ask-1',
            'keywords' => ['price'],
            'opening_message_enabled' => true,
            'opening_message' => 'Opening comes first.',
            'ask_to_follow_enabled' => true,
            'ask_to_follow_strict' => true,
            'ask_to_follow_message' => 'Follow us for updates.',
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Final reply message.',
            'is_active' => true,
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('sendMessage')
            ->once()
            ->withArgs(function (string $accessToken, string $igAccountId, string $recipientIgId, string $messageText): bool {
                return $accessToken === 'token-open-ask-1'
                    && $igAccountId === 'ig-open-ask-1'
                    && $recipientIgId === 'recipient-open-ask-1'
                    && $messageText === 'Opening comes first.';
            })
            ->ordered('send_sequence')
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['message_id' => 'opening-1'],
            ]);

        $service->shouldReceive('sendButtonTemplateMessage')
            ->once()
            ->withArgs(function (
                string $accessToken,
                string $igAccountId,
                string $recipientIgId,
                string $messageText,
                array $buttons
            ): bool {
                return $accessToken === 'token-open-ask-1'
                    && $igAccountId === 'ig-open-ask-1'
                    && $recipientIgId === 'recipient-open-ask-1'
                    && $messageText === 'Follow us for updates.'
                    && count($buttons) === 2;
            })
            ->ordered('send_sequence')
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['message_id' => 'ask-follow-1'],
            ]);

        $service->shouldReceive('sendMessage')
            ->once()
            ->withArgs(function (string $accessToken, string $igAccountId, string $recipientIgId, string $messageText): bool {
                return $accessToken === 'token-open-ask-1'
                    && $igAccountId === 'ig-open-ask-1'
                    && $recipientIgId === 'recipient-open-ask-1'
                    && $messageText === 'Final reply message.';
            })
            ->ordered('send_sequence')
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['message_id' => 'reply-1'],
            ]);

        $mediaUrlService = Mockery::mock(MediaUrlService::class);
        $mediaUrlService->shouldNotReceive('deliveryUrl');
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        $deeplinkService->shouldReceive('rewriteLinksInText')
            ->twice()
            ->andReturnUsing(fn ($text) => (string) $text);

        (new ExecuteAutomationActionJob(
            $flow->id,
            'story-mid-open-ask-1',
            'recipient-open-ask-1',
            $account->id
        ))->handle($service, $mediaUrlService, $deeplinkService);

        $log = AutomationLog::query()
            ->where('automation_flow_id', $flow->id)
            ->where('trigger_source_id', 'story-mid-open-ask-1')
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertSame('sent', $log->status);
        $types = collect($log->response_payload ?? [])->pluck('type')->all();
        $this->assertSame(['opening', 'ask_to_follow', 'reply_text'], $types);
    }

    public function test_public_reply_is_sent_once_across_retryable_retries_for_same_trigger(): void
    {
        Cache::flush();

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-retry-1',
            'fb_page_id' => 'page-retry-1',
            'access_token' => 'token-retry-1',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Retryable Error Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-retry-1',
            'keywords' => ['price'],
            'opening_message_enabled' => true,
            'opening_message' => 'Opening details message.',
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox.'],
            'public_reply_limit_enabled' => false,
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Here are the details.',
            'is_active' => true,
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('sendPublicCommentReply')
            ->once()
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['id' => 'public-reply-1'],
            ]);
        $service->shouldReceive('sendCommentPrivateReply')
            ->twice()
            ->andReturn(
                [
                    'success' => true,
                    'status' => 200,
                    'payload' => ['message_id' => 'private-retry-1a'],
                ],
                [
                    'success' => true,
                    'status' => 200,
                    'payload' => ['message_id' => 'private-retry-1b'],
                ]
            );
        $service->shouldReceive('sendMessage')
            ->twice()
            ->andReturn(
                [
                    'success' => false,
                    'status' => 500,
                    'payload' => [
                        'error' => [
                            'message' => 'Temporary Meta API error.',
                            'code' => 2,
                            'error_subcode' => 0,
                        ],
                    ],
                ],
                [
                    'success' => true,
                    'status' => 200,
                    'payload' => ['message_id' => 'mid-retry-1'],
                ]
            );

        $mediaUrlService = Mockery::mock(MediaUrlService::class);
        $mediaUrlService->shouldNotReceive('deliveryUrl');
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        $deeplinkService->shouldReceive('rewriteLinksInText')
            ->times(4)
            ->andReturnUsing(fn ($text) => (string) $text);

        Cache::put(
            "autodm:window_last_inbound:{$account->id}:recipient-retry-1",
            now()->toIso8601String(),
            now()->addHours(24)
        );

        $retryableJob = new class($flow->id, '18201702973346602', 'recipient-retry-1', $account->id) extends ExecuteAutomationActionJob
        {
            private int $forcedAttempts = 1;

            public function setForcedAttempts(int $attempts): void
            {
                $this->forcedAttempts = $attempts;
            }

            public function attempts(): int
            {
                return $this->forcedAttempts;
            }
        };

        $firstRunFailed = false;
        $retryableJob->setForcedAttempts(1);
        try {
            $retryableJob->handle($service, $mediaUrlService, $deeplinkService);
        } catch (\Exception $exception) {
            $firstRunFailed = true;
            $this->assertSame('Meta send failed', $exception->getMessage());
        }

        $this->assertTrue($firstRunFailed);

        RateLimiter::clear("dm:rate:{$account->ig_account_id}");
        $retryableJob->setForcedAttempts(2);
        $retryableJob->handle($service, $mediaUrlService, $deeplinkService);

        $log = AutomationLog::query()
            ->where('automation_flow_id', $flow->id)
            ->where('trigger_source_id', '18201702973346602')
            ->first();

        $this->assertNotNull($log);
        $this->assertSame('sent', $log->status);
        $this->assertSame(
            1,
            AutomationLog::query()
                ->where('automation_flow_id', $flow->id)
                ->where('trigger_source_id', '18201702973346602')
                ->count()
        );

        $responseTypes = collect($log->response_payload ?? [])->pluck('type')->all();
        $this->assertNotContains('public_reply', $responseTypes);
    }

    public function test_successful_flow_keeps_public_reply_and_dm_behavior_unchanged(): void
    {
        Cache::flush();

        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-success-1',
            'fb_page_id' => 'page-success-1',
            'access_token' => 'token-success-1',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Success Flow',
            'trigger_type' => 'post',
            'trigger_value' => 'media-success-1',
            'keywords' => ['price'],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Thanks for commenting. Check your inbox!'],
            'public_reply_limit_enabled' => false,
            'status' => 'active',
        ]);

        AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Sending details now.',
            'is_active' => true,
        ]);

        $service = Mockery::mock(MetaApiService::class);
        $service->shouldReceive('sendPublicCommentReply')
            ->once()
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['id' => 'public-reply-success-1'],
            ]);
        $service->shouldReceive('sendCommentPrivateReply')
            ->once()
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => ['message_id' => 'private-success-1'],
            ]);
        $service->shouldNotReceive('sendMessage');

        $mediaUrlService = Mockery::mock(MediaUrlService::class);
        $mediaUrlService->shouldNotReceive('deliveryUrl');
        $deeplinkService = Mockery::mock(AutodmDeeplinkService::class);
        $deeplinkService->shouldReceive('rewriteLinksInText')
            ->once()
            ->andReturnUsing(fn ($text) => (string) $text);

        Cache::put(
            "autodm:window_last_inbound:{$account->id}:recipient-success-1",
            now()->toIso8601String(),
            now()->addHours(24)
        );

        (new ExecuteAutomationActionJob(
            $flow->id,
            '18128689504590026',
            'recipient-success-1',
            $account->id
        ))->handle($service, $mediaUrlService, $deeplinkService);

        $log = AutomationLog::query()
            ->where('automation_flow_id', $flow->id)
            ->where('trigger_source_id', '18128689504590026')
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertSame('sent', $log->status);
        $types = collect($log->response_payload ?? [])->pluck('type')->all();
        $this->assertContains('public_reply', $types);
        $this->assertContains('reply_text', $types);
    }
}
