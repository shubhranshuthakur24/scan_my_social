<?php

namespace App\Http\Middleware;

use App\Services\PlanService;
use Closure;
use Illuminate\Http\Request;

class RequireActivePlan
{
    /**
     * Ensure the authenticated user has an active subscription
     * before allowing access to any billable route.
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if ($user?->isSuperAdmin()) {
            return $next($request);
        }

        if (! $user || ! PlanService::hasActivePlan($user)) {
            if ($request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'no_active_plan',
                    'message' => 'You need an active subscription to use this feature.',
                    'redirect' => route('settings.upgrade'),
                ], 403);
            }

            return redirect()->route('settings.upgrade');
        }

        return $next($request);
    }
}
