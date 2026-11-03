<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class ScriptGenerationBatch extends Model
{
    use HasUuids;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'research_enabled' => 'boolean',
            'comparison_topic' => 'boolean',
            'creative_brief' => 'array',
            'content_mix' => 'array',
            'enriched_brief' => 'array',
            'supplemental_research' => 'array',
            'unresolved_questions' => 'array',
            'user_provided_facts' => 'array',
            'submitted_source_urls' => 'array',
            'cache_hit_at' => 'datetime',
            'credits_settled_at' => 'datetime',
            'credits_refunded_at' => 'datetime',
            'angles_generated_at' => 'datetime',
            'angle_selected_at' => 'datetime',
            'base_refunded_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function research(): BelongsTo
    {
        return $this->belongsTo(ScriptResearch::class, 'script_research_id');
    }

    public function selectedAngle(): BelongsTo
    {
        return $this->belongsTo(ScriptAngle::class, 'selected_angle_id');
    }

    public function angles(): HasMany
    {
        return $this->hasMany(ScriptAngle::class);
    }

    public function scripts(): HasMany
    {
        return $this->hasMany(GeneratedScript::class, 'batch_id');
    }

    public function supplementalSources(): HasMany
    {
        return $this->hasMany(ScriptResearchSource::class);
    }

    public function supplementalClaims(): HasMany
    {
        return $this->hasMany(ScriptResearchClaim::class);
    }

    public function settleResearchCost(int $cost): void
    {
        DB::transaction(function () use ($cost): void {
            $batch = self::query()->lockForUpdate()->findOrFail($this->id);
            if ($batch->credit_state !== 'reserved') {
                return;
            }

            $refund = max(0, (int) $batch->research_reserved_cost - $cost);
            if ($refund > 0) {
                $batch->user->addCredits($refund, 'script_research_cache_settlement');
            }

            $batch->forceFill([
                'research_settled_cost' => $cost,
                'total_refunded_cost' => (int) $batch->total_refunded_cost + $refund,
                'credit_state' => 'settled',
                'credits_settled_at' => now(),
            ])->save();
        });

        $this->refresh();
    }

    public function refundAll(string $action): void
    {
        DB::transaction(function () use ($action): void {
            $batch = self::query()->lockForUpdate()->findOrFail($this->id);
            if ($batch->credit_state === 'refunded') {
                return;
            }

            $refund = max(
                0,
                (int) $batch->total_reserved_cost - (int) $batch->total_refunded_cost
            );

            if ($refund > 0) {
                $batch->user->addCredits($refund, $action);
            }

            $batch->forceFill([
                'total_refunded_cost' => (int) $batch->total_refunded_cost + $refund,
                'research_settled_cost' => 0,
                'credit_state' => 'refunded',
                'credits_refunded_at' => now(),
            ])->save();
        });

        $this->refresh();
    }

    public function refundBaseCost(string $action): void
    {
        DB::transaction(function () use ($action): void {
            $batch = self::query()->lockForUpdate()->findOrFail($this->id);
            if ($batch->base_refunded_at !== null) {
                return;
            }

            $refund = (int) $batch->base_cost;
            if ($refund > 0) {
                $batch->user->addCredits($refund, $action);
            }

            $batch->forceFill([
                'total_refunded_cost' => (int) $batch->total_refunded_cost + $refund,
                'base_refunded_at' => now(),
            ])->save();
        });

        $this->refresh();
    }
}
