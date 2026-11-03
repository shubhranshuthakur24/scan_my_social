<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scheduled_post_analytics_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scheduled_post_id')->constrained('scheduled_posts')->cascadeOnDelete();
            $table->foreignId('instagram_account_id')->constrained()->cascadeOnDelete();
            $table->date('snapshot_date')->index();
            $table->unsignedBigInteger('followers')->nullable();
            $table->unsignedBigInteger('reach')->nullable();
            $table->unsignedBigInteger('impressions')->nullable();
            $table->unsignedBigInteger('engagement')->nullable();
            $table->unsignedBigInteger('likes')->nullable();
            $table->unsignedBigInteger('comments')->nullable();
            $table->unsignedBigInteger('shares')->nullable();
            $table->unsignedBigInteger('saves')->nullable();
            $table->json('raw_metrics')->nullable();
            $table->timestamps();

            $table->unique(['scheduled_post_id', 'snapshot_date'], 'sched_post_snapshot_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scheduled_post_analytics_snapshots');
    }
};
