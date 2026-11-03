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
        Schema::table('instagram_accounts', function (Blueprint $table) {
            if (! Schema::hasColumn('instagram_accounts', 'welcome_dm_enabled')) {
                $table->boolean('welcome_dm_enabled')->default(false)->after('webhook_subscriptions_error');
            }

            if (! Schema::hasColumn('instagram_accounts', 'welcome_dm_variants')) {
                $table->json('welcome_dm_variants')->nullable()->after('welcome_dm_enabled');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('instagram_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('instagram_accounts', 'welcome_dm_variants')) {
                $table->dropColumn('welcome_dm_variants');
            }

            if (Schema::hasColumn('instagram_accounts', 'welcome_dm_enabled')) {
                $table->dropColumn('welcome_dm_enabled');
            }
        });
    }
};
