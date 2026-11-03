<?php

namespace App\Models;

use Database\Factories\InstagramAccountMediaAnalyticsFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class InstagramAccountMediaAnalytics extends Model
{
    /** @use HasFactory<InstagramAccountMediaAnalyticsFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'instagram_account_id',
        'instagram_media_id',
        'media_type',
        'format',
        'caption',
        'permalink',
        'media_url',
        'thumbnail_url',
        'posted_at',
        'synced_at',
        'reach',
        'impressions',
        'engagement',
        'likes',
        'comments',
        'shares',
        'saves',
        'story_replies',
        'story_taps_forward',
        'story_taps_back',
        'story_exits',
        'raw_media',
        'raw_metrics',
    ];

    protected function casts(): array
    {
        return [
            'posted_at' => 'datetime',
            'synced_at' => 'datetime',
            'raw_media' => 'array',
            'raw_metrics' => 'array',
            'reach' => 'integer',
            'impressions' => 'integer',
            'engagement' => 'integer',
            'likes' => 'integer',
            'comments' => 'integer',
            'shares' => 'integer',
            'saves' => 'integer',
            'story_replies' => 'integer',
            'story_taps_forward' => 'integer',
            'story_taps_back' => 'integer',
            'story_exits' => 'integer',
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

    public function automationFlow(): HasOne
    {
        return $this->hasOne(AutomationFlow::class, 'trigger_value', 'instagram_media_id');
    }
}
