<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('script_researches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('cache_key', 64)->index();
            $table->text('original_topic');
            $table->string('normalized_topic', 500);
            $table->string('intent', 32);
            $table->string('language', 32);
            $table->string('locale', 16)->default('en-US');
            $table->string('tier', 16)->default('lite');
            $table->unsignedInteger('research_version');
            $table->string('state', 16)->default('active')->index();
            $table->boolean('is_historical')->default(false)->index();
            $table->unsignedInteger('reference_count')->default(0);
            $table->unsignedTinyInteger('confidence_score')->default(0);
            $table->string('confidence_label', 16)->default('low');
            $table->json('summary')->nullable();
            $table->string('provider', 32);
            $table->string('provider_version', 64);
            $table->string('model', 100);
            $table->string('provider_response_id')->nullable();
            $table->json('usage')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->dateTime('researched_at');
            $table->dateTime('fresh_until')->index();
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();

            $table->index(
                ['cache_key', 'state', 'fresh_until'],
                'script_research_cache_lookup'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('script_researches');
    }
};
