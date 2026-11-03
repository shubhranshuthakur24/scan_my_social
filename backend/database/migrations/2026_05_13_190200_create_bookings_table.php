<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('booking_event_type_id')->constrained()->cascadeOnDelete();
            $table->foreignId('host_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('cancelled_by_host_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('guest_name', 120);
            $table->string('guest_email', 190);
            $table->string('guest_timezone', 80)->nullable();
            $table->text('guest_notes')->nullable();
            $table->string('status', 20)->default('confirmed');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->dateTime('cancelled_at')->nullable();
            $table->string('cancellation_reason', 255)->nullable();
            $table->timestamps();

            $table->index(['booking_event_type_id', 'status', 'starts_at'], 'bookings_event_status_start_idx');
            $table->index(['host_user_id', 'starts_at'], 'bookings_host_start_idx');
            $table->index(['guest_email', 'starts_at'], 'bookings_guest_start_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
