<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('lock_time_slots_across_event_types')
                ->default(false)
                ->after('channel_untrack_count');
        });

        Schema::table('booking_event_types', function (Blueprint $table): void {
            $table->boolean('exclude_from_global_slot_lock')
                ->default(false)
                ->after('seat_capacity');
        });
    }

    public function down(): void
    {
        Schema::table('booking_event_types', function (Blueprint $table): void {
            $table->dropColumn('exclude_from_global_slot_lock');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('lock_time_slots_across_event_types');
        });
    }
};
