<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('web_page_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('web_page_id')->constrained()->cascadeOnDelete();
            $table->string('type', 40);
            $table->string('block_id')->nullable();
            $table->string('referrer', 2048)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->string('ip_hash', 64)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['web_page_id', 'type', 'occurred_at']);
            $table->index(['web_page_id', 'block_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('web_page_events');
    }
};
