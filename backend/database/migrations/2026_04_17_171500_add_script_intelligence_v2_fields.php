<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_analyses', function (Blueprint $table) {
            $table->longText('transcript_raw')->nullable()->after('transcription');
            $table->longText('transcript_cleaned')->nullable()->after('transcript_raw');
            $table->json('sentence_list')->nullable()->after('transcript_cleaned');
            $table->text('hook_text')->nullable()->after('hook');
            $table->string('hook_type', 100)->nullable()->after('hook_text');
            $table->text('topic_angle')->nullable()->after('content_angle');
            $table->string('script_type', 64)->nullable()->after('archetype');
            $table->text('script_flow')->nullable()->after('structure_model');
            $table->text('insight_shift_text')->nullable()->after('insight_shift');
            $table->string('insight_shift_position', 32)->nullable()->after('insight_shift_text');
            $table->text('cta_text')->nullable()->after('cta_type');
            $table->json('authority_signals')->nullable()->after('rhythm_profile');
            $table->json('pattern_dna')->nullable()->after('authority_signals');
            $table->json('signal_snapshot')->nullable()->after('pattern_dna');
            $table->json('llm_raw_outputs')->nullable()->after('signal_snapshot');
            $table->decimal('analysis_confidence', 5, 2)->nullable()->after('llm_raw_outputs');
            $table->string('analysis_version', 16)->default('v2')->after('analysis_confidence');
            $table->string('transcript_hash', 64)->nullable()->after('analysis_version');

            $table->index('script_type');
            $table->index('analysis_version');
            $table->index('transcript_hash');
        });

        Schema::table('generated_scripts', function (Blueprint $table) {
            $table->string('generation_mode', 32)->default('fresh')->after('status');
            $table->string('recreation_mode', 32)->nullable()->after('generation_mode');
            $table->foreignId('source_analysis_id')->nullable()->after('content_analysis_id')->constrained('content_analyses')->nullOnDelete();
            $table->json('recreation_settings')->nullable()->after('source_analysis_id');
            $table->string('cta_objective', 64)->nullable()->after('recreation_mode');
            $table->json('analysis_blueprint_snapshot')->nullable()->after('recreation_settings');

            $table->index('generation_mode');
            $table->index('recreation_mode');
            $table->index('cta_objective');
        });
    }

    public function down(): void
    {
        Schema::table('generated_scripts', function (Blueprint $table) {
            $table->dropForeign(['source_analysis_id']);
            $table->dropIndex(['generation_mode']);
            $table->dropIndex(['recreation_mode']);
            $table->dropIndex(['cta_objective']);
            $table->dropColumn([
                'generation_mode',
                'recreation_mode',
                'source_analysis_id',
                'recreation_settings',
                'cta_objective',
                'analysis_blueprint_snapshot',
            ]);
        });

        Schema::table('content_analyses', function (Blueprint $table) {
            $table->dropIndex(['script_type']);
            $table->dropIndex(['analysis_version']);
            $table->dropIndex(['transcript_hash']);
            $table->dropColumn([
                'transcript_raw',
                'transcript_cleaned',
                'sentence_list',
                'hook_text',
                'hook_type',
                'topic_angle',
                'script_type',
                'script_flow',
                'insight_shift_text',
                'insight_shift_position',
                'cta_text',
                'authority_signals',
                'pattern_dna',
                'signal_snapshot',
                'llm_raw_outputs',
                'analysis_confidence',
                'analysis_version',
                'transcript_hash',
            ]);
        });
    }
};
