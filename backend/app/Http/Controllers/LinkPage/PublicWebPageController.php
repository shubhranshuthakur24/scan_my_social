<?php

namespace App\Http\Controllers\LinkPage;

use App\Http\Controllers\Controller;
use App\Models\WebPage;
use App\Models\WebPageEvent;
use App\Models\WebPageSubmission;
use App\Services\LeadCaptureService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class PublicWebPageController extends Controller
{
    public function show(Request $request, string $username, string $slug): Response
    {
        $webPage = $this->resolvePublishedPage($username, $slug);
        if (! $webPage) {
            abort(404);
        }

        $this->recordEvent($request, $webPage, WebPageEvent::TYPE_VIEW);

        return Inertia::render('LinkPage/PublicWebPageShow', [
            'web_page' => $this->transformPublicWebPage($webPage),
            'is_preview' => false,
        ])->toResponse($request);
    }

    public function click(Request $request, string $username, string $slug, string $blockId): RedirectResponse
    {
        $webPage = $this->resolvePublishedPage($username, $slug);
        if (! $webPage) {
            abort(404);
        }

        $section = $webPage->findSection($blockId);
        $target = $request->query('target') === 'secondary' ? 'secondary' : 'primary';
        $url = $this->resolveCtaUrl($section, $target);

        if (! $url || ! $this->isAllowedRedirectUrl($url)) {
            abort(404);
        }

        $this->recordEvent($request, $webPage, WebPageEvent::TYPE_CTA_CLICK, $blockId, [
            'label' => $this->resolveCtaLabel($section, $target),
            'target' => $target,
            'destination' => $url,
        ]);

        return str_starts_with($url, '/')
            ? redirect($url)
            : redirect()->away($url);
    }

    public function submit(Request $request, string $username, string $slug, string $blockId): RedirectResponse
    {
        $webPage = $this->resolvePublishedPage($username, $slug);
        if (! $webPage) {
            abort(404);
        }

        $section = $webPage->findSection($blockId);
        if ((string) Arr::get($section, 'type') !== 'contact_form') {
            abort(404);
        }

        $fields = $this->formFields($section);
        $validator = Validator::make($request->all(), $this->submissionRules($fields), [], $this->submissionAttributes($fields));

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $validated = $validator->validated();
        $payload = is_array($validated['data'] ?? null) ? $validated['data'] : [];

        $submission = WebPageSubmission::query()->create([
            'web_page_id' => $webPage->id,
            'block_id' => $blockId,
            'data' => $payload,
            'metadata' => [
                'query' => $request->query(),
                'referer' => $request->headers->get('referer'),
            ],
            'ip_hash' => $this->hashIp($request->ip()),
            'user_agent' => $this->truncateNullable($request->userAgent(), 512),
            'submitted_at' => now(),
        ]);

        app(LeadCaptureService::class)->fromWebPageSubmission($submission);

        return redirect()
            ->route('web-pages.public.show', ['username' => $username, 'slug' => $slug])
            ->with('success', 'Thanks, your response has been recorded.');
    }

    private function resolvePublishedPage(string $username, string $slug): ?WebPage
    {
        return WebPage::query()
            ->published()
            ->where('slug', $slug)
            ->whereHas('user', fn ($query) => $query->where('username', $username))
            ->with('user')
            ->first();
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
            'sections' => $webPage->sections ?? [],
            'theme_settings' => $webPage->theme_settings ?? [],
            'is_published' => (bool) $webPage->is_published,
        ];
    }

    /**
     * @param  array<string, mixed>|null  $section
     */
    private function resolveCtaUrl(?array $section, string $target = 'primary'): ?string
    {
        $content = is_array($section['content'] ?? null) ? $section['content'] : [];

        if ($target === 'secondary') {
            return trim((string) Arr::get($content, 'secondary_url'));
        }

        return trim((string) (Arr::get($content, 'primary_url') ?: Arr::get($content, 'url')));
    }

    /**
     * @param  array<string, mixed>|null  $section
     */
    private function resolveCtaLabel(?array $section, string $target = 'primary'): ?string
    {
        $content = is_array($section['content'] ?? null) ? $section['content'] : [];
        $label = $target === 'secondary'
            ? trim((string) Arr::get($content, 'secondary_label'))
            : trim((string) (Arr::get($content, 'primary_label') ?: Arr::get($content, 'label')));

        return $label === '' ? null : $label;
    }

    /**
     * @param  array<string, mixed>|null  $section
     * @return array<int, array<string, mixed>>
     */
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

    /**
     * @param  array<int, array<string, mixed>>  $fields
     * @return array<string, mixed>
     */
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

    /**
     * @param  array<int, array<string, mixed>>  $fields
     * @return array<string, string>
     */
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

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function recordEvent(Request $request, WebPage $webPage, string $type, ?string $blockId = null, array $metadata = []): void
    {
        WebPageEvent::query()->create([
            'web_page_id' => $webPage->id,
            'type' => $type,
            'block_id' => $blockId,
            'referrer' => $this->truncateNullable($request->headers->get('referer'), 2048),
            'user_agent' => $this->truncateNullable($request->userAgent(), 512),
            'ip_hash' => $this->hashIp($request->ip()),
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

    private function truncateNullable(?string $value, int $limit): ?string
    {
        if (! $value) {
            return null;
        }

        return mb_substr($value, 0, $limit);
    }
}
