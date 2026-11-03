<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_scheduler_media_scheduled_post', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scheduled_post_id');
            $table->foreignId('content_scheduler_media_id');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('scheduled_post_id', 'csmsp_post_fk')->references('id')->on('scheduled_posts')->cascadeOnDelete();
            $table->foreign('content_scheduler_media_id', 'csmsp_media_fk')->references('id')->on('content_scheduler_media')->cascadeOnDelete();
            $table->unique(['scheduled_post_id', 'content_scheduler_media_id'], 'csmsp_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_scheduler_media_scheduled_post');
    }
};
