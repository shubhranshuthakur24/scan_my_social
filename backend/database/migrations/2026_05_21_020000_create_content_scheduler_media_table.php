<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_scheduler_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('disk')->default('public');
            $table->string('path');
            $table->text('url')->nullable();
            $table->string('original_name');
            $table->string('mime_type');
            $table->string('media_type')->index();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('title')->nullable();
            $table->text('default_caption')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'media_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_scheduler_media');
    }
};
