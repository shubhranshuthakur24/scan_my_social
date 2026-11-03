<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('autodm_reminder_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('automation_flow_id');
            $table->unsignedBigInteger('automation_flow_message_id')->nullable();
            $table->string('recipient_ig_id')->nullable();
            $table->string('trigger_source_id')->nullable();
            $table->enum('status', ['scheduled', 'sent', 'skipped_window', 'failed'])->default('scheduled');
            $table->timestamp('scheduled_for')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->unsignedInteger('clicks_count')->default(0);
            $table->string('skip_reason')->nullable();
            $table->json('response_payload')->nullable();
            $table->timestamps();

            $table->foreign('automation_flow_id')
                ->references('id')
                ->on('automation_flows')
                ->onDelete('cascade');

            $table->foreign('automation_flow_message_id')
                ->references('id')
                ->on('automation_flow_messages')
                ->nullOnDelete();

            $table->index(['automation_flow_id', 'status'], 'adr_events_flow_status_idx');
            $table->index('scheduled_for', 'adr_events_scheduled_for_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('autodm_reminder_events');
    }
};
