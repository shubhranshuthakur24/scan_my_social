<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scheduled_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('instagram_account_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->string('platform')->default('instagram')->index();
            $table->string('format')->index();
            $table->string('status')->default('draft')->index();
            $table->text('caption')->nullable();
            $table->json('hashtags')->nullable();
            $table->json('options')->nullable();
            $table->timestamp('scheduled_at')->nullable()->index();
            $table->timestamp('published_at')->nullable();
            $table->string('meta_container_id')->nullable();
            $table->string('meta_media_id')->nullable();
            $table->unsignedInteger('retry_count')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scheduled_posts');
    }
};
