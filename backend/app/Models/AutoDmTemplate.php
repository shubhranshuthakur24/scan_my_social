<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AutoDmTemplate extends Model
{
    use HasFactory;

    protected $table = 'autodm_templates';

    protected $fillable = [
        'use_case_id',
        'created_by',
        'is_system',
        'is_default',
        'is_active',
        'recommended',
        'name',
        'title',
        'slug',
        'badge',
        'trigger_type',
        'content_source',
        'description',
        'keywords',
        'template_payload',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'keywords' => 'array',
            'template_payload' => 'array',
            'is_system' => 'boolean',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
            'recommended' => 'boolean',
            'sort_order' => 'integer',
            'use_case_id' => 'integer',
            'created_by' => 'integer',
        ];
    }

    public function useCase(): BelongsTo
    {
        return $this->belongsTo(AutoDmTemplateUseCase::class, 'use_case_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeVisibleToUser(Builder $query, int $userId): Builder
    {
        return $query->where('is_active', true)
            ->where(function (Builder $inner) use ($userId): void {
                $inner->where('is_system', true)
                    ->orWhere('created_by', $userId);
            });
    }
}
