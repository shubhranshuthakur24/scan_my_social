<?php

namespace App\Models;

use Database\Factories\WebPageEventFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebPageEvent extends Model
{
    public const TYPE_VIEW = 'view';

    public const TYPE_CTA_CLICK = 'cta_click';

    /** @use HasFactory<WebPageEventFactory> */
    use HasFactory;

    protected $fillable = [
        'web_page_id',
        'type',
        'block_id',
        'referrer',
        'user_agent',
        'ip_hash',
        'metadata',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    public function webPage(): BelongsTo
    {
        return $this->belongsTo(WebPage::class);
    }
}
