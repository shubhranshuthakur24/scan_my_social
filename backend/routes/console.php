<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use App\Jobs\PublishDueScheduledPostsJob;
use App\Jobs\SyncScheduledPostAnalyticsJob;
use App\Models\Activity;
use Illuminate\Support\Facades\Schedule;

// Schedule Instagram scraping - Weekly in production, Daily in local
Schedule::command('instagram:scrape')->when(function () {
    return app()->environment('production');
})->weekly()->sundays()->at('06:00')->timezone('Asia/Kolkata')->withoutOverlapping();

Schedule::command('instagram:scrape')->when(function () {
    return ! app()->environment('production');
})->daily()->at('06:00')->timezone('Asia/Kolkata')->withoutOverlapping();

// Poll for completed Apify runs every minute
Schedule::command('app:poll-apify-runs')->everyMinute()->withoutOverlapping();

// Reset user credits to monthly plan allowance when reset timestamps are due.
Schedule::command('app:reset-monthly-credits')->hourly()->withoutOverlapping();

// Publish due content scheduler posts from the app-side queue.
Schedule::job(new PublishDueScheduledPostsJob)->everyMinute()->withoutOverlapping();

// Pull available Instagram insights for recently published scheduled posts.
Schedule::job(new SyncScheduledPostAnalyticsJob)->hourly()->withoutOverlapping();

// Refresh connected Instagram-account analytics six times daily (Asia/Kolkata).
foreach (['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'] as $time) {
    Schedule::command('content-scheduler:sync-instagram-analytics')
        ->timezone('Asia/Kolkata')
        ->dailyAt($time)
        ->withoutOverlapping();
}

// Check for expiring connected Instagram account tokens daily
Schedule::command('instagram:check-tokens')
    ->timezone('Asia/Kolkata')
    ->dailyAt('09:00')
    ->withoutOverlapping();

// Prune stale activity rows to keep dashboard/recent-activity queries fast.
Schedule::command('model:prune', ['--model' => [Activity::class]])
    ->daily()
    ->at('03:30')
    ->timezone('Asia/Kolkata')
    ->withoutOverlapping();

Schedule::command('script-research:cleanup')
    ->daily()
    ->at('04:15')
    ->timezone('Asia/Kolkata')
    ->withoutOverlapping();
