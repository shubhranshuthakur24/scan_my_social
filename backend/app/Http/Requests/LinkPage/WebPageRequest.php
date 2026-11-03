<?php

namespace App\Http\Requests\LinkPage;

use App\Models\WebPage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class WebPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $webPage = $this->route('webPage');

        if (! $webPage instanceof WebPage) {
            return true;
        }

        return (int) $webPage->user_id === (int) $this->user()->id;
    }

    protected function failedAuthorization(): void
    {
        throw new NotFoundHttpException;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $webPage = $this->route('webPage');
        $webPageId = $webPage instanceof WebPage ? $webPage->id : null;
        $requiresExistingSlug = $webPage instanceof WebPage;
        $userId = (int) $this->user()->id;

        return [
            'title' => ['required', 'string', 'max:140'],
            'slug' => [
                $requiresExistingSlug ? 'required' : 'nullable',
                'string',
                'max:120',
                'regex:/^[a-z0-9-]+$/',
                Rule::notIn(WebPage::reservedSlugs()),
                Rule::unique('web_pages', 'slug')
                    ->where(fn ($query) => $query->where('user_id', $userId))
                    ->ignore($webPageId),
            ],
            'description' => ['nullable', 'string', 'max:240'],
            'template_key' => ['nullable', 'string', 'max:80', Rule::in(array_keys(WebPage::templates()))],
            'sections' => [$requiresExistingSlug ? 'required' : 'nullable', 'array', 'min:1'],
            'theme_settings' => ['nullable', 'array'],
            'theme_settings.theme_key' => ['nullable', 'string', Rule::in(array_keys(WebPage::themePresets()))],
            'theme_settings.background_color' => ['nullable', 'hex_color'],
            'theme_settings.text_color' => ['nullable', 'hex_color'],
            'theme_settings.muted_text_color' => ['nullable', 'hex_color'],
            'theme_settings.accent_color' => ['nullable', 'hex_color'],
            'theme_settings.surface_color' => ['nullable', 'hex_color'],
            'theme_settings.border_color' => ['nullable', 'hex_color'],
            'theme_settings.button_style' => ['nullable', 'string', Rule::in(['rounded', 'pill', 'sharp'])],
            'theme_settings.radius_style' => ['nullable', 'string', Rule::in(['rounded', 'soft', 'sharp'])],
            'theme_settings.layout_style' => ['nullable', 'string', Rule::in(['split', 'immersive', 'editorial', 'centered'])],
            'theme_settings.font_style' => ['nullable', 'string', Rule::in(['sans', 'serif'])],
            'is_published' => ['boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $sections = $this->input('sections', []);
                if (! is_array($sections)) {
                    return;
                }

                foreach ($sections as $index => $section) {
                    if (! is_array($section)) {
                        $validator->errors()->add("sections.{$index}", 'Each section must be valid.');

                        continue;
                    }

                    $type = (string) Arr::get($section, 'type');
                    if (! in_array($type, $this->allowedSectionTypes(), true)) {
                        $validator->errors()->add("sections.{$index}.type", 'The section type is not supported.');
                    }

                    if (! Str::isUuid((string) Arr::get($section, 'id'))) {
                        $validator->errors()->add("sections.{$index}.id", 'Each section needs a valid block id.');
                    }

                    $this->validateSectionUrls($validator, $section, $index);
                }
            },
        ];
    }

    protected function prepareForValidation(): void
    {
        $webPage = $this->route('webPage');
        $requiresExistingSlug = $webPage instanceof WebPage;
        $title = trim((string) $this->input('title'));
        $slug = trim((string) $this->input('slug'));

        $this->merge([
            'title' => $title,
            'slug' => $slug === ''
                ? ($requiresExistingSlug ? Str::slug($title) : null)
                : Str::slug($slug),
            'description' => trim((string) $this->input('description')),
            'is_published' => $this->boolean('is_published'),
        ]);
    }

    /**
     * @return array<int, string>
     */
    private function allowedSectionTypes(): array
    {
        return [
            'hero',
            'text',
            'image',
            'video',
            'cta',
            'link_list',
            'faq',
            'testimonials',
            'contact_form',
        ];
    }

    /**
     * @param  array<string, mixed>  $section
     */
    private function validateSectionUrls($validator, array $section, int $index): void
    {
        $content = Arr::get($section, 'content', []);
        if (! is_array($content)) {
            $validator->errors()->add("sections.{$index}.content", 'Section content must be valid.');

            return;
        }

        foreach (['primary_url', 'secondary_url', 'url', 'image_url'] as $key) {
            $value = trim((string) Arr::get($content, $key));
            if ($value !== '' && ! $this->isAllowedUrl($value)) {
                $validator->errors()->add("sections.{$index}.content.{$key}", 'Only http, https, anchors, or internal public URLs are allowed.');
            }
        }

        foreach (Arr::get($content, 'links', []) as $linkIndex => $link) {
            $value = trim((string) Arr::get($link, 'url'));
            if ($value !== '' && ! $this->isAllowedUrl($value)) {
                $validator->errors()->add("sections.{$index}.content.links.{$linkIndex}.url", 'Only http, https, anchors, or internal public URLs are allowed.');
            }
        }
    }

    private function isAllowedUrl(string $value): bool
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

        $scheme = parse_url($value, PHP_URL_SCHEME);

        return in_array($scheme, ['http', 'https'], true);
    }
}
