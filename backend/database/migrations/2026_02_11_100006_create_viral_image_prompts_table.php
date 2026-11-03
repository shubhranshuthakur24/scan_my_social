<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('viral_image_prompts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('prompt');
            $table->string('category')->index();
            $table->string('image_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('viral_image_prompts');
    }
};
