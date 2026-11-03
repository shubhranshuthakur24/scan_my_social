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
        Schema::create('instagram_account_media_analytics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('instagram_account_id')->constrained()->cascadeOnDelete();
            $table->string('instagram_media_id');
            $table->string('media_type')->nullable();
            $table->string('format')->default('image');
            $table->text('caption')->nullable();
            $table->text('permalink')->nullable();
            $table->text('media_url')->nullable();
            $table->text('thumbnail_url')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->unsignedInteger('reach')->default(0);
            $table->unsignedInteger('impressions')->default(0);
            $table->unsignedInteger('engagement')->default(0);
            $table->unsignedInteger('likes')->default(0);
            $table->unsignedInteger('comments')->default(0);
            $table->unsignedInteger('shares')->default(0);
            $table->unsignedInteger('saves')->default(0);
            $table->json('raw_media')->nullable();
            $table->json('raw_metrics')->nullable();
            $table->timestamps();

            $table->unique(['instagram_account_id', 'instagram_media_id'], 'ig_account_media_analytics_unique');
            $table->index(['user_id', 'instagram_account_id', 'posted_at'], 'ig_account_media_analytics_date_idx');
            $table->index(['instagram_account_id', 'engagement'], 'ig_account_media_analytics_engagement_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('instagram_account_media_analytics');
    }
};
