<?php

namespace App\Models;

use Database\Factories\ShortLinkFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ShortLink extends Model
{
    /** @use HasFactory<ShortLinkFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'destination_url',
        'code',
        'description',
        'is_active',
        'starts_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function clicks(): HasMany
    {
        return $this->hasMany(ShortLinkClick::class);
    }

    public function scopeAvailableForRedirect(Builder $query): Builder
    {
        return $query
            ->where('is_active', true)
            ->where(function (Builder $query): void {
                $query->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now());
            })
            ->where(function (Builder $query): void {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', now());
            });
    }

    /**
     * @return array<int, string>
     */
    public static function reservedCodes(): array
    {
        return [
            'admin',
            'api',
            'app',
            'blog',
            'blogs',
            'cal',
            'create',
            'dashboard',
            'edit',
            'login',
            'logout',
            'pricing',
            'register',
            'settings',
            'social-bio-links',
            's',
        ];
    }

    public static function generateUniqueCode(): string
    {
        do {
            $code = Str::lower(Str::random(7));
        } while (
            in_array($code, self::reservedCodes(), true)
            || self::query()->where('code', $code)->exists()
        );

        return $code;
    }
}
