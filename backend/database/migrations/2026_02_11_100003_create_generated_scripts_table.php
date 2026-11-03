<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('generated_scripts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('content_analysis_id')->constrained()->onDelete('cascade');
            $table->text('title')->nullable();
            $table->text('script');
            $table->text('revised_script')->nullable();
            $table->string('suggested_topic')->nullable();
            $table->string('estimated_duration')->nullable();
            $table->string('hook_type')->nullable();
            $table->decimal('overall_score', 3, 1)->nullable();
            $table->json('scores')->nullable(); // hookStrength, retention, clarity, etc.
            $table->json('strengths')->nullable();
            $table->json('improvements')->nullable();
            $table->string('audio_file_path')->nullable(); // Generated TTS audio
            // Strategy fields (mirrored from content_analysis for script-specific overrides)
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
            $table->timestamps();

            $table->index('user_id');
            $table->index('content_analysis_id');
            $table->index('overall_score');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('generated_scripts');
    }
};
