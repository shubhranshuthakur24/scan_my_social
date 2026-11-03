<?php

namespace Tests\Feature;

use App\Jobs\DownloadPostMediaJob;
use App\Models\Channel;
use App\Services\InstagramScraperService;
use App\Services\OutlierDetectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Tests\TestCase;

class InstagramScraperMediaDispatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_fetch_run_results_de_duplicates_media_download_dispatches_per_batch(): void
    {
        Queue::fake();

        $channel = Channel::create([
            'handle' => 'scraper_batch_'.uniqid(),
            'platform' => 'instagram',
        ]);

        $dataset = [
            [
                'id' => 'duplicate-post-id',
                'type' => 'Video',
                'displayUrl' => 'https://cdn.example.com/dup.jpg',
                'ownerUsername' => 'batchuser',
                'ownerFullName' => 'Batch User',
                'timestamp' => '2026-04-20 10:00:00',
            ],
            [
                'id' => 'duplicate-post-id',
                'type' => 'Video',
                'displayUrl' => 'https://cdn.example.com/dup.jpg',
                'ownerUsername' => 'batchuser',
                'ownerFullName' => 'Batch User',
                'timestamp' => '2026-04-20 09:00:00',
            ],
        ];

        $outlierDetection = Mockery::mock(OutlierDetectionService::class);
        $outlierDetection->shouldReceive('processChannel')
            ->once()
            ->with(Mockery::on(fn (Channel $model): bool => $model->id === $channel->id));
        $this->app->instance(OutlierDetectionService::class, $outlierDetection);

        $service = new class($dataset) extends InstagramScraperService
        {
            public function __construct(private readonly array $dataset)
            {
                parent::__construct();
            }

            public function fetchRunDataset(string $runId, int $limit = 100): array
            {
                return $this->dataset;
            }
        };

        $service->fetchRunResults('run_test', 100, $channel);

        Queue::assertPushed(DownloadPostMediaJob::class, 1);
    }
}
