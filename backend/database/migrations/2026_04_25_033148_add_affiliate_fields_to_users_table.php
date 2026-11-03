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
        Schema::table('users', function (Blueprint $table) {
            $table->string('affiliate_status', 20)->nullable()->index(); // pending, approved, rejected
            $table->string('affiliate_code', 50)->nullable()->unique()->index();
            $table->text('affiliate_rejection_reason')->nullable();
            $table->timestamp('affiliate_applied_at')->nullable();
            $table->timestamp('affiliate_approved_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            //
        });
    }
};
