<?php

namespace App\Models;

use Database\Factories\WebPageSubmissionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebPageSubmission extends Model
{
    /** @use HasFactory<WebPageSubmissionFactory> */
    use HasFactory;

    protected $fillable = [
        'web_page_id',
        'block_id',
        'data',
        'metadata',
        'ip_hash',
        'user_agent',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'metadata' => 'array',
            'submitted_at' => 'datetime',
        ];
    }

    public function webPage(): BelongsTo
    {
        return $this->belongsTo(WebPage::class);
    }
}
