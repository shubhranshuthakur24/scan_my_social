<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingHostNotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Booking $booking
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New booking received'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.booking-host-notification',
            with: [
                'appName' => (string) config('app.name', 'Scan My Social'),
                'logoUrl' => url('/images/logo.png'),
                'primaryColor' => '#7C3AED',
            ]
        );
    }
}
