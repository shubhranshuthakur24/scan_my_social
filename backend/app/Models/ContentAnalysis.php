<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContentAnalysis extends Model
{
    protected $fillable = [
        'post_id',
        'transcription',
        'transcript_raw',
        'transcript_cleaned',
        'sentence_list',
        'transcript_hash',
        'analysis_version',
        'analysis_confidence',
        'transcription_status',
        'analysis_status',
        'hook',
        'hook_text',
        'hook_type',
        'content_angle',
        'topic_angle',
        'psychological_driver',
        'structure_model',
        'script_flow',
        'mechanism_type',
        'insight_shift',
        'insight_shift_text',
        'insight_shift_position',
        'key_shift',
        'rhythm_profile',
        'authority_signals',
        'pattern_dna',
        'signal_snapshot',
        'llm_raw_outputs',
        'cta_type',
        'cta_text',
        'closure_type',
        'archetype',
        'script_type',
        'script_origin',
        'language_style',
        'language_used',
        'hook_score',
        'content_angle_score',
        'psychological_driver_score',
        'structure_model_score',
        'mechanism_type_score',
        'insight_shift_score',
        'rhythm_profile_score',
        'cta_type_score',
        'closure_type_score',
        'archetype_score',
    ];

    protected $casts = [
        'sentence_list' => 'array',
        'authority_signals' => 'array',
        'pattern_dna' => 'array',
        'signal_snapshot' => 'array',
        'llm_raw_outputs' => 'array',
        'analysis_confidence' => 'decimal:2',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'content_analysis_by_user')
            ->withPivot([
                'transcription_charged_at',
                'analysis_charged_at',
                'transcription_status',
                'transcription_error',
                'analysis_status',
                'analysis_error',
            ])
            ->withTimestamps();
    }

    public function generatedScripts(): HasMany
    {
        return $this->hasMany(GeneratedScript::class);
    }
}
