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
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->index('razorpay_id');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->index('razorpay_payment_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('google_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['razorpay_id']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['razorpay_payment_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['google_id']);
        });
    }
};
