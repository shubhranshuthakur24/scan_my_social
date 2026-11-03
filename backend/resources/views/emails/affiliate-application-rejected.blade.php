<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Affiliate Application Update</title>
</head>
<body style="margin:0; padding:0; background-color:#efeff2; font-family:Arial, Helvetica, sans-serif; color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff; padding:30px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px; max-width:100%; background-color:#ffffff; border:1px solid #e5e7eb; border-radius:14px;">
                    <tr>
                        <td align="center" style="padding:24px 28px 8px;">
                            <div style="display:inline-block; border-radius:10px; padding:10px 16px;">
                                <img src="{{ $logoUrl }}" alt="{{ $appName }}" style="display:block; width:48px; max-width:100%; height:auto;">
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 34px 30px;">
                            <h1 style="margin:0 0 14px; font-size:32px; line-height:1.2; font-weight:700; color:{{ $primaryColor }}; text-align:center;">
                                Application Update
                            </h1>

                            <p style="margin:0 0 14px; font-size:17px; line-height:1.65; color:#1f2937;">
                                Hi {{ $application->name }},
                            </p>

                            <p style="margin:0 0 14px; font-size:17px; line-height:1.65; color:#1f2937;">
                                Thank you for your interest in our affiliate program. Your application is currently marked as rejected.
                            </p>

                            @if (! empty($application->rejection_reason))
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px; background-color:#fff1f2; border:1px solid #fecdd3; border-radius:10px;">
                                    <tr>
                                        <td style="padding:12px 14px;">
                                            <p style="margin:0 0 8px; font-size:13px; color:#9f1239; text-transform:uppercase; letter-spacing:0.08em; font-weight:700;">Reason</p>
                                            <p style="margin:0; font-size:15px; color:#881337; line-height:1.65;">{{ $application->rejection_reason }}</p>
                                        </td>
                                    </tr>
                                </table>
                            @endif

                            <p style="margin:0; font-size:16px; line-height:1.65; color:#334155;">
                                You can reapply later after addressing the feedback.
                            </p>
                        </td>
                    </tr>
                </table>

                <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px; max-width:100%; margin-top:14px;">
                    <tr>
                        <td align="center" style="padding:14px 10px 0;">
                            <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                                You received this email because an affiliate application was submitted for this address.
                            </p>
                            <p style="margin:10px 0 0; font-size:12px; line-height:1.6; color:#9ca3af;">
                                &copy; {{ now()->year }} {{ $appName }}. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
