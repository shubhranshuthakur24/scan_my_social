<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScriptAngle extends Model
{
    protected $fillable = [
        'script_generation_batch_id',
        'title',
        'explanation',
        'expected_outcome',
        'position',
        'is_selected',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'is_selected' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function generationBatch(): BelongsTo
    {
        return $this->belongsTo(ScriptGenerationBatch::class, 'script_generation_batch_id');
    }

    public function scripts(): HasMany
    {
        return $this->hasMany(GeneratedScript::class);
    }
}
