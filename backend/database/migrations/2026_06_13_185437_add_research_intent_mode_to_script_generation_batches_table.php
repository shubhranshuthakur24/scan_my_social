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
            $table->string('research_intent_mode', 16)
                ->nullable()
                ->after('research_intent');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('script_generation_batches', function (Blueprint $table) {
            $table->dropColumn('research_intent_mode');
        });
    }
};
