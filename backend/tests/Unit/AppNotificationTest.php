<?php

namespace Tests\Unit;

use App\Notifications\AppNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use PHPUnit\Framework\TestCase;

class AppNotificationTest extends TestCase
{
    public function test_notification_uses_queue_and_runs_after_commit(): void
    {
        $notification = new AppNotification('Title', 'Message');

        $this->assertInstanceOf(ShouldQueue::class, $notification);
        $this->assertTrue($notification->afterCommit);
    }

    public function test_notification_channels_are_database_and_broadcast(): void
    {
        $notification = new AppNotification('Title', 'Message');

        $this->assertSame(['database', 'broadcast'], $notification->via(new \stdClass));
    }

    public function test_notification_payload_is_consistent_across_database_and_broadcast(): void
    {
        $notification = new AppNotification(
            title: 'Payment Received',
            message: 'Your payment was processed successfully.',
            type: 'success',
            actionUrl: '/settings/billing',
            extraData: ['invoice_id' => 10]
        );

        $databasePayload = $notification->toArray(new \stdClass);
        $broadcastPayload = $notification->toBroadcast(new \stdClass)->data;

        $this->assertSame($databasePayload, $broadcastPayload);
        $this->assertSame('app.notification', $notification->broadcastType());
    }
}
