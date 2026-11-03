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
        Schema::table('instagram_account_media_analytics', function (Blueprint $table) {
            $table->unsignedInteger('story_replies')->default(0)->after('saves');
            $table->unsignedInteger('story_taps_forward')->default(0)->after('story_replies');
            $table->unsignedInteger('story_taps_back')->default(0)->after('story_taps_forward');
            $table->unsignedInteger('story_exits')->default(0)->after('story_taps_back');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('instagram_account_media_analytics', function (Blueprint $table) {
            $table->dropColumn([
                'story_replies',
                'story_taps_forward',
                'story_taps_back',
                'story_exits',
            ]);
        });
    }
};
