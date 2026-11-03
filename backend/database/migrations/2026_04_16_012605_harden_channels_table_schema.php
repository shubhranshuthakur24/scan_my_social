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
        Schema::table('channels', function (Blueprint $table) {
            // Convert existing varchar columns to numeric types for correct sorting and indexing
            $table->unsignedBigInteger('followers_count')->default(0)->change();
            $table->unsignedBigInteger('posts_count')->default(0)->change();
            $table->unsignedBigInteger('follows_count')->default(0)->change();
            $table->unsignedBigInteger('views_count')->default(0)->change();

            // Add index for fast popularity sorting
            $table->index('followers_count', 'idx_followers');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->dropIndex('idx_followers');

            $table->string('followers_count')->nullable()->change();
            $table->string('posts_count')->nullable()->change();
            $table->string('follows_count')->nullable()->change();
            $table->string('views_count')->nullable()->change();
        });
    }
};
