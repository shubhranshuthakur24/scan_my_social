<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_availability_overrides', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('host_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('booking_event_type_id')->nullable()->constrained('booking_event_types')->cascadeOnDelete();
            $table->date('override_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->boolean('is_available')->default(false);
            $table->string('reason', 255)->nullable();
            $table->timestamps();

            $table->index(['host_user_id', 'override_date'], 'booking_overrides_host_date_idx');
            $table->index(['booking_event_type_id', 'override_date'], 'booking_overrides_event_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_availability_overrides');
    }
};
