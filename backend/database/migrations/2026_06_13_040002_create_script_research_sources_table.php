<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('script_research_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('script_research_id')->nullable()->constrained('script_researches')->cascadeOnDelete();
            $table->foreignUuid('script_generation_batch_id')->nullable()->constrained('script_generation_batches')->cascadeOnDelete();
            $table->text('title');
            $table->string('publisher')->nullable();
            $table->text('url');
            $table->string('url_hash', 64)->index();
            $table->timestamp('published_at')->nullable();
            $table->string('source_type', 32)->default('web');
            $table->unsignedTinyInteger('authority_score')->default(50);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index(
                ['script_research_id', 'url_hash'],
                'script_research_source_lookup'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('script_research_sources');
    }
};
