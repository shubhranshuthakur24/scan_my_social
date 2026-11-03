<?php

namespace App\Models;

use Database\Factories\InstagramAccountInsightSnapshotFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstagramAccountInsightSnapshot extends Model
{
    /** @use HasFactory<InstagramAccountInsightSnapshotFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'instagram_account_id',
        'snapshot_date',
        'reach',
        'impressions',
        'profile_views',
        'follower_count',
        'following_count',
        'media_count',
        'synced_at',
        'raw_metrics',
    ];

    protected function casts(): array
    {
        return [
            'snapshot_date' => 'date',
            'synced_at' => 'datetime',
            'raw_metrics' => 'array',
            'reach' => 'integer',
            'impressions' => 'integer',
            'profile_views' => 'integer',
            'follower_count' => 'integer',
            'following_count' => 'integer',
            'media_count' => 'integer',
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
}
