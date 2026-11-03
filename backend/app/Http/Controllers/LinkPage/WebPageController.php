<?php

namespace App\Http\Controllers\LinkPage;

use App\Http\Controllers\Controller;
use App\Http\Requests\LinkPage\WebPageRequest;
use App\Models\User;
use App\Models\WebPage;
use App\Models\WebPageEvent;
use App\Models\WebPageSubmission;
use App\Services\LinkPageUsernameService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class WebPageController extends Controller
{
    public function create(Request $request, LinkPageUsernameService $usernameService): Response
    {
        $this->ensureUsername($request->user(), $usernameService);

        return Inertia::render('LinkPage/WebPageCreate', [
            'templates' => $this->transformTemplates(),
            'default_theme_settings' => WebPage::defaultThemeSettings(),
        ]);
    }

    public function store(WebPageRequest $request, LinkPageUsernameService $usernameService): RedirectResponse
    {
        $this->ensureUsername($request->user(), $usernameService);
        $validated = $request->validated();

        $templateKey = array_key_exists((string) ($validated['template_key'] ?? ''), WebPage::templates())
            ? (string) $validated['template_key']
            : 'creator';
        $title = trim((string) $validated['title']);
        $description = trim((string) ($validated['description'] ?? ''));
        $slug = (string) ($validated['slug'] ?? '');
        $isPublished = (bool) ($validated['is_published'] ?? false);
        $sections = is_array($validated['sections'] ?? null) && $validated['sections'] !== []
            ? $validated['sections']
            : WebPage::defaultSections($templateKey);
        $templateThemeKey = (string) (WebPage::templates()[$templateKey]['theme_key'] ?? 'studio');

        $webPage = $request->user()->webPages()->create([
            'title' => $title,
            'slug' => $slug !== '' ? $slug : $this->generateUniqueSlug($request->user(), $title),
            'description' => $description !== '' ? $description : (WebPage::templates()[$templateKey]['description'] ?? null),
            'template_key' => $templateKey,
            'sections' => $this->replaceUsernamePlaceholders($sections, (string) $request->user()->username),
            'theme_settings' => $validated['theme_settings'] ?? WebPage::defaultThemeSettings($templateThemeKey),
            'is_published' => $isPublished,
            'published_at' => $isPublished ? now() : null,
        ]);

        return redirect()
            ->route('social-bio-links.web-pages.edit', $webPage)
            ->with('success', 'Web page created.');
    }

    public function edit(Request $request, WebPage $webPage): Response
    {
        $this->authorizeOwnership($request->user(), $webPage);

        $webPage->loadCount(['events', 'submissions']);

        return Inertia::render('LinkPage/WebPageEdit', [
            'web_page' => $this->transformWebPage($webPage),
            'templates' => $this->transformTemplates(),
            'theme_presets' => $this->transformThemePresets(),
            'analytics' => $this->analytics($webPage),
        ]);
    }

    public function update(WebPageRequest $request, WebPage $webPage): RedirectResponse
    {
        $this->authorizeOwnership($request->user(), $webPage);
        $validated = $request->validated();
        $isPublished = (bool) $validated['is_published'];

        $webPage->update([
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'template_key' => $validated['template_key'] ?? $webPage->template_key,
            'sections' => $validated['sections'],
            'theme_settings' => $validated['theme_settings'] ?? [],
            'is_published' => $isPublished,
            'published_at' => $isPublished ? ($webPage->published_at ?? now()) : null,
        ]);

        return back()->with('success', 'Web page saved.');
    }

    public function togglePublish(Request $request, WebPage $webPage): RedirectResponse
    {
        $this->authorizeOwnership($request->user(), $webPage);
        $isPublished = ! $webPage->is_published;

        $webPage->update([
            'is_published' => $isPublished,
            'published_at' => $isPublished ? ($webPage->published_at ?? now()) : null,
        ]);

        return back()->with('success', $isPublished ? 'Web page published.' : 'Web page unpublished.');
    }

    public function preview(Request $request, WebPage $webPage): Response
    {
        $this->authorizeOwnership($request->user(), $webPage);
        $webPage->loadMissing('user');

        return Inertia::render('LinkPage/PublicWebPageShow', [
            'web_page' => $this->transformPublicWebPage($webPage),
            'is_preview' => true,
        ]);
    }

    public function destroy(Request $request, WebPage $webPage): RedirectResponse
    {
        $this->authorizeOwnership($request->user(), $webPage);
        $webPage->delete();

        return redirect()
            ->route('social-bio-links.web-pages.index')
            ->with('success', 'Web page deleted.');
    }

    private function authorizeOwnership(User $user, WebPage $webPage): void
    {
        abort_unless((int) $webPage->user_id === (int) $user->id, 404);
    }

    private function ensureUsername(User $user, LinkPageUsernameService $usernameService): void
    {
        if ($user->username) {
            return;
        }

        $user->forceFill([
            'username' => $usernameService->generate($user->name, (int) $user->id),
        ])->save();
    }

    private function generateUniqueSlug(User $user, string $title): string
    {
        $base = Str::slug($title) ?: 'page';
        if (in_array($base, WebPage::reservedSlugs(), true)) {
            $base = "{$base}-page";
        }

        $slug = $base;
        $suffix = 2;

        while ($user->webPages()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    /**
     * @param  array<int, array<string, mixed>>  $sections
     * @return array<int, array<string, mixed>>
     */
    private function replaceUsernamePlaceholders(array $sections, string $username): array
    {
        return collect($sections)
            ->map(function (array $section) use ($username): array {
                $content = is_array($section['content'] ?? null) ? $section['content'] : [];
                foreach (['primary_url', 'secondary_url', 'url'] as $key) {
                    if (isset($content[$key]) && is_string($content[$key])) {
                        $content[$key] = str_replace('@username', '@'.$username, $content[$key]);
                    }
                }
                $section['content'] = $content;

                return $section;
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function transformTemplates(): array
    {
        return collect(WebPage::templates())
            ->map(fn (array $template, string $key): array => [
                'key' => $key,
                'label' => $template['label'],
                'category' => $template['category'],
                'description' => $template['description'],
                'theme_key' => $template['theme_key'],
                'theme_settings' => WebPage::defaultThemeSettings($template['theme_key']),
                'preview_image' => $template['preview_image'],
                'sections' => $template['sections'],
            ])
            ->all();
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function transformThemePresets(): array
    {
        return collect(WebPage::themePresets())
            ->map(fn (array $theme, string $key): array => [
                'key' => $key,
                'label' => $theme['label'],
                'description' => $theme['description'],
                'settings' => $theme['settings'],
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function transformWebPage(WebPage $webPage): array
    {
        $username = $webPage->user?->username ?? request()->user()?->username;

        return [
            'id' => $webPage->id,
            'title' => $webPage->title,
            'slug' => $webPage->slug,
            'description' => $webPage->description,
            'template_key' => $webPage->template_key,
            'sections' => $webPage->sections ?? [],
            'theme_settings' => $webPage->theme_settings ?? [],
            'is_published' => (bool) $webPage->is_published,
            'published_at' => $webPage->published_at?->toIso8601String(),
            'public_url' => $username ? route('web-pages.public.show', ['username' => $username, 'slug' => $webPage->slug]) : null,
            'preview_url' => route('social-bio-links.web-pages.preview', $webPage),
            'events_count' => (int) ($webPage->events_count ?? 0),
            'submissions_count' => (int) ($webPage->submissions_count ?? 0),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformPublicWebPage(WebPage $webPage): array
    {
        return [
            'id' => $webPage->id,
            'username' => $webPage->user->username,
            'title' => $webPage->title,
            'slug' => $webPage->slug,
            'description' => $webPage->description,
            'template_key' => $webPage->template_key,
            'sections' => $webPage->sections ?? [],
            'theme_settings' => $webPage->theme_settings ?? [],
            'is_published' => (bool) $webPage->is_published,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function analytics(WebPage $webPage): array
    {
        $events = $webPage->events()
            ->where('occurred_at', '>=', now()->subDays(30))
            ->latest('occurred_at')
            ->get();

        return [
            'total_views' => $webPage->events()->where('type', WebPageEvent::TYPE_VIEW)->count(),
            'total_cta_clicks' => $webPage->events()->where('type', WebPageEvent::TYPE_CTA_CLICK)->count(),
            'total_submissions' => $webPage->submissions()->count(),
            'unique_visitors' => $webPage->events()->whereNotNull('ip_hash')->distinct('ip_hash')->count('ip_hash'),
            'daily_views' => $this->dailyCounts($events->where('type', WebPageEvent::TYPE_VIEW)),
            'cta_clicks' => $webPage->events()
                ->where('type', WebPageEvent::TYPE_CTA_CLICK)
                ->selectRaw('block_id, count(*) as clicks')
                ->groupBy('block_id')
                ->orderByDesc('clicks')
                ->get()
                ->map(fn (WebPageEvent $event): array => [
                    'block_id' => $event->block_id,
                    'clicks' => (int) $event->clicks,
                ])
                ->values(),
            'recent_submissions' => $webPage->submissions()
                ->latest('submitted_at')
                ->limit(8)
                ->get()
                ->map(fn (WebPageSubmission $submission): array => [
                    'id' => $submission->id,
                    'block_id' => $submission->block_id,
                    'data' => $submission->data,
                    'submitted_at' => $submission->submitted_at?->toIso8601String(),
                ])
                ->values(),
        ];
    }

    /**
     * @param  Collection<int, WebPageEvent>  $events
     * @return array<int, array<string, mixed>>
     */
    private function dailyCounts(Collection $events): array
    {
        return collect(range(29, 0))
            ->map(function (int $daysAgo) use ($events): array {
                $date = now()->subDays($daysAgo)->toDateString();

                return [
                    'date' => $date,
                    'views' => $events->filter(fn (WebPageEvent $event): bool => $event->occurred_at?->toDateString() === $date)->count(),
                ];
            })
            ->values()
            ->all();
    }
}
