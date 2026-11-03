<?php

namespace Tests\Feature;

use App\Jobs\PublishScheduledPostJob;
use App\Models\InstagramAccount;
use App\Models\ScheduledPost;
use App\Models\User;
use App\Services\ContentSchedulerPublishingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class PublishScheduledPostJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_retryable_meta_processing_error_releases_job_with_next_delay(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();
        $post = ScheduledPost::factory()->for($user)->for($account)->due()->create();

        $publishingService = Mockery::mock(ContentSchedulerPublishingService::class);
        $publishingService->shouldReceive('publish')
            ->once()
            ->with(Mockery::on(fn (ScheduledPost $scheduledPost): bool => $scheduledPost->id === $post->id))
            ->andThrow(new RuntimeException('Meta media is still processing. Retrying publish shortly.', 2207027));

        $job = (new PublishScheduledPostJob($post->id))->withFakeQueueInteractions();
        $job->job->attempts = 4;

        $job->handle($publishingService);

        $job->assertReleased(120);
    }

    public function test_failed_logs_terminal_error_and_marks_post_failed(): void
    {
        Log::spy();

        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();
        $post = ScheduledPost::factory()->for($user)->for($account)->create([
            'status' => ScheduledPost::STATUS_PUBLISHING,
            'retry_count' => 1,
        ]);
        $post->publishAttempts()->create([
            'status' => 'retrying',
            'started_at' => now()->subMinutes(2),
            'error_message' => 'previous retry',
        ]);

        $job = new PublishScheduledPostJob($post->id);
        $job->failed(new RuntimeException('Meta publish failed permanently.'));

        $this->assertDatabaseHas('scheduled_posts', [
            'id' => $post->id,
            'status' => ScheduledPost::STATUS_FAILED,
            'retry_count' => 2,
            'last_error' => 'Meta publish failed permanently.',
        ]);
        $this->assertDatabaseHas('scheduled_post_publish_attempts', [
            'scheduled_post_id' => $post->id,
            'status' => 'failed',
            'error_message' => 'Meta publish failed permanently.',
        ]);

        Log::shouldHaveReceived('error')
            ->once()
            ->with(
                'Scheduled post publish job failed permanently',
                Mockery::on(fn (array $context): bool => $context['scheduled_post_id'] === $post->id
                    && $context['instagram_account_id'] === $account->id
                    && $context['exception_message'] === 'Meta publish failed permanently.')
            );
    }
}
