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
            if (! Schema::hasColumn('instagram_accounts', 'token_type')) {
                $table->string('token_type')->default('long_lived')->after('access_token');
            }

            if (! Schema::hasColumn('instagram_accounts', 'long_lived_exchange_failed_at')) {
                $table->timestamp('long_lived_exchange_failed_at')->nullable()->after('token_expires_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('instagram_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('instagram_accounts', 'long_lived_exchange_failed_at')) {
                $table->dropColumn('long_lived_exchange_failed_at');
            }

            if (Schema::hasColumn('instagram_accounts', 'token_type')) {
                $table->dropColumn('token_type');
            }
        });
    }
};
