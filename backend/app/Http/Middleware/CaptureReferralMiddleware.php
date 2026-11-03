<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CaptureReferralMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->has('ref') && is_string($request->query('ref')) && trim($request->query('ref')) !== '') {
            $cookie = cookie(
                'sms_referral_code',
                strtoupper(trim($request->query('ref'))),
                43200, // 30 days in minutes
                '/',
                null,
                true,  // secure
                false, // httpOnly
                false, // raw
                'Lax'  // sameSite
            );
            $response->withCookie($cookie);
        }

        return $response;
    }
}
