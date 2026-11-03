<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasIndex('content_analyses', ['script_type'])) {
            Schema::table('content_analyses', function (Blueprint $table): void {
                $table->dropIndex(['script_type']);
            });
        }

        Schema::table('content_analyses', function (Blueprint $table): void {
            if (Schema::hasColumn('content_analyses', 'hook_text')) {
                $table->text('hook_text')->nullable()->change();
            } else {
                $table->text('hook_text')->nullable();
            }

            if (Schema::hasColumn('content_analyses', 'topic_angle')) {
                $table->text('topic_angle')->nullable()->change();
            } else {
                $table->text('topic_angle')->nullable();
            }

            if (Schema::hasColumn('content_analyses', 'insight_shift_text')) {
                $table->text('insight_shift_text')->nullable()->change();
            } else {
                $table->text('insight_shift_text')->nullable();
            }

            if (Schema::hasColumn('content_analyses', 'cta_text')) {
                $table->text('cta_text')->nullable()->change();
            } else {
                $table->text('cta_text')->nullable();
            }

            if (Schema::hasColumn('content_analyses', 'mechanism_type')) {
                $table->text('mechanism_type')->nullable()->change();
            } else {
                $table->text('mechanism_type')->nullable();
            }

            if (Schema::hasColumn('content_analyses', 'psychological_driver')) {
                $table->text('psychological_driver')->nullable()->change();
            } else {
                $table->text('psychological_driver')->nullable();
            }

            if (Schema::hasColumn('content_analyses', 'closure_type')) {
                $table->text('closure_type')->nullable()->change();
            } else {
                $table->text('closure_type')->nullable();
            }

            if (Schema::hasColumn('content_analyses', 'script_type')) {
                $table->text('script_type')->nullable()->change();
            } else {
                $table->text('script_type')->nullable();
            }

            if (Schema::hasColumn('content_analyses', 'key_shift')) {
                $table->text('key_shift')->nullable()->change();
            } else {
                $table->text('key_shift')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('content_analyses', function (Blueprint $table): void {
            if (Schema::hasColumn('content_analyses', 'hook_text')) {
                $table->string('hook_text', 255)->nullable()->change();
            }

            if (Schema::hasColumn('content_analyses', 'topic_angle')) {
                $table->string('topic_angle', 255)->nullable()->change();
            }

            if (Schema::hasColumn('content_analyses', 'insight_shift_text')) {
                $table->string('insight_shift_text', 255)->nullable()->change();
            }

            if (Schema::hasColumn('content_analyses', 'cta_text')) {
                $table->string('cta_text', 255)->nullable()->change();
            }

            if (Schema::hasColumn('content_analyses', 'mechanism_type')) {
                $table->string('mechanism_type', 255)->nullable()->change();
            }

            if (Schema::hasColumn('content_analyses', 'psychological_driver')) {
                $table->string('psychological_driver', 255)->nullable()->change();
            }

            if (Schema::hasColumn('content_analyses', 'closure_type')) {
                $table->string('closure_type', 255)->nullable()->change();
            }

            if (Schema::hasColumn('content_analyses', 'script_type')) {
                $table->string('script_type', 255)->nullable()->change();
            }

            if (Schema::hasColumn('content_analyses', 'key_shift')) {
                $table->string('key_shift', 255)->nullable()->change();
            }
        });

        if (! Schema::hasIndex('content_analyses', ['script_type'])) {
            Schema::table('content_analyses', function (Blueprint $table): void {
                $table->index('script_type');
            });
        }
    }
};
