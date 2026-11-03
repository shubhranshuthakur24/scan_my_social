<?php

namespace App\Models;

use Database\Factories\ContentSchedulerMediaFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Storage;

class ContentSchedulerMedia extends Model
{
    /** @use HasFactory<ContentSchedulerMediaFactory> */
    use HasFactory;

    protected $table = 'content_scheduler_media';

    protected $fillable = [
        'user_id',
        'disk',
        'path',
        'url',
        'original_name',
        'mime_type',
        'media_type',
        'size_bytes',
        'title',
        'default_caption',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'size_bytes' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scheduledPosts(): BelongsToMany
    {
        return $this->belongsToMany(ScheduledPost::class, 'content_scheduler_media_scheduled_post')
            ->withPivot('sort_order')
            ->withTimestamps()
            ->orderByPivot('sort_order');
    }

    public function deliveryUrl(): string
    {
        if (filled($this->url)) {
            return (string) $this->url;
        }

        return Storage::disk((string) $this->disk)->url((string) $this->path);
    }
}
