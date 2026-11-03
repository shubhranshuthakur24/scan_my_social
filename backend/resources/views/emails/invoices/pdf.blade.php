@php
    $invoiceNumber = $invoice->razorpay_invoice_id
        ?? $invoice->razorpay_payment_id
        ?? 'INV-'.str_pad((string) $invoice->id, 6, '0', STR_PAD_LEFT);
    $paymentReference = $invoice->razorpay_payment_id ?? 'Not available';
    $issuedDate = $invoice->created_at?->format('M d, Y') ?? now()->format('M d, Y');
    $amount = number_format(((int) $invoice->amount) / 100, 2);
    $normalizedStatus = strtolower((string) ($invoice->status ?: 'paid'));
    $status = strtoupper($normalizedStatus);
    $statusClass = $normalizedStatus === 'paid' ? 'status-paid' : 'status-muted';
    $lineItemTitle = $invoice->lineItemTitle();
    $billingPeriod = $invoice->billingPeriodLabel();
    $logoPath = public_path('images/scanmysocial-invoice.jpg');
    $logoSrc = is_file($logoPath)
        ? 'data:image/jpeg;base64,'.base64_encode((string) file_get_contents($logoPath))
        : null;
@endphp

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice #{{ $invoiceNumber }}</title>
    <style>
        @page { margin: 28px; }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            background: #f7f4ff;
            color: #141022;
            font-family: "DejaVu Sans", Arial, sans-serif;
            font-size: 12px;
            line-height: 1.5;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        .invoice {
            width: 100%;
            background: #ffffff;
            border: 1px solid #ddd6fe;
        }

        .accent {
            height: 10px;
            background: #7c3aed;
            border-bottom: 3px solid #f43f5e;
        }

        .wrap {
            padding: 34px 38px 30px;
        }

        .brand-cell {
            width: 58%;
            vertical-align: top;
        }

        .doc-cell {
            width: 42%;
            text-align: right;
            vertical-align: top;
        }

        .brand-row {
            margin-bottom: 26px;
        }

        .brand-lockup {
            display: inline-block;
            width: 230px;
            padding: 10px 12px;
            border: 1px solid #2c164f;
            border-bottom: 3px solid #f43f5e;
            border-radius: 8px;
            background: #000000;
        }

        .brand-lockup img {
            display: block;
            width: 206px;
            height: auto;
        }

        .brand-fallback {
            color: #ffffff;
            font-size: 16px;
            font-weight: 800;
        }

        .brand-tagline {
            margin-top: 8px;
            color: #6f6785;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .5px;
            text-transform: uppercase;
        }

        .muted {
            color: #6f6785;
        }

        .eyebrow {
            color: #7c3aed;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 1.4px;
            text-transform: uppercase;
        }

        .doc-title {
            margin: 2px 0 6px;
            color: #4c1d95;
            font-size: 30px;
            font-weight: 800;
            letter-spacing: .8px;
            text-transform: uppercase;
        }

        .doc-number {
            color: #6f6785;
            font-size: 11px;
            font-weight: 700;
        }

        .panel {
            border: 1px solid #ddd6fe;
            margin-top: 24px;
            background: #ffffff;
        }

        .panel td {
            padding: 18px 20px;
            vertical-align: top;
        }

        .panel-divider {
            border-left: 1px solid #ddd6fe;
        }

        .section-title {
            margin-bottom: 8px;
            color: #7c3aed;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 1.2px;
            text-transform: uppercase;
        }

        .name {
            margin-bottom: 3px;
            color: #141022;
            font-size: 14px;
            font-weight: 800;
        }

        .meta {
            margin-top: 24px;
            border: 1px solid #ddd6fe;
            background: #f7f4ff;
        }

        .meta td {
            width: 25%;
            padding: 14px 16px;
            border-left: 1px solid #ddd6fe;
            vertical-align: top;
        }

        .meta td:first-child {
            border-left: 0;
        }

        .meta-label {
            margin-bottom: 5px;
            color: #7c3aed;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .meta-value {
            color: #141022;
            font-size: 11px;
            font-weight: 800;
            word-break: break-word;
        }

        .status-paid,
        .status-muted {
            display: inline-block;
            padding: 4px 9px;
            border-radius: 999px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: .8px;
        }

        .status-paid {
            border: 1px solid #bbf7d0;
            background: #ecfdf5;
            color: #047857;
        }

        .status-muted {
            border: 1px solid #cbd5e1;
            background: #f1f5f9;
            color: #475569;
        }

        .items {
            margin-top: 28px;
            border: 1px solid #ddd6fe;
        }

        .items th {
            padding: 12px 14px;
            background: #4c1d95;
            color: #ffffff;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 1px;
            text-align: left;
            text-transform: uppercase;
        }

        .items th.amount,
        .items td.amount {
            text-align: right;
        }

        .items td {
            padding: 17px 14px;
            border-bottom: 1px solid #ede9fe;
            vertical-align: top;
        }

        .item-title {
            color: #141022;
            font-size: 13px;
            font-weight: 800;
        }

        .item-desc {
            margin-top: 3px;
            color: #6f6785;
            font-size: 11px;
        }

        .item-period {
            margin-top: 8px;
            color: #4c1d95;
            font-size: 11px;
            font-weight: 700;
        }

        .totals {
            width: 45%;
            margin-left: 55%;
            margin-top: 18px;
        }

        .totals td {
            padding: 8px 0;
            border-bottom: 1px solid #ede9fe;
        }

        .totals .label {
            color: #6f6785;
            font-weight: 700;
            text-align: left;
        }

        .totals .value {
            color: #141022;
            font-weight: 800;
            text-align: right;
        }

        .totals .grand td {
            border-top: 2px solid #7c3aed;
            border-bottom: 0;
            background: #f5f3ff;
            padding: 12px 10px;
            font-size: 16px;
        }

        .totals .grand .label,
        .totals .grand .value {
            color: #4c1d95;
        }

        .note {
            margin-top: 34px;
            padding: 16px 18px;
            border: 1px solid #fbcfe8;
            background: #fff1f2;
            color: #6f6785;
        }

        .footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #ede9fe;
            color: #6f6785;
            font-size: 10px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="accent"></div>

        <div class="wrap">
            <table class="brand-row">
                <tr>
                    <td class="brand-cell">
                        <table>
                            <tr>
                                <td>
                                    <div class="brand-lockup">
                                        @if ($logoSrc)
                                            <img src="{{ $logoSrc }}" alt="Scan My Social logo">
                                        @else
                                            <span class="brand-fallback">Scan My Social</span>
                                        @endif
                                    </div>
                                    <div class="brand-tagline">AI growth intelligence platform</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td class="doc-cell">
                        <div class="eyebrow">Official billing document</div>
                        <div class="doc-title">Invoice</div>
                        <div class="doc-number">#{{ $invoiceNumber }}</div>
                    </td>
                </tr>
            </table>

            <table class="panel">
                <tr>
                    <td style="width: 50%;">
                        <div class="section-title">Issued by</div>
                        <div class="name">Scan My Social</div>
                        <div class="muted">scanmysocial.com</div>
                        <div class="muted">support@scanmysocial.com</div>
                    </td>
                    <td class="panel-divider" style="width: 50%;">
                        <div class="section-title">Billed to</div>
                        <div class="name">{{ $user->name }}</div>
                        <div class="muted">{{ $user->email }}</div>
                    </td>
                </tr>
            </table>

            <table class="meta">
                <tr>
                    <td>
                        <div class="meta-label">Invoice date</div>
                        <div class="meta-value">{{ $issuedDate }}</div>
                    </td>
                    <td>
                        <div class="meta-label">Payment method</div>
                        <div class="meta-value">Razorpay</div>
                    </td>
                    <td>
                        <div class="meta-label">Payment ID</div>
                        <div class="meta-value">{{ $paymentReference }}</div>
                    </td>
                    <td>
                        <div class="meta-label">Status</div>
                        <div class="{{ $statusClass }}">{{ $status }}</div>
                    </td>
                </tr>
            </table>

            <table class="items">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="width: 80px;">Qty</th>
                        <th class="amount" style="width: 140px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div class="item-title">{{ $lineItemTitle }}</div>
                            <div class="item-desc">Subscription access and platform credits processed through Razorpay.</div>
                            @if ($billingPeriod)
                                <div class="item-period">Billing period: {{ $billingPeriod }}</div>
                            @endif
                        </td>
                        <td>1</td>
                        <td class="amount">&#8377;{{ $amount }}</td>
                    </tr>
                </tbody>
            </table>

            <table class="totals">
                <tr>
                    <td class="label">Subtotal</td>
                    <td class="value">&#8377;{{ $amount }}</td>
                </tr>
                <tr class="grand">
                    <td class="label">Total paid</td>
                    <td class="value">&#8377;{{ $amount }}</td>
                </tr>
            </table>

            <div class="note">
                Thank you for your payment. This invoice confirms the amount paid for your Scan My Social subscription. For billing help, contact support@scanmysocial.com and include invoice #{{ $invoiceNumber }}.
            </div>

            <div class="footer">
                This invoice was generated electronically by Scan My Social. No signature is required.
            </div>
        </div>
    </div>
</body>
</html>
