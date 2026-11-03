<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->timestamp('next_credit_reset_at')->nullable()->after('ends_at');
            $table->index(['status', 'next_credit_reset_at'], 'subscriptions_status_credit_reset_idx');
        });

        DB::table('subscriptions')
            ->select(['id', 'created_at'])
            ->where('status', 'active')
            ->whereNull('next_credit_reset_at')
            ->orderBy('id')
            ->chunkById(200, function ($subscriptions): void {
                foreach ($subscriptions as $subscription) {
                    $anchor = Carbon::parse($subscription->created_at ?? now());
                    $nextResetAt = $anchor->copy()->addMonthNoOverflow();

                    while ($nextResetAt->lessThanOrEqualTo(now())) {
                        $nextResetAt = $nextResetAt->addMonthNoOverflow();
                    }

                    DB::table('subscriptions')
                        ->where('id', (int) $subscription->id)
                        ->update([
                            'next_credit_reset_at' => $nextResetAt,
                            'updated_at' => now(),
                        ]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex('subscriptions_status_credit_reset_idx');
            $table->dropColumn('next_credit_reset_at');
        });
    }
};
