<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('script_research_claim_source', function (Blueprint $table) {
            $table->id();
            $table->foreignId('script_research_claim_id')->constrained()->cascadeOnDelete();
            $table->foreignId('script_research_source_id')->constrained()->cascadeOnDelete();
            $table->string('relationship', 24)->default('supports');
            $table->timestamps();

            $table->unique(
                ['script_research_claim_id', 'script_research_source_id'],
                'script_claim_source_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('script_research_claim_source');
    }
};
