<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_analysis_by_user', function (Blueprint $table) {
            // Track when each user was charged for transcription access
            $table->timestamp('transcription_charged_at')->nullable()->after('content_analysis_id');
            // Track when each user was charged for analysis access
            $table->timestamp('analysis_charged_at')->nullable()->after('transcription_charged_at');
        });
    }

    public function down(): void
    {
        Schema::table('content_analysis_by_user', function (Blueprint $table) {
            $table->dropColumn(['transcription_charged_at', 'analysis_charged_at']);
        });
    }
};
