<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('channel_id')->nullable()->constrained('channels')->onDelete('cascade');
            $table->string('platform')->default('instagram')->index();
            $table->string('post_id')->unique();
            $table->string('type')->nullable();
            $table->string('short_code')->nullable();
            $table->text('caption')->nullable();
            $table->json('hashtags')->nullable();
            $table->json('mentions')->nullable();
            $table->text('url')->nullable();
            $table->integer('comments_count')->default(0);
            $table->text('first_comment')->nullable();
            $table->json('latest_comments')->nullable();
            $table->integer('dimensions_height')->nullable();
            $table->integer('dimensions_width')->nullable();
            $table->text('display_url')->nullable();
            $table->json('images')->nullable();
            $table->text('video_url')->nullable();
            $table->integer('likes_count')->default(0);
            $table->integer('video_view_count')->nullable();
            $table->timestamp('post_timestamp')->nullable();
            $table->json('child_posts')->nullable();
            $table->string('owner_full_name')->nullable();
            $table->string('owner_username')->nullable();
            $table->string('owner_id')->nullable();
            $table->string('product_type')->nullable();
            $table->json('tagged_users')->nullable();
            $table->json('coauthor_producers')->nullable();
            $table->boolean('is_comments_disabled')->default(false);
            $table->text('input_url')->nullable();
            $table->text('audio_url')->nullable();
            $table->text('alt')->nullable();
            $table->integer('video_play_count')->nullable();
            $table->integer('video_duration')->nullable();
            $table->json('music_info')->nullable();
            $table->string('location_name')->nullable();
            $table->string('location_id')->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_approved')->default(false);
            $table->boolean('is_transcribed')->default(false);
            $table->boolean('is_analyzed')->default(false);

            // Outlier & Engagement Detection (Viralzr V1 spec)
            $table->string('breakout_label')->nullable()->index(); // Insufficient Data / Normal / Strong / Outlier / Breakout / Explosive
            $table->float('breakout_multiplier')->nullable();      // current_plays / rolling_median
            $table->float('median_baseline')->nullable();          // Rolling median at time of evaluation
            $table->float('stddev_baseline')->nullable();          // Rolling stddev at time of evaluation
            $table->float('engagement_rate')->nullable();          // (likes + comments) / plays
            $table->float('engagement_ratio')->nullable();         // engagement_rate / rolling_median_engagement_rate

            $table->timestamps();

            $table->index('channel_id');
            $table->index('owner_username');
            $table->index('is_approved');
            $table->index('is_transcribed');
            $table->index('post_timestamp');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
