<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_analyses', function (Blueprint $table): void {
            if (! Schema::hasColumn('content_analyses', 'script_origin')) {
                $table->string('script_origin', 50)->nullable()->after('script_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('content_analyses', function (Blueprint $table): void {
            if (Schema::hasColumn('content_analyses', 'script_origin')) {
                $table->dropColumn('script_origin');
            }
        });
    }
};
