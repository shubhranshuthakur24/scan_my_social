<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_analyses', function (Blueprint $table) {
            $table->string('analysis_status')->default('idle')->after('transcription_status');
            $table->index('analysis_status');
        });

        Schema::table('content_analysis_by_user', function (Blueprint $table) {
            $table->string('analysis_status')->default('idle')->after('analysis_charged_at');
            $table->text('analysis_error')->nullable()->after('analysis_status');
            $table->index('analysis_status', 'content_analysis_by_user_analysis_status_idx');
        });

        DB::table('content_analyses')
            ->whereNotNull('hook_score')
            ->update(['analysis_status' => 'completed']);

        DB::table('content_analysis_by_user')
            ->whereNotNull('analysis_charged_at')
            ->update(['analysis_status' => 'completed']);
    }

    public function down(): void
    {
        Schema::table('content_analysis_by_user', function (Blueprint $table) {
            $table->dropIndex('content_analysis_by_user_analysis_status_idx');
            $table->dropColumn(['analysis_status', 'analysis_error']);
        });

        Schema::table('content_analyses', function (Blueprint $table) {
            $table->dropIndex(['analysis_status']);
            $table->dropColumn('analysis_status');
        });
    }
};
