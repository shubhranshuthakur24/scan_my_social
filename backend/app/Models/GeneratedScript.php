<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneratedScript extends Model
{
    protected $fillable = [
        'batch_id',
        'script_angle_id',
        'title',
        'script',
        'draft_script',
        'suggested_topic',
        'estimated_duration',
        'hook_type',
        'suggested_hook',
        'suggested_cta',
        'angle_rationale',
        'status',
        'generation_mode',
        'script_origin',
        'recreation_mode',
        'source_analysis_id',
        'recreation_settings',
        'cta_objective',
        'analysis_blueprint_snapshot',
        'error_message',
        'revised_script',
        'overall_score',
        'scores',
        'strengths',
        'improvements',
        'quality_checks',
        'corrective_rewrite_applied',
        'audio_file_path',
        'hook',
        'content_angle',
        'psychological_driver',
        'structure_model',
        'mechanism_type',
        'insight_shift',
        'rhythm_profile',
        'cta_type',
        'closure_type',
        'archetype',
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
        'scores' => 'array',
        'strengths' => 'array',
        'improvements' => 'array',
        'recreation_settings' => 'array',
        'analysis_blueprint_snapshot' => 'array',
        'quality_checks' => 'array',
        'corrective_rewrite_applied' => 'boolean',
        'overall_score' => 'decimal:1',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function generationBatch(): BelongsTo
    {
        return $this->belongsTo(ScriptGenerationBatch::class, 'batch_id');
    }

    public function scriptAngle(): BelongsTo
    {
        return $this->belongsTo(ScriptAngle::class);
    }

    public function contentAnalysis(): BelongsTo
    {
        return $this->belongsTo(ContentAnalysis::class);
    }

    public function sourceAnalysis(): BelongsTo
    {
        return $this->belongsTo(ContentAnalysis::class, 'source_analysis_id');
    }

    public function scopeHighScore($query, $minScore = 9.0)
    {
        return $query->where('overall_score', '>=', $minScore);
    }
}
