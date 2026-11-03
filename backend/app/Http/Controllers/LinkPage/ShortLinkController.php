<?php

namespace App\Http\Controllers\LinkPage;

use App\Http\Controllers\Controller;
use App\Http\Requests\LinkPage\ShortLinkRequest;
use App\Models\ShortLink;
use App\Models\ShortLinkClick;
use Carbon\CarbonPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ShortLinkController extends Controller
{
    public function store(ShortLinkRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $request->user()->shortLinks()->create([
            ...$validated,
            'code' => $validated['code'] ?? ShortLink::generateUniqueCode(),
        ]);

        return redirect()
            ->route('social-bio-links.linkshort')
            ->with('success', 'Short link created.');
    }

    public function show(Request $request, ShortLink $shortLink): Response
    {
        $this->authorizeShortLinkOwnership($request, $shortLink);
        $shortLink->loadCount('clicks');

        return Inertia::render('LinkPage/ShortLinkShow', [
            'short_link' => $this->transformShortLink($shortLink),
            'analytics' => $this->analytics($shortLink),
        ]);
    }

    public function update(ShortLinkRequest $request, ShortLink $shortLink): RedirectResponse
    {
        $this->authorizeShortLinkOwnership($request, $shortLink);
        $validated = $request->validated();

        $shortLink->update([
            ...$validated,
            'code' => $validated['code'] ?? ShortLink::generateUniqueCode(),
        ]);

        return back()->with('success', 'Short link updated.');
    }

    public function toggle(Request $request, ShortLink $shortLink): RedirectResponse
    {
        $this->authorizeShortLinkOwnership($request, $shortLink);

        $shortLink->update([
            'is_active' => ! $shortLink->is_active,
        ]);

        return back()->with('success', 'Short link status updated.');
    }

    public function destroy(Request $request, ShortLink $shortLink): RedirectResponse
    {
        $this->authorizeShortLinkOwnership($request, $shortLink);
        $shortLink->delete();

        return redirect()
            ->route('social-bio-links.linkshort')
            ->with('success', 'Short link deleted.');
    }

    public function redirect(Request $request, ShortLink $shortLink): RedirectResponse
    {
        if (! $shortLink->newQuery()->whereKey($shortLink->id)->availableForRedirect()->exists()) {
            abort(404);
        }

        ShortLinkClick::query()->create([
            'short_link_id' => $shortLink->id,
            'clicked_at' => now(),
            'referrer' => $this->truncateNullable($request->headers->get('referer'), 2048),
            'user_agent' => $this->truncateNullable($request->userAgent(), 512),
            'ip_hash' => $this->hashIp($request->ip()),
        ]);

        return redirect()->away($shortLink->destination_url);
    }

    private function authorizeShortLinkOwnership(Request $request, ShortLink $shortLink): void
    {
        if ((int) $shortLink->user_id !== (int) $request->user()->id) {
            abort(403);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function transformShortLink(ShortLink $shortLink): array
    {
        return [
            'id' => $shortLink->id,
            'title' => $shortLink->title,
            'destination_url' => $shortLink->destination_url,
            'code' => $shortLink->code,
            'description' => $shortLink->description,
            'is_active' => (bool) $shortLink->is_active,
            'starts_at' => $shortLink->starts_at?->format('Y-m-d\\TH:i'),
            'ends_at' => $shortLink->ends_at?->format('Y-m-d\\TH:i'),
            'short_url' => route('short-links.redirect', ['shortLink' => $shortLink->code]),
            'clicks_count' => (int) ($shortLink->clicks_count ?? $shortLink->clicks()->count()),
            'created_at' => $shortLink->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function analytics(ShortLink $shortLink): array
    {
        $thirtyDaysAgo = now()->subDays(29)->startOfDay();
        $clicks = $shortLink->clicks();
        $dailyCounts = ShortLinkClick::query()
            ->where('short_link_id', $shortLink->id)
            ->where('clicked_at', '>=', $thirtyDaysAgo)
            ->selectRaw('DATE(clicked_at) as click_date, COUNT(*) as clicks')
            ->groupBy('click_date')
            ->pluck('clicks', 'click_date');

        $daily = collect(CarbonPeriod::create($thirtyDaysAgo, now()->startOfDay()))
            ->map(fn ($date): array => [
                'date' => $date->format('Y-m-d'),
                'clicks' => (int) ($dailyCounts[$date->format('Y-m-d')] ?? 0),
            ])
            ->values();

        return [
            'total_clicks' => (int) $clicks->count(),
            'unique_visitors' => (int) $shortLink->clicks()->whereNotNull('ip_hash')->distinct('ip_hash')->count('ip_hash'),
            'daily_clicks' => $daily,
            'top_referrers' => ShortLinkClick::query()
                ->where('short_link_id', $shortLink->id)
                ->select('referrer', DB::raw('COUNT(*) as clicks'))
                ->groupBy('referrer')
                ->orderByDesc('clicks')
                ->limit(8)
                ->get()
                ->map(fn (ShortLinkClick $click): array => [
                    'referrer' => $click->referrer ?: 'Direct',
                    'clicks' => (int) $click->clicks,
                ])
                ->values(),
            'recent_clicks' => $shortLink->clicks()
                ->latest('clicked_at')
                ->limit(10)
                ->get()
                ->map(fn (ShortLinkClick $click): array => [
                    'clicked_at' => $click->clicked_at?->toIso8601String(),
                    'referrer' => $click->referrer ?: 'Direct',
                    'user_agent' => $click->user_agent,
                ])
                ->values(),
        ];
    }

    private function hashIp(?string $ip): ?string
    {
        if (! $ip) {
            return null;
        }

        return hash_hmac('sha256', $ip, (string) config('app.key'));
    }

    private function truncateNullable(?string $value, int $limit): ?string
    {
        if (! $value) {
            return null;
        }

        return mb_substr($value, 0, $limit);
    }
}
