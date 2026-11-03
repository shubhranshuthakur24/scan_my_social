<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('script_research_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('script_research_id')->nullable()->constrained('script_researches')->cascadeOnDelete();
            $table->foreignUuid('script_generation_batch_id')->nullable()->constrained('script_generation_batches')->cascadeOnDelete();
            $table->string('category', 32)->index();
            $table->text('claim');
            $table->unsignedTinyInteger('confidence_score')->nullable();
            $table->string('confidence_label', 16)->nullable();
            $table->boolean('is_usable')->default(false);
            $table->boolean('is_user_provided')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('script_research_claims');
    }
};
