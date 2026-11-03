<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\LeadFormSubmission;
use App\Services\LeadCaptureService;
use Illuminate\Console\Command;

class BackfillLeads extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leads:backfill';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill unified leads from form submissions and appointment bookings.';

    /**
     * Execute the console command.
     */
    public function handle(LeadCaptureService $leadCaptureService): int
    {
        $formLeadCount = 0;
        $bookingLeadCount = 0;

        LeadFormSubmission::query()
            ->with('leadForm')
            ->orderBy('id')
            ->chunkById(200, function ($submissions) use ($leadCaptureService, &$formLeadCount): void {
                foreach ($submissions as $submission) {
                    $leadCaptureService->fromLeadFormSubmission($submission);
                    $formLeadCount++;
                }
            });

        Booking::query()
            ->with('eventType')
            ->orderBy('id')
            ->chunkById(200, function ($bookings) use ($leadCaptureService, &$bookingLeadCount): void {
                foreach ($bookings as $booking) {
                    $leadCaptureService->fromBooking($booking);
                    $bookingLeadCount++;
                }
            });

        $this->info("Leads backfill completed. Form submissions: {$formLeadCount}, bookings: {$bookingLeadCount}.");

        return self::SUCCESS;
    }
}
