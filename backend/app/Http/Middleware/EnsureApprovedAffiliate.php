<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApprovedAffiliate
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->affiliate_status !== 'approved') {
            return redirect()
                ->route('referrals')
                ->withErrors(['affiliate' => 'Affiliate wallet access is available only after affiliate approval.']);
        }

        return $next($request);
    }
}
