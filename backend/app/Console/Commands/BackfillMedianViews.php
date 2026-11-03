<?php

namespace App\Console\Commands;

use App\Models\Channel;
use App\Services\OutlierDetectionService;
use Illuminate\Console\Command;

class BackfillMedianViews extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'channels:backfill-median';

    /**
     * The console command description.
     */
    protected $description = 'Run full outlier + engagement detection for all channels (backfill existing data)';

    /**
     * Execute the console command.
     */
    public function handle(OutlierDetectionService $detector)
    {
        $channels = Channel::all();
        $count = $channels->count();

        $this->info("Running outlier + engagement detection for {$count} channels...");

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        foreach ($channels as $channel) {
            $detector->processChannel($channel);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Backfill completed successfully! All posts now have breakout labels.');
    }
}
