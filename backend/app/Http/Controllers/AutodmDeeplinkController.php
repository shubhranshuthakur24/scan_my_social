<?php

namespace App\Http\Controllers;

use App\Models\AutodmLinkClick;
use App\Models\AutodmReminderEvent;
use App\Models\AutomationFlowMessage;
use App\Services\AutodmDeeplinkService;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

class AutodmDeeplinkController extends Controller
{
    public function redirect(Request $request, string $payload, AutodmDeeplinkService $deeplinkService)
    {
        if (! $request->hasValidSignature(false)) {
            abort(403);
        }

        try {
            // Backward compatible:
            // 1) Legacy payloads used raw Crypt::encryptString output.
            // 2) New payloads are base64url-encoded encrypted payloads.
            try {
                $decrypted = Crypt::decryptString($payload);
            } catch (DecryptException $exception) {
                $decoded = $this->fromBase64Url($payload);
                if ($decoded === null) {
                    throw $exception;
                }

                $decrypted = Crypt::decryptString($decoded);
            }

            $data = json_decode($decrypted, true, 512, JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException $exception) {
            abort(403);
        }

        $targetUrl = $deeplinkService->normalizeTargetUrl((string) ($data['url'] ?? ''));
        $flowId = isset($data['flow_id']) ? (int) $data['flow_id'] : 0;
        $messageId = isset($data['message_id']) ? (int) $data['message_id'] : null;
        $reminderEventId = isset($data['reminder_event_id']) ? (int) $data['reminder_event_id'] : null;
        $host = parse_url($targetUrl, PHP_URL_HOST);

        if ($targetUrl === '' || $flowId <= 0 || ! $host) {
            abort(403);
        }

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $isPublicIp = filter_var(
                $host,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            );

            if (! $isPublicIp) {
                abort(403);
            }
        }

        $safeMessageId = $messageId;
        if ($messageId) {
            $exists = AutomationFlowMessage::query()
                ->where('id', $messageId)
                ->where('automation_flow_id', $flowId)
                ->exists();
            if (! $exists) {
                $safeMessageId = null;
            }
        }

        try {
            AutodmLinkClick::query()->insert([
                'automation_flow_id' => $flowId,
                'automation_flow_message_id' => $safeMessageId,
                'target_url' => $targetUrl,
                'ip' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 512),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (($reminderEventId ?? 0) > 0) {
                AutodmReminderEvent::query()
                    ->where('id', $reminderEventId)
                    ->where('automation_flow_id', $flowId)
                    ->increment('clicks_count');
            }
        } catch (\Throwable $exception) {
            Log::warning('Autodm deeplink click logging failed', [
                'flow_id' => $flowId,
                'message_id' => $messageId,
                'reminder_event_id' => $reminderEventId,
                'target_url' => $targetUrl,
                'error' => $exception->getMessage(),
            ]);
        }

        if (! $this->shouldShowRedirectPage($request)) {
            return redirect()
                ->away($targetUrl, 302)
                ->header('X-Robots-Tag', 'noindex, nofollow, noarchive')
                ->header('Cache-Control', 'no-store');
        }

        return response()
            ->view('autodm.redirect', ['targetUrl' => $targetUrl])
            ->withHeaders([
                'X-Robots-Tag' => 'noindex, nofollow, noarchive',
                'Cache-Control' => 'no-store',
            ]);
    }

    private function shouldShowRedirectPage(Request $request): bool
    {
        $ua = strtolower((string) $request->userAgent());
        if ($ua === '') {
            return false;
        }

        return str_contains($ua, 'instagram')
            || str_contains($ua, 'fbav')
            || str_contains($ua, 'fban');
    }

    private function fromBase64Url(string $value): ?string
    {
        $base64 = strtr($value, '-_', '+/');
        $paddingLength = (4 - (strlen($base64) % 4)) % 4;
        if ($paddingLength > 0) {
            $base64 .= str_repeat('=', $paddingLength);
        }

        $decoded = base64_decode($base64, true);

        return $decoded === false ? null : $decoded;
    }
}
