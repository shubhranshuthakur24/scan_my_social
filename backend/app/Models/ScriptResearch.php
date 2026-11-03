<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use LogicException;

class ScriptResearch extends Model
{
    use HasUuids;

    protected $table = 'script_researches';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'summary' => 'array',
            'usage' => 'array',
            'is_historical' => 'boolean',
            'researched_at' => 'datetime',
            'fresh_until' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (ScriptResearch $research): void {
            $mutable = ['state', 'is_historical', 'reference_count', 'updated_at'];
            $changed = array_keys($research->getDirty());

            if (array_diff($changed, $mutable) !== []) {
                throw new LogicException('Public script research artifacts are immutable.');
            }
        });
    }

    public function batches(): HasMany
    {
        return $this->hasMany(ScriptGenerationBatch::class);
    }

    public function sources(): HasMany
    {
        return $this->hasMany(ScriptResearchSource::class);
    }

    public function claims(): HasMany
    {
        return $this->hasMany(ScriptResearchClaim::class);
    }

    public function scopeReusable($query)
    {
        return $query
            ->where('state', 'active')
            ->where('fresh_until', '>', now());
    }
}
