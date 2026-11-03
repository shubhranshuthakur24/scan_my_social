<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_availability_rules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('booking_event_type_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['booking_event_type_id', 'day_of_week', 'is_active'], 'booking_rules_event_day_active_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_availability_rules');
    }
};
