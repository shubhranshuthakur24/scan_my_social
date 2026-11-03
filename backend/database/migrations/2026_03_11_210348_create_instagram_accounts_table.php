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
        Schema::create('instagram_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('ig_account_id');
            $table->string('fb_page_id');
            $table->string('username')->nullable();
            $table->text('profile_url')->nullable();
            $table->text('access_token');
            $table->timestamp('token_expires_at')->nullable();
            $table->string('status')->default('active'); // active, disconnected
            $table->string('webhook_subscriptions_status')->nullable();
            $table->timestamp('webhook_subscriptions_last_synced_at')->nullable();
            $table->text('webhook_subscriptions_error')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'ig_account_id']);
            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('instagram_accounts');
    }
};
