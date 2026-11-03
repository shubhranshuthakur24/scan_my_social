<?php

namespace App\Models;

use Database\Factories\ScheduledPostFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ScheduledPost extends Model
{
    /** @use HasFactory<ScheduledPostFactory> */
    use HasFactory;

    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_PUBLISHING = 'publishing';

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_FAILED = 'failed';

    public const STATUS_CANCELLED = 'cancelled';

    public const FORMAT_IMAGE = 'image';

    public const FORMAT_VIDEO = 'video';

    public const FORMAT_REEL = 'reel';

    public const FORMAT_STORY = 'story';

    public const FORMAT_CAROUSEL = 'carousel';

    protected $fillable = [
        'user_id',
        'instagram_account_id',
        'title',
        'platform',
        'format',
        'status',
        'caption',
        'hashtags',
        'options',
        'scheduled_at',
        'published_at',
        'meta_container_id',
        'meta_media_id',
        'retry_count',
        'last_error',
    ];

    protected function casts(): array
    {
        return [
            'hashtags' => 'array',
            'options' => 'array',
            'scheduled_at' => 'datetime',
            'published_at' => 'datetime',
            'retry_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function instagramAccount(): BelongsTo
    {
        return $this->belongsTo(InstagramAccount::class);
    }

    public function media(): BelongsToMany
    {
        return $this->belongsToMany(ContentSchedulerMedia::class, 'content_scheduler_media_scheduled_post')
            ->withPivot('sort_order')
            ->withTimestamps()
            ->orderByPivot('sort_order');
    }

    public function publishAttempts(): HasMany
    {
        return $this->hasMany(ScheduledPostPublishAttempt::class);
    }

    public function analyticsSnapshots(): HasMany
    {
        return $this->hasMany(ScheduledPostAnalyticsSnapshot::class);
    }

    public function scopeDueForPublishing(Builder $query): Builder
    {
        return $query
            ->where('status', self::STATUS_SCHEDULED)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now());
    }
}
