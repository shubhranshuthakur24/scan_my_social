<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_event_types', function (Blueprint $table): void {
            $table->string('location_type', 40)->nullable()->after('timezone');
            $table->string('location_value', 255)->nullable()->after('location_type');
            $table->string('location_label', 120)->nullable()->after('location_value');
        });
    }

    public function down(): void
    {
        Schema::table('booking_event_types', function (Blueprint $table): void {
            $table->dropColumn([
                'location_type',
                'location_value',
                'location_label',
            ]);
        });
    }
};
