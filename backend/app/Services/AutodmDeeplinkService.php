<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class AutodmDeeplinkService
{
    public function build(int $flowId, ?int $messageId, string $targetUrl, ?int $reminderEventId = null): string
    {
        $normalizedTarget = $this->normalizeTargetUrl($targetUrl);
        $encryptedPayload = Crypt::encryptString(json_encode([
            'url' => $normalizedTarget,
            'flow_id' => $flowId,
            'message_id' => $messageId,
            'reminder_event_id' => $reminderEventId,
            'created_at' => time(),
        ], JSON_UNESCAPED_SLASHES));
        $payload = $this->toBase64Url($encryptedPayload);

        $ttlHours = (int) config('services.autodm.deeplink_ttl_hours', 24);
        if ($ttlHours <= 0) {
            $ttlHours = 24;
        }
        $expiresAt = now()->addHours($ttlHours);

        $relative = URL::signedRoute('autodm.deeplink.redirect', [
            'payload' => $payload,
        ], $expiresAt, false);

        return rtrim($this->baseUrl(), '/').$relative;
    }

    public function rewriteLinksInText(string $text, int $flowId, ?int $messageId, ?int $reminderEventId = null): string
    {
        $output = $text;
        $markdownPattern = '/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/i';
        $plainPattern = '/(?<!\]\()https?:\/\/[^\s<>()"]+/i';

        $output = preg_replace_callback($markdownPattern, function (array $matches) use ($flowId, $messageId, $reminderEventId) {
            $label = $matches[1];
            $url = $matches[2];
            if ($this->isAlreadyDeeplink($url)) {
                return $label !== '' ? ($label.': '.$url) : $url;
            }

            $deeplink = $this->build($flowId, $messageId, $url, $reminderEventId);

            return $label !== '' ? ($label.': '.$deeplink) : $deeplink;
        }, $output) ?? $output;

        $output = preg_replace_callback($plainPattern, function (array $matches) use ($flowId, $messageId, $reminderEventId) {
            $url = $matches[0];
            if ($this->isAlreadyDeeplink($url)) {
                return $url;
            }

            $deeplink = $this->build($flowId, $messageId, $url, $reminderEventId);

            return $deeplink;
        }, $output) ?? $output;

        return $output;
    }

    public function normalizeTargetUrl(string $url): string
    {
        $candidate = trim($url);
        if ($candidate === '') {
            return $candidate;
        }

        if (! preg_match('/^https?:\/\//i', $candidate)) {
            $candidate = 'https://'.ltrim($candidate, '/');
        }

        return $candidate;
    }

    private function isAlreadyDeeplink(string $url): bool
    {
        $baseHost = parse_url($this->baseUrl(), PHP_URL_HOST);
        $urlHost = parse_url($url, PHP_URL_HOST);
        $urlPath = parse_url($url, PHP_URL_PATH);

        return $baseHost !== null
            && $urlHost !== null
            && Str::lower($baseHost) === Str::lower($urlHost)
            && Str::startsWith((string) $urlPath, '/r/');
    }

    private function baseUrl(): string
    {
        return (string) config('services.autodm.deeplink_base_url', 'https://scanmysocial.com');
    }

    private function toBase64Url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
