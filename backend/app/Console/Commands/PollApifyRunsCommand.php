<?php

namespace App\Console\Commands;

use App\Models\Channel;
use App\Services\InstagramScraperService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PollApifyRunsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:poll-apify-runs';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Poll active Apify runs and process completed results';

    /**
     * Execute the console command.
     */
    public function handle(
        InstagramScraperService $scraper
    ) {
        $this->info('Checking for active Apify runs...');

        // 0. Failsafe: Timeout runs stuck in RUNNING for more than 6 hours
        $timeoutThreshold = now()->subHours(6);

        $staleProfileChannelIds = Channel::where('apify_profile_run_status', 'RUNNING')
            ->where('updated_at', '<', $timeoutThreshold)
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $stalePostChannelIds = Channel::where('apify_post_run_status', 'RUNNING')
            ->where('updated_at', '<', $timeoutThreshold)
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->all();

        $staleProfileRuns = 0;
        if ($staleProfileChannelIds !== []) {
            $staleProfileRuns = Channel::whereIn('id', $staleProfileChannelIds)
                ->update(['apify_profile_run_status' => 'TIMED-OUT']);
        }

        $stalePostRuns = 0;
        if ($stalePostChannelIds !== []) {
            $stalePostRuns = Channel::whereIn('id', $stalePostChannelIds)
                ->update(['apify_post_run_status' => 'TIMED-OUT']);
        }

        $staleChannelIds = array_values(array_unique(array_merge($staleProfileChannelIds, $stalePostChannelIds)));

        if ($staleProfileRuns > 0 || $stalePostRuns > 0) {
            $msg = "Failsafe triggered: Timed out {$staleProfileRuns} stuck profile runs and {$stalePostRuns} stuck post runs.";
            Log::warning($msg);
            $this->warn($msg);
        }

        // 1. Check Profile Runs
        $profileChannels = Channel::where('apify_profile_run_status', 'RUNNING')->get();
        foreach ($profileChannels as $channel) {
            Log::info("Polling profile run for @{$channel->handle} (Run ID: {$channel->apify_profile_run_id})");
            $this->processRun($channel, 'profile', $scraper);
        }

        // 2. Check Post Runs
        $postChannels = Channel::where('apify_post_run_status', 'RUNNING')->get();
        foreach ($postChannels as $channel) {
            Log::info("Polling post run for @{$channel->handle} (Run ID: {$channel->apify_post_run_id})");
            $this->processRun($channel, 'post', $scraper);
        }

        $this->info('Polling completed.');
    }

    protected function processRun($channel, string $type, InstagramScraperService $scraper)
    {
        $runIdField = "apify_{$type}_run_id";
        $statusField = "apify_{$type}_run_status";
        $runId = $channel->$runIdField;

        if (! $runId) {
            return;
        }

        try {
            $statusData = $scraper->checkRunStatus($runId);
            $status = $statusData['status'];

            if (in_array($status, ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'])) {
                if ($status === 'SUCCEEDED') {
                    if ($type === 'profile') {
                        $scraper->handleProfileRunCompletion($channel, $runId);
                    } else {
                        $scraper->handlePostRunCompletion($channel, $runId);
                    }
                    $msg = "Run {$runId} ({$type}) for @{$channel->handle} processed successfully.";
                    $this->info($msg);
                    Log::info($msg);
                } else {
                    $msg = "Run {$runId} ({$type}) for @{$channel->handle} completed with status: {$status}";
                    $this->info($msg);
                    Log::warning($msg);
                    $channel->forceFill([$statusField => $status])->save();
                }
            }
        } catch (\Exception $e) {
            $msg = "Failed to check status for run {$runId}: ".$e->getMessage();
            $this->error($msg);
            Log::error($msg, [
                'channel_id' => $channel->id,
                'handle' => $channel->handle,
                'exception' => $e,
            ]);
        }
    }
}
