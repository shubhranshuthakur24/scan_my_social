<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WebPage;
use App\Models\WebPageEvent;
use App\Models\WebPageSubmission;
use App\Services\LeadCaptureService;
use App\Services\LinkPageUsernameService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class WebPageApiController extends Controller
{
    /**
     * Resolve the authenticated user.
     */
    private function resolveUser(Request $request): User
    {
        $user = Auth::user() ?: $request->user();
        if (!$user && app()->environment('local')) {
            $user = User::first();
        }

        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        return $user;
    }

    /**
     * Return template & theme preset catalog.
     */
    public function catalog(Request $request): JsonResponse
    {
        return response()->json([
            'templates' => $this->transformTemplates(),
            'theme_presets' => $this->transformThemePresets(),
        ]);
    }

    /**
     * List user web pages with search and status filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);
        $search = trim((string) $request->query('search', ''));
        $status = (string) $request->query('status', 'all');

        $query = $user->webPages()
            ->withCount(['events', 'submissions'])
            ->latest('updated_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($status === 'published') {
            $query->where('is_published', true);
        } elseif ($status === 'draft') {
            $query->where('is_published', false);
        }

        $webPages = $query->get();
        $allPages = $user->webPages()->withCount(['events', 'submissions'])->get();

        $totalViews = (int) WebPageEvent::whereIn('web_page_id', $allPages->pluck('id'))
            ->where('type', WebPageEvent::TYPE_VIEW)
            ->count();
        $totalSubmissions = (int) $allPages->sum('submissions_count');

        return response()->json([
            'web_pages' => $webPages->map(fn (WebPage $p) => $this->transformWebPage($p, $user))->values(),
            'summary' => [
                'total_pages' => $allPages->count(),
                'published_pages' => $allPages->where('is_published', true)->count(),
                'total_views' => $totalViews,
                'total_submissions' => $totalSubmissions,
            ],
            'templates' => $this->transformTemplates(),
            'theme_presets' => $this->transformThemePresets(),
        ]);
    }

    /**
     * Get details and analytics for a single web page.
     */
    public function show(Request $request, int|string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $webPage = $user->webPages()
            ->withCount(['events', 'submissions'])
            ->findOrFail($id);

        return response()->json([
            'web_page' => $this->transformWebPage($webPage, $user),
            'templates' => $this->transformTemplates(),
            'theme_presets' => $this->transformThemePresets(),
            'analytics' => $this->analytics($webPage),
        ]);
    }

    /**
     * Create a new web page.
     */
    public function store(Request $request, LinkPageUsernameService $usernameService): JsonResponse
    {
        $user = $this->resolveUser($request);
        $this->ensureUsername($user, $usernameService);

        $validator = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:140'],
            'slug' => [
                'nullable',
                'string',
                'max:120',
                'regex:/^[a-z0-9-]+$/',
                Rule::notIn(WebPage::reservedSlugs()),
                Rule::unique('web_pages', 'slug')->where(fn ($q) => $q->where('user_id', $user->id)),
            ],
            'description' => ['nullable', 'string', 'max:240'],
            'template_key' => ['nullable', 'string', 'max:80', Rule::in(array_keys(WebPage::templates()))],
            'sections' => ['nullable', 'array'],
            'theme_settings' => ['nullable', 'array'],
            'is_published' => ['boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
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

        $webPage = $user->webPages()->create([
            'title' => $title,
            'slug' => $slug !== '' ? $slug : $this->generateUniqueSlug($user, $title),
            'description' => $description !== '' ? $description : (WebPage::templates()[$templateKey]['description'] ?? null),
            'template_key' => $templateKey,
            'sections' => $this->replaceUsernamePlaceholders($sections, (string) $user->username),
            'theme_settings' => $validated['theme_settings'] ?? WebPage::defaultThemeSettings($templateThemeKey),
            'is_published' => $isPublished,
            'published_at' => $isPublished ? now() : null,
        ]);

        return response()->json([
            'message' => 'Web page created successfully.',
            'web_page' => $this->transformWebPage($webPage, $user),
        ], 201);
    }

    /**
     * Update an existing web page.
     */
    public function update(Request $request, int|string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $webPage = $user->webPages()->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:140'],
            'slug' => [
                'required',
                'string',
                'max:120',
                'regex:/^[a-z0-9-]+$/',
                Rule::notIn(WebPage::reservedSlugs()),
                Rule::unique('web_pages', 'slug')
                    ->where(fn ($q) => $q->where('user_id', $user->id))
                    ->ignore($webPage->id),
            ],
            'description' => ['nullable', 'string', 'max:240'],
            'template_key' => ['nullable', 'string', 'max:80', Rule::in(array_keys(WebPage::templates()))],
            'sections' => ['required', 'array', 'min:1'],
            'theme_settings' => ['nullable', 'array'],
            'is_published' => ['boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $isPublished = (bool) ($validated['is_published'] ?? $webPage->is_published);

        $webPage->update([
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'template_key' => $validated['template_key'] ?? $webPage->template_key,
            'sections' => $validated['sections'],
            'theme_settings' => $validated['theme_settings'] ?? $webPage->theme_settings ?? [],
            'is_published' => $isPublished,
            'published_at' => $isPublished ? ($webPage->published_at ?? now()) : null,
        ]);

        return response()->json([
            'message' => 'Web page updated successfully.',
            'web_page' => $this->transformWebPage($webPage, $user),
        ]);
    }

    /**
     * Toggle the publish status of a web page.
     */
    public function togglePublish(Request $request, int|string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $webPage = $user->webPages()->findOrFail($id);

        $isPublished = ! $webPage->is_published;
        $webPage->update([
            'is_published' => $isPublished,
            'published_at' => $isPublished ? ($webPage->published_at ?? now()) : null,
        ]);

        return response()->json([
            'message' => $isPublished ? 'Web page published successfully.' : 'Web page unpublished.',
            'is_published' => $isPublished,
            'published_at' => $webPage->published_at?->toIso8601String(),
            'web_page' => $this->transformWebPage($webPage, $user),
        ]);
    }

    /**
     * Delete a web page.
     */
    public function destroy(Request $request, int|string $id): JsonResponse
    {
        $user = $this->resolveUser($request);
        $webPage = $user->webPages()->findOrFail($id);
        $webPage->delete();

        return response()->json([
            'message' => 'Web page deleted successfully.',
        ]);
    }

    /**
     * Public show endpoint for unauthenticated visitors.
     */
    public function publicShow(Request $request, string $username, string $slug): JsonResponse
    {
        $webPage = WebPage::query()
            ->published()
            ->where('slug', $slug)
            ->whereHas('user', fn ($q) => $q->where('username', $username))
            ->with('user')
            ->first();

        if (! $webPage) {
            return response()->json([
                'message' => 'The requested web page was not found or is currently not published.',
            ], 404);
        }

        $this->recordEvent($request, $webPage, WebPageEvent::TYPE_VIEW);

        return response()->json([
            'web_page' => $this->transformPublicWebPage($webPage),
        ]);
    }

    /**
     * Public click redirect tracker.
     */
    public function publicClick(Request $request, string $username, string $slug, string $blockId)
    {
        $webPage = WebPage::query()
            ->published()
            ->where('slug', $slug)
            ->whereHas('user', fn ($q) => $q->where('username', $username))
            ->with('user')
            ->first();

        if (! $webPage) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $section = $webPage->findSection($blockId);
        $target = $request->query('target') === 'secondary' ? 'secondary' : 'primary';
        $url = $this->resolveCtaUrl($section, $target);

        if (! $url || ! $this->isAllowedRedirectUrl($url)) {
            return response()->json(['message' => 'Invalid destination.'], 404);
        }

        $this->recordEvent($request, $webPage, WebPageEvent::TYPE_CTA_CLICK, $blockId, [
            'label' => $this->resolveCtaLabel($section, $target),
            'target' => $target,
            'destination' => $url,
        ]);

        return redirect()->away($url, 302);
    }

    /**
     * Public contact form submission.
     */
    public function publicSubmit(Request $request, string $username, string $slug, string $blockId, LeadCaptureService $leadCaptureService): JsonResponse
    {
        $webPage = WebPage::query()
            ->published()
            ->where('slug', $slug)
            ->whereHas('user', fn ($q) => $q->where('username', $username))
            ->with('user')
            ->first();

        if (! $webPage) {
            return response()->json(['message' => 'The requested web page was not found or is not published.'], 404);
        }

        $section = $webPage->findSection($blockId);
        if ((string) Arr::get($section, 'type') !== 'contact_form') {
            return response()->json(['message' => 'The specified block is not a submission form.'], 404);
        }

        $fields = $this->formFields($section);
        $validator = Validator::make($request->all(), $this->submissionRules($fields), [], $this->submissionAttributes($fields));

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $payload = is_array($validated['data'] ?? null) ? $validated['data'] : [];

        $clientIp = $request->header('X-Client-IP') ?: $request->ip();

        $submission = WebPageSubmission::query()->create([
            'web_page_id' => $webPage->id,
            'block_id' => $blockId,
            'data' => $payload,
            'metadata' => [
                'query' => $request->query(),
                'referer' => $request->headers->get('referer'),
            ],
            'ip_hash' => $this->hashIp($clientIp),
            'user_agent' => substr((string) $request->userAgent(), 0, 512),
            'submitted_at' => now(),
        ]);

        $leadCaptureService->fromWebPageSubmission($submission);

        return response()->json([
            'success' => true,
            'message' => 'Thanks, your response has been recorded.',
        ]);
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

    private function replaceUsernamePlaceholders(array $sections, string $username): array
    {
        return collect($sections)
            ->map(function (array $section) use ($username): array {
                $content = is_array($section['content'] ?? null) ? $section['content'] : [];
                foreach (['primary_url', 'secondary_url', 'url'] as $key) {
                    if (isset($content[$key]) && is_string($content[$key])) {
                        $content[$key] = str_replace('@username', '@' . $username, $content[$key]);
                    }
                }
                $section['content'] = $content;

                return $section;
            })
            ->values()
            ->all();
    }

    private function transformTemplates(): array
    {
        return collect(WebPage::templates())
            ->map(fn (array $template, string $key): array => [
                'key' => $key,
                'name' => $template['label'] ?? ucfirst($key),
                'label' => $template['label'],
                'category' => $template['category'],
                'description' => $template['description'],
                'theme_key' => $template['theme_key'],
                'theme_settings' => WebPage::defaultThemeSettings($template['theme_key']),
                'preview_image' => $template['preview_image'],
                'sections' => $template['sections'],
            ])
            ->values()
            ->all();
    }

    private function transformThemePresets(): array
    {
        return collect(WebPage::themePresets())
            ->map(fn (array $theme, string $key): array => [
                'key' => $key,
                'label' => $theme['label'],
                'description' => $theme['description'],
                'settings' => $theme['settings'],
            ])
            ->values()
            ->all();
    }

    private function transformWebPage(WebPage $webPage, ?User $fallbackUser = null): array
    {
        $username = $webPage->user?->username ?? $fallbackUser?->username;

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
            'public_url' => $username ? "/@{$username}/pages/{$webPage->slug}" : null,
            'events_count' => (int) ($webPage->events_count ?? 0),
            'submissions_count' => (int) ($webPage->submissions_count ?? 0),
            'user' => $webPage->user ? [
                'id' => $webPage->user->id,
                'name' => $webPage->user->name,
                'username' => $webPage->user->username,
                'email' => $webPage->user->email,
            ] : null,
            'created_at' => $webPage->created_at?->toIso8601String(),
            'updated_at' => $webPage->updated_at?->toIso8601String(),
        ];
    }

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

    private function resolveCtaUrl(?array $section, string $target = 'primary'): ?string
    {
        $content = is_array($section['content'] ?? null) ? $section['content'] : [];

        if ($target === 'secondary') {
            return trim((string) Arr::get($content, 'secondary_url'));
        }

        return trim((string) (Arr::get($content, 'primary_url') ?: Arr::get($content, 'url')));
    }

    private function resolveCtaLabel(?array $section, string $target = 'primary'): ?string
    {
        $content = is_array($section['content'] ?? null) ? $section['content'] : [];
        $label = $target === 'secondary'
            ? trim((string) Arr::get($content, 'secondary_label'))
            : trim((string) (Arr::get($content, 'primary_label') ?: Arr::get($content, 'label')));

        return $label === '' ? null : $label;
    }

    private function formFields(?array $section): array
    {
        $fields = Arr::get($section, 'content.fields');
        if (is_array($fields) && $fields !== []) {
            return $fields;
        }

        return [
            ['key' => 'name', 'label' => 'Name', 'type' => 'text', 'required' => true],
            ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true],
            ['key' => 'message', 'label' => 'Message', 'type' => 'textarea', 'required' => false],
        ];
    }

    private function submissionRules(array $fields): array
    {
        $rules = ['data' => ['required', 'array']];

        foreach ($fields as $field) {
            $key = trim((string) Arr::get($field, 'key'));
            if ($key === '') {
                continue;
            }

            $baseRules = (bool) Arr::get($field, 'required') ? ['required'] : ['nullable'];
            $type = (string) Arr::get($field, 'type', 'text');

            $rules["data.{$key}"] = match ($type) {
                'email' => [...$baseRules, 'string', 'email', 'max:255'],
                'phone' => [...$baseRules, 'string', 'max:40'],
                'textarea' => [...$baseRules, 'string', 'max:2000'],
                default => [...$baseRules, 'string', 'max:255'],
            };
        }

        return $rules;
    }

    private function submissionAttributes(array $fields): array
    {
        $attributes = ['data' => 'form data'];

        foreach ($fields as $field) {
            $key = trim((string) Arr::get($field, 'key'));
            $label = trim((string) Arr::get($field, 'label', $key));
            if ($key !== '') {
                $attributes["data.{$key}"] = $label;
            }
        }

        return $attributes;
    }

    private function recordEvent(Request $request, WebPage $webPage, string $type, ?string $blockId = null, array $metadata = []): void
    {
        $clientIp = $request->header('X-Client-IP') ?: $request->ip();

        WebPageEvent::query()->create([
            'web_page_id' => $webPage->id,
            'type' => $type,
            'block_id' => $blockId,
            'referrer' => substr((string) $request->headers->get('referer'), 0, 2048) ?: null,
            'user_agent' => substr((string) $request->userAgent(), 0, 512) ?: null,
            'ip_hash' => $this->hashIp($clientIp),
            'metadata' => $metadata,
            'occurred_at' => now(),
        ]);
    }

    private function isAllowedRedirectUrl(string $value): bool
    {
        if (str_starts_with($value, '#')) {
            return true;
        }

        if (str_starts_with($value, '/') && ! str_starts_with($value, '//') && ! str_contains($value, ' ')) {
            return true;
        }

        if (! filter_var($value, FILTER_VALIDATE_URL)) {
            return false;
        }

        return in_array(parse_url($value, PHP_URL_SCHEME), ['http', 'https'], true);
    }

    private function hashIp(?string $ip): ?string
    {
        if (! $ip) {
            return null;
        }

        return hash_hmac('sha256', $ip, (string) config('app.key'));
    }
}

