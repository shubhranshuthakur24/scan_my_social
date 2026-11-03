<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('script_generation_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('script_research_id')->nullable()->constrained('script_researches')->nullOnDelete();
            $table->text('original_topic');
            $table->string('normalized_topic', 500);
            $table->string('status', 32)->default('queued')->index();
            $table->string('research_status', 32)->default('not_requested')->index();
            $table->boolean('research_enabled')->default(false);
            $table->string('research_intent', 32)->nullable();
            $table->string('research_tier', 16)->default('lite');
            $table->boolean('comparison_topic')->default(false);
            $table->string('research_strategy', 40)->nullable();
            $table->string('cache_key', 64)->nullable()->index();
            $table->timestamp('cache_hit_at')->nullable();
            $table->json('creative_brief')->nullable();
            $table->json('enriched_brief')->nullable();
            $table->json('supplemental_research')->nullable();
            $table->json('unresolved_questions')->nullable();
            $table->json('user_provided_facts')->nullable();
            $table->json('submitted_source_urls')->nullable();
            $table->unsignedTinyInteger('variant_count')->default(1);
            $table->unsignedTinyInteger('research_attempts')->default(0);
            $table->unsignedTinyInteger('supplemental_query_count')->default(0);
            $table->unsignedInteger('base_cost')->default(0);
            $table->unsignedInteger('research_reserved_cost')->default(0);
            $table->unsignedInteger('research_settled_cost')->default(0);
            $table->unsignedInteger('total_reserved_cost')->default(0);
            $table->unsignedInteger('total_refunded_cost')->default(0);
            $table->string('credit_state', 24)->default('reserved');
            $table->timestamp('credits_settled_at')->nullable();
            $table->timestamp('credits_refunded_at')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('script_generation_batches');
    }
};
