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
            $table->string('transcription_status')->default('idle')->after('transcription');
            $table->index('transcription_status');
        });

        Schema::table('content_analysis_by_user', function (Blueprint $table) {
            $table->string('transcription_status')->default('idle')->after('transcription_charged_at');
            $table->text('transcription_error')->nullable()->after('transcription_status');
            $table->index('transcription_status', 'content_analysis_by_user_transcription_status_idx');
        });

        DB::table('content_analyses')
            ->whereNotNull('transcription')
            ->where('transcription', '!=', '')
            ->update(['transcription_status' => 'completed']);

        DB::table('content_analysis_by_user')
            ->whereNotNull('transcription_charged_at')
            ->update(['transcription_status' => 'completed']);
    }

    public function down(): void
    {
        Schema::table('content_analysis_by_user', function (Blueprint $table) {
            $table->dropIndex('content_analysis_by_user_transcription_status_idx');
            $table->dropColumn(['transcription_status', 'transcription_error']);
        });

        Schema::table('content_analyses', function (Blueprint $table) {
            $table->dropIndex(['transcription_status']);
            $table->dropColumn('transcription_status');
        });
    }
};
