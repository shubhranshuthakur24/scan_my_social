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
        Schema::create('instagram_account_insight_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('instagram_account_id')->constrained()->cascadeOnDelete();
            $table->date('snapshot_date');
            $table->unsignedInteger('reach')->default(0);
            $table->unsignedInteger('impressions')->default(0);
            $table->unsignedInteger('profile_views')->default(0);
            $table->unsignedInteger('follower_count')->default(0);
            $table->timestamp('synced_at')->nullable();
            $table->json('raw_metrics')->nullable();
            $table->timestamps();

            $table->unique(['instagram_account_id', 'snapshot_date'], 'ig_account_insights_unique');
            $table->index(['user_id', 'instagram_account_id', 'snapshot_date'], 'ig_account_insights_date_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('instagram_account_insight_snapshots');
    }
};
