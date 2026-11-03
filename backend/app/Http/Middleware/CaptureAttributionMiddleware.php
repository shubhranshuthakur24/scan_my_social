<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Response;

class CaptureAttributionMiddleware
{
    public const COOKIE_NAME = 'sms_last_touch_attribution';

    public const SESSION_KEY = 'last_touch_attribution';

    private const COOKIE_MINUTES = 10080;

    private const TRACKING_KEYS = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'fbclid',
    ];

    private const STORED_KEYS = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'fbclid',
        'landing_url',
        'referrer',
        'captured_at',
    ];

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $queryAttribution = self::queryAttribution($request);

        if ($queryAttribution !== []) {
            $request->session()->put(self::SESSION_KEY, $queryAttribution);
        } elseif (! $request->session()->has(self::SESSION_KEY)) {
            $cookieAttribution = self::decodeCookie($request->cookie(self::COOKIE_NAME));

            if ($cookieAttribution !== []) {
                $request->session()->put(self::SESSION_KEY, $cookieAttribution);
            }
        }

        $response = $next($request);

        if ($queryAttribution !== []) {
            $response->headers->setCookie(self::cookie($request, $queryAttribution));
        }

        return $response;
    }

    /**
     * @return array<string, string>
     */
    public static function attributionFromRequest(Request $request): array
    {
        $sessionAttribution = $request->session()->get(self::SESSION_KEY);

        if (is_array($sessionAttribution)) {
            return self::normalize($sessionAttribution);
        }

        return self::decodeCookie($request->cookie(self::COOKIE_NAME));
    }

    public static function forgetCookie(): Cookie
    {
        return cookie()->forget(self::COOKIE_NAME);
    }

    /**
     * @return array<string, string>
     */
    private static function queryAttribution(Request $request): array
    {
        $tracking = [];

        foreach (self::TRACKING_KEYS as $key) {
            $value = $request->query($key);

            if (is_string($value) && trim($value) !== '') {
                $tracking[$key] = Str::limit(trim($value), 500, '');
            }
        }

        if ($tracking === []) {
            return [];
        }

        return self::normalize([
            ...$tracking,
            'landing_url' => $request->fullUrl(),
            'referrer' => (string) $request->headers->get('referer', ''),
            'captured_at' => now()->toDateTimeString(),
        ]);
    }

    /**
     * @return array<string, string>
     */
    private static function decodeCookie(mixed $value): array
    {
        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        if (! is_array($decoded)) {
            return [];
        }

        return self::normalize($decoded);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, string>
     */
    private static function normalize(array $data): array
    {
        $normalized = [];

        foreach (self::STORED_KEYS as $key) {
            $value = Arr::get($data, $key);

            if (is_string($value) && trim($value) !== '') {
                $maxLength = in_array($key, ['landing_url', 'referrer'], true) ? 2048 : 500;
                $normalized[$key] = Str::limit(trim($value), $maxLength, '');
            }
        }

        return Arr::only($normalized, self::TRACKING_KEYS) === []
            ? []
            : $normalized;
    }

    /**
     * @param  array<string, string>  $attribution
     */
    private static function cookie(Request $request, array $attribution): Cookie
    {
        return cookie(
            self::COOKIE_NAME,
            json_encode($attribution, JSON_THROW_ON_ERROR),
            self::COOKIE_MINUTES,
            '/',
            null,
            $request->isSecure(),
            true,
            false,
            'Lax'
        );
    }
}
