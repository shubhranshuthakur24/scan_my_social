<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ScriptFlowMigrationTest extends TestCase
{
    protected function tearDown(): void
    {
        $this->restoreApplicationSchema();

        parent::tearDown();
    }

    public function test_script_intelligence_base_migration_creates_script_flow_as_unindexed_text(): void
    {
        $this->rebuildLegacyScriptTables();

        $migration = include database_path('migrations/2026_04_17_171500_add_script_intelligence_v2_fields.php');

        $migration->up();

        $this->assertSame('text', Schema::getColumnType('content_analyses', 'script_flow'));
        $this->assertFalse(Schema::hasIndex('content_analyses', ['script_flow']));
    }

    public function test_change_additional_analysis_columns_to_text_migration_handles_indexed_script_type(): void
    {
        $this->rebuildLegacyScriptTables();

        $migrationV2 = include database_path('migrations/2026_04_17_171500_add_script_intelligence_v2_fields.php');
        $migrationV2->up();

        $this->assertTrue(Schema::hasColumn('content_analyses', 'script_type'));
        $this->assertTrue(Schema::hasIndex('content_analyses', ['script_type']));

        $migrationChange = include database_path('migrations/2026_04_24_000002_change_additional_analysis_columns_to_text_in_content_analyses_table.php');
        $migrationChange->up();

        $this->assertSame('text', Schema::getColumnType('content_analyses', 'script_type'));
        $this->assertFalse(Schema::hasIndex('content_analyses', ['script_type']));

        $migrationChange->down();

        $this->assertSame('varchar', Schema::getColumnType('content_analyses', 'script_type'));
        $this->assertTrue(Schema::hasIndex('content_analyses', ['script_type']));
    }

    private function rebuildLegacyScriptTables(): void
    {
        Schema::disableForeignKeyConstraints();

        try {
            Schema::dropIfExists('generated_scripts');
            Schema::dropIfExists('content_analyses');
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        Schema::create('content_analyses', function (Blueprint $table): void {
            $table->id();
            $table->text('transcription')->nullable();
            $table->string('hook')->nullable();
            $table->string('content_angle')->nullable();
            $table->string('archetype')->nullable();
            $table->string('structure_model')->nullable();
            $table->string('insight_shift')->nullable();
            $table->string('cta_type')->nullable();
            $table->string('rhythm_profile')->nullable();
        });

        Schema::create('generated_scripts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('content_analysis_id')->nullable();
            $table->string('status')->nullable();
        });
    }

    private function restoreApplicationSchema(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::disableForeignKeyConstraints();

        try {
            Artisan::call('migrate:fresh', ['--force' => true]);
        } finally {
            Schema::enableForeignKeyConstraints();
        }
    }
}
