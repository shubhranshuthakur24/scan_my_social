<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\AppNotification;
use Illuminate\Console\Command;

class TestNotification extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:test-notification {user_id}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a test notification to a specific user';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = $this->argument('user_id');
        $user = User::findOrFail($userId);

        $user->notify(new AppNotification(
            title: 'Test Notification',
            message: 'This is a test notification sent via Pusher!',
            type: 'success',
            actionUrl: route('dashboard'),
            extraData: ['test' => true]
        ));

        $this->info("Notification sent to user {$userId}!");
    }
}
