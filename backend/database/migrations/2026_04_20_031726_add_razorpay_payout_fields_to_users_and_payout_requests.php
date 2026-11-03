<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('razorpay_contact_id')->nullable()->after('wallet_balance');
        });

        Schema::table('payout_requests', function (Blueprint $table) {
            $table->string('razorpay_payout_id')->nullable()->after('notes');
            $table->string('razorpay_fund_account_id')->nullable()->after('razorpay_payout_id');
            $table->string('razorpay_status')->nullable()->after('razorpay_fund_account_id');
            $table->text('razorpay_error')->nullable()->after('razorpay_status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('razorpay_contact_id');
        });

        Schema::table('payout_requests', function (Blueprint $table) {
            $table->dropColumn([
                'razorpay_payout_id',
                'razorpay_fund_account_id',
                'razorpay_status',
                'razorpay_error',
            ]);
        });
    }
};
