<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('link_pages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('slug', 120)->default('main');
            $table->string('display_name', 120);
            $table->boolean('is_primary')->default(false);
            $table->string('banner_url')->nullable();
            $table->string('theme', 40)->default('sunrise');
            $table->json('theme_settings')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'slug'], 'link_pages_user_slug_unique');
            $table->index(['user_id', 'is_primary'], 'link_pages_user_primary_index');
            $table->index('is_published');
        });

        Schema::create('link_page_links', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('link_page_id')->constrained()->cascadeOnDelete();
            $table->string('title', 120);
            $table->string('url', 2048);
            $table->string('description', 240)->nullable();
            $table->string('icon', 40)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['link_page_id', 'sort_order']);
            $table->index(['link_page_id', 'is_active']);
            $table->index(['starts_at', 'ends_at']);
        });

        Schema::create('link_clicks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('link_page_link_id')->constrained()->cascadeOnDelete();
            $table->timestamp('clicked_at')->index();
            $table->string('referrer', 2048)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->string('ip_hash', 64)->nullable()->index();
            $table->timestamps();

            $table->index(['link_page_link_id', 'clicked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('link_clicks');
        Schema::dropIfExists('link_page_links');
        Schema::dropIfExists('link_pages');
    }
};
