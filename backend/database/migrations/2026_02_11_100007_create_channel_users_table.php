<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('channel_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            // A user can only add a given channel once
            $table->unique(['channel_id', 'user_id']);
            $table->index(['user_id', 'channel_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_users');
    }
};
