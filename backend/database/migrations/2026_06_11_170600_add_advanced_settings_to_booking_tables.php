<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('booking_timezone', 80)->nullable()->after('lock_time_slots_across_event_types');
            $table->text('booking_welcome_message')->nullable()->after('booking_timezone');
            $table->unsignedInteger('default_minimum_booking_notice_minutes')->default(120)->after('booking_welcome_message');
            $table->unsignedInteger('default_booking_window_days')->default(60)->after('default_minimum_booking_notice_minutes');
        });

        Schema::table('booking_event_types', function (Blueprint $table): void {
            $table->unsignedInteger('minimum_booking_notice_minutes')->nullable()->after('exclude_from_global_slot_lock');
            $table->unsignedInteger('booking_window_days')->nullable()->after('minimum_booking_notice_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'booking_timezone',
                'booking_welcome_message',
                'default_minimum_booking_notice_minutes',
                'default_booking_window_days',
            ]);
        });

        Schema::table('booking_event_types', function (Blueprint $table): void {
            $table->dropColumn([
                'minimum_booking_notice_minutes',
                'booking_window_days',
            ]);
        });
    }
};
