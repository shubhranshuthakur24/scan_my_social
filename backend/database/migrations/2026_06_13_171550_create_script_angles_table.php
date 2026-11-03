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
        Schema::create('script_angles', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('script_generation_batch_id')
                ->constrained('script_generation_batches')
                ->cascadeOnDelete();
            $table->string('title', 160);
            $table->text('explanation');
            $table->string('expected_outcome', 255);
            $table->unsignedTinyInteger('position');
            $table->boolean('is_selected')->default(false)->index();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(
                ['script_generation_batch_id', 'position'],
                'script_angle_batch_position_unique'
            );
        });

        Schema::table('script_generation_batches', function (Blueprint $table) {
            $table->foreignId('selected_angle_id')
                ->nullable()
                ->after('script_research_id')
                ->constrained('script_angles')
                ->nullOnDelete();
        });

        Schema::table('generated_scripts', function (Blueprint $table) {
            $table->foreignId('script_angle_id')
                ->nullable()
                ->after('batch_id')
                ->constrained('script_angles')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('generated_scripts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('script_angle_id');
        });

        Schema::table('script_generation_batches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('selected_angle_id');
        });

        Schema::dropIfExists('script_angles');
    }
};
