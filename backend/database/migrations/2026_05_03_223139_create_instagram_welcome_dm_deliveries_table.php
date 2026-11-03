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
        Schema::create('instagram_welcome_dm_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instagram_account_id')->constrained('instagram_accounts')->cascadeOnDelete();
            $table->string('recipient_ig_id');
            $table->text('message_text')->nullable();
            $table->timestamp('delivered_at');
            $table->timestamps();

            $table->unique(['instagram_account_id', 'recipient_ig_id'], 'instagram_welcome_dm_unique_recipient');
            $table->index(['instagram_account_id', 'delivered_at'], 'instagram_welcome_dm_account_delivered_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('instagram_welcome_dm_deliveries');
    }
};
