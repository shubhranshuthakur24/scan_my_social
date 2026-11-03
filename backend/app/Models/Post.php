<?php

namespace App\Models;

use App\Services\MediaUrlService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Post extends Model
{
    protected $table = 'posts';

    protected $fillable = [
        'channel_id',
        'platform',
        'post_id',
        'type',
        'short_code',
        'caption',
        'hashtags',
        'mentions',
        'url',
        'comments_count',
        'first_comment',
        'latest_comments',
        'dimensions_height',
        'dimensions_width',
        'display_url',
        'images',
        'video_url',
        'likes_count',
        'video_view_count',
        'post_timestamp',
        'child_posts',
        'owner_full_name',
        'owner_username',
        'owner_id',
        'product_type',
        'tagged_users',
        'coauthor_producers',
        'is_comments_disabled',
        'input_url',
        'audio_url',
        'alt',
        'video_play_count',
        'video_duration',
        'music_info',
        'location_name',
        'location_id',
        'is_pinned',
        'is_approved',
        'is_transcribed',
        'is_analyzed',
        // Outlier & Engagement Detection (set by OutlierDetectionService)
        'breakout_label',
        'breakout_multiplier',
        'median_baseline',
        'stddev_baseline',
        'engagement_rate',
        'engagement_ratio',
    ];

    protected $casts = [
        'hashtags' => 'array',
        'mentions' => 'array',
        'images' => 'array',
        'latest_comments' => 'array',
        'child_posts' => 'array',
        'tagged_users' => 'array',
        'coauthor_producers' => 'array',
        'music_info' => 'array',
        'is_comments_disabled' => 'boolean',
        'is_approved' => 'boolean',
        'is_pinned' => 'boolean',
        'is_transcribed' => 'boolean',
        'is_analyzed' => 'boolean',
        'post_timestamp' => 'datetime',
    ];

    protected $appends = ['outlier_score'];

    public function getOutlierScoreAttribute()
    {
        // Return stored breakout_multiplier if available (computed by OutlierDetectionService)
        if ($this->breakout_multiplier !== null) {
            return round((float) $this->breakout_multiplier, 1);
        }

        // Fallback: simple ratio using channel's global median_views
        $median = $this->channel?->median_views;
        if (! $median || $median === 0) {
            return 1.0;
        }

        $actualViews = max((int) ($this->video_view_count ?? 0), (int) ($this->video_play_count ?? 0));

        if ($actualViews === 0) {
            return 0.0;
        }

        return round($actualViews / $median, 1);
    }

    public function getDisplayUrlAttribute($value): ?string
    {
        $normalized = trim((string) $value);
        if ($normalized === '') {
            return null;
        }

        return app(MediaUrlService::class)->previewUrl($normalized);
    }

    public function channel()
    {
        return $this->belongsTo(Channel::class);
    }

    public function contentAnalysis(): HasOne
    {
        return $this->hasOne(ContentAnalysis::class);
    }

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(Project::class, 'project_posts')
            ->withTimestamps();
    }

    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    public function scopeNotTranscribed($query)
    {
        return $query->where('is_transcribed', false);
    }

    public function scopeHasAudio($query)
    {
        return $query->whereNotNull('audio_url');
    }
}
