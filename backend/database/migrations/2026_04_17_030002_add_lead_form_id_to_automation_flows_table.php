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
        Schema::table('automation_flows', function (Blueprint $table) {
            if (Schema::hasColumn('automation_flows', 'lead_form_id')) {
                $table->foreign('lead_form_id')
                    ->references('id')
                    ->on('lead_forms')
                    ->nullOnDelete();
            } else {
                $table->foreignId('lead_form_id')
                    ->nullable()
                    ->after('instagram_account_id')
                    ->constrained('lead_forms')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('automation_flows', function (Blueprint $table) {
            $table->dropForeign(['lead_form_id']);
        });
    }
};
