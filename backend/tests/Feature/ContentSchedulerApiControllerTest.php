<?php

namespace Tests\Feature;

use App\Jobs\PublishScheduledPostJob;
use App\Models\ContentSchedulerMedia;
use App\Models\InstagramAccount;
use App\Models\ScheduledPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ContentSchedulerApiControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/v1/instagram/scheduler')
            ->assertUnauthorized();

        $this->postJson('/api/v1/instagram/scheduler', [])
            ->assertUnauthorized();

        $this->getJson('/api/v1/instagram/media')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_list_only_their_scheduled_posts(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $otherAccount = InstagramAccount::factory()->for($otherUser)->create(['status' => 'active']);

        $userPost = ScheduledPost::factory()->for($user)->for($account)->create([
            'title' => 'My User Post',
            'caption' => 'Caption for user post',
            'scheduled_at' => now()->addDays(2),
        ]);

        $otherPost = ScheduledPost::factory()->for($otherUser)->for($otherAccount)->create([
            'title' => 'Other User Post',
            'caption' => 'Caption for other post',
            'scheduled_at' => now()->addDays(2),
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/v1/instagram/scheduler')
            ->assertOk();

        $response->assertJsonFragment(['caption' => 'Caption for user post']);
        $response->assertJsonMissing(['caption' => 'Caption for other post']);
    }

    public function test_filter_by_instagram_account_id(): void
    {
        $user = User::factory()->create();
        $account1 = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $account2 = InstagramAccount::factory()->for($user)->create(['status' => 'active']);

        $post1 = ScheduledPost::factory()->for($user)->for($account1)->create([
            'caption' => 'Account 1 Caption',
            'scheduled_at' => now()->addDays(1),
        ]);

        $post2 = ScheduledPost::factory()->for($user)->for($account2)->create([
            'caption' => 'Account 2 Caption',
            'scheduled_at' => now()->addDays(2),
        ]);

        $response = $this->actingAs($user)
            ->getJson("/api/v1/instagram/scheduler?instagram_account_id={$account1->id}")
            ->assertOk();

        $response->assertJsonFragment(['caption' => 'Account 1 Caption']);
        $response->assertJsonMissing(['caption' => 'Account 2 Caption']);
    }

    public function test_scheduling_fails_if_account_does_not_belong_to_user(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $otherAccount = InstagramAccount::factory()->for($otherUser)->create(['status' => 'active']);

        $response = $this->actingAs($user)->postJson('/api/v1/instagram/scheduler', [
            'instagram_account_id' => $otherAccount->id,
            'format' => 'image',
            'caption' => 'Test caption',
            'scheduledTime' => now()->addHours(3)->toISOString(),
            'media_asset_ids' => [1],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['instagram_account_id']);
    }

    public function test_scheduling_fails_if_scheduled_time_is_in_the_past(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);

        $response = $this->actingAs($user)->postJson('/api/v1/instagram/scheduler', [
            'instagram_account_id' => $account->id,
            'format' => 'reel',
            'caption' => 'Test reel',
            'scheduledTime' => now()->subHour()->toISOString(),
            'publish_now' => false,
            'media_asset_ids' => [1],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['scheduledTime']);
    }

    public function test_user_can_schedule_post_with_media_asset_pivot(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $media = ContentSchedulerMedia::factory()->for($user)->image()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/instagram/scheduler', [
            'instagram_account_id' => $account->id,
            'format' => 'image',
            'caption' => 'Scheduled photo caption',
            'hashtags' => ['#growth', '#marketing'],
            'scheduledTime' => now()->addHours(5)->toISOString(),
            'media_asset_ids' => [$media->id],
            'hasAutodm' => true,
            'autodmKeyword' => 'PROMO',
            'autodmReplyText' => 'Here is your link: https://example.com',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'Scheduled')
            ->assertJsonPath('format', 'IMAGE');

        $this->assertDatabaseHas('scheduled_posts', [
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'format' => 'image',
            'status' => 'scheduled',
        ]);

        $createdPostId = $response->json('id');

        $this->assertDatabaseHas('content_scheduler_media_scheduled_post', [
            'scheduled_post_id' => $createdPostId,
            'content_scheduler_media_id' => $media->id,
            'sort_order' => 0,
        ]);
    }

    public function test_publish_now_dispatches_job_immediately(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $media = ContentSchedulerMedia::factory()->for($user)->image()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/instagram/scheduler', [
            'instagram_account_id' => $account->id,
            'format' => 'image',
            'caption' => 'Instant publish caption',
            'scheduledTime' => now()->toISOString(),
            'publish_now' => true,
            'media_asset_ids' => [$media->id],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'Publishing');

        Queue::assertPushed(PublishScheduledPostJob::class);
    }

    public function test_user_can_cancel_scheduled_post(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $post = ScheduledPost::factory()->for($user)->for($account)->scheduled()->create();

        $response = $this->actingAs($user)->deleteJson("/api/v1/instagram/scheduler/{$post->id}");

        $response->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertEquals(ScheduledPost::STATUS_CANCELLED, ScheduledPost::withTrashed()->find($post->id)->status);
    }

    public function test_user_cannot_cancel_other_users_scheduled_post(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $otherAccount = InstagramAccount::factory()->for($otherUser)->create(['status' => 'active']);
        $otherPost = ScheduledPost::factory()->for($otherUser)->for($otherAccount)->scheduled()->create();

        $response = $this->actingAs($user)->deleteJson("/api/v1/instagram/scheduler/{$otherPost->id}");

        $response->assertNotFound();
        $this->assertEquals(ScheduledPost::STATUS_SCHEDULED, $otherPost->fresh()->status);
    }

    public function test_user_can_retry_failed_post(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $failedPost = ScheduledPost::factory()->for($user)->for($account)->create([
            'status' => ScheduledPost::STATUS_FAILED,
            'last_error' => 'Instagram API timeout',
        ]);

        $response = $this->actingAs($user)->postJson("/api/v1/instagram/scheduler/{$failedPost->id}/retry");

        $response->assertOk()
            ->assertJsonPath('status', 'Scheduled');

        $this->assertEquals(ScheduledPost::STATUS_SCHEDULED, $failedPost->fresh()->status);
        Queue::assertPushed(PublishScheduledPostJob::class);
    }

    public function test_user_cannot_retry_non_failed_post(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $scheduledPost = ScheduledPost::factory()->for($user)->for($account)->scheduled()->create();

        $response = $this->actingAs($user)->postJson("/api/v1/instagram/scheduler/{$scheduledPost->id}/retry");

        $response->assertStatus(422);
    }

    public function test_media_upload_and_listing_and_deletion(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        // 1. Upload
        $file = UploadedFile::fake()->image('test_post.jpg', 800, 800);

        $uploadResponse = $this->actingAs($user)->postJson('/api/v1/instagram/media', [
            'media' => $file,
            'title' => 'Sample upload image',
        ]);

        $uploadResponse->assertStatus(201)
            ->assertJsonPath('originalName', 'test_post.jpg')
            ->assertJsonPath('mediaType', 'image');

        $mediaId = $uploadResponse->json('id');
        $this->assertDatabaseHas('content_scheduler_media', [
            'id' => $mediaId,
            'user_id' => $user->id,
        ]);

        // 2. Listing
        $listResponse = $this->actingAs($user)->getJson('/api/v1/instagram/media');
        $listResponse->assertOk()
            ->assertJsonFragment(['id' => $mediaId]);

        // Other user cannot see this media
        $otherListResponse = $this->actingAs($otherUser)->getJson('/api/v1/instagram/media');
        $otherListResponse->assertOk()
            ->assertJsonMissing(['id' => $mediaId]);

        // 3. Other user cannot delete it
        $this->actingAs($otherUser)->deleteJson("/api/v1/instagram/media/{$mediaId}")
            ->assertNotFound();

        // 4. Owner can delete it
        $this->actingAs($user)->deleteJson("/api/v1/instagram/media/{$mediaId}")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertDatabaseMissing('content_scheduler_media', [
            'id' => $mediaId,
        ]);
    }

    public function test_publishing_service_retries_transient_media_download_timeout(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'status' => 'active',
            'access_token' => 'valid-token',
            'ig_account_id' => '17841400000001',
        ]);
        $media = ContentSchedulerMedia::factory()->for($user)->image()->create();

        $post = ScheduledPost::factory()->for($user)->for($account)->create([
            'format' => ScheduledPost::FORMAT_IMAGE,
            'status' => ScheduledPost::STATUS_SCHEDULED,
        ]);
        $post->media()->attach($media->id, ['sort_order' => 0]);

        // Mock MetaApiService: first container creation times out with 2207003, second succeeds
        $metaMock = \Mockery::mock(\App\Services\MetaApiService::class);
        $metaMock->shouldReceive('createMediaContainer')
            ->once()
            ->andReturn([
                'success' => false,
                'status' => 400,
                'payload' => [
                    'error' => [
                        'message' => 'Timeout',
                        'code' => -2,
                        'error_subcode' => 2207003,
                    ],
                ],
            ]);

        $metaMock->shouldReceive('createMediaContainer')
            ->once()
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => [
                    'id' => 'container-success-123',
                ],
            ]);

        $metaMock->shouldReceive('getMediaContainerStatus')
            ->once()
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => [
                    'status_code' => 'FINISHED',
                ],
            ]);

        $metaMock->shouldReceive('publishMediaContainer')
            ->once()
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => [
                    'id' => 'published-media-999',
                ],
            ]);

        $publishingService = new \App\Services\ContentSchedulerPublishingService($metaMock);
        $result = $publishingService->publish($post);

        $this->assertEquals(ScheduledPost::STATUS_PUBLISHED, $result->status);
        $this->assertEquals('published-media-999', $result->meta_media_id);
    }
}
