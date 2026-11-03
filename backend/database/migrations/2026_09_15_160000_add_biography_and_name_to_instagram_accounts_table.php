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
            if (!Schema::hasColumn('instagram_accounts', 'name')) {
                $table->string('name')->nullable()->after('username');
            }
            if (!Schema::hasColumn('instagram_accounts', 'biography')) {
                $table->text('biography')->nullable()->after('name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('instagram_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('instagram_accounts', 'biography')) {
                $table->dropColumn('biography');
            }
            if (Schema::hasColumn('instagram_accounts', 'name')) {
                $table->dropColumn('name');
            }
        });
    }
};
