<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->repairBookingEventTypesTable();
        $this->repairBookingsTable();
    }

    public function down(): void
    {
        // Intentionally left empty: this is a one-way schema repair migration.
    }

    private function repairBookingEventTypesTable(): void
    {
        if (! Schema::hasTable('booking_event_types')) {
            return;
        }

        if (! Schema::hasColumn('booking_event_types', 'host_user_id') && Schema::hasColumn('booking_event_types', 'user_id')) {
            Schema::table('booking_event_types', function (Blueprint $table): void {
                $table->renameColumn('user_id', 'host_user_id');
            });
        }
    }

    private function repairBookingsTable(): void
    {
        if (! Schema::hasTable('bookings')) {
            return;
        }

        if (! Schema::hasColumn('bookings', 'host_user_id') && Schema::hasColumn('bookings', 'user_id')) {
            Schema::table('bookings', function (Blueprint $table): void {
                $table->renameColumn('user_id', 'host_user_id');
            });
        }
    }
};
