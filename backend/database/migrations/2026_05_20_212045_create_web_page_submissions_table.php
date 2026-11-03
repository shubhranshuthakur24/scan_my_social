<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('web_page_submissions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('web_page_id')->constrained()->cascadeOnDelete();
            $table->string('block_id');
            $table->json('data');
            $table->json('metadata')->nullable();
            $table->string('ip_hash', 64)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->index(['web_page_id', 'submitted_at']);
            $table->index(['web_page_id', 'block_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('web_page_submissions');
    }
};
