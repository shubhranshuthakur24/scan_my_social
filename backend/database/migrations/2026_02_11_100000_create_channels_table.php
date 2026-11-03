<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channels', function (Blueprint $table) {
            $table->id();
            $table->string('handle'); // Canonical handle, lowercase and no leading '@'
            $table->string('name')->nullable(); // Full name
            $table->enum('platform', ['instagram', 'youtube', 'linkedin'])->default('instagram');
            $table->text('bio')->nullable();
            $table->text('profile_image_url')->nullable();
            $table->string('followers_count')->nullable(); // e.g., '699M'
            $table->string('views_count')->nullable(); // e.g., '44B'
            $table->integer('median_views')->nullable();
            $table->integer('posts_count')->nullable();
            $table->integer('follows_count')->nullable();
            $table->boolean('is_private')->default(false);
            $table->boolean('is_verified')->default(false);
            $table->boolean('is_business')->default(false);
            $table->json('topics')->nullable(); // Popular topics
            $table->boolean('is_favorite')->default(false);
            $table->string('apify_profile_run_id')->nullable();
            $table->string('apify_profile_run_status')->nullable();
            $table->string('apify_post_run_id')->nullable();
            $table->string('apify_post_run_status')->nullable();
            $table->timestamp('last_refreshed_data_on')->nullable();
            $table->timestamps();

            $table->unique(['handle', 'platform']);
            $table->index('platform');
            $table->index('is_favorite');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channels');
    }
};
