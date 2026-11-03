<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

class Activity extends Model
{
    use Prunable;

    protected $fillable = [
        'user_id',
        'type',
        'description',
        'url',
    ];

    /**
     * Prune stale activity records to keep dashboard queries bounded.
     */
    public function prunable(): Builder
    {
        return static::query()->where('created_at', '<', now()->subMonths(6));
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Allow only internal app URLs.
     */
    public static function sanitizeInternalUrl(?string $url): ?string
    {
        if (! is_string($url)) {
            return null;
        }

        $value = trim($url);
        if ($value === '') {
            return null;
        }

        if (str_starts_with($value, '/') && ! str_starts_with($value, '//')) {
            return $value;
        }

        $parts = parse_url($value);
        if (! is_array($parts)) {
            return null;
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));
        if ($scheme === '' || $host === '' || ! in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        $appHost = strtolower((string) parse_url((string) config('app.url'), PHP_URL_HOST));
        if ($appHost === '' || $host !== $appHost) {
            return null;
        }

        $path = (string) ($parts['path'] ?? '/');
        if (! str_starts_with($path, '/')) {
            $path = '/'.$path;
        }

        $query = isset($parts['query']) ? '?'.$parts['query'] : '';
        $fragment = isset($parts['fragment']) ? '#'.$parts['fragment'] : '';

        return $path.$query.$fragment;
    }
}
