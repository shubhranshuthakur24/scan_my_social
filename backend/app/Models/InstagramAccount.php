<?php

namespace App\Models;

use Database\Factories\InstagramAccountFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InstagramAccount extends Model
{
    /** @use HasFactory<InstagramAccountFactory> */
    use HasFactory;

    public const TOKEN_TYPE_LONG_LIVED = 'long_lived';

    public const TOKEN_TYPE_SHORT_LIVED = 'short_lived';

    protected $fillable = [
        'user_id',
        'ig_account_id',
        'fb_page_id',
        'username',
        'name',
        'biography',
        'profile_url',
        'profile_picture_url',
        'profile_picture_synced_at',
        'media_count',
        'follower_count',
        'following_count',
        'access_token',
        'token_type',
        'token_expires_at',
        'long_lived_exchange_failed_at',
        'status',
        'webhook_subscriptions_status',
        'webhook_subscriptions_last_synced_at',
        'webhook_subscriptions_error',
        'welcome_dm_enabled',
        'welcome_dm_variants',
    ];

    protected $hidden = [
        'access_token',
    ];

    protected $casts = [
        'access_token' => 'encrypted',
        'media_count' => 'integer',
        'follower_count' => 'integer',
        'following_count' => 'integer',
        'token_expires_at' => 'datetime',
        'long_lived_exchange_failed_at' => 'datetime',
        'profile_picture_synced_at' => 'datetime',
        'webhook_subscriptions_last_synced_at' => 'datetime',
        'welcome_dm_enabled' => 'boolean',
        'welcome_dm_variants' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function automationFlows()
    {
        return $this->hasMany(AutomationFlow::class);
    }

    public function scheduledPosts(): HasMany
    {
        return $this->hasMany(ScheduledPost::class);
    }

    public function welcomeDmDeliveries(): HasMany
    {
        return $this->hasMany(InstagramWelcomeDmDelivery::class);
    }

    public function mediaAnalytics(): HasMany
    {
        return $this->hasMany(InstagramAccountMediaAnalytics::class);
    }

    public function insightSnapshots(): HasMany
    {
        return $this->hasMany(InstagramAccountInsightSnapshot::class);
    }
}
