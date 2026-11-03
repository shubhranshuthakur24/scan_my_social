<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('generated_scripts', function (Blueprint $table): void {
            if (! Schema::hasColumn('generated_scripts', 'script_origin')) {
                $table->string('script_origin', 50)->nullable()->after('generation_mode');
            }
        });

        if (Schema::hasColumn('generated_scripts', 'script_origin')) {
            DB::table('generated_scripts')
                ->whereNull('script_origin')
                ->update([
                    'script_origin' => DB::raw("CASE WHEN content_analysis_id IS NULL THEN 'script_page' ELSE 'video_details' END"),
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('generated_scripts', function (Blueprint $table): void {
            if (Schema::hasColumn('generated_scripts', 'script_origin')) {
                $table->dropColumn('script_origin');
            }
        });
    }
};
