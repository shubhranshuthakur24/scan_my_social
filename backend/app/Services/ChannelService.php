<?php

namespace App\Services;

class ChannelService
{
    /**
     * Allowed hosts per platform (exact domain or subdomain).
     *
     * @var array<string, array<int, string>>
     */
    private const PLATFORM_HOSTS = [
        'instagram' => ['instagram.com'],
        'youtube' => ['youtube.com', 'youtu.be'],
        'linkedin' => ['linkedin.com'],
    ];

    /**
     * Reserved Instagram path segments that are not profile handles.
     *
     * @var array<int, string>
     */
    private const INSTAGRAM_RESERVED_SEGMENTS = [
        'p',
        'reel',
        'reels',
        'stories',
        'explore',
        'tv',
        'accounts',
        'about',
        'developer',
    ];

    /**
     * Strictly normalize and validate channel input.
     *
     * @return array{valid: bool, handle?: string, reason?: string}
     */
    public function normalizeAndValidate(string $input, string $platform): array
    {
        $platform = strtolower(trim($platform));
        $input = trim($input);

        if (! isset(self::PLATFORM_HOSTS[$platform])) {
            return ['valid' => false, 'reason' => 'invalid_platform'];
        }

        if ($input === '') {
            return ['valid' => false, 'reason' => 'invalid_format'];
        }

        // Auto-prepend protocol for known domains.
        if (preg_match('/^(www\.)?(instagram\.com|youtube\.com|youtu\.be|linkedin\.com)/i', $input)) {
            $input = 'https://'.$input;
        }

        if (filter_var($input, FILTER_VALIDATE_URL)) {
            $host = parse_url($input, PHP_URL_HOST);
            if (! $host || ! $this->isAllowedHost((string) $host, $platform)) {
                return ['valid' => false, 'reason' => 'invalid_host'];
            }

            $path = (string) (parse_url($input, PHP_URL_PATH) ?? '');
            $handle = $this->extractHandleFromPath($path, $platform);
            if ($handle === null) {
                return ['valid' => false, 'reason' => 'invalid_format'];
            }

            return ['valid' => true, 'handle' => $handle];
        }

        // Non-URL values are treated as handles.
        // We relax the @ check to support raw handle inputs.
        $handle = $this->sanitizeHandle($input);
        if ($handle === null) {
            return ['valid' => false, 'reason' => 'invalid_format'];
        }

        return ['valid' => true, 'handle' => $handle];
    }

    /**
     * Validate if a profile input is valid for a given platform.
     */
    public function isValidProfile(string $input, string $platform): bool
    {
        return (bool) ($this->normalizeAndValidate($input, $platform)['valid'] ?? false);
    }

    /**
     * Extract the handle from a profile link or string.
     */
    public function extractHandle(string $input, string $platform): string
    {
        return (string) ($this->normalizeAndValidate($input, $platform)['handle'] ?? '');
    }

    private function normalizeHost(string $host): string
    {
        $normalized = strtolower(trim($host));
        $normalized = rtrim($normalized, '.');

        if (str_starts_with($normalized, 'www.')) {
            $normalized = substr($normalized, 4);
        }

        return $normalized;
    }

    private function isAllowedHost(string $host, string $platform): bool
    {
        $normalizedHost = $this->normalizeHost($host);
        $allowed = self::PLATFORM_HOSTS[$platform] ?? [];

        foreach ($allowed as $domain) {
            if ($normalizedHost === $domain || str_ends_with($normalizedHost, '.'.$domain)) {
                return true;
            }
        }

        return false;
    }

    private function sanitizeHandle(string $value): ?string
    {
        $candidate = urldecode(trim($value));
        $candidate = ltrim($candidate, '@');
        $candidate = trim($candidate);
        $candidate = trim($candidate, '/');

        if ($candidate === '') {
            return null;
        }

        if (preg_match('/[\/\s\?&#=]/', $candidate)) {
            return null;
        }

        // Keep canonical storage case-insensitive.
        return strtolower($candidate);
    }

    private function extractHandleFromPath(string $path, string $platform): ?string
    {
        $segments = array_values(array_filter(array_map(
            static fn ($segment) => trim((string) $segment),
            explode('/', trim($path, '/'))
        )));

        if ($platform === 'instagram') {
            if (count($segments) < 1) {
                return null;
            }

            $first = strtolower((string) $segments[0]);
            if (in_array($first, self::INSTAGRAM_RESERVED_SEGMENTS, true)) {
                return null;
            }

            return $this->sanitizeHandle($segments[0]);
        }

        if ($platform === 'youtube') {
            if (count($segments) < 1) {
                return null;
            }

            $first = (string) $segments[0];
            if (str_starts_with($first, '@')) {
                return $this->sanitizeHandle($first);
            }

            $firstLower = strtolower($first);
            if (in_array($firstLower, ['channel', 'c', 'user'], true) && isset($segments[1])) {
                return $this->sanitizeHandle((string) $segments[1]);
            }

            return null;
        }

        if ($platform === 'linkedin') {
            if (count($segments) < 2) {
                return null;
            }

            $firstLower = strtolower((string) $segments[0]);
            if (! in_array($firstLower, ['in', 'company', 'school'], true)) {
                return null;
            }

            return $this->sanitizeHandle((string) $segments[1]);
        }

        return null;
    }
}
