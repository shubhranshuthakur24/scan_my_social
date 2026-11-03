<?php

namespace App\Mail;

use App\Models\AffiliateApplication;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AffiliateApplicationApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public AffiliateApplication $application
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your affiliate application is approved'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.affiliate-application-approved',
            with: [
                'appName' => (string) config('app.name', 'Scan My Social'),
                'logoUrl' => url('/images/logo.png'),
                'primaryColor' => '#7C3AED',
            ]
        );
    }
}
