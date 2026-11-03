<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ScriptResearchSource extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'is_primary' => 'boolean',
        ];
    }

    public function research(): BelongsTo
    {
        return $this->belongsTo(ScriptResearch::class, 'script_research_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ScriptGenerationBatch::class, 'script_generation_batch_id');
    }

    public function claims(): BelongsToMany
    {
        return $this->belongsToMany(
            ScriptResearchClaim::class,
            'script_research_claim_source'
        )->withPivot('relationship')->withTimestamps();
    }
}
