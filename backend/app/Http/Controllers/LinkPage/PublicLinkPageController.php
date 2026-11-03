<?php

namespace App\Http\Controllers\LinkPage;

use App\Http\Controllers\Controller;
use App\Models\LinkClick;
use App\Models\LinkPage;
use App\Models\LinkPageLink;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class PublicLinkPageController extends Controller
{
    public function show(Request $request, string $username, ?string $slug = null): Response
    {
        $linkPage = LinkPage::query()
            ->published()
            ->whereHas('user', fn ($query) => $query->where('username', $username))
            ->when(
                $slug,
                fn ($query) => $query->where('slug', $slug),
                fn ($query) => $query->where('is_primary', true)
            )
            ->with([
                'user',
                'links' => fn ($query) => $query->visibleNow(),
            ])
            ->first();

        if (! $linkPage) {
            return Inertia::render('LinkPage/NotFound', [
                'username' => $username,
            ])->toResponse($request)->setStatusCode(Response::HTTP_NOT_FOUND);
        }

        $themeSettings = array_replace(
            LinkPage::defaultThemeSettings($linkPage->theme),
            $linkPage->theme_settings ?? []
        );

        return Inertia::render('LinkPage/PublicShow', [
            'link_page' => [
                'username' => $linkPage->user->username,
                'slug' => $linkPage->slug,
                'is_primary' => (bool) $linkPage->is_primary,
                'display_name' => $linkPage->display_name,
                'bio' => $linkPage->user->bio,
                'avatar_url' => $linkPage->user->avatar_url,
                'banner_url' => $linkPage->banner_url,
                'theme' => $linkPage->theme,
                'theme_settings' => $themeSettings,
                'links' => $linkPage->links
                    ->map(fn (LinkPageLink $link): array => [
                        'id' => $link->id,
                        'title' => $link->title,
                        'description' => $link->description,
                        'icon' => $link->icon,
                        'url' => route('social-bio-links.public.redirect', [
                            'username' => $linkPage->user->username,
                            'link' => $link->id,
                        ]),
                    ])
                    ->values(),
            ],
        ])->toResponse($request);
    }

    public function redirect(Request $request, string $username, LinkPageLink $link)
    {
        $link->loadMissing('linkPage.user');

        if (
            $link->linkPage->user->username !== $username
            || ! $link->linkPage->is_published
            || ! $link->newQuery()->whereKey($link->id)->visibleNow()->exists()
        ) {
            abort(404);
        }

        LinkClick::query()->create([
            'link_page_link_id' => $link->id,
            'clicked_at' => now(),
            'referrer' => $this->truncateNullable($request->headers->get('referer'), 2048),
            'user_agent' => $this->truncateNullable($request->userAgent(), 512),
            'ip_hash' => $this->hashIp($request->ip()),
        ]);

        return redirect()->away($link->url);
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
