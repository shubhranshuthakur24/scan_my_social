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
        if (Schema::hasTable('instagram_accounts')) {
            Schema::table('instagram_accounts', function (Blueprint $table) {
                if (! Schema::hasColumn('instagram_accounts', 'media_count')) {
                    $table->unsignedBigInteger('media_count')->default(0)->nullable()->after('profile_picture_url');
                }
                if (! Schema::hasColumn('instagram_accounts', 'follower_count')) {
                    $table->unsignedBigInteger('follower_count')->default(0)->nullable()->after('media_count');
                }
                if (! Schema::hasColumn('instagram_accounts', 'following_count')) {
                    $table->unsignedBigInteger('following_count')->default(0)->nullable()->after('follower_count');
                }
            });
        }

        if (Schema::hasTable('instagram_account_insight_snapshots')) {
            Schema::table('instagram_account_insight_snapshots', function (Blueprint $table) {
                if (! Schema::hasColumn('instagram_account_insight_snapshots', 'following_count')) {
                    $table->unsignedBigInteger('following_count')->nullable()->after('follower_count');
                }
                if (! Schema::hasColumn('instagram_account_insight_snapshots', 'media_count')) {
                    $table->unsignedBigInteger('media_count')->nullable()->after('following_count');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('instagram_accounts')) {
            Schema::table('instagram_accounts', function (Blueprint $table) {
                $dropColumns = [];
                if (Schema::hasColumn('instagram_accounts', 'following_count')) {
                    $dropColumns[] = 'following_count';
                }
                if (Schema::hasColumn('instagram_accounts', 'follower_count')) {
                    $dropColumns[] = 'follower_count';
                }
                if (Schema::hasColumn('instagram_accounts', 'media_count')) {
                    $dropColumns[] = 'media_count';
                }
                if (! empty($dropColumns)) {
                    $table->dropColumn($dropColumns);
                }
            });
        }

        if (Schema::hasTable('instagram_account_insight_snapshots')) {
            Schema::table('instagram_account_insight_snapshots', function (Blueprint $table) {
                $dropColumns = [];
                if (Schema::hasColumn('instagram_account_insight_snapshots', 'media_count')) {
                    $dropColumns[] = 'media_count';
                }
                if (Schema::hasColumn('instagram_account_insight_snapshots', 'following_count')) {
                    $dropColumns[] = 'following_count';
                }
                if (! empty($dropColumns)) {
                    $table->dropColumn($dropColumns);
                }
            });
        }
    }
};
