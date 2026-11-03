<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed</title>
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
                                Password Updated
                            </h1>

                            <p style="margin:0 0 14px; font-size:17px; line-height:1.65; color:#1f2937;">
                                Hi {{ $user->name }},
                            </p>

                            <p style="margin:0 0 14px; font-size:17px; line-height:1.65; color:#1f2937;">
                                Your account password was changed successfully.
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
                                <tr>
                                    <td style="padding:12px 14px;">
                                        <p style="margin:0 0 8px; font-size:13px; color:#475569; text-transform:uppercase; letter-spacing:0.08em; font-weight:700;">Change Details</p>
                                        <p style="margin:0; font-size:15px; color:#0f172a; line-height:1.65;">
                                            Time: {{ $changedAt }}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0; font-size:16px; line-height:1.65; color:#334155;">
                                If you did not make this change, reset your password immediately and contact support.
                            </p>
                        </td>
                    </tr>
                </table>

                <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px; max-width:100%; margin-top:14px;">
                    <tr>
                        <td align="center" style="padding:14px 10px 0;">
                            <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                                Need help? Contact <a href="mailto:support@scanmysocial.com" style="color:#6b7280; text-decoration:underline;">support@scanmysocial.com</a>
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
