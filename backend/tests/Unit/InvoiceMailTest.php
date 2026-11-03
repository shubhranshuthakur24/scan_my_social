<?php

namespace Tests\Unit;

use App\Mail\InvoiceMail;
use App\Models\Invoice;
use App\Models\Subscription;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class InvoiceMailTest extends TestCase
{
    public function test_invoice_mail_uses_emails_invoices_view_namespace(): void
    {
        $mail = new InvoiceMail($this->makeInvoice(), $this->makeUser());

        $this->assertSame('emails.invoices.email', $mail->content()->view);
    }

    public function test_invoice_mail_can_build_pdf_attachment_from_new_view_path(): void
    {
        $mail = new InvoiceMail($this->makeInvoice(), $this->makeUser());
        $attachments = $mail->attachments();
        $pdf = Pdf::loadView('emails.invoices.pdf', [
            'invoice' => $this->makeInvoice(),
            'user' => $this->makeUser(),
        ])->output();

        $this->assertCount(1, $attachments);
        $this->assertStringStartsWith('%PDF', $pdf);
    }

    public function test_invoice_pdf_view_renders_professional_invoice_details(): void
    {
        $html = view('emails.invoices.pdf', [
            'invoice' => $this->makeInvoice(),
            'user' => $this->makeUser(),
        ])->render();

        $this->assertStringContainsString('Official billing document', $html);
        $this->assertStringContainsString('Scan My Social logo', $html);
        $this->assertStringContainsString('Invoice Test User', $html);
        $this->assertStringContainsString('pay_test_invoice_001', $html);
        $this->assertStringContainsString('ScanMySocial AI Subscription', $html);
        $this->assertStringContainsString('Total paid', $html);
        $this->assertStringContainsString('&#8377;1,099.00', $html);
    }

    public function test_invoice_pdf_view_uses_subscription_plan_and_billing_period(): void
    {
        $html = view('emails.invoices.pdf', [
            'invoice' => $this->makeInvoiceWithSubscription('pro'),
            'user' => $this->makeUser(),
        ])->render();

        $this->assertStringContainsString('ScanMySocial Pro Monthly Subscription', $html);
        $this->assertStringContainsString('Billing period: May 02, 2026 - Jun 01, 2026', $html);
    }

    private function makeUser(): User
    {
        return new User([
            'name' => 'Invoice Test User',
            'email' => 'invoice-test@example.com',
        ]);
    }

    private function makeInvoice(): Invoice
    {
        $invoice = new Invoice([
            'amount' => 109900,
            'status' => 'paid',
            'razorpay_payment_id' => 'pay_test_invoice_001',
        ]);

        $invoice->id = 1;
        $invoice->created_at = Carbon::parse('2026-05-02 10:00:00');

        return $invoice;
    }

    private function makeInvoiceWithSubscription(string $plan): Invoice
    {
        $invoice = $this->makeInvoice();
        $invoice->setRelation('subscription', new Subscription([
            'name' => $plan,
            'status' => 'active',
        ]));

        return $invoice;
    }
}
