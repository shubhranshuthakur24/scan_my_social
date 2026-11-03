<?php

namespace App\Models;

use Database\Factories\ScheduledPostAnalyticsSnapshotFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduledPostAnalyticsSnapshot extends Model
{
    /** @use HasFactory<ScheduledPostAnalyticsSnapshotFactory> */
    use HasFactory;

    protected $fillable = [
        'scheduled_post_id',
        'instagram_account_id',
        'snapshot_date',
        'followers',
        'reach',
        'impressions',
        'engagement',
        'likes',
        'comments',
        'shares',
        'saves',
        'raw_metrics',
    ];

    protected function casts(): array
    {
        return [
            'snapshot_date' => 'date',
            'raw_metrics' => 'array',
            'followers' => 'integer',
            'reach' => 'integer',
            'impressions' => 'integer',
            'engagement' => 'integer',
            'likes' => 'integer',
            'comments' => 'integer',
            'shares' => 'integer',
            'saves' => 'integer',
        ];
    }

    public function scheduledPost(): BelongsTo
    {
        return $this->belongsTo(ScheduledPost::class);
    }

    public function instagramAccount(): BelongsTo
    {
        return $this->belongsTo(InstagramAccount::class);
    }
}
