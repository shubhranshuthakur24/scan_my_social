<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmed</title>
</head>
<body style="margin:0; padding:0; background-color:#efeff2; font-family:Arial, Helvetica, sans-serif; color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff; padding:30px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px; max-width:100%; background-color:#ffffff; border:1px solid #e5e7eb; border-radius:14px;">
                    <tr>
                        <td align="center" style="padding:24px 28px 8px;">
                            <img src="{{ $logoUrl }}" alt="{{ $appName }}" style="display:block; width:48px; max-width:100%; height:auto;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 34px 30px;">
                            <h1 style="margin:0 0 14px; font-size:32px; line-height:1.2; font-weight:700; color:{{ $primaryColor }}; text-align:center;">
                                Booking Confirmed
                            </h1>

                            <p style="margin:0 0 14px; font-size:16px; line-height:1.65; color:#1f2937;">
                                Hi {{ $booking->guest_name }},
                            </p>
                            <p style="margin:0 0 14px; font-size:16px; line-height:1.65; color:#1f2937;">
                                Your appointment for <strong>{{ $booking->eventType->name }}</strong> is confirmed.
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
                                <tr>
                                    <td style="padding:12px 14px;">
                                        <p style="margin:0 0 6px; font-size:14px; color:#0f172a;">
                                            {{ $booking->starts_at->setTimezone($booking->eventType->timezone)->format('D, M j, Y g:i A') }}
                                            ({{ $booking->eventType->timezone }})
                                        </p>
                                        <p style="margin:0; font-size:14px; color:#334155;">
                                            Host: {{ $booking->host->name }}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0; font-size:15px; line-height:1.65; color:#334155;">
                                Thanks for booking with {{ $appName }}.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
