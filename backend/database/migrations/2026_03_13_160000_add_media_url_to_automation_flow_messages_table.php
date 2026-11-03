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
        Schema::table('automation_flow_messages', function (Blueprint $table) {
            if (! Schema::hasColumn('automation_flow_messages', 'media_url')) {
                $table->text('media_url')->nullable()->after('message_text');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('automation_flow_messages', function (Blueprint $table) {
            if (Schema::hasColumn('automation_flow_messages', 'media_url')) {
                $table->dropColumn('media_url');
            }
        });
    }
};
