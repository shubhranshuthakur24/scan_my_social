<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_event_types', function (Blueprint $table): void {
            $table->string('schedule_type', 20)->default('weekly')->after('timezone');
            $table->date('one_time_date')->nullable()->after('schedule_type');
            $table->time('one_time_start_time')->nullable()->after('one_time_date');
            $table->time('one_time_end_time')->nullable()->after('one_time_start_time');

            $table->index(['host_user_id', 'schedule_type'], 'booking_event_types_host_schedule_idx');
        });
    }

    public function down(): void
    {
        Schema::table('booking_event_types', function (Blueprint $table): void {
            $table->dropIndex('booking_event_types_host_schedule_idx');
            $table->dropColumn([
                'schedule_type',
                'one_time_date',
                'one_time_start_time',
                'one_time_end_time',
            ]);
        });
    }
};
