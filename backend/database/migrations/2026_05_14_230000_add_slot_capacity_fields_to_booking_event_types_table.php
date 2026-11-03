<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_event_types', function (Blueprint $table): void {
            $table->boolean('allows_multi_seat_booking')->default(false)->after('location_label');
            $table->unsignedInteger('seat_capacity')->nullable()->after('allows_multi_seat_booking');
        });
    }

    public function down(): void
    {
        Schema::table('booking_event_types', function (Blueprint $table): void {
            $table->dropColumn([
                'allows_multi_seat_booking',
                'seat_capacity',
            ]);
        });
    }
};
