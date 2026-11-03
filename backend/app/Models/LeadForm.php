<?php

namespace App\Models;

use Database\Factories\LeadFormFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class LeadForm extends Model
{
    /** @use HasFactory<LeadFormFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'cover_image_url',

        'public_id',
        'status',
        'fields',
        'settings',
        'published_at',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $leadForm): void {
            if (! $leadForm->public_id) {
                $attempts = 0;
                do {
                    $candidate = Str::lower(Str::random(8));
                    $exists = self::query()->where('public_id', $candidate)->exists();
                    $attempts++;
                } while ($exists && $attempts < 10);

                $leadForm->public_id = $candidate;
            }
        });
    }

    protected function casts(): array
    {
        return [
            'fields' => 'array',
            'settings' => 'array',
            'published_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(LeadFormSubmission::class);
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }
}
