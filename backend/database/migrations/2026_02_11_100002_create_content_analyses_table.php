<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->nullable()->constrained('posts')->onDelete('cascade');
            $table->text('transcription')->nullable();
            // Strategy fields
            $table->text('hook')->nullable();
            $table->text('content_angle')->nullable();
            $table->text('psychological_driver')->nullable();
            $table->text('structure_model')->nullable();
            $table->text('mechanism_type')->nullable();
            $table->text('insight_shift')->nullable();
            $table->text('rhythm_profile')->nullable();
            $table->text('cta_type')->nullable();
            $table->text('closure_type')->nullable();
            $table->text('archetype')->nullable();
            $table->text('language_style')->nullable();
            $table->text('language_used')->nullable();
            // AI scores (1-10)
            $table->integer('hook_score')->nullable();
            $table->integer('content_angle_score')->nullable();
            $table->integer('psychological_driver_score')->nullable();
            $table->integer('structure_model_score')->nullable();
            $table->integer('mechanism_type_score')->nullable();
            $table->integer('insight_shift_score')->nullable();
            $table->integer('rhythm_profile_score')->nullable();
            $table->integer('cta_type_score')->nullable();
            $table->integer('closure_type_score')->nullable();
            $table->integer('archetype_score')->nullable();
            // Script blueprint fields (from process() pipeline)
            $table->text('opening_pattern')->nullable();
            $table->text('flow_structure')->nullable();
            $table->text('retention_triggers')->nullable();
            $table->text('emotional_arc')->nullable();
            $table->text('cta_formula')->nullable();
            $table->text('do_not_change')->nullable();
            $table->timestamps();

            $table->index('post_id');
        });

        // Pivot: shared analysis accessed by multiple users
        Schema::create('content_analysis_by_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('content_analysis_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['user_id', 'content_analysis_id'], 'user_analysis_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_analysis_by_user');
        Schema::dropIfExists('content_analyses');
    }
};
