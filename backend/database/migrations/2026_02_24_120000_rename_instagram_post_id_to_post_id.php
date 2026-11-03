<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Production-safe migration.
 *
 * Runs only if the old schema still exists (i.e., this is NOT a fresh install).
 * A fresh `migrate:fresh` skips this because the old tables/columns don't exist.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Rename instagram_posts → posts ──────────────────────────────
        if (Schema::hasTable('instagram_posts') && ! Schema::hasTable('posts')) {
            Schema::rename('instagram_posts', 'posts');
        }

        // ── 2. Add `platform` column to posts ──────────────────────────────
        if (Schema::hasTable('posts') && ! Schema::hasColumn('posts', 'platform')) {
            Schema::table('posts', function (Blueprint $table) {
                $table->string('platform')->default('instagram')->after('channel_id')->index();
            });
            // Backfill existing rows as instagram
            DB::table('posts')->update(['platform' => 'instagram']);
        }

        // ── 3. content_analyses: instagram_post_id → post_id ───────────────
        if (Schema::hasTable('content_analyses') && Schema::hasColumn('content_analyses', 'instagram_post_id')) {
            Schema::table('content_analyses', function (Blueprint $table) {
                // Drop old FK if it exists
                try {
                    $table->dropForeign(['instagram_post_id']);
                } catch (Throwable $e) {
                }
                $table->renameColumn('instagram_post_id', 'post_id');
            });
        }

        // ── 4. project_posts: instagram_post_id → post_id ──────────────────
        if (Schema::hasTable('project_posts') && Schema::hasColumn('project_posts', 'instagram_post_id')) {
            Schema::table('project_posts', function (Blueprint $table) {
                try {
                    $table->dropForeign(['instagram_post_id']);
                } catch (Throwable $e) {
                }
                $table->renameColumn('instagram_post_id', 'post_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('posts') && ! Schema::hasTable('instagram_posts')) {
            Schema::rename('posts', 'instagram_posts');
        }

        if (Schema::hasTable('content_analyses') && Schema::hasColumn('content_analyses', 'post_id')) {
            Schema::table('content_analyses', function (Blueprint $table) {
                $table->renameColumn('post_id', 'instagram_post_id');
            });
        }

        if (Schema::hasTable('project_posts') && Schema::hasColumn('project_posts', 'post_id')) {
            Schema::table('project_posts', function (Blueprint $table) {
                $table->renameColumn('post_id', 'instagram_post_id');
            });
        }
    }
};
