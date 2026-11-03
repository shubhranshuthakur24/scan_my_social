<?php

namespace Tests\Feature;

use App\Jobs\PublishDueScheduledPostsJob;
use App\Jobs\PublishScheduledPostJob;
use App\Jobs\SyncInstagramAccountAnalyticsJob;
use App\Models\AutomationFlow;
use App\Models\AutomationLog;
use App\Models\ContentSchedulerMedia;
use App\Models\InstagramAccount;
use App\Models\InstagramAccountInsightSnapshot;
use App\Models\InstagramAccountMediaAnalytics;
use App\Models\ScheduledPost;
use App\Models\SchedulerNote;
use App\Models\User;
use App\Services\ContentSchedulerPublishingService;
use App\Services\InstagramAccountAnalyticsSyncService;
use App\Services\MetaApiService;
use Illuminate\Auth\Access\Response as AuthorizationResponse;
use Illuminate\Contracts\Auth\Access\Gate as GateContract;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class ContentSchedulerModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_access_content_scheduler_tabs(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $this->stubMyInstaProfileLookup();

        $this->actingAs($user)->get(route('instagram.calendar'))
            ->assertInertia(fn (Assert $page) => $page->component('ContentScheduler/Calendar'));

        $this->actingAs($user)->get(route('instagram.library'))
            ->assertInertia(fn (Assert $page) => $page->component('ContentScheduler/Library'));

        $this->actingAs($user)->get(route('instagram.schedule'))
            ->assertInertia(fn (Assert $page) => $page->component('ContentScheduler/Schedule'));

        $this->actingAs($user)->get(route('instagram.analytics'))
            ->assertInertia(fn (Assert $page) => $page->component('ContentScheduler/Analytics'));

        $this->actingAs($user)->get(route('instagram.my-profile'))
            ->assertInertia(fn (Assert $page) => $page->component('ContentScheduler/MyInsta'));
    }

    public function test_authenticated_user_is_redirected_from_instagram_root_to_my_profile(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $this->stubMyInstaProfileLookup();

        $this->actingAs($user)
            ->get('/instagram')
            ->assertRedirect(route('instagram.my-profile'));
    }

    public function test_schedule_page_exposes_media_assets_for_modal_library_picker(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $asset = ContentSchedulerMedia::factory()->for($user)->video()->create([
            'title' => 'Modal picker media',
        ]);

        $this->actingAs($user)->get(route('instagram.schedule'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Schedule')
                ->has('instagram_accounts', 1)
                ->where('instagram_accounts.0.id', $account->id)
                ->has('media_assets', 1)
                ->where('media_assets.0.id', $asset->id)
                ->where('media_assets.0.media_type', 'video')
            );
    }

    public function test_schedule_page_scopes_recent_posts_to_selected_instagram_account(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $selectedAccount = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $otherAccount = InstagramAccount::factory()->for($user)->create(['status' => 'active']);

        $selectedAccountPost = ScheduledPost::factory()
            ->for($user)
            ->for($selectedAccount)
            ->scheduled()
            ->create([
                'title' => 'Selected account scheduled post',
            ]);

        ScheduledPost::factory()
            ->for($user)
            ->for($otherAccount)
            ->scheduled()
            ->create([
                'title' => 'Other account scheduled post',
            ]);

        $this->actingAs($user)->get(route('instagram.schedule', [
            'instagram_account_id' => $selectedAccount->id,
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Schedule')
                ->where('selected_instagram_account_id', $selectedAccount->id)
                ->where('connected_count', 2)
                ->has('instagram_accounts', 2)
                ->has('scheduled_posts', 1)
                ->where('scheduled_posts.0.id', $selectedAccountPost->id)
            );
    }

    public function test_calendar_exposes_scheduled_posts_for_requested_month(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();
        $post = ScheduledPost::factory()
            ->for($user)
            ->for($account)
            ->scheduled()
            ->create([
                'title' => 'Launch post',
                'scheduled_at' => '2026-05-20 22:40:00',
            ]);

        $this->actingAs($user)->get(route('instagram.calendar', ['month' => '2026-05']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Calendar')
                ->where('calendar_month', '2026-05')
                ->has('events', 1)
                ->where('events.0.id', $post->id)
                ->where('events.0.title', 'Launch post')
            );
    }

    public function test_calendar_exposes_currently_queueing_publishing_posts(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        $publishingPost = ScheduledPost::factory()
            ->for($user)
            ->for($account)
            ->create([
                'title' => 'Queueing post',
                'status' => ScheduledPost::STATUS_PUBLISHING,
                'scheduled_at' => now()->subMinutes(10),
            ]);

        ScheduledPost::factory()
            ->for($user)
            ->for($account)
            ->create([
                'title' => 'Scheduled only',
                'status' => ScheduledPost::STATUS_SCHEDULED,
                'scheduled_at' => now()->addHour(),
            ]);

        $this->actingAs($user)->get(route('instagram.calendar'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Calendar')
                ->has('queue_posts', 1)
                ->where('queue_posts.0.id', $publishingPost->id)
                ->where('queue_posts.0.status', ScheduledPost::STATUS_PUBLISHING)
            );
    }

    public function test_calendar_scopes_events_queue_and_status_counts_to_selected_instagram_account(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $selectedAccount = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $otherAccount = InstagramAccount::factory()->for($user)->create(['status' => 'active']);

        $selectedScheduledPost = ScheduledPost::factory()
            ->for($user)
            ->for($selectedAccount)
            ->scheduled()
            ->create([
                'title' => 'Selected scheduled',
                'scheduled_at' => '2026-05-10 09:00:00',
            ]);

        $selectedPublishingPost = ScheduledPost::factory()
            ->for($user)
            ->for($selectedAccount)
            ->create([
                'title' => 'Selected publishing',
                'status' => ScheduledPost::STATUS_PUBLISHING,
                'scheduled_at' => '2026-05-11 09:00:00',
            ]);

        ScheduledPost::factory()
            ->for($user)
            ->for($otherAccount)
            ->scheduled()
            ->create([
                'title' => 'Other scheduled',
                'scheduled_at' => '2026-05-12 09:00:00',
            ]);

        ScheduledPost::factory()
            ->for($user)
            ->for($otherAccount)
            ->create([
                'title' => 'Other publishing',
                'status' => ScheduledPost::STATUS_PUBLISHING,
                'scheduled_at' => '2026-05-13 09:00:00',
            ]);

        $this->actingAs($user)->get(route('instagram.calendar', [
            'month' => '2026-05',
            'instagram_account_id' => $selectedAccount->id,
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Calendar')
                ->where('selected_instagram_account_id', $selectedAccount->id)
                ->has('instagram_accounts', 2)
                ->has('events', 2)
                ->where('events.0.id', $selectedScheduledPost->id)
                ->where('events.1.id', $selectedPublishingPost->id)
                ->has('queue_posts', 1)
                ->where('queue_posts.0.id', $selectedPublishingPost->id)
                ->where('status_counts.scheduled', 1)
                ->where('status_counts.publishing', 1)
            );
    }

    public function test_user_can_upload_scheduler_media_to_configured_disk(): void
    {
        config()->set('filesystems.upload_disk', 'content_scheduler_test');
        config()->set('filesystems.disks.content_scheduler_test', [
            'driver' => 'local',
            'root' => public_path(),
            'url' => 'https://cdn.test',
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)->post(route('instagram.media.store'), [
            'media' => UploadedFile::fake()->create('launch.jpg', 120, 'image/jpeg'),
            'title' => 'Launch image',
            'default_caption' => 'Caption draft',
        ])->assertRedirect();

        $asset = ContentSchedulerMedia::query()->firstOrFail();

        $this->assertSame($user->id, $asset->user_id);
        $this->assertSame('image', $asset->media_type);
        Storage::disk('content_scheduler_test')->assertExists($asset->path);
    }

    public function test_user_can_upload_scheduler_video_up_to_two_hundred_mb(): void
    {
        config()->set('filesystems.upload_disk', 'content_scheduler_test');
        config()->set('filesystems.disks.content_scheduler_test', [
            'driver' => 'local',
            'root' => public_path(),
            'url' => 'https://cdn.test',
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)->post(route('instagram.media.store'), [
            'media' => UploadedFile::fake()->create('launch.mp4', 180 * 1024, 'video/mp4'),
        ])->assertRedirect();

        $asset = ContentSchedulerMedia::query()->firstOrFail();

        $this->assertSame($user->id, $asset->user_id);
        $this->assertSame('video', $asset->media_type);
        $this->assertSame('launch.mp4', $asset->original_name);
        Storage::disk('content_scheduler_test')->assertExists($asset->path);
    }

    public function test_scheduler_media_upload_rejects_files_over_two_hundred_mb(): void
    {
        config()->set('filesystems.upload_disk', 'content_scheduler_test');
        config()->set('filesystems.disks.content_scheduler_test', [
            'driver' => 'local',
            'root' => public_path(),
            'url' => 'https://cdn.test',
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('instagram.schedule'))
            ->post(route('instagram.media.store'), [
                'media' => UploadedFile::fake()->create('oversized.mp4', 205 * 1024, 'video/mp4'),
            ])
            ->assertRedirect(route('instagram.schedule'))
            ->assertSessionHasErrors(['media']);

        $this->assertDatabaseCount('content_scheduler_media', 0);
    }

    public function test_media_upload_authorizes_create_policy(): void
    {
        config()->set('filesystems.upload_disk', 'content_scheduler_test');
        config()->set('filesystems.disks.content_scheduler_test', [
            'driver' => 'local',
            'root' => public_path(),
            'url' => 'https://cdn.test',
        ]);

        $user = User::factory()->create();
        $gate = Mockery::mock(GateContract::class);
        $gate->shouldReceive('authorize')
            ->once()
            ->with('create', ContentSchedulerMedia::class)
            ->andReturn(AuthorizationResponse::allow());
        app()->instance(GateContract::class, $gate);

        $this->actingAs($user)->post(route('instagram.media.store'), [
            'media' => UploadedFile::fake()->create('authorized.jpg', 120, 'image/jpeg'),
        ])->assertRedirect();

        $this->assertDatabaseHas('content_scheduler_media', [
            'user_id' => $user->id,
            'original_name' => 'authorized.jpg',
        ]);
    }

    public function test_users_cannot_manage_foreign_scheduler_records(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $foreignMedia = ContentSchedulerMedia::factory()->for($owner)->image()->create();
        $foreignAccount = InstagramAccount::factory()->for($owner)->create();
        $foreignPost = ScheduledPost::factory()->for($owner)->for($foreignAccount)->scheduled()->create();
        $foreignNote = SchedulerNote::factory()->for($owner)->create();

        $this->actingAs($intruder)
            ->delete(route('instagram.media.destroy', $foreignMedia))
            ->assertForbidden();

        $this->actingAs($intruder)
            ->patch(route('instagram.posts.reschedule', $foreignPost), [
                'scheduled_at' => now()->addDay()->toDateTimeString(),
            ])
            ->assertForbidden();

        $this->actingAs($intruder)
            ->patch(route('instagram.notes.update', $foreignNote), [
                'content' => 'No access',
            ])
            ->assertForbidden();
    }

    public function test_user_can_create_multiple_scheduler_notes_for_the_same_day(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $date = now()->addDay()->toDateString();

        $this->actingAs($user)->post(route('instagram.notes.store'), [
            'note_date' => $date,
            'content' => 'Plan first launch variant',
        ])->assertRedirect();

        $this->actingAs($user)->post(route('instagram.notes.store'), [
            'note_date' => $date,
            'content' => 'Prepare backup story cut',
        ])->assertRedirect();

        $this->assertDatabaseCount('scheduler_notes', 2);

        $this->actingAs($user)->get(route('instagram.calendar', ['month' => now()->addDay()->format('Y-m')]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Calendar')
                ->has('scheduler_notes', 2)
                ->where('scheduler_notes.0.note_date', $date)
            );
    }

    public function test_cancelling_a_post_soft_deletes_it_and_hides_it_from_calendar(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();
        $post = ScheduledPost::factory()
            ->for($user)
            ->for($account)
            ->published()
            ->create([
                'scheduled_at' => '2026-05-22 03:34:00',
            ]);

        $this->actingAs($user)
            ->patch(route('instagram.posts.cancel', $post))
            ->assertRedirect();

        $this->assertSoftDeleted('scheduled_posts', [
            'id' => $post->id,
            'status' => ScheduledPost::STATUS_CANCELLED,
        ]);

        $this->actingAs($user)
            ->get(route('instagram.calendar', ['month' => '2026-05']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Calendar')
                ->has('events', 0)
            );
    }

    public function test_schedule_wizard_creates_posts_for_all_instagram_formats(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();
        $image = ContentSchedulerMedia::factory()->for($user)->image()->create();
        $secondImage = ContentSchedulerMedia::factory()->for($user)->image()->create();
        $video = ContentSchedulerMedia::factory()->for($user)->video()->create();

        $cases = [
            ScheduledPost::FORMAT_IMAGE => [$image->id],
            ScheduledPost::FORMAT_VIDEO => [$video->id],
            ScheduledPost::FORMAT_REEL => [$video->id],
            ScheduledPost::FORMAT_STORY => [$image->id],
            ScheduledPost::FORMAT_CAROUSEL => [$image->id, $secondImage->id],
        ];

        foreach ($cases as $format => $mediaIds) {
            $this->actingAs($user)->post(route('instagram.posts.store'), [
                'instagram_account_id' => $account->id,
                'title' => "Test {$format}",
                'format' => $format,
                'status' => ScheduledPost::STATUS_SCHEDULED,
                'caption' => "Caption {$format}",
                'hashtags' => ['launch', 'test'],
                'media_asset_ids' => $mediaIds,
                'scheduled_at' => now()->addDay()->toDateTimeString(),
                'options' => [],
            ])->assertRedirect(route('instagram.schedule'));

            $this->assertDatabaseHas('scheduled_posts', [
                'user_id' => $user->id,
                'instagram_account_id' => $account->id,
                'format' => $format,
                'status' => ScheduledPost::STATUS_SCHEDULED,
            ]);
        }
    }

    public function test_post_now_queues_publish_job_without_future_schedule_delay(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $image = ContentSchedulerMedia::factory()->for($user)->image()->create();
        $startedAt = now();

        $this->actingAs($user)->post(route('instagram.posts.store'), [
            'instagram_account_id' => $account->id,
            'title' => 'Post now test',
            'format' => ScheduledPost::FORMAT_IMAGE,
            'status' => ScheduledPost::STATUS_SCHEDULED,
            'caption' => 'Publish this immediately.',
            'hashtags' => ['launch', 'now'],
            'media_asset_ids' => [$image->id],
            'scheduled_at' => null,
            'publish_now' => true,
            'options' => [],
        ])->assertRedirect(route('instagram.schedule'))
            ->assertSessionHas('success', 'Publishing queued.');

        $post = ScheduledPost::query()->sole();

        $this->assertSame(ScheduledPost::STATUS_PUBLISHING, $post->status);
        $this->assertNotNull($post->scheduled_at);
        $this->assertTrue($post->scheduled_at->greaterThanOrEqualTo($startedAt->copy()->subSecond()));
        $this->assertTrue($post->scheduled_at->lessThanOrEqualTo(now()->addSecond()));
        $this->assertDatabaseHas('content_scheduler_media_scheduled_post', [
            'scheduled_post_id' => $post->id,
            'content_scheduler_media_id' => $image->id,
            'sort_order' => 0,
        ]);

        Queue::assertPushed(PublishScheduledPostJob::class, function (PublishScheduledPostJob $job) use ($post): bool {
            return $job->scheduledPostId === $post->id;
        });
    }

    public function test_scheduling_a_continued_draft_updates_the_existing_draft_post(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $oldMedia = ContentSchedulerMedia::factory()->for($user)->image()->create();
        $newMedia = ContentSchedulerMedia::factory()->for($user)->image()->create();

        $draft = ScheduledPost::factory()
            ->for($user)
            ->for($account)
            ->create([
                'status' => ScheduledPost::STATUS_DRAFT,
                'format' => ScheduledPost::FORMAT_IMAGE,
                'title' => 'Old draft title',
                'caption' => 'Old draft caption',
            ]);
        $draft->media()->sync([$oldMedia->id => ['sort_order' => 0]]);

        $scheduledAt = now()->addDay()->toDateTimeString();

        $this->actingAs($user)->post(route('instagram.posts.store'), [
            'draft_post_id' => $draft->id,
            'instagram_account_id' => $account->id,
            'title' => 'Updated scheduled title',
            'format' => ScheduledPost::FORMAT_IMAGE,
            'status' => ScheduledPost::STATUS_SCHEDULED,
            'caption' => 'Updated scheduled caption',
            'hashtags' => ['updated', 'draft'],
            'media_asset_ids' => [$newMedia->id],
            'scheduled_at' => $scheduledAt,
            'options' => [],
        ])->assertRedirect(route('instagram.schedule'));

        $this->assertDatabaseCount('scheduled_posts', 1);
        $this->assertDatabaseHas('scheduled_posts', [
            'id' => $draft->id,
            'status' => ScheduledPost::STATUS_SCHEDULED,
            'title' => 'Updated scheduled title',
            'caption' => 'Updated scheduled caption',
        ]);
        $this->assertDatabaseHas('content_scheduler_media_scheduled_post', [
            'scheduled_post_id' => $draft->id,
            'content_scheduler_media_id' => $newMedia->id,
            'sort_order' => 0,
        ]);
        $this->assertDatabaseMissing('content_scheduler_media_scheduled_post', [
            'scheduled_post_id' => $draft->id,
            'content_scheduler_media_id' => $oldMedia->id,
        ]);
    }

    public function test_schedule_validation_blocks_past_times_disconnected_accounts_and_invalid_media(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->disconnected()->create();
        $image = ContentSchedulerMedia::factory()->for($user)->image()->create();

        $this->actingAs($user)->post(route('instagram.posts.store'), [
            'instagram_account_id' => $account->id,
            'format' => ScheduledPost::FORMAT_VIDEO,
            'status' => ScheduledPost::STATUS_SCHEDULED,
            'media_asset_ids' => [$image->id],
            'scheduled_at' => now()->subMinute()->toDateTimeString(),
        ])->assertSessionHasErrors(['instagram_account_id', 'media_asset_ids', 'scheduled_at']);
    }

    public function test_due_publish_dispatcher_claims_posts_before_queueing(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();
        $duePost = ScheduledPost::factory()->for($user)->for($account)->due()->create([
            'last_error' => 'Previous failure.',
        ]);
        $futurePost = ScheduledPost::factory()->for($user)->for($account)->scheduled()->create();

        app(PublishDueScheduledPostsJob::class)->handle();
        app(PublishDueScheduledPostsJob::class)->handle();

        Queue::assertPushed(PublishScheduledPostJob::class, function (PublishScheduledPostJob $job) use ($duePost): bool {
            return $job->scheduledPostId === $duePost->id;
        });
        Queue::assertPushed(PublishScheduledPostJob::class, 1);

        $this->assertDatabaseHas('scheduled_posts', [
            'id' => $duePost->id,
            'status' => ScheduledPost::STATUS_PUBLISHING,
            'last_error' => null,
        ]);
        $this->assertDatabaseHas('scheduled_posts', [
            'id' => $futurePost->id,
            'status' => ScheduledPost::STATUS_SCHEDULED,
        ]);
    }

    public function test_due_publish_service_creates_container_and_marks_post_published(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'ig_account_id' => 'ig-publish-1',
            'access_token' => 'token-publish-1',
        ]);
        $asset = ContentSchedulerMedia::factory()->for($user)->image()->create([
            'url' => 'https://cdn.example.com/publish.jpg',
        ]);
        $post = ScheduledPost::factory()->for($user)->for($account)->due()->create([
            'format' => ScheduledPost::FORMAT_IMAGE,
            'caption' => 'Ready to publish',
        ]);
        $post->media()->attach($asset->id, ['sort_order' => 0]);

        $metaApi = Mockery::mock(MetaApiService::class);
        $metaApi->shouldReceive('createMediaContainer')
            ->once()
            ->with('token-publish-1', 'ig-publish-1', Mockery::on(fn (array $payload): bool => $payload['image_url'] === 'https://cdn.example.com/publish.jpg'))
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['id' => 'container-1']]);
        $metaApi->shouldReceive('getMediaContainerStatus')
            ->once()
            ->with('token-publish-1', 'ig-publish-1', 'container-1')
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['status_code' => 'FINISHED', 'status' => 'FINISHED']]);
        $metaApi->shouldReceive('publishMediaContainer')
            ->once()
            ->with('token-publish-1', 'ig-publish-1', 'container-1')
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['id' => 'media-1']]);

        app()->instance(MetaApiService::class, $metaApi);

        app(ContentSchedulerPublishingService::class)->publish($post);

        $this->assertDatabaseHas('scheduled_posts', [
            'id' => $post->id,
            'status' => ScheduledPost::STATUS_PUBLISHED,
            'meta_container_id' => 'container-1',
            'meta_media_id' => 'media-1',
        ]);
        $this->assertDatabaseHas('scheduled_post_publish_attempts', [
            'scheduled_post_id' => $post->id,
            'status' => 'success',
        ]);
    }

    public function test_due_publish_service_uses_reels_media_type_for_video_format(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'ig_account_id' => 'ig-video-1',
            'access_token' => 'token-video-1',
        ]);
        $asset = ContentSchedulerMedia::factory()->for($user)->video()->create([
            'url' => 'https://cdn.example.com/video.mp4',
        ]);
        $post = ScheduledPost::factory()->for($user)->for($account)->due()->create([
            'format' => ScheduledPost::FORMAT_VIDEO,
            'caption' => 'Video payload contract',
        ]);
        $post->media()->attach($asset->id, ['sort_order' => 0]);

        $metaApi = Mockery::mock(MetaApiService::class);
        $metaApi->shouldReceive('createMediaContainer')
            ->once()
            ->with('token-video-1', 'ig-video-1', Mockery::on(function (array $payload): bool {
                return ($payload['media_type'] ?? null) === 'REELS'
                    && ($payload['video_url'] ?? null) === 'https://cdn.example.com/video.mp4'
                    && ($payload['share_to_feed'] ?? null) === true;
            }))
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['id' => 'container-video-1']]);
        $metaApi->shouldReceive('getMediaContainerStatus')
            ->once()
            ->with('token-video-1', 'ig-video-1', 'container-video-1')
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['status_code' => 'FINISHED', 'status' => 'FINISHED']]);
        $metaApi->shouldReceive('publishMediaContainer')
            ->once()
            ->with('token-video-1', 'ig-video-1', 'container-video-1')
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['id' => 'media-video-1']]);

        app()->instance(MetaApiService::class, $metaApi);

        app(ContentSchedulerPublishingService::class)->publish($post);

        $this->assertDatabaseHas('scheduled_posts', [
            'id' => $post->id,
            'status' => ScheduledPost::STATUS_PUBLISHED,
            'meta_container_id' => 'container-video-1',
            'meta_media_id' => 'media-video-1',
        ]);
    }

    public function test_due_publish_service_logs_full_publish_payload_for_video_format(): void
    {
        Log::spy();

        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'ig_account_id' => 'ig-video-log-1',
            'access_token' => 'token-video-log-1',
        ]);
        $asset = ContentSchedulerMedia::factory()->for($user)->video()->create([
            'url' => 'https://cdn.example.com/video-log.mp4',
        ]);
        $post = ScheduledPost::factory()->for($user)->for($account)->due()->create([
            'format' => ScheduledPost::FORMAT_VIDEO,
            'caption' => 'Video payload log contract',
            'hashtags' => ['flow', 'r2'],
        ]);
        $post->media()->attach($asset->id, ['sort_order' => 0]);

        $metaApi = Mockery::mock(MetaApiService::class);
        $metaApi->shouldReceive('createMediaContainer')
            ->once()
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['id' => 'container-video-log-1']]);
        $metaApi->shouldReceive('getMediaContainerStatus')
            ->once()
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['status_code' => 'FINISHED', 'status' => 'FINISHED']]);
        $metaApi->shouldReceive('publishMediaContainer')
            ->once()
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['id' => 'media-video-log-1']]);

        app()->instance(MetaApiService::class, $metaApi);

        app(ContentSchedulerPublishingService::class)->publish($post);

        Log::shouldHaveReceived('info')
            ->once()
            ->with(
                'Meta content scheduler publish payload prepared',
                Mockery::on(function (array $context) use ($post): bool {
                    return $context['scheduled_post_id'] === $post->id
                        && $context['format'] === ScheduledPost::FORMAT_VIDEO
                        && ($context['payload']['video_url'] ?? null) === 'https://cdn.example.com/video-log.mp4'
                        && ($context['payload']['media_type'] ?? null) === 'REELS'
                        && ($context['payload']['share_to_feed'] ?? null) === true
                        && str_contains((string) ($context['payload']['caption'] ?? ''), '#flow')
                        && str_contains((string) ($context['payload']['caption'] ?? ''), '#r2');
                })
            );
    }

    public function test_publish_service_processes_preclaimed_post(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'ig_account_id' => 'ig-preclaimed-1',
            'access_token' => 'token-preclaimed-1',
        ]);
        $asset = ContentSchedulerMedia::factory()->for($user)->image()->create([
            'url' => 'https://cdn.example.com/preclaimed.jpg',
        ]);
        $post = ScheduledPost::factory()->for($user)->for($account)->due()->create([
            'format' => ScheduledPost::FORMAT_IMAGE,
            'status' => ScheduledPost::STATUS_PUBLISHING,
            'caption' => 'Already claimed',
        ]);
        $post->media()->attach($asset->id, ['sort_order' => 0]);

        $metaApi = Mockery::mock(MetaApiService::class);
        $metaApi->shouldReceive('createMediaContainer')
            ->once()
            ->with('token-preclaimed-1', 'ig-preclaimed-1', Mockery::on(fn (array $payload): bool => $payload['image_url'] === 'https://cdn.example.com/preclaimed.jpg'))
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['id' => 'container-preclaimed-1']]);
        $metaApi->shouldReceive('getMediaContainerStatus')
            ->once()
            ->with('token-preclaimed-1', 'ig-preclaimed-1', 'container-preclaimed-1')
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['status_code' => 'FINISHED', 'status' => 'FINISHED']]);
        $metaApi->shouldReceive('publishMediaContainer')
            ->once()
            ->with('token-preclaimed-1', 'ig-preclaimed-1', 'container-preclaimed-1')
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['id' => 'media-preclaimed-1']]);

        app()->instance(MetaApiService::class, $metaApi);

        app(ContentSchedulerPublishingService::class)->publish($post);

        $this->assertDatabaseHas('scheduled_posts', [
            'id' => $post->id,
            'status' => ScheduledPost::STATUS_PUBLISHED,
            'meta_container_id' => 'container-preclaimed-1',
            'meta_media_id' => 'media-preclaimed-1',
        ]);
    }

    public function test_failed_post_retry_queues_publish_job_for_owner(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();
        $post = ScheduledPost::factory()->for($user)->for($account)->create([
            'status' => ScheduledPost::STATUS_FAILED,
            'last_error' => 'Meta failed.',
        ]);

        $this->actingAs($user)
            ->post(route('instagram.posts.retry', $post))
            ->assertRedirect();

        Queue::assertPushed(PublishScheduledPostJob::class);
        $this->assertDatabaseHas('scheduled_posts', [
            'id' => $post->id,
            'status' => ScheduledPost::STATUS_SCHEDULED,
            'last_error' => null,
        ]);
    }

    public function test_publish_service_marks_attempt_retrying_and_bubbles_retryable_media_not_ready_error(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'ig_account_id' => 'ig-retry-1',
            'access_token' => 'token-retry-1',
        ]);
        $asset = ContentSchedulerMedia::factory()->for($user)->video()->create([
            'url' => 'https://cdn.example.com/retry.mp4',
        ]);
        $post = ScheduledPost::factory()->for($user)->for($account)->due()->create([
            'format' => ScheduledPost::FORMAT_REEL,
            'caption' => 'Retry me',
        ]);
        $post->media()->attach($asset->id, ['sort_order' => 0]);

        $metaApi = Mockery::mock(MetaApiService::class);
        $metaApi->shouldReceive('createMediaContainer')
            ->once()
            ->with('token-retry-1', 'ig-retry-1', Mockery::type('array'))
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['id' => 'container-retry-1']]);
        $metaApi->shouldReceive('getMediaContainerStatus')
            ->once()
            ->with('token-retry-1', 'ig-retry-1', 'container-retry-1')
            ->andReturn(['success' => true, 'status' => 200, 'payload' => ['status_code' => 'FINISHED', 'status' => 'FINISHED']]);
        $metaApi->shouldReceive('publishMediaContainer')
            ->once()
            ->with('token-retry-1', 'ig-retry-1', 'container-retry-1')
            ->andReturn([
                'success' => false,
                'status' => 400,
                'payload' => [
                    'error' => [
                        'message' => 'Media ID is not available',
                        'code' => 9007,
                        'error_subcode' => 2207027,
                    ],
                ],
            ]);

        app()->instance(MetaApiService::class, $metaApi);

        try {
            app(ContentSchedulerPublishingService::class)->publish($post);
            $this->fail('Expected retryable RuntimeException was not thrown.');
        } catch (RuntimeException $exception) {
            $this->assertSame(2207027, $exception->getCode());
        }

        $this->assertDatabaseHas('scheduled_posts', [
            'id' => $post->id,
            'status' => ScheduledPost::STATUS_PUBLISHING,
        ]);
        $this->assertDatabaseHas('scheduled_post_publish_attempts', [
            'scheduled_post_id' => $post->id,
            'status' => 'retrying',
        ]);
    }

    public function test_analytics_page_exposes_only_owned_instagram_metrics_even_when_platform_source_is_requested(): void
    {
        $this->withoutVite();
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $ownerAccount = InstagramAccount::factory()->for($owner)->create(['status' => 'active']);
        $otherAccount = InstagramAccount::factory()->for($other)->create(['status' => 'active']);

        InstagramAccountMediaAnalytics::factory()
            ->for($owner, 'user')
            ->for($ownerAccount, 'instagramAccount')
            ->create([
                'reach' => 120,
                'impressions' => 200,
                'engagement' => 30,
                'posted_at' => now()->subHour(),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($other, 'user')
            ->for($otherAccount, 'instagramAccount')
            ->create([
                'reach' => 999,
                'impressions' => 999,
                'engagement' => 999,
                'posted_at' => now()->subMinutes(30),
            ]);

        $start = now()->subDay()->toDateString();
        $end = now()->addDay()->toDateString();

        $this->actingAs($owner)->get(route('instagram.analytics', [
            'source' => 'platform',
            'start' => $start,
            'end' => $end,
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Analytics')
                ->missing('source')
                ->where('selected_instagram_account_id', $ownerAccount->id)
                ->where('selected_account.id', $ownerAccount->id)
                ->where('date_range.start', $start)
                ->where('date_range.end', $end)
                ->where('date_range.days', 3)
                ->has('daily_metrics', 3)
                ->has('format_breakdown', 5)
                ->where('overview.posts', 1)
                ->where('overview.reach', 120)
                ->where('overview.impressions', 200)
                ->where('overview.engagement', 30)
                ->where('overview.total_posts', 1)
                ->where('overview.comparison.posts.current', 1)
                ->where('overview.comparison.posts.previous', 0)
            );
    }

    public function test_instagram_analytics_respects_selected_instagram_account_filter(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $selectedAccount = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $otherAccount = InstagramAccount::factory()->for($user)->create(['status' => 'active']);

        $start = now()->subDay()->toDateString();
        $end = now()->toDateString();

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($selectedAccount, 'instagramAccount')
            ->create([
                'reach' => 321,
                'impressions' => 654,
                'engagement' => 87,
                'posted_at' => now()->subHours(2),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($selectedAccount, 'instagramAccount')
            ->create([
                'reach' => 8000,
                'impressions' => 9000,
                'engagement' => 500,
                'posted_at' => now()->subDays(12),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($otherAccount, 'instagramAccount')
            ->create([
                'reach' => 999,
                'impressions' => 999,
                'engagement' => 999,
                'posted_at' => now()->subHour(),
            ]);

        $this->actingAs($user)
            ->get(route('instagram.analytics', [
                'instagram_account_id' => $selectedAccount->id,
                'start' => $start,
                'end' => $end,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Analytics')
                ->where('selected_instagram_account_id', $selectedAccount->id)
                ->where('date_range.start', $start)
                ->where('date_range.end', $end)
                ->where('date_range.days', 2)
                ->where('overview.reach', 321)
                ->where('overview.impressions', 654)
                ->where('overview.engagement', 87)
                ->where('overview.total_posts', 1)
            );
    }

    public function test_analytics_sync_requires_an_active_instagram_account_selection(): void
    {
        Queue::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('instagram.analytics.sync'))
            ->assertSessionHasErrors(['instagram_account_id']);

        Queue::assertNothingPushed();
    }

    public function test_analytics_page_includes_previous_period_deltas_for_key_kpis(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $start = now()->subDay()->toDateString();
        $end = now()->toDateString();

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'reach' => 120,
                'impressions' => 200,
                'engagement' => 25,
                'posted_at' => now()->subHours(3),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'reach' => 80,
                'impressions' => 150,
                'engagement' => 20,
                'posted_at' => now()->subDay()->addHours(2),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'reach' => 50,
                'impressions' => 70,
                'engagement' => 10,
                'posted_at' => now()->subDays(2)->addHours(2),
            ]);

        $this->actingAs($user)->get(route('instagram.analytics', [
            'instagram_account_id' => $account->id,
            'start' => $start,
            'end' => $end,
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Analytics')
                ->where('overview.comparison.posts.current', 2)
                ->where('overview.comparison.posts.previous', 1)
                ->where('overview.comparison.posts.delta', 1)
                ->where('overview.comparison.posts.trend', 'up')
                ->where('overview.comparison.reach.current', 200)
                ->where('overview.comparison.reach.previous', 50)
                ->where('overview.comparison.impressions.current', 350)
                ->where('overview.comparison.impressions.previous', 70)
                ->where('overview.comparison.engagement.current', 45)
                ->where('overview.comparison.engagement.previous', 10)
            );
    }

    public function test_analytics_page_can_render_instagram_account_mode_with_only_owned_media_metrics(): void
    {
        $this->withoutVite();
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $start = now()->subDays(7)->toDateString();
        $end = now()->toDateString();

        $ownerAccount = InstagramAccount::factory()->for($owner)->create([
            'status' => 'active',
            'username' => 'owner.analytics',
        ]);

        $otherAccount = InstagramAccount::factory()->for($other)->create([
            'status' => 'active',
            'username' => 'other.analytics',
        ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($owner, 'user')
            ->for($ownerAccount, 'instagramAccount')
            ->create([
                'format' => 'image',
                'reach' => 350,
                'impressions' => 720,
                'engagement' => 100,
                'likes' => 70,
                'comments' => 12,
                'posted_at' => now()->subDays(2),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($owner, 'user')
            ->for($ownerAccount, 'instagramAccount')
            ->create([
                'format' => 'reel',
                'reach' => 150,
                'impressions' => 310,
                'engagement' => 45,
                'likes' => 35,
                'comments' => 5,
                'posted_at' => now()->subDay(),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($other, 'user')
            ->for($otherAccount, 'instagramAccount')
            ->create([
                'reach' => 9999,
                'impressions' => 9999,
                'engagement' => 9999,
                'posted_at' => now()->subDay(),
            ]);

        InstagramAccountInsightSnapshot::factory()
            ->for($owner, 'user')
            ->for($ownerAccount, 'instagramAccount')
            ->create([
                'snapshot_date' => now()->subDays(2)->toDateString(),
                'reach' => 400,
                'impressions' => 800,
                'follower_count' => 1000,
            ]);

        InstagramAccountInsightSnapshot::factory()
            ->for($owner, 'user')
            ->for($ownerAccount, 'instagramAccount')
            ->create([
                'snapshot_date' => now()->subDay()->toDateString(),
                'reach' => 100,
                'impressions' => 230,
                'follower_count' => 1015,
            ]);

        $this->actingAs($owner)->get(route('instagram.analytics', [
            'instagram_account_id' => $ownerAccount->id,
            'start' => $start,
            'end' => $end,
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Analytics')
                ->where('selected_instagram_account_id', $ownerAccount->id)
                ->where('selected_account.username', 'owner.analytics')
                ->where('date_range.start', $start)
                ->where('date_range.end', $end)
                ->where('date_range.preset', 'custom')
                ->where('overview.total_posts', 2)
                ->where('overview.reach', 500)
                ->where('overview.impressions', 1030)
                ->where('overview.engagement', 145)
                ->where('overview.followers', 1015)
                ->where('format_breakdown.0.count', 1)
                ->where('format_breakdown.1.count', 1)
            );
    }

    public function test_analytics_page_falls_back_to_media_impressions_when_legacy_snapshot_rows_lack_impressions_metric(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $start = now()->subDays(2)->toDateString();
        $end = now()->toDateString();

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'reach' => 350,
                'impressions' => 720,
                'engagement' => 100,
                'posted_at' => now()->subDays(2),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'reach' => 150,
                'impressions' => 310,
                'engagement' => 45,
                'posted_at' => now()->subDay(),
            ]);

        InstagramAccountInsightSnapshot::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'snapshot_date' => now()->subDays(2)->toDateString(),
                'reach' => 400,
                'impressions' => 0,
                'follower_count' => 1000,
                'raw_metrics' => [
                    'data' => [
                        ['name' => 'reach', 'values' => [['value' => 400]]],
                        ['name' => 'profile_views', 'values' => [['value' => 80]]],
                        ['name' => 'follower_count', 'values' => [['value' => 1000]]],
                    ],
                ],
            ]);

        InstagramAccountInsightSnapshot::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'snapshot_date' => now()->subDay()->toDateString(),
                'reach' => 100,
                'impressions' => 0,
                'follower_count' => 1015,
                'raw_metrics' => [
                    'data' => [
                        ['name' => 'reach', 'values' => [['value' => 100]]],
                        ['name' => 'profile_views', 'values' => [['value' => 45]]],
                        ['name' => 'follower_count', 'values' => [['value' => 1015]]],
                    ],
                ],
            ]);

        $this->actingAs($user)->get(route('instagram.analytics', [
            'instagram_account_id' => $account->id,
            'start' => $start,
            'end' => $end,
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Analytics')
                ->where('overview.reach', 500)
                ->where('overview.impressions', 1030)
                ->where('overview.engagement', 145)
                ->where('daily_metrics.0.impressions', 720)
                ->where('daily_metrics.1.impressions', 310)
            );
    }

    public function test_analytics_page_includes_daily_continent_breakdown_for_selected_date(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $start = now()->subDays(2)->toDateString();
        $end = now()->toDateString();
        $targetDate = now()->subDay()->toDateString();

        InstagramAccountInsightSnapshot::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'snapshot_date' => $targetDate,
                'reach' => 100000,
                'impressions' => 140000,
                'raw_metrics' => [
                    'daily_continent_breakdown' => [
                        $targetDate => [
                            'Asia' => [
                                'reach' => 70000,
                                'impressions' => 95000,
                                'engagement' => 8500,
                            ],
                            'Europe' => [
                                'reach' => 30000,
                                'impressions' => 45000,
                                'engagement' => 3200,
                            ],
                        ],
                    ],
                ],
            ]);

        $this->actingAs($user)->get(route('instagram.analytics', [
            'instagram_account_id' => $account->id,
            'start' => $start,
            'end' => $end,
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Analytics')
                ->where('daily_metric_details.'.$targetDate.'.continents.0.continent', 'Asia')
                ->where('daily_metric_details.'.$targetDate.'.continents.0.reach', 70000)
                ->where('daily_metric_details.'.$targetDate.'.continents.0.impressions', 95000)
                ->where('daily_metric_details.'.$targetDate.'.continents.0.engagement', 8500)
                ->where('daily_metric_details.'.$targetDate.'.continents.0.share_percent', 70)
                ->where('daily_metric_details.'.$targetDate.'.continents.1.continent', 'Europe')
            );
    }

    public function test_analytics_page_returns_empty_instagram_payload_when_user_has_no_active_accounts(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        InstagramAccount::factory()->for($user)->create([
            'status' => 'disconnected',
        ]);

        $this->actingAs($user)->get(route('instagram.analytics'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Analytics')
                ->has('instagram_accounts', 1)
                ->where('has_active_account', false)
                ->where('active_connected_count', 0)
                ->where('selected_instagram_account_id', null)
                ->where('selected_account.id', null)
                ->where('date_range.preset', 'last_30_days')
                ->has('daily_metrics', 30)
                ->has('daily_metric_details', 30)
                ->has('format_breakdown', 5)
                ->where('overview.total_posts', 0)
                ->where('overview.posts', 0)
                ->where('overview.reach', 0)
                ->where('overview.impressions', 0)
                ->where('overview.engagement', 0)
                ->where('overview.comparison.reach.trend', 'none')
            );
    }

    public function test_analytics_page_caps_requested_date_range_to_ninety_days(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create(['status' => 'active']);
        $requestedStart = now()->subDays(220)->toDateString();
        $requestedEnd = now()->toDateString();
        $expectedClampedStart = now()->subDays(89)->toDateString();

        $this->actingAs($user)->get(route('instagram.analytics', [
            'instagram_account_id' => $account->id,
            'start' => $requestedStart,
            'end' => $requestedEnd,
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Analytics')
                ->where('date_range.start', $expectedClampedStart)
                ->where('date_range.end', $requestedEnd)
                ->where('date_range.days', 90)
                ->has('daily_metrics', 90)
            );
    }

    public function test_analytics_sync_caps_requested_date_range_to_ninety_days_when_queueing_job(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'status' => 'active',
        ]);
        $requestedStart = now()->subDays(220)->toDateString();
        $requestedEnd = now()->toDateString();
        $expectedClampedStart = now()->subDays(89)->toDateString();

        $this->actingAs($user)
            ->post(route('instagram.analytics.sync'), [
                'instagram_account_id' => $account->id,
                'start' => $requestedStart,
                'end' => $requestedEnd,
            ])
            ->assertRedirect();

        Queue::assertPushed(SyncInstagramAccountAnalyticsJob::class, function (SyncInstagramAccountAnalyticsJob $job) use ($user, $account, $expectedClampedStart, $requestedEnd): bool {
            $reflection = new \ReflectionClass($job);
            $userIdProperty = $reflection->getProperty('userId');
            $accountIdProperty = $reflection->getProperty('instagramAccountId');
            $startDateProperty = $reflection->getProperty('startDate');
            $endDateProperty = $reflection->getProperty('endDate');

            $userIdProperty->setAccessible(true);
            $accountIdProperty->setAccessible(true);
            $startDateProperty->setAccessible(true);
            $endDateProperty->setAccessible(true);

            return $userIdProperty->getValue($job) === $user->id
                && $accountIdProperty->getValue($job) === $account->id
                && $startDateProperty->getValue($job) === $expectedClampedStart
                && $endDateProperty->getValue($job) === $requestedEnd
                && $job->queue === 'instagram-analytics';
        });
    }

    public function test_my_insta_page_scopes_feed_to_selected_owned_account(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $ownerPrimaryAccount = InstagramAccount::factory()->for($owner)->create([
            'username' => 'owner.primary',
            'profile_url' => 'https://www.instagram.com/owner.primary/',
        ]);
        $ownerSecondaryAccount = InstagramAccount::factory()->for($owner)->create([
            'username' => 'owner.secondary',
        ]);
        $otherAccount = InstagramAccount::factory()->for($other)->create();

        InstagramAccountMediaAnalytics::factory()
            ->for($owner, 'user')
            ->for($ownerPrimaryAccount, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'owner-primary-new',
                'caption' => 'Primary newest',
                'posted_at' => now()->subHour(),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($owner, 'user')
            ->for($ownerPrimaryAccount, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'owner-primary-old',
                'caption' => 'Primary oldest',
                'posted_at' => now()->subHours(3),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($owner, 'user')
            ->for($ownerSecondaryAccount, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'owner-secondary',
                'caption' => 'Secondary account row',
                'posted_at' => now()->subHours(2),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($other, 'user')
            ->for($otherAccount, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'other-user-row',
                'caption' => 'Other user row',
                'posted_at' => now()->subMinutes(20),
            ]);

        $this->actingAs($owner)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $ownerPrimaryAccount->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('selected_instagram_account_id', $ownerPrimaryAccount->id)
                ->has('feed_posts.data', 2)
                ->where('feed_posts.data.0.instagram_media_id', 'owner-primary-new')
                ->where('feed_posts.data.1.instagram_media_id', 'owner-primary-old')
            );
    }

    public function test_my_insta_page_marks_matching_rows_when_autodm_flow_is_active_or_paused(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'username' => 'autodm.marker',
        ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'paused-flow-media',
                'caption' => 'Paused flow row',
                'posted_at' => now()->subHour(),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'no-flow-media',
                'caption' => 'No flow row',
                'posted_at' => now()->subHours(2),
            ]);

        AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Paused marker flow',
            'trigger_type' => 'story',
            'trigger_value' => 'paused-flow-media',
            'status' => 'paused',
        ]);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('feed_posts.data.0.instagram_media_id', 'paused-flow-media')
                ->where('feed_posts.data.0.autodm_running', true)
                ->where('feed_posts.data.1.instagram_media_id', 'no-flow-media')
                ->where('feed_posts.data.1.autodm_running', false)
            );
    }

    public function test_my_insta_page_filters_by_post_format_and_updates_totals(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-filter-image',
                'format' => 'image',
                'likes' => 2,
                'comments' => 3,
                'reach' => 4,
                'impressions' => 5,
                'posted_at' => now()->subHours(3),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-filter-reel',
                'format' => 'reel',
                'media_type' => 'REELS',
                'likes' => 10,
                'comments' => 20,
                'reach' => 30,
                'impressions' => 40,
                'posted_at' => now()->subHours(2),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-filter-story',
                'format' => 'story',
                'media_type' => 'STORY',
                'likes' => 7,
                'comments' => 8,
                'reach' => 9,
                'impressions' => 10,
                'posted_at' => now()->subHour(),
            ]);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
                'format' => 'reel',
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('filters.format', 'reel')
                ->where('filters.autodm', 'all')
                ->has('feed_posts.data', 1)
                ->where('feed_posts.data.0.instagram_media_id', 'my-insta-filter-reel')
                ->where('account_totals.posts', 1)
                ->where('account_totals.likes', 10)
                ->where('account_totals.comments', 20)
                ->where('account_totals.reach', 30)
                ->where('account_totals.impressions', 40)
            );
    }

    public function test_my_insta_page_filters_by_multiple_post_formats_and_updates_totals(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-filter-post-multi',
                'format' => 'image',
                'media_type' => 'IMAGE',
                'likes' => 4,
                'comments' => 5,
                'reach' => 6,
                'impressions' => 7,
                'posted_at' => now()->subHours(3),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-filter-reel-multi',
                'format' => 'reel',
                'media_type' => 'REELS',
                'likes' => 10,
                'comments' => 20,
                'reach' => 30,
                'impressions' => 40,
                'posted_at' => now()->subHours(2),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-filter-story-multi',
                'format' => 'story',
                'media_type' => 'STORY',
                'likes' => 7,
                'comments' => 8,
                'reach' => 9,
                'impressions' => 10,
                'posted_at' => now()->subHour(),
            ]);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
                'format' => 'post,reel',
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('filters.format', 'post,reel')
                ->where('filters.autodm', 'all')
                ->has('feed_posts.data', 2)
                ->where('feed_posts.data', function ($rows): bool {
                    $mediaIds = collect($rows)
                        ->map(fn (array $row): string => (string) ($row['instagram_media_id'] ?? ''))
                        ->filter()
                        ->values();

                    return $mediaIds->contains('my-insta-filter-post-multi')
                        && $mediaIds->contains('my-insta-filter-reel-multi')
                        && ! $mediaIds->contains('my-insta-filter-story-multi');
                })
                ->where('account_totals.posts', 2)
                ->where('account_totals.likes', 14)
                ->where('account_totals.comments', 25)
                ->where('account_totals.reach', 36)
                ->where('account_totals.impressions', 47)
            );
    }

    public function test_my_insta_hides_expired_stories_from_feed_and_totals(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-visible-image',
                'format' => 'image',
                'media_type' => 'IMAGE',
                'likes' => 3,
                'comments' => 4,
                'reach' => 5,
                'impressions' => 6,
                'posted_at' => now()->subHour(),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-visible-story',
                'format' => 'story',
                'media_type' => 'STORY',
                'permalink' => 'https://www.instagram.com/stories/coach.ravikant/100000000001/',
                'likes' => 7,
                'comments' => 8,
                'reach' => 9,
                'impressions' => 10,
                'posted_at' => now()->subHours(12),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-expired-story',
                'format' => 'video',
                'media_type' => 'VIDEO',
                'permalink' => 'https://www.instagram.com/stories/coach.ravikant/100000000002/',
                'raw_media' => [
                    'media_product_type' => 'STORIES',
                ],
                'likes' => 50,
                'comments' => 60,
                'reach' => 70,
                'impressions' => 80,
                'posted_at' => now()->subHours(30),
            ]);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->has('feed_posts.data', 2)
                ->where('feed_posts.data', function ($rows): bool {
                    $mediaIds = collect($rows)
                        ->map(fn (array $row): string => (string) ($row['instagram_media_id'] ?? ''))
                        ->filter()
                        ->values();

                    return $mediaIds->contains('my-insta-visible-image')
                        && $mediaIds->contains('my-insta-visible-story')
                        && ! $mediaIds->contains('my-insta-expired-story');
                })
                ->where('account_totals.posts', 2)
                ->where('account_totals.likes', 10)
                ->where('account_totals.comments', 12)
                ->where('account_totals.reach', 14)
                ->where('account_totals.impressions', 16)
            );

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
                'format' => 'story',
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('filters.format', 'story')
                ->has('feed_posts.data', 1)
                ->where('feed_posts.data.0.instagram_media_id', 'my-insta-visible-story')
                ->where('account_totals.posts', 1)
                ->where('account_totals.likes', 7)
                ->where('account_totals.comments', 8)
                ->where('account_totals.reach', 9)
                ->where('account_totals.impressions', 10)
            );
    }

    public function test_my_insta_page_filters_by_autodm_state_and_updates_totals(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-autodm-filter-active',
                'likes' => 11,
                'comments' => 12,
                'reach' => 13,
                'impressions' => 14,
                'posted_at' => now()->subHour(),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-autodm-filter-paused',
                'likes' => 31,
                'comments' => 32,
                'reach' => 33,
                'impressions' => 34,
                'posted_at' => now()->subHours(2),
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-autodm-filter-none',
                'likes' => 21,
                'comments' => 22,
                'reach' => 23,
                'impressions' => 24,
                'posted_at' => now()->subHours(3),
            ]);

        AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Active flow for active filter',
            'trigger_type' => 'story',
            'trigger_value' => 'my-insta-autodm-filter-active',
            'status' => 'active',
        ]);

        AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Paused flow for paused filter',
            'trigger_type' => 'story',
            'trigger_value' => 'my-insta-autodm-filter-paused',
            'status' => 'paused',
        ]);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
                'autodm' => 'active',
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('filters.format', 'all')
                ->where('filters.autodm', 'active')
                ->has('feed_posts.data', 1)
                ->where('feed_posts.data.0.instagram_media_id', 'my-insta-autodm-filter-active')
                ->where('feed_posts.data.0.autodm_running', true)
                ->where('account_totals.posts', 1)
                ->where('account_totals.likes', 11)
                ->where('account_totals.comments', 12)
                ->where('account_totals.reach', 13)
                ->where('account_totals.impressions', 14)
            );

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
                'autodm' => 'paused',
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('filters.format', 'all')
                ->where('filters.autodm', 'paused')
                ->has('feed_posts.data', 1)
                ->where('feed_posts.data.0.instagram_media_id', 'my-insta-autodm-filter-paused')
                ->where('feed_posts.data.0.autodm_running', true)
                ->where('account_totals.posts', 1)
                ->where('account_totals.likes', 31)
                ->where('account_totals.comments', 32)
                ->where('account_totals.reach', 33)
                ->where('account_totals.impressions', 34)
            );

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
                'autodm' => 'none',
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('filters.format', 'all')
                ->where('filters.autodm', 'none')
                ->has('feed_posts.data', 1)
                ->where('feed_posts.data.0.instagram_media_id', 'my-insta-autodm-filter-none')
                ->where('feed_posts.data.0.autodm_running', false)
                ->where('account_totals.posts', 1)
                ->where('account_totals.likes', 21)
                ->where('account_totals.comments', 22)
                ->where('account_totals.reach', 23)
                ->where('account_totals.impressions', 24)
            );
    }

    public function test_my_insta_page_filters_by_date_range_and_updates_totals(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-date-range-in-1',
                'likes' => 10,
                'comments' => 11,
                'reach' => 12,
                'impressions' => 13,
                'posted_at' => now()->subDays(2),
                'format' => 'image',
                'media_type' => 'IMAGE',
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-date-range-in-2',
                'likes' => 20,
                'comments' => 21,
                'reach' => 22,
                'impressions' => 23,
                'posted_at' => now()->subDay(),
                'format' => 'image',
                'media_type' => 'IMAGE',
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'my-insta-date-range-out',
                'likes' => 30,
                'comments' => 31,
                'reach' => 32,
                'impressions' => 33,
                'posted_at' => now()->subDays(20),
                'format' => 'image',
                'media_type' => 'IMAGE',
            ]);

        $start = now()->subDays(3)->toDateString();
        $end = now()->subDay()->toDateString();

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
                'start' => $start,
                'end' => $end,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('filters.start', $start)
                ->where('filters.end', $end)
                ->has('feed_posts.data', 2)
                ->where('feed_posts.data.0.instagram_media_id', 'my-insta-date-range-in-2')
                ->where('feed_posts.data.1.instagram_media_id', 'my-insta-date-range-in-1')
                ->where('account_totals.posts', 2)
                ->where('account_totals.likes', 30)
                ->where('account_totals.comments', 32)
                ->where('account_totals.reach', 34)
                ->where('account_totals.impressions', 36)
            );
    }

    public function test_my_insta_page_preserves_filters_in_pagination_links(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();
        $start = now()->subDays(7)->toDateString();
        $end = now()->toDateString();

        foreach (range(1, 20) as $index) {
            InstagramAccountMediaAnalytics::factory()
                ->for($user, 'user')
                ->for($account, 'instagramAccount')
                ->create([
                    'instagram_media_id' => 'my-insta-filter-pagination-'.$index,
                    'format' => 'story',
                    'posted_at' => now()->subMinutes($index),
                ]);
        }

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
                'format' => 'story',
                'autodm' => 'none',
                'start' => $start,
                'end' => $end,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('filters.format', 'story')
                ->where('filters.autodm', 'none')
                ->where('filters.start', $start)
                ->where('filters.end', $end)
                ->where('feed_posts.next_page_url', fn (?string $url): bool => is_string($url)
                    && str_contains($url, 'page=2')
                    && str_contains($url, 'format=story')
                    && str_contains($url, 'autodm=none')
                    && str_contains($url, "start={$start}")
                    && str_contains($url, "end={$end}"))
            );
    }

    public function test_my_insta_page_exposes_autodm_kpis_scoped_to_selected_account(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $selectedAccount = InstagramAccount::factory()->for($user)->create();
        $otherAccount = InstagramAccount::factory()->for($user)->create();

        $activeFlow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $selectedAccount->id,
            'name' => 'Selected active flow',
            'trigger_type' => 'post',
            'trigger_value' => 'selected-active-media',
            'status' => 'active',
        ]);

        $pausedFlow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $selectedAccount->id,
            'name' => 'Selected paused flow',
            'trigger_type' => 'reel',
            'trigger_value' => 'selected-paused-media',
            'status' => 'paused',
        ]);

        $otherAccountFlow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $otherAccount->id,
            'name' => 'Other account flow',
            'trigger_type' => 'story',
            'trigger_value' => 'other-media',
            'status' => 'active',
        ]);

        $archivedFlow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $selectedAccount->id,
            'name' => 'Archived selected flow',
            'trigger_type' => 'post',
            'trigger_value' => 'selected-archived-media',
            'status' => 'archived',
        ]);

        AutomationLog::query()->insert([
            [
                'automation_flow_id' => $activeFlow->id,
                'trigger_source_id' => 'selected-active-run-queued',
                'recipient_ig_id' => 'recipient-active-queued',
                'status' => 'queued',
                'created_at' => now()->subDay(),
                'updated_at' => now()->subDay(),
            ],
            [
                'automation_flow_id' => $activeFlow->id,
                'trigger_source_id' => 'selected-active-run-sent',
                'recipient_ig_id' => 'recipient-active-sent',
                'status' => 'sent',
                'created_at' => now()->subHours(12),
                'updated_at' => now()->subHours(12),
            ],
            [
                'automation_flow_id' => $activeFlow->id,
                'trigger_source_id' => 'selected-active-run-failed',
                'recipient_ig_id' => 'recipient-active-failed',
                'status' => 'failed',
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDays(2),
            ],
            [
                'automation_flow_id' => $pausedFlow->id,
                'trigger_source_id' => 'selected-paused-run-sent',
                'recipient_ig_id' => 'recipient-paused-sent',
                'status' => 'sent',
                'created_at' => now()->subDays(6),
                'updated_at' => now()->subDays(6),
            ],
            [
                'automation_flow_id' => $pausedFlow->id,
                'trigger_source_id' => 'selected-paused-run-old',
                'recipient_ig_id' => 'recipient-paused-old',
                'status' => 'failed',
                'created_at' => now()->subDays(8),
                'updated_at' => now()->subDays(8),
            ],
            [
                'automation_flow_id' => $otherAccountFlow->id,
                'trigger_source_id' => 'other-account-run',
                'recipient_ig_id' => 'recipient-other',
                'status' => 'sent',
                'created_at' => now()->subDay(),
                'updated_at' => now()->subDay(),
            ],
            [
                'automation_flow_id' => $archivedFlow->id,
                'trigger_source_id' => 'selected-archived-run',
                'recipient_ig_id' => 'recipient-archived',
                'status' => 'sent',
                'created_at' => now()->subDays(3),
                'updated_at' => now()->subDays(3),
            ],
        ]);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $selectedAccount->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('selected_instagram_account_id', $selectedAccount->id)
                ->where('autodm_kpis.total_automations', 3)
                ->where('autodm_kpis.active_automations', 1)
                ->where('autodm_kpis.paused_automations', 1)
                ->where('autodm_kpis.runs_last_7_days', 5)
            );
    }

    public function test_my_insta_page_returns_zero_autodm_kpis_without_selected_account(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('instagram.my-profile'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('selected_instagram_account_id', null)
                ->where('autodm_kpis.total_automations', 0)
                ->where('autodm_kpis.active_automations', 0)
                ->where('autodm_kpis.paused_automations', 0)
                ->where('autodm_kpis.runs_last_7_days', 0)
            );
    }

    public function test_my_insta_page_includes_profile_url_for_selected_account_payload(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'username' => 'profile.payload',
            'profile_url' => 'https://www.instagram.com/profile.payload/',
        ]);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('selected_instagram_account_id', $account->id)
                ->where('instagram_accounts.0.profile_url', 'https://www.instagram.com/profile.payload/')
            );
    }

    public function test_my_insta_page_paginates_feed_posts(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        foreach (range(1, 20) as $index) {
            InstagramAccountMediaAnalytics::factory()
                ->for($user, 'user')
                ->for($account, 'instagramAccount')
                ->create([
                    'instagram_media_id' => 'paginated-'.$index,
                    'posted_at' => now()->subMinutes($index),
                ]);
        }

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('feed_posts.current_page', 1)
                ->has('feed_posts.data', 18)
                ->where('feed_posts.next_page_url', fn (?string $url): bool => is_string($url) && str_contains($url, 'page=2'))
            );

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
                'page' => 2,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('feed_posts.current_page', 2)
                ->has('feed_posts.data', 2)
            );
    }

    public function test_my_insta_account_totals_are_account_wide_not_page_limited(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        foreach (range(1, 20) as $index) {
            InstagramAccountMediaAnalytics::factory()
                ->for($user, 'user')
                ->for($account, 'instagramAccount')
                ->create([
                    'likes' => 1,
                    'comments' => 2,
                    'reach' => 3,
                    'impressions' => 4,
                    'posted_at' => now()->subMinutes($index),
                ]);
        }

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->has('feed_posts.data', 18)
                ->where('account_totals.posts', 20)
                ->where('account_totals.likes', 20)
                ->where('account_totals.comments', 40)
                ->where('account_totals.reach', 60)
                ->where('account_totals.impressions', 80)
            );
    }

    public function test_my_insta_prefers_thumbnail_for_reel_and_video_rows(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'format' => 'reel',
                'media_type' => 'VIDEO',
                'media_url' => 'https://cdn.example.com/reel-video.mp4',
                'thumbnail_url' => 'https://cdn.example.com/reel-thumb.jpg',
                'posted_at' => now()->subHour(),
            ]);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('feed_posts.data.0.media_url', 'https://cdn.example.com/reel-video.mp4')
                ->where('feed_posts.data.0.preview_media_url', 'https://cdn.example.com/reel-thumb.jpg')
                ->where('feed_posts.data.0.thumbnail_url', 'https://cdn.example.com/reel-thumb.jpg')
            );
    }

    public function test_my_insta_page_does_not_refresh_visible_post_media_urls_during_render(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'status' => 'active',
            'access_token' => 'token-refresh-visible',
            'ig_account_id' => '17841400000009999',
            'profile_picture_synced_at' => now(),
        ]);

        $row = InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'refresh-visible-1',
                'media_type' => 'IMAGE',
                'format' => 'image',
                'media_url' => 'https://cdn.example.com/old-image.jpg',
                'thumbnail_url' => 'https://cdn.example.com/old-thumb.jpg',
                'permalink' => 'https://www.instagram.com/p/old/',
                'posted_at' => now()->subHour(),
            ]);

        $metaApiService = Mockery::mock(MetaApiService::class);
        $metaApiService->shouldReceive('fetchUserMedia')
            ->never();
        $metaApiService->shouldReceive('fetchUserStories')
            ->never();
        $metaApiService->shouldReceive('fetchInstagramAccountsFromToken')
            ->never();

        $this->app->instance(MetaApiService::class, $metaApiService);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('feed_posts.data.0.media_url', 'https://cdn.example.com/old-image.jpg')
                ->where('feed_posts.data.0.preview_media_url', 'https://cdn.example.com/old-image.jpg')
                ->where('feed_posts.data.0.thumbnail_url', 'https://cdn.example.com/old-thumb.jpg')
                ->where('feed_posts.data.0.permalink', 'https://www.instagram.com/p/old/')
            );

        $this->assertDatabaseHas('instagram_account_media_analytics', [
            'id' => $row->id,
            'media_url' => 'https://cdn.example.com/old-image.jpg',
            'thumbnail_url' => 'https://cdn.example.com/old-thumb.jpg',
            'permalink' => 'https://www.instagram.com/p/old/',
        ]);
    }

    public function test_my_insta_resolves_story_format_from_raw_media_product_type(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'format' => 'video',
                'media_type' => 'VIDEO',
                'permalink' => 'https://www.instagram.com/stories/coach.ravikant/3671378347729070625/',
                'raw_media' => [
                    'media_product_type' => 'STORIES',
                ],
                'posted_at' => now()->subHour(),
            ]);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('feed_posts.data.0.format', 'story')
                ->where('feed_posts.data.0.media_product_type', 'STORIES')
            );
    }

    public function test_my_insta_includes_story_specific_insights_for_story_rows(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'format' => 'story',
                'media_type' => 'STORY',
                'permalink' => 'https://www.instagram.com/stories/coach.ravikant/3671378347729070626/',
                'story_replies' => 11,
                'story_taps_forward' => 120,
                'story_taps_back' => 45,
                'story_exits' => 9,
                'posted_at' => now()->subHours(2),
            ]);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('feed_posts.data.0.format', 'story')
                ->where('feed_posts.data.0.story_replies', 11)
                ->where('feed_posts.data.0.story_taps_forward', 120)
                ->where('feed_posts.data.0.story_taps_back', 45)
                ->where('feed_posts.data.0.story_exits', 9)
            );
    }

    public function test_my_insta_refreshes_selected_account_profile_picture_and_persists_it(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'ig_account_id' => '17841400000000001',
            'status' => 'active',
            'profile_picture_url' => null,
            'profile_picture_synced_at' => now()->subDays(2),
        ]);

        $this->stubMyInstaProfileLookup([[
            'ig_id' => '17841400000000001',
            'username' => 'coach.ravikant',
            'profile_url' => 'https://www.instagram.com/coach.ravikant/',
            'profile_picture_url' => 'https://cdn.example.com/coach-profile.jpg',
        ]], 1);

        $this->actingAs($user)
            ->get(route('instagram.my-profile', [
                'instagram_account_id' => $account->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('selected_instagram_account_id', $account->id)
                ->where('instagram_accounts.0.profile_picture_url', 'https://cdn.example.com/coach-profile.jpg')
            );

        $this->assertDatabaseHas('instagram_accounts', [
            'id' => $account->id,
            'profile_picture_url' => 'https://cdn.example.com/coach-profile.jpg',
            'profile_url' => 'https://www.instagram.com/coach.ravikant/',
            'username' => 'coach.ravikant',
        ]);
    }

    public function test_user_can_queue_instagram_account_analytics_sync_from_analytics_page(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'status' => 'active',
        ]);
        $start = now()->subDays(14)->toDateString();
        $end = now()->toDateString();

        $this->actingAs($user)
            ->post(route('instagram.analytics.sync'), [
                'instagram_account_id' => $account->id,
                'start' => $start,
                'end' => $end,
            ])
            ->assertRedirect();

        Queue::assertPushed(SyncInstagramAccountAnalyticsJob::class, function (SyncInstagramAccountAnalyticsJob $job) use ($user, $account, $start, $end): bool {
            $reflection = new \ReflectionClass($job);
            $userIdProperty = $reflection->getProperty('userId');
            $accountIdProperty = $reflection->getProperty('instagramAccountId');
            $startDateProperty = $reflection->getProperty('startDate');
            $endDateProperty = $reflection->getProperty('endDate');

            $userIdProperty->setAccessible(true);
            $accountIdProperty->setAccessible(true);
            $startDateProperty->setAccessible(true);
            $endDateProperty->setAccessible(true);

            return $userIdProperty->getValue($job) === $user->id
                && $accountIdProperty->getValue($job) === $account->id
                && $startDateProperty->getValue($job) === $start
                && $endDateProperty->getValue($job) === $end
                && $job->queue === 'instagram-analytics';
        });
    }

    public function test_instagram_analytics_sync_service_persists_story_specific_insights_metrics(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'access_token' => 'token-story-sync',
            'ig_account_id' => '17841400000008888',
        ]);
        $storyTimestamp = now()->subHours(6)->toIso8601String();

        $metaApiService = Mockery::mock(MetaApiService::class);
        $metaApiService->shouldReceive('fetchUserInsights')
            ->once()
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => [
                    'data' => [],
                ],
            ]);
        $metaApiService->shouldReceive('fetchUserMedia')
            ->once()
            ->with('token-story-sync', '17841400000008888', null, 50)
            ->andReturn([
                'data' => [],
                'paging' => [
                    'next_cursor' => null,
                    'has_next_page' => false,
                ],
            ]);
        $metaApiService->shouldReceive('fetchUserStories')
            ->once()
            ->with('token-story-sync', '17841400000008888', null, 50)
            ->andReturn([
                'data' => [[
                    'id' => 'story-sync-1',
                    'media_type' => 'STORY',
                    'media_product_type' => 'STORIES',
                    'media_url' => 'https://cdn.example.com/story-sync-1.jpg',
                    'thumbnail_url' => null,
                    'permalink' => 'https://www.instagram.com/stories/coach.ravikant/3671378347729070627/',
                    'timestamp' => $storyTimestamp,
                ]],
                'paging' => [
                    'next_cursor' => null,
                    'has_next_page' => false,
                ],
            ]);
        $metaApiService->shouldReceive('fetchMediaInsights')
            ->once()
            ->with(
                'token-story-sync',
                'story-sync-1',
                ['reach', 'views', 'replies', 'taps_forward', 'taps_back', 'exits']
            )
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => [
                    'data' => [
                        ['name' => 'reach', 'values' => [['value' => 456]]],
                        ['name' => 'views', 'values' => [['value' => 678]]],
                        ['name' => 'replies', 'values' => [['value' => 12]]],
                        ['name' => 'taps_forward', 'values' => [['value' => 90]]],
                        ['name' => 'taps_back', 'values' => [['value' => 34]]],
                        ['name' => 'exits', 'values' => [['value' => 5]]],
                    ],
                ],
            ]);

        $this->app->instance(MetaApiService::class, $metaApiService);

        $result = $this->app->make(InstagramAccountAnalyticsSyncService::class)->syncRange(
            $account,
            now()->subDay()->startOfDay(),
            now()->endOfDay()
        );

        $this->assertSame(1, $result['synced']);
        $this->assertSame(1, $result['considered']);
        $this->assertDatabaseHas('instagram_account_media_analytics', [
            'instagram_account_id' => $account->id,
            'instagram_media_id' => 'story-sync-1',
            'format' => 'story',
            'story_replies' => 12,
            'story_taps_forward' => 90,
            'story_taps_back' => 34,
            'story_exits' => 5,
            'reach' => 456,
            'impressions' => 678,
        ]);
    }

    public function test_instagram_analytics_sync_service_persists_account_impressions_from_user_insights(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'access_token' => 'token-account-sync',
            'ig_account_id' => '17841400000009999',
        ]);
        $targetDate = now()->subDay()->toDateString();

        $metaApiService = Mockery::mock(MetaApiService::class);
        $metaApiService->shouldReceive('fetchUserInsights')
            ->once()
            ->with(
                'token-account-sync',
                '17841400000009999',
                ['reach', 'views', 'profile_views', 'follower_count'],
                'day',
                Mockery::type('int'),
                Mockery::type('int'),
            )
            ->andReturn([
                'success' => true,
                'status' => 200,
                'payload' => [
                    'data' => [
                        [
                            'name' => 'reach',
                            'values' => [
                                ['end_time' => "{$targetDate}T07:00:00+0000", 'value' => 456],
                            ],
                        ],
                        [
                            'name' => 'views',
                            'values' => [
                                ['end_time' => "{$targetDate}T07:00:00+0000", 'value' => 789],
                            ],
                        ],
                        [
                            'name' => 'profile_views',
                            'values' => [
                                ['end_time' => "{$targetDate}T07:00:00+0000", 'value' => 21],
                            ],
                        ],
                        [
                            'name' => 'follower_count',
                            'values' => [
                                ['end_time' => "{$targetDate}T07:00:00+0000", 'value' => 1234],
                            ],
                        ],
                    ],
                ],
            ]);
        $metaApiService->shouldReceive('fetchUserMedia')
            ->once()
            ->with('token-account-sync', '17841400000009999', null, 50)
            ->andReturn([
                'data' => [],
                'paging' => [
                    'next_cursor' => null,
                    'has_next_page' => false,
                ],
            ]);
        $metaApiService->shouldReceive('fetchUserStories')
            ->once()
            ->with('token-account-sync', '17841400000009999', null, 50)
            ->andReturn([
                'data' => [],
                'paging' => [
                    'next_cursor' => null,
                    'has_next_page' => false,
                ],
            ]);

        $this->app->instance(MetaApiService::class, $metaApiService);

        $result = $this->app->make(InstagramAccountAnalyticsSyncService::class)->syncRange(
            $account,
            now()->subDays(2)->startOfDay(),
            now()->endOfDay()
        );

        $this->assertSame(0, $result['synced']);
        $this->assertSame(0, $result['considered']);
        $this->assertDatabaseHas('instagram_account_insight_snapshots', [
            'instagram_account_id' => $account->id,
            'snapshot_date' => now()->subDay()->startOfDay()->toDateTimeString(),
            'reach' => 456,
            'impressions' => 789,
            'profile_views' => 21,
            'follower_count' => 1234,
        ]);
    }

    public function test_post_details_endpoint_returns_json_details_for_valid_post(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create([
            'status' => 'active',
            'access_token' => 'test-token-123',
            'ig_account_id' => 'ig-acc-123',
        ]);

        $post = InstagramAccountMediaAnalytics::factory()->create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'instagram_media_id' => 'test-media-id-456',
            'likes' => 100,
            'comments' => 10,
            'reach' => 1000,
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'trigger_type' => 'post',
            'trigger_value' => 'test-media-id-456',
            'name' => 'Test AutoDM Flow',
            'status' => 'active',
            'opening_message' => 'Hello there!',
        ]);

        $metaApi = Mockery::mock(MetaApiService::class);
        $metaApi->shouldReceive('fetchMediaComments')
            ->once()
            ->with('test-token-123', 'ig-acc-123', 'test-media-id-456', 15)
            ->andReturn([
                'data' => [
                    [
                        'id' => 'comment-1',
                        'text' => 'Great post!',
                        'from' => ['username' => 'test_viewer'],
                        'timestamp' => '2026-06-11T18:00:00+0000',
                    ],
                ],
            ]);
        $this->app->instance(MetaApiService::class, $metaApi);

        $response = $this->actingAs($user)
            ->get(route('instagram.posts.details', ['instagram_media_id' => 'test-media-id-456']))
            ->assertOk()
            ->assertJsonStructure([
                'post' => [
                    'id', 'instagram_media_id', 'reach', 'likes', 'comments',
                ],
                'flow' => [
                    'id', 'name', 'status', 'opening_message',
                ],
                'comments' => [
                    ['id', 'text', 'from', 'timestamp'],
                ],
            ]);

        $this->assertSame(100, $response->json('post.likes'));
        $this->assertSame('Hello there!', $response->json('flow.opening_message'));
        $this->assertSame('Great post!', $response->json('comments.0.text'));
    }

    public function test_post_details_endpoint_returns_404_for_foreign_or_missing_post(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $account = InstagramAccount::factory()->for($otherUser)->create();
        $post = InstagramAccountMediaAnalytics::factory()->create([
            'user_id' => $otherUser->id,
            'instagram_account_id' => $account->id,
            'instagram_media_id' => 'foreign-media-id',
        ]);

        $this->actingAs($user)
            ->get(route('instagram.posts.details', ['instagram_media_id' => 'foreign-media-id']))
            ->assertNotFound();

        $this->actingAs($user)
            ->get(route('instagram.posts.details', ['instagram_media_id' => 'non-existent-id']))
            ->assertNotFound();
    }

    public function test_instagram_pages_handle_disconnected_account_and_suppress_stale_data(): void
    {
        $this->withoutVite();
        $this->stubMyInstaProfileLookup();
        $user = User::factory()->create();

        $account = InstagramAccount::factory()
            ->for($user)
            ->disconnected()
            ->create([
                'username' => 'urbangearhubs',
            ]);

        InstagramAccountMediaAnalytics::factory()
            ->for($user, 'user')
            ->for($account, 'instagramAccount')
            ->create([
                'instagram_media_id' => 'stale-post-1',
                'caption' => 'Stale cached post',
                'likes' => 150,
                'comments' => 20,
                'reach' => 1200,
                'posted_at' => now()->subDay(),
            ]);

        ScheduledPost::factory()
            ->for($user)
            ->for($account)
            ->scheduled()
            ->create([
                'scheduled_at' => now()->addDays(2),
            ]);

        // 1. My Profile
        $this->actingAs($user)->get(route('instagram.my-profile'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/MyInsta')
                ->where('has_active_account', false)
                ->where('active_connected_count', 0)
                ->where('disconnectToast.account_id', $account->id)
                ->where('disconnectToast.username', 'urbangearhubs')
                ->has('feed_posts.data', 0)
                ->where('account_totals.posts', 0)
                ->where('account_totals.likes', 0)
                ->where('account_totals.comments', 0)
                ->where('account_totals.reach', 0)
                ->where('autodm_kpis.active_automations', 0)
                ->where('autodm_kpis.total_automations', 0)
            );

        // 2. Calendar
        $this->actingAs($user)->get(route('instagram.calendar'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Calendar')
                ->where('has_active_account', false)
                ->where('active_connected_count', 0)
                ->where('disconnectToast.account_id', $account->id)
                ->has('events', 0)
                ->has('queue_posts', 0)
                ->where('status_counts.scheduled', 0)
                ->where('status_counts.published', 0)
                ->where('status_counts.in_queue', 0)
                ->where('status_counts.failed', 0)
            );

        // 3. Schedule
        $this->actingAs($user)->get(route('instagram.schedule'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Schedule')
                ->where('has_active_account', false)
                ->where('active_connected_count', 0)
                ->where('disconnectToast.account_id', $account->id)
                ->has('scheduled_posts', 0)
            );

        // 4. Analytics
        $this->actingAs($user)->get(route('instagram.analytics'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ContentScheduler/Analytics')
                ->where('has_active_account', false)
                ->where('disconnectToast.account_id', $account->id)
            );
    }

    private function stubMyInstaProfileLookup(array $accounts = [], int $times = 0): void
    {
        $metaApiService = Mockery::mock(MetaApiService::class);
        $emptyMediaResponse = [
            'data' => [],
            'paging' => [
                'next_cursor' => null,
                'has_next_page' => false,
            ],
        ];

        if ($times > 0) {
            $metaApiService->shouldReceive('fetchInstagramAccountsFromToken')
                ->times($times)
                ->andReturn($accounts);
        } else {
            $metaApiService->shouldReceive('fetchInstagramAccountsFromToken')
                ->andReturn($accounts);
        }

        $metaApiService->shouldReceive('fetchUserMedia')
            ->andReturn($emptyMediaResponse);

        $metaApiService->shouldReceive('fetchUserStories')
            ->andReturn($emptyMediaResponse);

        $this->app->instance(MetaApiService::class, $metaApiService);
    }
}
