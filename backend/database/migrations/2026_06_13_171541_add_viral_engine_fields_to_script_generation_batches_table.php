<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('script_generation_batches', function (Blueprint $table) {
            $table->string('workflow_version', 32)->nullable()->after('normalized_topic')->index();
            $table->text('audience')->nullable()->after('workflow_version');
            $table->string('primary_problem', 255)->nullable()->after('audience');
            $table->string('objective', 64)->nullable()->after('primary_problem');
            $table->string('platform', 64)->nullable()->after('objective');
            $table->string('language', 32)->nullable()->after('platform');
            $table->string('output_length', 32)->nullable()->after('language');
            $table->json('content_mix')->nullable()->after('output_length');
            $table->text('supporting_information')->nullable()->after('content_mix');
            $table->string('communication_style', 32)->nullable()->after('supporting_information');
            $table->string('tone_mode', 16)->nullable()->after('communication_style');
            $table->string('tone', 64)->nullable()->after('tone_mode');
            $table->string('hook_mode', 16)->nullable()->after('tone');
            $table->string('hook_type', 100)->nullable()->after('hook_mode');
            $table->string('cta_mode', 16)->nullable()->after('hook_type');
            $table->string('cta_type', 100)->nullable()->after('cta_mode');
            $table->timestamp('angles_generated_at')->nullable()->after('cta_type');
            $table->timestamp('angle_selected_at')->nullable()->after('angles_generated_at');
            $table->timestamp('base_refunded_at')->nullable()->after('credits_refunded_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('script_generation_batches', function (Blueprint $table) {
            $table->dropIndex(['workflow_version']);
            $table->dropColumn([
                'workflow_version',
                'audience',
                'primary_problem',
                'objective',
                'platform',
                'language',
                'output_length',
                'content_mix',
                'supporting_information',
                'communication_style',
                'tone_mode',
                'tone',
                'hook_mode',
                'hook_type',
                'cta_mode',
                'cta_type',
                'angles_generated_at',
                'angle_selected_at',
                'base_refunded_at',
            ]);
        });
    }
};
