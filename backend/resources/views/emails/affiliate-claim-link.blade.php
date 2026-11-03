<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claim Affiliate Application</title>
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
                                Verify Application Ownership
                            </h1>

                            <p style="margin:0 0 14px; font-size:17px; line-height:1.65; color:#1f2937;">
                                Hi {{ $application->name }},
                            </p>

                            <p style="margin:0 0 14px; font-size:17px; line-height:1.65; color:#1f2937;">
                                We received an affiliate application for this email address. To verify ownership and connect it to your account, use the secure link below.
                            </p>

                            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 20px auto;">
                                <tr>
                                    <td align="center" style="background-color:{{ $primaryColor }}; border-radius:8px;">
                                        <a href="{{ $claimUrl }}" style="display:inline-block; padding:12px 24px; color:#ffffff; text-decoration:none; font-size:16px; line-height:1.2; font-weight:700;">
                                            Claim my affiliate application
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 14px; font-size:16px; line-height:1.65; color:#334155;">
                                This link expires in 3 days. If you did not request this, you can safely ignore this email.
                            </p>

                            <hr style="margin:0 0 16px; border:none; border-top:1px solid #e5e7eb;">

                            <p style="margin:0; font-size:14px; line-height:1.65; word-break:break-all;">
                                <a href="{{ $claimUrl }}" style="color:{{ $primaryColor }}; text-decoration:underline;">{{ $claimUrl }}</a>
                            </p>
                        </td>
                    </tr>
                </table>

                <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px; max-width:100%; margin-top:14px;">
                    <tr>
                        <td align="center" style="padding:14px 10px 0;">
                            <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                                You received this email because an affiliate claim verification was requested for this address.
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
