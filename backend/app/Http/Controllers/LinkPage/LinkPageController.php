<?php

namespace App\Http\Controllers\LinkPage;

use App\Http\Controllers\Controller;
use App\Http\Requests\LinkPage\LinkPageLinkRequest;
use App\Http\Requests\LinkPage\ReorderLinkPageLinksRequest;
use App\Http\Requests\LinkPage\UpdateLinkPageRequest;
use App\Models\LinkClick;
use App\Models\LinkPage;
use App\Models\LinkPageLink;
use App\Models\ShortLink;
use App\Models\User;
use App\Models\WebPage;
use App\Models\WebPageEvent;
use App\Services\LinkPageUsernameService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LinkPageController extends Controller
{
    private const AVAILABLE_TABS = ['link_in_bio', 'linkshort', 'web_pages'];

    public function notFound(): never
    {
        abort(404);
    }

    public function index(Request $request, LinkPageUsernameService $usernameService): Response
    {
        $activeTab = $request->route('active_tab');

        if ($request->has('tab') || ! is_string($activeTab) || ! in_array($activeTab, self::AVAILABLE_TABS, true)) {
            abort(404);
        }

        $primaryLinkPage = $this->findOrCreatePrimaryLinkPage($request->user(), $usernameService);
        $primaryLinkPage->load([
            'links' => fn ($query) => $query->withCount('clicks'),
        ]);

        $allLinkPages = $request->user()
            ->linkPages()
            ->with([
                'links' => fn ($query) => $query->withCount('clicks'),
                'user',
            ])
            ->withCount(['links', 'clicks'])
            ->orderByDesc('is_primary')
            ->orderBy('id')
            ->get();
        $shortLinks = $request->user()
            ->shortLinks()
            ->withCount('clicks')
            ->latest()
            ->get();
        $webPages = $request->user()
            ->webPages()
            ->with('user')
            ->withCount([
                'events',
                'submissions',
                'events as views_count' => fn ($query) => $query->where('type', WebPageEvent::TYPE_VIEW),
            ])
            ->latest()
            ->get();

        return Inertia::render('LinkPage/Show', [
            'active_tab' => $activeTab,
            'link_page' => $this->transformLinkPage($primaryLinkPage),
            'link_pages' => $allLinkPages->map(fn (LinkPage $linkPage): array => $this->transformLinkPageSummary($linkPage))->values(),
            'short_links' => $shortLinks->map(fn (ShortLink $shortLink): array => $this->transformShortLinkSummary($shortLink))->values(),
            'short_link_summary' => [
                'total_links' => $shortLinks->count(),
                'active_links' => $shortLinks->where('is_active', true)->count(),
                'total_clicks' => $shortLinks->sum(fn (ShortLink $shortLink): int => (int) ($shortLink->clicks_count ?? 0)),
            ],
            'web_pages' => $webPages->map(fn (WebPage $webPage): array => $this->transformWebPageSummary($webPage))->values(),
            'web_page_summary' => [
                'total_pages' => $webPages->count(),
                'published_pages' => $webPages->where('is_published', true)->count(),
                'total_views' => $webPages->sum(fn (WebPage $webPage): int => (int) ($webPage->views_count ?? 0)),
                'total_submissions' => $webPages->sum(fn (WebPage $webPage): int => (int) ($webPage->submissions_count ?? 0)),
            ],
            'web_page_templates' => $this->transformWebPageTemplates(),
            'theme_presets' => LinkPage::themePresets(),
            'selected_analytics' => $this->analytics($primaryLinkPage),
            'combined_analytics' => $this->combinedAnalytics($allLinkPages),
        ]);
    }

    public function create(Request $request, LinkPageUsernameService $usernameService): Response
    {
        $primaryLinkPage = $this->findOrCreatePrimaryLinkPage($request->user(), $usernameService);

        return Inertia::render('LinkPage/Edit', [
            'mode' => 'create',
            'link_page' => $this->transformDraftLinkPage($primaryLinkPage),
            'theme_presets' => LinkPage::themePresets(),
        ]);
    }

    public function edit(Request $request, LinkPage $linkPage): Response
    {
        $this->authorizeLinkPageOwnership($request->user(), $linkPage);

        $linkPage->load([
            'links' => fn ($query) => $query->withCount('clicks'),
            'user',
        ]);

        return Inertia::render('LinkPage/Edit', [
            'link_page' => $this->transformLinkPage($linkPage),
            'theme_presets' => LinkPage::themePresets(),
        ]);
    }

    public function createCard(Request $request, LinkPageUsernameService $usernameService): RedirectResponse
    {
        $this->findOrCreatePrimaryLinkPage($request->user(), $usernameService);

        $validated = $request->validate([
            'display_name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:120', 'alpha_dash:ascii'],
            'theme' => ['nullable', 'string', Rule::in(array_keys(LinkPage::themePresets()))],
        ]);

        $preferredSlug = isset($validated['slug']) && $validated['slug'] !== ''
            ? (string) $validated['slug']
            : (string) $validated['display_name'];

        $slug = $this->generateUniqueSlugForUser($request->user(), $preferredSlug);
        $theme = (string) ($validated['theme'] ?? 'sunrise');

        $card = $request->user()->linkPages()->create([
            'slug' => $slug,
            'display_name' => (string) $validated['display_name'],
            'theme' => $theme,
            'theme_settings' => LinkPage::defaultThemeSettings($theme),
            'is_primary' => false,
            'is_published' => false,
            'published_at' => null,
        ]);

        return redirect()
            ->route('social-bio-links.cards.edit', ['linkPage' => $card->id])
            ->with('success', 'Link card created.');
    }

    public function setPrimary(Request $request, LinkPage $linkPage): RedirectResponse
    {
        $this->authorizeLinkPageOwnership($request->user(), $linkPage);

        DB::transaction(function () use ($request, $linkPage): void {
            $request->user()->linkPages()->update(['is_primary' => false]);

            $linkPage->forceFill(['is_primary' => true])->save();
        });

        return back()->with('success', 'Primary card updated.');
    }

    public function destroyCard(Request $request, LinkPage $linkPage, LinkPageUsernameService $usernameService): RedirectResponse
    {
        $this->authorizeLinkPageOwnership($request->user(), $linkPage);

        $allOwnedPages = $request->user()->linkPages()->orderBy('id')->get();

        if ($allOwnedPages->count() <= 1) {
            return back()->withErrors([
                'card' => 'At least one link card is required.',
            ]);
        }

        DB::transaction(function () use ($request, $linkPage): void {
            $wasPrimary = (bool) $linkPage->is_primary;
            $linkPage->delete();

            if (! $wasPrimary) {
                return;
            }

            $nextPrimary = $request->user()
                ->linkPages()
                ->orderBy('id')
                ->first();

            if ($nextPrimary) {
                $request->user()->linkPages()->update(['is_primary' => false]);
                $nextPrimary->forceFill(['is_primary' => true])->save();
            }
        });

        $primaryLinkPage = $this->findOrCreatePrimaryLinkPage($request->user(), $usernameService);

        return redirect()
            ->route('social-bio-links.index', ['card' => $primaryLinkPage->id])
            ->with('success', 'Link card deleted.');
    }

    public function update(UpdateLinkPageRequest $request, LinkPageUsernameService $usernameService): RedirectResponse
    {
        $linkPage = $this->resolveManagedLinkPage($request, $usernameService);
        $validated = $request->validated();
        $isPublished = (bool) $validated['is_published'];

        $linkPage->update([
            'theme' => $validated['theme'],
            'theme_settings' => $validated['theme_settings'],
            'is_published' => $isPublished,
            'published_at' => $isPublished ? ($linkPage->published_at ?? now()) : null,
        ]);

        return back()->with('success', 'Link page updated.');
    }

    public function uploadBanner(Request $request, LinkPageUsernameService $usernameService): RedirectResponse
    {
        $linkPage = $this->resolveManagedLinkPage($request, $usernameService);

        $request->validate([
            'banner' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $disk = (string) config('filesystems.upload_disk', 'public');
        $banner = $request->file('banner');

        try {
            $this->deleteManagedImage($linkPage->banner_url);

            $path = $banner->store("link-page-banners/{$linkPage->id}", $disk);
            $url = Storage::disk($disk)->url($path);

            $linkPage->update([
                'banner_url' => $url,
            ]);
        } catch (\Throwable $exception) {
            $this->logBannerUploadFailure([
                'user_id' => $request->user()?->id,
                'link_page_id' => $linkPage->id,
                'disk' => $disk,
                'original_name' => $banner?->getClientOriginalName(),
                'mime_type' => $banner?->getClientMimeType(),
                'size' => $banner?->getSize(),
                'error' => $exception->getMessage(),
                'exception' => $exception::class,
            ]);

            throw $exception;
        }

        return back()->with('success', 'Banner uploaded.');
    }

    public function removeBanner(Request $request, LinkPageUsernameService $usernameService): RedirectResponse
    {
        $linkPage = $this->resolveManagedLinkPage($request, $usernameService);
        $this->deleteManagedImage($linkPage->banner_url);

        $linkPage->update(['banner_url' => null]);

        return back()->with('success', 'Banner removed.');
    }

    public function storeLink(LinkPageLinkRequest $request, LinkPageUsernameService $usernameService): RedirectResponse
    {
        $linkPage = $this->resolveManagedLinkPage($request, $usernameService);
        $nextSortOrder = ((int) $linkPage->links()->max('sort_order')) + 1;

        $linkPage->links()->create([
            ...$request->validated(),
            'sort_order' => $nextSortOrder,
        ]);

        return back()->with('success', 'Link added.');
    }

    public function updateLink(LinkPageLinkRequest $request, LinkPageLink $link): RedirectResponse
    {
        $this->authorizeLinkOwnership($request->user(), $link);
        $link->update($request->validated());

        return back()->with('success', 'Link updated.');
    }

    public function destroyLink(Request $request, LinkPageLink $link): RedirectResponse
    {
        $this->authorizeLinkOwnership($request->user(), $link);
        $link->delete();

        return back()->with('success', 'Link removed.');
    }

    public function reorderLinks(ReorderLinkPageLinksRequest $request, LinkPageUsernameService $usernameService): RedirectResponse
    {
        $linkPage = $this->resolveManagedLinkPage($request, $usernameService);
        $submittedLinkIds = collect($request->validated('links'))
            ->map(fn ($id) => (int) $id)
            ->sort()
            ->values();
        $ownedLinkIds = $linkPage->links()->pluck('id')->map(fn ($id) => (int) $id)->sort()->values();

        if ($ownedLinkIds->all() !== $submittedLinkIds->all()) {
            abort(422);
        }

        DB::transaction(function () use ($request): void {
            foreach ($request->validated('links') as $index => $linkId) {
                LinkPageLink::query()
                    ->whereKey($linkId)
                    ->update(['sort_order' => $index + 1]);
            }
        });

        return back()->with('success', 'Links reordered.');
    }

    private function findOrCreatePrimaryLinkPage(User $user, LinkPageUsernameService $usernameService): LinkPage
    {
        if (! $user->username) {
            $user->forceFill([
                'username' => $usernameService->generate($user->name, (int) $user->id),
            ])->save();
        }

        $primary = $user->linkPages()->where('is_primary', true)->orderBy('id')->first();

        if ($primary) {
            return $primary;
        }

        $existing = $user->linkPages()->orderBy('id')->first();
        if ($existing) {
            $existing->forceFill([
                'is_primary' => true,
                'slug' => $existing->slug ?: 'main',
            ])->save();

            return $existing;
        }

        return $user->linkPages()->create([
            'slug' => 'main',
            'display_name' => $user->name,
            'theme' => 'sunrise',
            'theme_settings' => LinkPage::defaultThemeSettings(),
            'is_primary' => true,
            'is_published' => false,
            'published_at' => null,
        ]);
    }

    private function resolveManagedLinkPage(Request $request, LinkPageUsernameService $usernameService): LinkPage
    {
        $primaryLinkPage = $this->findOrCreatePrimaryLinkPage($request->user(), $usernameService);
        $selectedId = (int) $request->input('link_page_id', 0);

        if ($selectedId <= 0) {
            return $primaryLinkPage;
        }

        $linkPage = $request->user()->linkPages()->whereKey($selectedId)->first();

        if (! $linkPage) {
            abort(404);
        }

        return $linkPage;
    }

    private function generateUniqueSlugForUser(User $user, string $value): string
    {
        $base = Str::of($value)->slug('-')->value();

        if ($base === '') {
            $base = 'card';
        }

        if ($base === 'links') {
            $base = 'card-links';
        }

        $candidate = $base;
        $suffix = 2;

        while ($user->linkPages()->where('slug', $candidate)->exists()) {
            $candidate = $base.'-'.$suffix;
            $suffix++;
        }

        return $candidate;
    }

    private function authorizeLinkPageOwnership(User $user, LinkPage $linkPage): void
    {
        if ((int) $linkPage->user_id !== (int) $user->id) {
            abort(403);
        }
    }

    private function authorizeLinkOwnership(User $user, LinkPageLink $link): void
    {
        $link->loadMissing('linkPage');

        if ((int) $link->linkPage->user_id !== (int) $user->id) {
            abort(403);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function analytics(LinkPage $linkPage): array
    {
        $links = $linkPage->links->map(function (LinkPageLink $link): LinkPageLink {
            if (! array_key_exists('clicks_count', $link->getAttributes())) {
                $link->setAttribute('clicks_count', $link->clicks()->count());
            }

            return $link;
        });

        return $this->analyticsFromLinks($links);
    }

    /**
     * @param  Collection<int, LinkPage>  $allLinkPages
     * @return array<string, mixed>
     */
    private function combinedAnalytics(Collection $allLinkPages): array
    {
        if ($allLinkPages->isEmpty()) {
            return [
                'total_clicks' => 0,
                'unique_clicks' => 0,
                'daily_clicks' => collect(),
                'links' => collect(),
            ];
        }

        $links = LinkPageLink::query()
            ->whereIn('link_page_id', $allLinkPages->pluck('id'))
            ->withCount('clicks')
            ->orderBy('id')
            ->get();

        return $this->analyticsFromLinks($links);
    }

    /**
     * @param  Collection<int, LinkPageLink>  $links
     * @return array<string, mixed>
     */
    private function analyticsFromLinks(Collection $links): array
    {
        $linkIds = $links->pluck('id');

        if ($linkIds->isEmpty()) {
            return [
                'total_clicks' => 0,
                'unique_clicks' => 0,
                'daily_clicks' => collect(),
                'links' => collect(),
            ];
        }

        $totalClicks = LinkClick::query()->whereIn('link_page_link_id', $linkIds)->count();
        $uniqueClicks = LinkClick::query()
            ->whereIn('link_page_link_id', $linkIds)
            ->whereNotNull('ip_hash')
            ->distinct('ip_hash')
            ->count('ip_hash');

        $dailyClicks = LinkClick::query()
            ->whereIn('link_page_link_id', $linkIds)
            ->where('clicked_at', '>=', now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(clicked_at) as date, COUNT(*) as clicks')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row): array => [
                'date' => (string) $row->date,
                'clicks' => (int) $row->clicks,
            ])
            ->values();

        return [
            'total_clicks' => $totalClicks,
            'unique_clicks' => $uniqueClicks,
            'daily_clicks' => $dailyClicks,
            'links' => $links
                ->map(fn (LinkPageLink $link): array => [
                    'id' => $link->id,
                    'title' => $link->title,
                    'clicks' => (int) ($link->clicks_count ?? 0),
                ])
                ->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformLinkPage(LinkPage $linkPage): array
    {
        $linkPage->loadMissing('user');

        $settings = $this->resolveThemeSettings($linkPage);

        $publicUrl = $linkPage->is_primary
            ? route('social-bio-links.public.show', ['username' => $linkPage->user->username])
            : route('social-bio-links.public.card.show', [
                'username' => $linkPage->user->username,
                'slug' => $linkPage->slug,
            ]);

        return [
            'id' => $linkPage->id,
            'slug' => $linkPage->slug,
            'is_primary' => (bool) $linkPage->is_primary,
            'card_name' => $linkPage->display_name,
            'username' => $linkPage->user->username,
            'display_name' => $linkPage->display_name,
            'bio' => $linkPage->user->bio,
            'avatar_url' => $linkPage->user->avatar_url,
            'banner_url' => $linkPage->banner_url,
            'theme' => $linkPage->theme,
            'theme_settings' => $settings,
            'is_published' => $linkPage->is_published,
            'published_at' => $linkPage->published_at?->toIso8601String(),
            'public_url' => $publicUrl,
            'links' => $linkPage->links
                ->map(fn (LinkPageLink $link): array => $this->transformLinkPageLink($link))
                ->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformDraftLinkPage(LinkPage $primaryLinkPage): array
    {
        $primaryLinkPage->loadMissing('user');

        return [
            'id' => null,
            'slug' => '',
            'is_primary' => false,
            'card_name' => '',
            'username' => $primaryLinkPage->user->username,
            'display_name' => '',
            'bio' => $primaryLinkPage->user->bio,
            'avatar_url' => $primaryLinkPage->user->avatar_url,
            'banner_url' => null,
            'theme' => 'sunrise',
            'theme_settings' => LinkPage::defaultThemeSettings(),
            'is_published' => false,
            'published_at' => null,
            'public_url' => $primaryLinkPage->is_primary
                ? route('social-bio-links.public.show', ['username' => $primaryLinkPage->user->username])
                : route('social-bio-links.public.card.show', [
                    'username' => $primaryLinkPage->user->username,
                    'slug' => $primaryLinkPage->slug,
                ]),
            'links' => [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformLinkPageSummary(LinkPage $linkPage): array
    {
        $linkPage->loadMissing('user');

        $settings = $this->resolveThemeSettings($linkPage);
        $publicUrl = $linkPage->is_primary
            ? route('social-bio-links.public.show', ['username' => $linkPage->user->username])
            : route('social-bio-links.public.card.show', [
                'username' => $linkPage->user->username,
                'slug' => $linkPage->slug,
            ]);

        return [
            'id' => $linkPage->id,
            'slug' => $linkPage->slug,
            'is_primary' => (bool) $linkPage->is_primary,
            'card_name' => $linkPage->display_name,
            'username' => $linkPage->user->username,
            'display_name' => $linkPage->display_name,
            'bio' => $linkPage->user->bio,
            'avatar_url' => $linkPage->user->avatar_url,
            'banner_url' => $linkPage->banner_url,
            'theme' => $linkPage->theme,
            'theme_settings' => $settings,
            'is_published' => (bool) $linkPage->is_published,
            'public_url' => $publicUrl,
            'links_count' => (int) ($linkPage->links_count ?? 0),
            'clicks_count' => (int) ($linkPage->clicks_count ?? 0),
            'preview_links' => $linkPage->links
                ->filter(fn (LinkPageLink $link): bool => $this->isLinkPubliclyVisible($link))
                ->map(fn (LinkPageLink $link): array => $this->transformLinkPageLink($link))
                ->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveThemeSettings(LinkPage $linkPage): array
    {
        return array_replace(
            LinkPage::defaultThemeSettings($linkPage->theme),
            $linkPage->theme_settings ?? []
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function transformLinkPageLink(LinkPageLink $link): array
    {
        return [
            'id' => $link->id,
            'title' => $link->title,
            'url' => $link->url,
            'description' => $link->description,
            'icon' => $link->icon,
            'sort_order' => $link->sort_order,
            'is_active' => $link->is_active,
            'starts_at' => $link->starts_at?->format('Y-m-d\\TH:i'),
            'ends_at' => $link->ends_at?->format('Y-m-d\\TH:i'),
            'clicks_count' => (int) ($link->clicks_count ?? 0),
        ];
    }

    private function isLinkPubliclyVisible(LinkPageLink $link): bool
    {
        if (! $link->is_active) {
            return false;
        }

        if ($link->starts_at !== null && $link->starts_at->isFuture()) {
            return false;
        }

        if ($link->ends_at !== null && $link->ends_at->isPast()) {
            return false;
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformShortLinkSummary(ShortLink $shortLink): array
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
            'clicks_count' => (int) ($shortLink->clicks_count ?? 0),
            'created_at' => $shortLink->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformWebPageSummary(WebPage $webPage): array
    {
        return [
            'id' => $webPage->id,
            'title' => $webPage->title,
            'slug' => $webPage->slug,
            'description' => $webPage->description,
            'template_key' => $webPage->template_key,
            'is_published' => (bool) $webPage->is_published,
            'published_at' => $webPage->published_at?->toIso8601String(),
            'public_url' => route('web-pages.public.show', [
                'username' => $webPage->user?->username ?? request()->user()?->username,
                'slug' => $webPage->slug,
            ]),
            'edit_url' => route('social-bio-links.web-pages.edit', $webPage),
            'events_count' => (int) ($webPage->events_count ?? 0),
            'submissions_count' => (int) ($webPage->submissions_count ?? 0),
            'sections_count' => count($webPage->sections ?? []),
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function transformWebPageTemplates(): array
    {
        return collect(WebPage::templates())
            ->map(fn (array $template, string $key): array => [
                'key' => $key,
                'label' => $template['label'],
                'category' => $template['category'],
                'description' => $template['description'],
                'preview_image' => $template['preview_image'],
            ])
            ->all();
    }

    private function deleteManagedImage(?string $imageUrl): void
    {
        if (! $imageUrl) {
            return;
        }

        foreach ($this->imageDeletableDisks() as $disk) {
            $resolvedPath = $this->resolveDiskPath($imageUrl, $disk);

            if ($resolvedPath !== null) {
                Storage::disk($disk)->delete($resolvedPath);

                return;
            }
        }
    }

    /**
     * @return array<int, string>
     */
    private function imageDeletableDisks(): array
    {
        return array_values(array_unique([
            (string) config('filesystems.upload_disk', 'public'),
            'r2',
            'public',
        ]));
    }

    private function resolveDiskPath(string $fileUrl, string $disk): ?string
    {
        if ($disk === 'public') {
            $publicPath = '/storage/';
            if (str_starts_with($fileUrl, $publicPath)) {
                return ltrim(Str::after($fileUrl, $publicPath), '/');
            }
        }

        if (! filter_var($fileUrl, FILTER_VALIDATE_URL)) {
            return null;
        }

        $diskBaseUrl = rtrim((string) Storage::disk($disk)->url(''), '/');
        if ($diskBaseUrl === '' || ! str_starts_with($fileUrl, $diskBaseUrl)) {
            return null;
        }

        $relativePath = ltrim(Str::after($fileUrl, $diskBaseUrl), '/');

        return $relativePath === '' ? null : $relativePath;
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function logBannerUploadFailure(array $context): void
    {
        try {
            Log::error('Link page banner upload failed.', $context);
        } catch (\Throwable) {
            // Logging should never break the upload response lifecycle.
        }
    }
}
