<?php

namespace App\Models;

use Database\Factories\WebPageFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class WebPage extends Model
{
    /** @use HasFactory<WebPageFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'description',
        'template_key',
        'sections',
        'theme_settings',
        'is_published',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'sections' => 'array',
            'theme_settings' => 'array',
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(WebPageEvent::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(WebPageSubmission::class);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }

    /**
     * @return array<int, string>
     */
    public static function reservedSlugs(): array
    {
        return [
            'admin',
            'api',
            'blog',
            'blogs',
            'cal',
            'calendar',
            'create',
            'dashboard',
            'edit',
            'login',
            'logout',
            'pages',
            'pricing',
            'register',
            'settings',
            'social-bio-links',
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function defaultSections(string $templateKey = 'creator'): array
    {
        $templates = static::templates();

        return $templates[$templateKey]['sections'] ?? $templates['creator']['sections'];
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultThemeSettings(string $themeKey = 'studio'): array
    {
        $themes = static::themePresets();

        return $themes[$themeKey]['settings'] ?? $themes['studio']['settings'];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function themePresets(): array
    {
        return [
            'studio' => [
                'label' => 'Studio',
                'description' => 'Clean white surfaces with a direct campaign accent.',
                'settings' => [
                    'theme_key' => 'studio',
                    'background_color' => '#f8fafc',
                    'text_color' => '#0f172a',
                    'muted_text_color' => '#64748b',
                    'accent_color' => '#ef4444',
                    'surface_color' => '#ffffff',
                    'border_color' => '#e2e8f0',
                    'button_style' => 'rounded',
                    'radius_style' => 'rounded',
                    'layout_style' => 'split',
                    'font_style' => 'sans',
                ],
            ],
            'midnight' => [
                'label' => 'Midnight',
                'description' => 'Dark, high-contrast pages for launches and drops.',
                'settings' => [
                    'theme_key' => 'midnight',
                    'background_color' => '#0f172a',
                    'text_color' => '#f8fafc',
                    'muted_text_color' => '#cbd5e1',
                    'accent_color' => '#38bdf8',
                    'surface_color' => '#1e293b',
                    'border_color' => '#334155',
                    'button_style' => 'pill',
                    'radius_style' => 'rounded',
                    'layout_style' => 'immersive',
                    'font_style' => 'sans',
                ],
            ],
            'sunrise' => [
                'label' => 'Sunrise',
                'description' => 'Warm and bright for personal creator pages.',
                'settings' => [
                    'theme_key' => 'sunrise',
                    'background_color' => '#fff7ed',
                    'text_color' => '#111827',
                    'muted_text_color' => '#7c2d12',
                    'accent_color' => '#f97316',
                    'surface_color' => '#ffffff',
                    'border_color' => '#fed7aa',
                    'button_style' => 'rounded',
                    'radius_style' => 'soft',
                    'layout_style' => 'split',
                    'font_style' => 'serif',
                ],
            ],
            'forest' => [
                'label' => 'Forest',
                'description' => 'Quiet green tones for services and consulting.',
                'settings' => [
                    'theme_key' => 'forest',
                    'background_color' => '#ecfdf5',
                    'text_color' => '#064e3b',
                    'muted_text_color' => '#047857',
                    'accent_color' => '#059669',
                    'surface_color' => '#ffffff',
                    'border_color' => '#a7f3d0',
                    'button_style' => 'rounded',
                    'radius_style' => 'soft',
                    'layout_style' => 'split',
                    'font_style' => 'sans',
                ],
            ],
            'ocean' => [
                'label' => 'Ocean',
                'description' => 'Fresh blue styling for polished public pages.',
                'settings' => [
                    'theme_key' => 'ocean',
                    'background_color' => '#ecfeff',
                    'text_color' => '#164e63',
                    'muted_text_color' => '#0e7490',
                    'accent_color' => '#0891b2',
                    'surface_color' => '#ffffff',
                    'border_color' => '#a5f3fc',
                    'button_style' => 'rounded',
                    'radius_style' => 'rounded',
                    'layout_style' => 'editorial',
                    'font_style' => 'sans',
                ],
            ],
            'candy' => [
                'label' => 'Candy',
                'description' => 'Bright rose styling for audience growth pages.',
                'settings' => [
                    'theme_key' => 'candy',
                    'background_color' => '#fff1f2',
                    'text_color' => '#4c0519',
                    'muted_text_color' => '#be123c',
                    'accent_color' => '#f43f5e',
                    'surface_color' => '#ffffff',
                    'border_color' => '#fecdd3',
                    'button_style' => 'pill',
                    'radius_style' => 'soft',
                    'layout_style' => 'centered',
                    'font_style' => 'sans',
                ],
            ],
            'noir' => [
                'label' => 'Noir',
                'description' => 'Sharp monochrome pages with a premium feel.',
                'settings' => [
                    'theme_key' => 'noir',
                    'background_color' => '#09090b',
                    'text_color' => '#fafafa',
                    'muted_text_color' => '#d4d4d8',
                    'accent_color' => '#f5f5f4',
                    'surface_color' => '#18181b',
                    'border_color' => '#3f3f46',
                    'button_style' => 'sharp',
                    'radius_style' => 'sharp',
                    'layout_style' => 'editorial',
                    'font_style' => 'serif',
                ],
            ],
            'royal' => [
                'label' => 'Royal',
                'description' => 'Purple accents for strong offers and lead magnets.',
                'settings' => [
                    'theme_key' => 'royal',
                    'background_color' => '#f5f3ff',
                    'text_color' => '#2e1065',
                    'muted_text_color' => '#6d28d9',
                    'accent_color' => '#7c3aed',
                    'surface_color' => '#ffffff',
                    'border_color' => '#ddd6fe',
                    'button_style' => 'rounded',
                    'radius_style' => 'rounded',
                    'layout_style' => 'centered',
                    'font_style' => 'sans',
                ],
            ],
        ];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function templates(): array
    {
        return [
            'creator' => [
                'label' => 'Creator Studio',
                'category' => 'Personal brand',
                'description' => 'A visual home for your work, content, and next offer.',
                'theme_key' => 'studio',
                'preview_image' => '/images/web-page-templates/creator.jpg',
                'sections' => [
                    static::section('hero', ['eyebrow' => 'Independent creative', 'heading' => 'Ideas, images, and work that moves people', 'body' => 'A considered home for selected projects, new releases, and ways to collaborate.', 'image_url' => '/images/web-page-templates/creator.jpg', 'primary_label' => 'Work with me', 'primary_url' => '/cal/@username', 'secondary_label' => 'Explore the work', 'secondary_url' => '#featured-video']),
                    static::section('video', ['heading' => 'Featured Video', 'url' => 'https://www.youtube.com/embed/dQw4w9WgXcQ']),
                    static::section('link_list', ['heading' => 'Start here', 'links' => [['label' => 'Latest drop', 'url' => 'https://example.com'], ['label' => 'Newsletter', 'url' => 'https://example.com/newsletter']]]),
                ],
            ],
            'service' => [
                'label' => 'Consulting Practice',
                'category' => 'Services',
                'description' => 'A proof-led service page built to turn interest into inquiries.',
                'theme_key' => 'forest',
                'preview_image' => '/images/web-page-templates/service.jpg',
                'sections' => [
                    static::section('hero', ['eyebrow' => 'Strategy and direction', 'heading' => 'Make the next business decision with clarity', 'body' => 'Focused advisory for teams navigating a launch, repositioning, or new stage of growth.', 'image_url' => '/images/web-page-templates/service.jpg', 'primary_label' => 'Book a working session', 'primary_url' => '#contact']),
                    static::section('testimonials', ['heading' => 'Client Wins', 'items' => [['quote' => 'Clear, fast, and exactly what we needed.', 'name' => 'Happy Client']]]),
                    static::section('contact_form', ['heading' => 'Tell us what you need', 'button_label' => 'Send request']),
                    static::section('faq', ['heading' => 'Questions', 'items' => [['question' => 'How fast can we start?', 'answer' => 'Most projects can start after a quick discovery call.']]]),
                ],
            ],
            'launch' => [
                'label' => 'Signal Launch',
                'category' => 'Campaign',
                'description' => 'A high-impact launch page for waitlists, drops, and announcements.',
                'theme_key' => 'midnight',
                'preview_image' => '/images/web-page-templates/launch.jpg',
                'sections' => [
                    static::section('hero', ['eyebrow' => 'New release', 'heading' => 'Small speaker. Serious presence.', 'body' => 'A compact wireless speaker engineered for room-filling sound and everyday movement.', 'image_url' => '/images/web-page-templates/launch.jpg', 'primary_label' => 'Join the first drop', 'primary_url' => '#contact', 'secondary_label' => 'See what is new', 'secondary_url' => '#why-it-matters']),
                    static::section('text', ['heading' => 'Why it matters', 'body' => 'Use this space to make the offer obvious and memorable.']),
                    static::section('contact_form', ['heading' => 'Join the waitlist', 'button_label' => 'Join now']),
                ],
            ],
            'portfolio' => [
                'label' => 'Selected Work',
                'category' => 'Portfolio',
                'description' => 'An editorial portfolio for visual work and project inquiries.',
                'theme_key' => 'noir',
                'preview_image' => '/images/web-page-templates/portfolio.jpg',
                'sections' => [
                    static::section('hero', ['eyebrow' => 'Art direction and image', 'heading' => 'Selected work, 2024-2026', 'body' => 'Campaigns, identities, and visual systems made with ambitious teams.', 'image_url' => '/images/web-page-templates/portfolio.jpg', 'primary_label' => 'Start a project', 'primary_url' => '#contact']),
                    static::section('image', ['heading' => 'Colour in motion', 'image_url' => '/images/web-page-templates/portfolio.jpg', 'body' => 'A campaign study shaped through movement, material, and vivid restraint.']),
                    static::section('contact_form', ['heading' => 'Project inquiry', 'button_label' => 'Send inquiry']),
                ],
            ],
            'event' => [
                'label' => 'Live Workshop',
                'category' => 'Events',
                'description' => 'A registration page for workshops, webinars, and live sessions.',
                'theme_key' => 'ocean',
                'preview_image' => '/images/web-page-templates/event.jpg',
                'sections' => [
                    static::section('hero', ['eyebrow' => 'Live in London · 18 July', 'heading' => 'Build a brand people can feel', 'body' => 'A hands-on one-day workshop for founders and creative teams ready to sharpen their point of view.', 'image_url' => '/images/web-page-templates/event.jpg', 'primary_label' => 'Reserve a seat', 'primary_url' => 'https://example.com/register']),
                    static::section('text', ['heading' => 'What you will learn', 'body' => 'Add the main takeaways and who should attend.']),
                    static::section('faq', ['heading' => 'Event Details', 'items' => [['question' => 'Will there be a replay?', 'answer' => 'Yes, registrants receive the replay link.']]]),
                ],
            ],
            'product' => [
                'label' => 'Object Store',
                'category' => 'Commerce',
                'description' => 'A polished product story with benefits, proof, and a clear purchase path.',
                'theme_key' => 'sunrise',
                'preview_image' => '/images/web-page-templates/product.jpg',
                'sections' => [
                    static::section('hero', ['eyebrow' => 'Edition 01', 'heading' => 'A warmer way to light the room', 'body' => 'Sculptural ambient light in hand-finished amber glass and brushed steel.', 'image_url' => '/images/web-page-templates/product.jpg', 'primary_label' => 'Shop the lamp', 'primary_url' => 'https://example.com/buy', 'secondary_label' => 'View details', 'secondary_url' => '#product-preview']),
                    static::section('image', ['heading' => 'Designed to stay', 'image_url' => '/images/web-page-templates/product.jpg', 'body' => 'Built from durable materials with a dimmable warm light source.']),
                    static::section('testimonials', ['heading' => 'What customers say', 'items' => [['quote' => 'It made the decision simple.', 'name' => 'Customer']]]),
                ],
            ],
            'lead_magnet' => [
                'label' => 'Resource Drop',
                'category' => 'Lead generation',
                'description' => 'Exchange a useful guide, checklist, or toolkit for a new lead.',
                'theme_key' => 'royal',
                'preview_image' => '/images/web-page-templates/lead-magnet.jpg',
                'sections' => [
                    static::section('hero', ['eyebrow' => 'Free brand workbook', 'heading' => 'Find the sharpest version of your idea', 'body' => 'A practical 18-page workbook for turning scattered thoughts into a clear creative direction.', 'image_url' => '/images/web-page-templates/lead-magnet.jpg', 'primary_label' => 'Get the workbook', 'primary_url' => '#contact']),
                    static::section('text', ['heading' => 'Inside the resource', 'body' => 'List the practical takeaways and why they matter.']),
                    static::section('contact_form', ['heading' => 'Send me the resource', 'button_label' => 'Get access']),
                ],
            ],
            'newsletter' => [
                'label' => 'Field Notes',
                'category' => 'Newsletter',
                'description' => 'An editorial subscription page for ideas worth returning to.',
                'theme_key' => 'candy',
                'preview_image' => '/images/web-page-templates/newsletter.jpg',
                'sections' => [
                    static::section('hero', ['eyebrow' => 'A letter every other Friday', 'heading' => 'Notes on making work that matters', 'body' => 'Essays and observations on creativity, attention, and building an independent practice.', 'image_url' => '/images/web-page-templates/newsletter.jpg', 'primary_label' => 'Join the readership', 'primary_url' => '#contact']),
                    static::section('testimonials', ['heading' => 'Reader Notes', 'items' => [['quote' => 'One of the few emails I open every week.', 'name' => 'Subscriber']]]),
                    static::section('contact_form', ['heading' => 'Subscribe now', 'button_label' => 'Subscribe']),
                ],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $content
     * @return array<string, mixed>
     */
    private static function section(string $type, array $content): array
    {
        return [
            'id' => (string) Str::uuid(),
            'type' => $type,
            'content' => $content,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findSection(string $blockId): ?array
    {
        return collect($this->sections ?? [])
            ->first(fn (array $section): bool => (string) Arr::get($section, 'id') === $blockId);
    }
}
