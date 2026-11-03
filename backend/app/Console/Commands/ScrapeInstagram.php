<?php

namespace App\Console\Commands;

use App\Services\InstagramScraperService;
use Illuminate\Console\Command;

class ScrapeInstagram extends Command
{
    protected $signature = 'instagram:scrape 
                            {username=coach.ravikant} 
                            {--limit=100}
                            {--async : Start run without waiting for results}
                            {--fetch= : Fetch results from a specific run ID}';

    protected $description = 'Scrape Instagram posts from specified username';

    public function handle(InstagramScraperService $scraper)
    {
        // Fetch results from existing run
        if ($runId = $this->option('fetch')) {
            return $this->fetchResults($scraper, $runId);
        }

        $username = $this->argument('username');
        $limit = $this->option('limit');

        // Async mode: Just start the run and return
        if ($this->option('async')) {
            return $this->startAsyncRun($scraper, $username);
        }

        // Sync mode: Wait for completion (up to 5 minutes)
        $this->info("🔍 Scraping Instagram posts for @{$username}...");
        $this->info('⏳ This may take 2-5 minutes. Please wait...');

        try {
            $items = $scraper->scrapeUsernameSync($username, $limit, 300);
            $this->info('✅ Successfully scraped and saved '.count($items).' posts!');

            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Scraping failed: '.$e->getMessage());

            // If it's a timeout, give instructions
            if (str_contains($e->getMessage(), 'Run ID:')) {
                $this->warn('💡 The run is still processing on Apify.');
                $this->warn('💡 You can fetch results later using the Run ID from your Apify dashboard.');
                $this->warn('💡 Or check: https://console.apify.com/actors/runs');
            }

            return 1;
        }
    }

    protected function startAsyncRun(InstagramScraperService $scraper, string $username): int
    {
        $this->info("🚀 Starting async scrape for @{$username}...");

        try {
            $run = $scraper->startScrapeRun($username);

            $this->info('✅ Run started successfully!');
            $this->info("📋 Run ID: {$run['id']}");
            $this->info("📊 Status: {$run['status']}");
            $this->info('');
            $this->info('💡 To fetch results when complete:');
            $this->warn("   php artisan instagram:scrape --fetch={$run['id']}");
            $this->info("💡 Or check: https://console.apify.com/actors/runs/{$run['id']}");

            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Failed to start run: '.$e->getMessage());

            return 1;
        }
    }

    protected function fetchResults(InstagramScraperService $scraper, string $runId): int
    {
        $this->info("📥 Fetching results from run: {$runId}");

        try {
            // Check status first
            $status = $scraper->checkRunStatus($runId);
            $this->info("📊 Run status: {$status['status']}");

            if ($status['status'] !== 'SUCCEEDED') {
                $this->warn('⚠️ Run has not completed successfully yet.');
                $this->info("Current status: {$status['status']}");

                return 1;
            }

            // Fetch results
            $limit = $this->option('limit');
            $items = $scraper->fetchRunResults($runId, $limit);

            $this->info('✅ Successfully fetched and saved '.count($items).' posts!');

            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Failed to fetch results: '.$e->getMessage());

            return 1;
        }
    }
}
