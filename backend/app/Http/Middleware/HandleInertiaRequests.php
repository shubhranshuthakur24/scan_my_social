<?php

namespace App\Http\Middleware;

use App\Models\AffiliateApplication;
use App\Models\ScriptCtaType;
use App\Models\ScriptHookType;
use App\Models\ScriptObjective;
use App\Services\PlanService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $affiliateApplicationStatus = null;

        if ($user) {
            $affiliateApplicationStatus = AffiliateApplication::query()
                ->where(function ($query) use ($user) {
                    $query->where('claimed_user_id', $user->id)
                        ->orWhere('user_id', $user->id)
                        ->orWhereRaw('LOWER(email) = ?', [strtolower((string) $user->email)]);
                })
                ->latest()
                ->value('status');
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'is_super_admin' => $user ? $user->isSuperAdmin() : false,
                'plan' => $user ? PlanService::activePlan($user) : null,
                'is_google_user' => $user ? ! is_null($user->google_id) : false,
                'has_password' => $user ? ! is_null($user->password) : false,
                'affiliate_application_status' => $affiliateApplicationStatus,
            ],
            'appName' => config('app.name'),
            'reviewMode' => (bool) env('APP_REVIEW_MODE', false),
            'csrf_token' => csrf_token(),
            'flash' => [
                'message' => $request->session()->get('message'),
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'verification_resend_wait_seconds' => $request->session()->get('verification_resend_wait_seconds'),
                'watchlist' => $request->session()->get('watchlist'),
                'transcription' => $request->session()->get('transcription'),
                'analysis' => $request->session()->get('analysis'),
                'generated_script' => $request->session()->get('generated_script'),
                'audio_path' => $request->session()->get('audio_path'),
                'redirect_url' => $request->session()->get('redirect_url'),
            ],
            'scriptIntelligence' => [
                'hookTypes' => ScriptHookType::active()->orderBy('display_order')->select('id', 'slug', 'label', 'description')->get(),
                'ctaTypes' => ScriptCtaType::active()->orderBy('display_order')->select('id', 'slug', 'label', 'description')->get(),
                'objectives' => ScriptObjective::active()->orderBy('display_order')->select('id', 'slug', 'label', 'description')->get(),
                'research' => [
                    'intents' => collect(config('script_research.intents'))
                        ->map(fn (array $intent, string $key): array => [
                            'value' => $key,
                            'label' => $intent['label'],
                            'hours' => $intent['hours'],
                        ])
                        ->values(),
                    'deepEnabled' => (bool) config('script_research.deep_enabled'),
                    'prices' => collect(config('script_research.tiers'))
                        ->map(fn (array $tier): array => [
                            'live' => $tier['live_cost'],
                            'cache' => $tier['cache_cost'],
                        ]),
                ],
            ],
        ];
    }
}
