<?php

namespace App\Models;

use Database\Factories\ScheduledPostPublishAttemptFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduledPostPublishAttempt extends Model
{
    /** @use HasFactory<ScheduledPostPublishAttemptFactory> */
    use HasFactory;

    protected $fillable = [
        'scheduled_post_id',
        'status',
        'meta_container_id',
        'meta_media_id',
        'request_payload',
        'response_payload',
        'error_message',
        'started_at',
        'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'request_payload' => 'array',
            'response_payload' => 'array',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function scheduledPost(): BelongsTo
    {
        return $this->belongsTo(ScheduledPost::class);
    }
}
