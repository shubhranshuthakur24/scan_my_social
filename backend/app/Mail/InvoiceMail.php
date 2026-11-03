<?php

namespace App\Mail;

use App\Models\Invoice;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InvoiceMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $invoice;

    public $user;

    /**
     * Create a new message instance.
     */
    public function __construct(Invoice $invoice, User $user)
    {
        $this->invoice = $invoice;
        $this->user = $user;
        $this->onQueue('emails');
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address('noreply@updates.scanmysocial.com', 'Scan My Social'),
            subject: 'Your Scan My Social Invoice #'.($this->invoice->razorpay_payment_id ?? $this->invoice->id),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.invoices.email',
            with: [
                'appName' => (string) config('app.name', 'Scan My Social'),
                'logoUrl' => url('/images/logo.png'),
                'primaryColor' => '#7C3AED',
            ]
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        if ($this->invoice->exists) {
            $this->invoice->loadMissing('subscription');
        }

        $pdf = Pdf::loadView('emails.invoices.pdf', [
            'invoice' => $this->invoice,
            'user' => $this->user,
        ]);

        return [
            Attachment::fromData(fn () => $pdf->output(), 'Scan My Social_Invoice_'.($this->invoice->razorpay_payment_id ?? $this->invoice->id).'.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
