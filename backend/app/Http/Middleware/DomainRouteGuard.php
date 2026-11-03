<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class DomainRouteGuard
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->isHttps($request) && ! app()->environment('testing')) {
            return $this->redirectToHttps($request);
        }

        $host = strtolower($request->getHost());
        $path = '/'.ltrim($request->path(), '/');

        if ($this->isStaticOrHealthPath($path) || $this->isApiPath($path)) {
            return $next($request);
        }

        if (in_array($host, ['scanmysocial.com', 'www.scanmysocial.com'], true)) {
            if ($this->isRootPublicPath($path)) {
                return $next($request);
            }

            abort(404);
        }

        if (in_array($host, ['viralyzer.foxxydigitaltools.com', 'localhost', 'localhost:8000'], true)) {
            return $next($request);
        }

        if ($host === 'app.scanmysocial.com') {
            return $next($request);
        }

        if (app()->environment(['local', 'testing'])) {
            return $next($request);
        }

        abort(404);
    }

    private function isHttps(Request $request): bool
    {
        return $request->isSecure();
    }

    private function redirectToHttps(Request $request): Response
    {
        $target = 'https://'.$request->getHost().$request->getRequestUri();

        if ($request->header('X-Inertia')) {
            return Inertia::location($target);
        }

        return redirect()->to($target, 301);
    }

    private function isAuthPath(string $path): bool
    {
        $authPaths = [
            '/login',
            '/register',
            '/forgot-password',
            '/reset-password',
            '/verify-email',
            '/email/verification-notification',
            '/confirm-password',
            '/logout',
            '/auth/google',
            '/auth/google/callback',
            '/password',
        ];

        foreach ($authPaths as $authPath) {
            if ($path === $authPath || str_starts_with($path, $authPath.'/')) {
                return true;
            }
        }

        return false;
    }

    private function isStaticOrHealthPath(string $path): bool
    {
        $staticPrefixes = [
            '/build',
            '/images',
            '/storage',
            '/favicon',
            '/robots.txt',
            '/sitemap',
            '/_ignition',
            '/up',
            '/r',
        ];

        foreach ($staticPrefixes as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix.'/')) {
                return true;
            }
        }

        return false;
    }

    private function isApiPath(string $path): bool
    {
        return $path === '/api' || str_starts_with($path, '/api/');
    }

    private function isRootPublicPath(string $path): bool
    {
        $allowedPaths = [
            '/',
            '/pricing',
            '/viral-image-prompts',
            '/privacy-policy',
            '/autodm/terms',
            '/data-deletion',
            '/waitlist',
            '/affiliate',
        ];

        if (in_array($path, $allowedPaths, true)) {
            return true;
        }

        // Allow affiliate apply, prompt details and public lead forms
        if (
            str_starts_with($path, '/affiliate/')
            || str_starts_with($path, '/data-deletion/status/')
            || str_starts_with($path, '/f/')
            || str_starts_with($path, '/viral-image-prompts/')
        ) {
            return true;
        }

        return false;
    }
}
