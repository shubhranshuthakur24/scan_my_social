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
        Schema::table('generated_scripts', function (Blueprint $table) {
            $table->longText('draft_script')->nullable()->after('script');
            $table->text('suggested_hook')->nullable()->after('hook_type');
            $table->text('suggested_cta')->nullable()->after('suggested_hook');
            $table->text('angle_rationale')->nullable()->after('suggested_cta');
            $table->json('quality_checks')->nullable()->after('improvements');
            $table->boolean('corrective_rewrite_applied')->default(false)->after('quality_checks');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('generated_scripts', function (Blueprint $table) {
            $table->dropColumn([
                'draft_script',
                'suggested_hook',
                'suggested_cta',
                'angle_rationale',
                'quality_checks',
                'corrective_rewrite_applied',
            ]);
        });
    }
};
