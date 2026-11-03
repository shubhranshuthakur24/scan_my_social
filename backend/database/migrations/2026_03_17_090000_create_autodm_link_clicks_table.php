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
        Schema::create('autodm_link_clicks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('automation_flow_id');
            $table->unsignedBigInteger('automation_flow_message_id')->nullable();
            $table->text('target_url');
            $table->string('ip', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->foreign('automation_flow_id')
                ->references('id')
                ->on('automation_flows')
                ->onDelete('cascade');

            $table->foreign('automation_flow_message_id')
                ->references('id')
                ->on('automation_flow_messages')
                ->nullOnDelete();

            $table->index(
                ['automation_flow_id', 'automation_flow_message_id'],
                'adl_clicks_flow_msg_idx'
            );
            $table->index('created_at', 'adl_clicks_created_at_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('autodm_link_clicks');
    }
};
