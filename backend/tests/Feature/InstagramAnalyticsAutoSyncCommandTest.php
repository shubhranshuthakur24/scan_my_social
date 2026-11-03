<?php

namespace Tests\Feature;

use App\Jobs\SyncInstagramAccountAnalyticsJob;
use App\Models\InstagramAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class InstagramAnalyticsAutoSyncCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_queues_refresh_only_for_active_connected_accounts(): void
    {
        Queue::fake();
        $this->travelTo(now()->setDate(2026, 5, 24)->setTime(9, 0));

        $owner = User::factory()->create();
        $activeOne = InstagramAccount::factory()->for($owner)->create([
            'status' => 'active',
            'access_token' => 'token-active-one',
        ]);
        $activeTwo = InstagramAccount::factory()->for($owner)->create([
            'status' => 'active',
            'access_token' => 'token-active-two',
        ]);
        InstagramAccount::factory()->for($owner)->disconnected()->create([
            'access_token' => 'token-disconnected',
        ]);
        InstagramAccount::factory()->for($owner)->create([
            'status' => 'active',
            'access_token' => null,
        ]);

        $this->artisan('content-scheduler:sync-instagram-analytics')
            ->assertSuccessful();

        Queue::assertPushed(SyncInstagramAccountAnalyticsJob::class, 2);
        Queue::assertPushed(SyncInstagramAccountAnalyticsJob::class, function (SyncInstagramAccountAnalyticsJob $job) use ($activeOne): bool {
            return $this->jobProperty($job, 'instagramAccountId') === $activeOne->id
                && $this->jobProperty($job, 'lifetime') === false
                && $this->jobProperty($job, 'startDate') === '2026-04-25'
                && $this->jobProperty($job, 'endDate') === '2026-05-24';
        });
        Queue::assertPushed(SyncInstagramAccountAnalyticsJob::class, function (SyncInstagramAccountAnalyticsJob $job) use ($activeTwo): bool {
            return $this->jobProperty($job, 'instagramAccountId') === $activeTwo->id
                && $this->jobProperty($job, 'lifetime') === false;
        });

        $this->travelBack();
    }

    public function test_command_lifetime_option_queues_lifetime_sync_for_specific_active_account(): void
    {
        Queue::fake();

        $owner = User::factory()->create();
        $target = InstagramAccount::factory()->for($owner)->create([
            'status' => 'active',
            'access_token' => 'token-lifetime-target',
        ]);
        InstagramAccount::factory()->for($owner)->create([
            'status' => 'active',
            'access_token' => 'token-other',
        ]);

        $this->artisan('content-scheduler:sync-instagram-analytics', [
            '--account-id' => $target->id,
            '--lifetime' => true,
        ])->assertSuccessful();

        Queue::assertPushed(SyncInstagramAccountAnalyticsJob::class, 1);
        Queue::assertPushed(SyncInstagramAccountAnalyticsJob::class, function (SyncInstagramAccountAnalyticsJob $job) use ($target): bool {
            return $this->jobProperty($job, 'instagramAccountId') === $target->id
                && $this->jobProperty($job, 'lifetime') === true
                && $this->jobProperty($job, 'startDate') === null
                && $this->jobProperty($job, 'endDate') === null;
        });
    }

    public function test_analytics_job_uses_configured_instagram_analytics_queue(): void
    {
        $job = new SyncInstagramAccountAnalyticsJob(
            userId: 1,
            instagramAccountId: 2,
            startDate: '2026-07-01',
            endDate: '2026-07-03',
        );

        $this->assertNull($job->connection);
        $this->assertSame('instagram-analytics', $job->queue);

        config(['queue.instagram_analytics_connection' => 'redis']);
        $redisJob = new SyncInstagramAccountAnalyticsJob(
            userId: 1,
            instagramAccountId: 2,
        );
        $this->assertSame('redis', $redisJob->connection);
    }

    private function jobProperty(SyncInstagramAccountAnalyticsJob $job, string $name): mixed
    {
        $reflection = new \ReflectionClass($job);
        $property = $reflection->getProperty($name);
        $property->setAccessible(true);

        return $property->getValue($job);
    }
}
