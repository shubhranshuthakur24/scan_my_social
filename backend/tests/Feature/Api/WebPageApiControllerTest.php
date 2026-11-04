<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\WebPage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WebPageApiControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_can_be_retrieved(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/web-pages/catalog');

        $response->assertOk()
            ->assertJsonStructure([
                'templates',
                'theme_presets',
            ]);

        $this->assertNotEmpty($response->json('templates'));
        $this->assertNotEmpty($response->json('theme_presets'));
    }

    public function test_guest_cannot_access_protected_web_pages_api(): void
    {
        $this->getJson('/api/v1/web-pages')->assertUnauthorized();
        $this->postJson('/api/v1/web-pages', ['title' => 'Test'])->assertUnauthorized();
    }

    public function test_authenticated_user_can_create_and_list_web_pages(): void
    {
        $user = User::factory()->create(['username' => 'testcreator']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/web-pages', [
            'title' => 'My Creator Landing Page',
            'slug' => 'my-creator-page',
            'template_key' => 'creator',
        ]);

        $response->assertCreated()
            ->assertJsonPath('web_page.title', 'My Creator Landing Page')
            ->assertJsonPath('web_page.slug', 'my-creator-page');

        $pageId = $response->json('web_page.id');

        $listRes = $this->getJson('/api/v1/web-pages');
        $listRes->assertOk()
            ->assertJsonCount(1, 'web_pages')
            ->assertJsonPath('web_pages.0.id', $pageId)
            ->assertJsonPath('summary.total_pages', 1);
    }

    public function test_authenticated_user_can_update_and_toggle_publish(): void
    {
        $user = User::factory()->create(['username' => 'testcreator']);
        Sanctum::actingAs($user);

        $webPage = WebPage::factory()->for($user)->create([
            'title' => 'Original Title',
            'slug' => 'original-slug',
            'is_published' => false,
        ]);

        $updateRes = $this->putJson("/api/v1/web-pages/{$webPage->id}", [
            'title' => 'Updated Title',
            'slug' => 'updated-slug',
            'sections' => WebPage::defaultSections('creator'),
        ]);

        $updateRes->assertOk()
            ->assertJsonPath('web_page.title', 'Updated Title')
            ->assertJsonPath('web_page.slug', 'updated-slug');

        $publishRes = $this->patchJson("/api/v1/web-pages/{$webPage->id}/publish");
        $publishRes->assertOk()
            ->assertJsonPath('is_published', true);

        $this->assertTrue($webPage->fresh()->is_published);
    }
}

