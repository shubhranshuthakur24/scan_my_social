<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('instagram_accounts', function (Blueprint $table) {
            $table->text('access_token')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('instagram_accounts')
            ->whereNull('access_token')
            ->update(['access_token' => '']);

        Schema::table('instagram_accounts', function (Blueprint $table) {
            $table->text('access_token')->nullable(false)->change();
        });
    }
};
