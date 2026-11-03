<?php

use App\Http\Middleware\CaptureAttributionMiddleware;
use App\Http\Middleware\CaptureReferralMiddleware;
use App\Http\Middleware\DomainRouteGuard;
use App\Http\Middleware\EnsureApprovedAffiliate;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequireActivePlan;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $trustedProxies = env('TRUSTED_PROXIES');
        if (is_string($trustedProxies) && trim($trustedProxies) !== '') {
            $normalizedTrustedProxies = trim($trustedProxies) === '*'
                ? '*'
                : array_values(array_filter(array_map('trim', explode(',', $trustedProxies))));

            if ($normalizedTrustedProxies !== []) {
                $middleware->trustProxies(at: $normalizedTrustedProxies);
            }
        }

        $middleware->validateCsrfTokens(except: [
            'api/webhooks/razorpay',
            'api/webhooks/razorpay/payouts',
            'api/webhooks/meta',
        ]);

        $middleware->web(append: [
            // SecurityHeaders::class,
            // DomainRouteGuard::class,
            CaptureAttributionMiddleware::class,
            CaptureReferralMiddleware::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'active.plan' => RequireActivePlan::class,
            'affiliate.approved' => EnsureApprovedAffiliate::class,
            'super.admin' => EnsureSuperAdmin::class,
        ]);

    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
