<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('generated_scripts')
            ->whereNotNull('batch_id')
            ->orderBy('id')
            ->get()
            ->groupBy('batch_id')
            ->each(function ($scripts, string $batchId): void {
                $first = $scripts->first();
                if (! $first || DB::table('script_generation_batches')->where('id', $batchId)->exists()) {
                    return;
                }

                DB::table('script_generation_batches')->insert([
                    'id' => $batchId,
                    'user_id' => $first->user_id,
                    'original_topic' => $first->suggested_topic ?? $first->title ?? 'Legacy script batch',
                    'normalized_topic' => mb_strtolower(trim((string) ($first->suggested_topic ?? $first->title ?? 'legacy script batch'))),
                    'status' => 'completed',
                    'research_status' => 'not_requested',
                    'research_enabled' => false,
                    'research_tier' => 'lite',
                    'comparison_topic' => false,
                    'variant_count' => $scripts->count(),
                    'base_cost' => 0,
                    'research_reserved_cost' => 0,
                    'research_settled_cost' => 0,
                    'total_reserved_cost' => 0,
                    'total_refunded_cost' => 0,
                    'credit_state' => 'settled',
                    'credits_settled_at' => now(),
                    'created_at' => $first->created_at ?? now(),
                    'updated_at' => now(),
                ]);
            });

        Schema::table('generated_scripts', function (Blueprint $table) {
            $table->foreign('batch_id')
                ->references('id')
                ->on('script_generation_batches')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('generated_scripts', function (Blueprint $table) {
            $table->dropForeign(['batch_id']);
        });
    }
};
