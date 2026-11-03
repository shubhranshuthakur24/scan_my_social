<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ScriptResearchClaim extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_usable' => 'boolean',
            'is_user_provided' => 'boolean',
            'metadata' => 'array',
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

    public function sources(): BelongsToMany
    {
        return $this->belongsToMany(
            ScriptResearchSource::class,
            'script_research_claim_source'
        )->withPivot('relationship')->withTimestamps();
    }
}
