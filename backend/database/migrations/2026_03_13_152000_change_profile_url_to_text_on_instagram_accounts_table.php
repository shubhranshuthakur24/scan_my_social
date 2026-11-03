<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('instagram_accounts')) {
            return;
        }

        if (! Schema::hasColumn('instagram_accounts', 'profile_url')) {
            return;
        }

        Schema::table('instagram_accounts', function (Blueprint $table) {
            $table->text('profile_url')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('instagram_accounts')) {
            return;
        }

        if (! Schema::hasColumn('instagram_accounts', 'profile_url')) {
            return;
        }

        Schema::table('instagram_accounts', function (Blueprint $table) {
            $table->string('profile_url')->nullable()->change();
        });
    }
};
