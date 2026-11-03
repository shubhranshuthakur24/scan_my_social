<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\ViralImagePrompt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ViralImagePromptTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_can_access_public_prompt_pages_but_not_manage_page(): void
    {
        $this->withoutVite();

        $this->get(route('viral-image-prompts.index'))
            ->assertOk();

        $prompt = ViralImagePrompt::query()->create([
            'title' => 'Public Prompt',
            'slug' => 'public-prompt',
            'prompt' => 'Visible prompt details.',
            'category' => 'Public',
            'image_path' => 'https://cdn.example.com/prompts/public.jpg',
        ]);

        $this->get(route('viral-image-prompts.show', $prompt->slug))
            ->assertOk()
            ->assertSee('Public Prompt');

        $this->get(route('viral-image-prompts.manage'))
            ->assertRedirect('/login');
    }

    public function test_non_super_admin_users_cannot_access_prompt_module(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('viral-image-prompts.index'))
            ->assertOk();

        $this->actingAs($user)
            ->get(route('viral-image-prompts.manage'))
            ->assertForbidden();
    }

    public function test_super_admin_can_access_prompt_module(): void
    {
        $this->withoutVite();
        $superAdmin = User::factory()->superAdmin()->create();

        ViralImagePrompt::query()->create([
            'title' => 'Test Prompt',
            'prompt' => 'This is a test prompt',
            'category' => 'Test',
            'image_path' => 'https://cdn.example.com/prompts/test.jpg',
        ]);

        $this->actingAs($superAdmin)
            ->get(route('viral-image-prompts.index'))
            ->assertOk()
            ->assertSee('Test Prompt');

        $this->actingAs($superAdmin)
            ->get(route('viral-image-prompts.manage'))
            ->assertOk()
            ->assertSee('Test Prompt');
    }

    public function test_super_admin_must_provide_all_required_fields_to_create_prompt(): void
    {
        $this->withoutVite();
        $superAdmin = User::factory()->superAdmin()->create();

        $this->actingAs($superAdmin)
            ->post(route('viral-image-prompts.store'), [])
            ->assertSessionHasErrors(['title', 'prompt', 'category', 'image_file']);
    }

    public function test_prompt_images_are_uploaded_to_configured_upload_disk(): void
    {
        $this->withoutVite();
        Storage::fake('r2');
        Storage::fake('public');

        config()->set('filesystems.upload_disk', 'r2');
        config()->set('filesystems.disks.r2.url', 'https://cdn.example.com');

        $superAdmin = User::factory()->superAdmin()->create();
        $tinyPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+8WQAAAAASUVORK5CYII=');

        $this->actingAs($superAdmin)->post(route('viral-image-prompts.store'), [
            'title' => 'R2 Prompt',
            'prompt' => 'R2 upload validation',
            'category' => 'Testing',
            'image_file' => UploadedFile::fake()->createWithContent('prompt.png', $tinyPng),
        ])->assertRedirect(route('viral-image-prompts.manage'));

        $storedPrompt = ViralImagePrompt::query()->where('title', 'R2 Prompt')->firstOrFail();

        $storedPath = $this->resolveStoredPathFromUrl($storedPrompt->image_path);
        Storage::disk('r2')->assertExists($storedPath);
        Storage::disk('public')->assertMissing($storedPath);
    }

    public function test_prompt_slug_is_generated_from_title_and_is_unique(): void
    {
        $this->withoutVite();

        $firstSlug = ViralImagePrompt::createUniqueSlug('Same Prompt Title');
        ViralImagePrompt::query()->create([
            'title' => 'Same Prompt Title',
            'slug' => $firstSlug,
            'prompt' => 'Prompt one',
            'category' => 'Test',
            'image_path' => 'https://cdn.example.com/prompts/one.jpg',
        ]);

        $secondSlug = ViralImagePrompt::createUniqueSlug('Same Prompt Title');

        $this->assertSame('same-prompt-title', $firstSlug);
        $this->assertSame('same-prompt-title-2', $secondSlug);
    }

    public function test_prompt_slug_stays_fixed_after_title_update(): void
    {
        $this->withoutVite();

        $superAdmin = User::factory()->superAdmin()->create();
        $prompt = ViralImagePrompt::query()->create([
            'title' => 'Original Title',
            'slug' => 'original-title',
            'prompt' => 'Original prompt text',
            'category' => 'Original',
            'image_path' => '/storage/viral-image-prompts/test.png',
        ]);

        $this->actingAs($superAdmin)
            ->post(route('viral-image-prompts.update', $prompt->id), [
                'title' => 'Updated Title',
                'prompt' => 'Updated prompt text',
                'category' => 'Updated',
            ])
            ->assertRedirect(route('viral-image-prompts.manage'));

        $prompt->refresh();

        $this->assertSame('original-title', $prompt->slug);
        $this->assertSame('Updated Title', $prompt->title);
    }

    public function test_prompt_details_page_uses_slug_url(): void
    {
        $this->withoutVite();

        $prompt = ViralImagePrompt::query()->create([
            'title' => 'Details Prompt',
            'slug' => 'details-prompt',
            'prompt' => 'This is the details prompt body.',
            'category' => 'Test',
            'image_path' => 'https://cdn.example.com/prompts/details.jpg',
        ]);

        $this->get(route('viral-image-prompts.show', $prompt->slug))
            ->assertOk()
            ->assertSee('Details Prompt')
            ->assertSee('This is the details prompt body.');
    }

    private function resolveStoredPathFromUrl(string $url): string
    {
        if (str_starts_with($url, '/storage/')) {
            return ltrim(substr($url, strlen('/storage/')), '/');
        }

        $path = (string) parse_url($url, PHP_URL_PATH);

        return ltrim($path, '/');
    }
}
