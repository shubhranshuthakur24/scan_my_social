<?php

namespace App\Models;

use App\Services\MediaUrlService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Log;

class Channel extends Model
{
    protected $fillable = [
        'handle',
        'name',
        'platform',
        'bio',
        'profile_image_url',
        'followers_count',
        'posts_count',
        'follows_count',
        'is_private',
        'is_verified',
        'is_business',
        'views_count',
        'topics',
        'is_favorite',
        'last_refreshed_data_on',
        'median_views',
        'apify_profile_run_id',
        'apify_profile_run_status',
        'apify_post_run_id',
        'apify_post_run_status',
    ];

    protected $hidden = [
        'apify_profile_run_id',
        'apify_post_run_id',
    ];

    protected $casts = [
        'topics' => 'array',
        'is_favorite' => 'boolean',
        'is_private' => 'boolean',
        'is_verified' => 'boolean',
        'is_business' => 'boolean',
        'last_refreshed_data_on' => 'datetime',
    ];

    /**
     * Get all Instagram posts for this channel
     */
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'channel_users')
            ->withTimestamps();
    }

    public function watchlists(): BelongsToMany
    {
        return $this->belongsToMany(Watchlist::class, 'watchlist_channels')
            ->withTimestamps();
    }

    /**
     * Recalculate and update the median views for this channel
     */
    public function recalculateMedianViews(): void
    {
        $views = $this->posts()
            ->where(function ($q) {
                $q->whereNotNull('video_view_count')
                    ->orWhereNotNull('video_play_count');
            })
            ->get()
            ->map(function ($post) {
                // Return the higher of the two, as Reels often report different numbers for play vs view
                return max((int) ($post->video_view_count ?? 0), (int) ($post->video_play_count ?? 0));
            })
            ->filter(fn ($v) => $v > 0) // Only consider videos with actual views
            ->sort()
            ->values();

        $count = $views->count();
        if ($count === 0) {
            $this->update(['median_views' => null]);

            return;
        }

        $mid = (int) floor($count / 2);

        if ($count % 2 === 0) {
            // Even: average of the two middle values
            $median = ($views[$mid - 1] + $views[$mid]) / 2;
        } else {
            // Odd: exact middle value
            $median = $views[$mid];
        }

        $result = (int) round($median);
        $this->update(['median_views' => $result]);

        Log::debug("Recalculated median for channel {$this->id} (@{$this->handle}): {$result} views based on {$count} videos.");
    }

    public function getProfileImageUrlAttribute($value): ?string
    {
        $normalized = trim((string) $value);
        if ($normalized === '') {
            return null;
        }

        return app(MediaUrlService::class)->previewUrl($normalized);
    }
}
