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
        Schema::create('automation_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('automation_flow_id');
            $table->string('trigger_source_id'); // The comment_id or message_id (CRITICAL FOR DUPLICATE PREVENTION)
            $table->string('recipient_ig_id');
            $table->string('status')->default('queued'); // queued, sent, failed
            $table->string('error_code')->nullable();
            $table->text('error_message')->nullable();
            $table->json('response_payload')->nullable();
            $table->timestamps();

            $table->foreign('automation_flow_id')->references('id')->on('automation_flows')->onDelete('cascade');
            $table->unique(['automation_flow_id', 'trigger_source_id'], 'automation_logs_flow_trigger_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('automation_logs');
    }
};
