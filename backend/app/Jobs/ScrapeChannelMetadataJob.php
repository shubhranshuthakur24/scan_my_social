<?php

namespace App\Jobs;

use App\Models\Channel;
use App\Services\InstagramScraperService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ScrapeChannelMetadataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    public $backoff = [30, 120, 300];

    public $timeout = 120;

    protected Channel $channel;

    /**
     * Create a new job instance.
     */
    public function __construct(Channel $channel)
    {
        $this->channel = $channel;
    }

    /**
     * Execute the job.
     */
    public function handle(InstagramScraperService $scraper): void
    {
        Log::info("Initiating asynchronous scrape for channel: {$this->channel->handle} on {$this->channel->platform}");

        try {
            if ($this->channel->platform === 'instagram') {
                // Only initiate the profile scrape.
                // The polling command will handle the transition to post scraping.
                $scraper->initiateProfileScrape($this->channel);
                Log::info("Profile scrape run initiated for @{$this->channel->handle}");
            } else {
                Log::warning("Scraping for platform {$this->channel->platform} not yet implemented.");
            }
        } catch (\Exception $e) {
            Log::error('Failed to initiate channel scrape: '.$e->getMessage(), [
                'channel_id' => $this->channel->id,
                'handle' => $this->channel->handle,
            ]);
            throw $e;
        }
    }
}
