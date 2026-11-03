<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_host_availability_rules', function (Blueprint $table): void {
            $table->dropUnique('booking_host_rules_user_day_unique');
            $table->index(
                ['host_user_id', 'day_of_week', 'start_time', 'end_time'],
                'booking_host_rules_user_day_time_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('booking_host_availability_rules', function (Blueprint $table): void {
            $table->dropIndex('booking_host_rules_user_day_time_idx');
            $table->unique(['host_user_id', 'day_of_week'], 'booking_host_rules_user_day_unique');
        });
    }
};
