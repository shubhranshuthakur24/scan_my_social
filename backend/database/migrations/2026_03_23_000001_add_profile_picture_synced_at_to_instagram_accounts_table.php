<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('instagram_accounts', function (Blueprint $table) {
            if (! Schema::hasColumn('instagram_accounts', 'profile_picture_synced_at')) {
                $table->timestamp('profile_picture_synced_at')
                    ->nullable()
                    ->after('profile_picture_url')
                    ->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('instagram_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('instagram_accounts', 'profile_picture_synced_at')) {
                $table->dropColumn('profile_picture_synced_at');
            }
        });
    }
};
