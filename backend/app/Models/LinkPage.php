<?php

namespace App\Models;

use Database\Factories\LinkPageFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class LinkPage extends Model
{
    /** @use HasFactory<LinkPageFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'slug',
        'display_name',
        'is_primary',
        'banner_url',
        'theme',
        'theme_settings',
        'is_published',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'theme_settings' => 'array',
            'is_primary' => 'boolean',
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function links(): HasMany
    {
        return $this->hasMany(LinkPageLink::class)->orderBy('sort_order')->orderBy('id');
    }

    public function clicks(): HasManyThrough
    {
        return $this->hasManyThrough(LinkClick::class, LinkPageLink::class);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }

    public function scopePrimary(Builder $query): Builder
    {
        return $query->where('is_primary', true);
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultThemeSettings(string $themeKey = 'sunrise'): array
    {
        $presets = static::themePresets();

        return $presets[$themeKey]['settings'] ?? $presets['sunrise']['settings'];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function themePresets(): array
    {
        return [
            'sunrise' => [
                'label' => 'Atelier',
                'category' => 'Fashion',
                'description' => 'Editorial product imagery with a refined split layout.',
                'settings' => [
                    'background_color' => '#eadce5',
                    'text_color' => '#35121e',
                    'button_background_color' => '#6f1026',
                    'button_text_color' => '#ffffff',
                    'button_style' => 'rounded',
                    'layout' => 'editorial',
                    'font_style' => 'serif',
                    'cover_image' => '/images/link-page-templates/atelier.jpg',
                ],
            ],
            'midnight' => [
                'label' => 'Motion',
                'category' => 'Fitness',
                'description' => 'A full-bleed monochrome cover built for bold personalities.',
                'settings' => [
                    'background_color' => '#090909',
                    'text_color' => '#fafafa',
                    'button_background_color' => '#f4f4f0',
                    'button_text_color' => '#151515',
                    'button_style' => 'pill',
                    'layout' => 'immersive',
                    'font_style' => 'sans',
                    'cover_image' => '/images/link-page-templates/motion.jpg',
                ],
            ],
            'forest' => [
                'label' => 'Woven',
                'category' => 'Studio',
                'description' => 'Tactile imagery and a vivid panel for craft-led brands.',
                'settings' => [
                    'background_color' => '#d7ff91',
                    'text_color' => '#102b18',
                    'button_background_color' => '#173f24',
                    'button_text_color' => '#ffffff',
                    'button_style' => 'rounded',
                    'layout' => 'split',
                    'font_style' => 'serif',
                    'cover_image' => '/images/link-page-templates/woven.jpg',
                ],
            ],
            'studio' => [
                'label' => 'Signal',
                'category' => 'Technology',
                'description' => 'A vivid digital poster with compact, high-contrast links.',
                'settings' => [
                    'background_color' => '#3a075f',
                    'text_color' => '#ffffff',
                    'button_background_color' => '#ffffff',
                    'button_text_color' => '#2a0642',
                    'button_style' => 'sharp',
                    'layout' => 'poster',
                    'font_style' => 'mono',
                    'cover_image' => null,
                ],
            ],
            'ocean' => [
                'label' => 'Field Notes',
                'category' => 'Travel',
                'description' => 'A cinematic cover that keeps the creator story front and center.',
                'settings' => [
                    'background_color' => '#dce9e8',
                    'text_color' => '#132a2b',
                    'button_background_color' => '#183f43',
                    'button_text_color' => '#ffffff',
                    'button_style' => 'rounded',
                    'layout' => 'cinematic',
                    'font_style' => 'sans',
                    'cover_image' => '/images/link-page-templates/field-notes.jpg',
                ],
            ],
            'candy' => [
                'label' => 'Bloom',
                'category' => 'Beauty',
                'description' => 'Soft color, circular portrait framing, and friendly calls to action.',
                'settings' => [
                    'background_color' => '#efb7d1',
                    'text_color' => '#421528',
                    'button_background_color' => '#8d2855',
                    'button_text_color' => '#ffffff',
                    'button_style' => 'pill',
                    'layout' => 'portrait',
                    'font_style' => 'sans',
                    'cover_image' => null,
                ],
            ],
            'noir' => [
                'label' => 'After Dark',
                'category' => 'Music',
                'description' => 'A stark night poster with oversized type and crisp actions.',
                'settings' => [
                    'background_color' => '#0d0d10',
                    'text_color' => '#f4f0e8',
                    'button_background_color' => '#d6ff3f',
                    'button_text_color' => '#11130a',
                    'button_style' => 'sharp',
                    'layout' => 'poster',
                    'font_style' => 'sans',
                    'cover_image' => null,
                ],
            ],
            'royal' => [
                'label' => 'Frame',
                'category' => 'Creator',
                'description' => 'A gallery-led layout for campaigns, drops, and recent work.',
                'settings' => [
                    'background_color' => '#10260f',
                    'text_color' => '#f8df72',
                    'button_background_color' => '#f8df72',
                    'button_text_color' => '#10260f',
                    'button_style' => 'rounded',
                    'layout' => 'gallery',
                    'font_style' => 'sans',
                    'cover_image' => '/images/link-page-templates/atelier.jpg',
                ],
            ],
        ];
    }
}
