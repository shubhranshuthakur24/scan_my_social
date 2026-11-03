<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('affiliate_applications', function (Blueprint $table) {
            $table->foreignId('claimed_user_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            $table->string('claim_token', 64)->nullable()->after('rejection_reason');
            $table->timestamp('claim_token_expires_at')->nullable()->after('claim_token');
            $table->timestamp('claim_requested_at')->nullable()->after('claim_token_expires_at');
            $table->timestamp('claimed_at')->nullable()->after('claim_requested_at');
            $table->timestamp('approved_at')->nullable()->after('claimed_at');

            $table->index(['email', 'status']);
            $table->index(['contact', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('affiliate_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('claimed_user_id');
            $table->dropColumn([
                'claim_token',
                'claim_token_expires_at',
                'claim_requested_at',
                'claimed_at',
                'approved_at',
            ]);
            $table->dropIndex(['email', 'status']);
            $table->dropIndex(['contact', 'status']);
        });
    }
};
