<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('viral_image_prompts', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('title');
        });

        $existingSlugs = [];
        $prompts = DB::table('viral_image_prompts')
            ->select(['id', 'title'])
            ->orderBy('id')
            ->get();

        foreach ($prompts as $prompt) {
            $baseSlug = Str::slug((string) $prompt->title);
            if ($baseSlug === '') {
                $baseSlug = 'prompt';
            }

            $slug = $baseSlug;
            $suffix = 2;

            while (in_array($slug, $existingSlugs, true)) {
                $slug = $baseSlug.'-'.$suffix;
                $suffix++;
            }

            DB::table('viral_image_prompts')
                ->where('id', $prompt->id)
                ->update(['slug' => $slug]);

            $existingSlugs[] = $slug;
        }

        Schema::table('viral_image_prompts', function (Blueprint $table) {
            $table->unique('slug');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('viral_image_prompts', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
