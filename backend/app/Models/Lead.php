<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    use HasFactory;

    public const SOURCE_FORM_SUBMISSION = 'lead_form_submission';

    public const SOURCE_APPOINTMENT_BOOKING = 'appointment_booking';

    public const SOURCE_WEB_PAGE_SUBMISSION = 'web_page_submission';

    public const STATUS_NEW = 'new';

    public const STATUS_BOOKED = 'booked';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'user_id',
        'source_type',
        'source_id',
        'source_label',
        'name',
        'email',
        'phone',
        'status',
        'payload',
        'captured_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'captured_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
