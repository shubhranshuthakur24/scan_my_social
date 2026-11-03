<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ViralImagePrompt extends Model
{
    protected $fillable = [
        'title',
        'slug',
        'prompt',
        'category',
        'image_path',
    ];

    public static function createUniqueSlug(string $title): string
    {
        $baseSlug = Str::slug($title);
        if ($baseSlug === '') {
            $baseSlug = 'prompt';
        }

        $slug = $baseSlug;
        $suffix = 2;

        while (self::query()->where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
