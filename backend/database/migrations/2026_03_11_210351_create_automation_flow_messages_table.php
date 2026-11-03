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
        Schema::create('automation_flow_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('automation_flow_id');
            $table->enum('message_type', ['reply', 'opening']);
            $table->text('message_text');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('automation_flow_id')
                ->references('id')
                ->on('automation_flows')
                ->onDelete('cascade');

            $table->index(['automation_flow_id', 'message_type', 'is_active'], 'flow_message_lookup_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('automation_flow_messages');
    }
};
