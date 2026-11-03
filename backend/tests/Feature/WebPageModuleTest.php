<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\LinkPage;
use App\Models\User;
use App\Models\WebPage;
use App\Models\WebPageEvent;
use App\Models\WebPageSubmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WebPageModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_and_list_web_pages_from_the_social_module(): void
    {
        $this->withoutVite();
        $user = User::factory()->create(['username' => 'creator']);
        LinkPage::factory()->for($user)->primary()->create();
        $sections = WebPage::defaultSections('launch');

        $this->actingAs($user)
            ->get(route('social-bio-links.web-pages.create'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/WebPageCreate')
                ->has('templates.launch.sections')
                ->where('templates.launch.category', 'Campaign')
                ->where('templates.launch.preview_image', '/images/web-page-templates/launch.jpg')
                ->where('templates.launch.theme_settings.layout_style', 'immersive')
            );

        $this->actingAs($user)
            ->post(route('social-bio-links.web-pages.store'), [
                'title' => 'Creator Launch',
                'slug' => 'creator-launch',
                'description' => 'Launch the new offer.',
                'template_key' => 'launch',
                'sections' => $sections,
                'theme_settings' => WebPage::defaultThemeSettings('studio'),
                'is_published' => true,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $webPage = WebPage::query()->where('title', 'Creator Launch')->firstOrFail();
        WebPageEvent::factory()->for($webPage)->create(['type' => WebPageEvent::TYPE_VIEW]);
        WebPageEvent::factory()->for($webPage)->create(['type' => WebPageEvent::TYPE_CTA_CLICK]);
        WebPageSubmission::factory()->for($webPage)->create();

        $this->assertSame('creator-launch', $webPage->slug);
        $this->assertSame('Launch the new offer.', $webPage->description);
        $this->assertSame('launch', $webPage->template_key);
        $this->assertEquals($sections, $webPage->sections);
        $this->assertTrue($webPage->is_published);
        $this->assertNotNull($webPage->published_at);

        $this->actingAs($user)
            ->get(route('social-bio-links.web-pages.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/Show')
                ->where('active_tab', 'web_pages')
                ->where('web_pages.0.title', 'Creator Launch')
                ->where('web_page_summary.total_pages', 1)
                ->where('web_page_summary.published_pages', 1)
                ->where('web_page_summary.total_views', 1)
                ->where('web_page_summary.total_submissions', 1)
                ->has('web_page_templates.creator')
            );
    }

    public function test_user_can_update_publish_and_delete_owned_web_page(): void
    {
        $this->withoutVite();
        $user = User::factory()->create(['username' => 'owner']);
        $webPage = WebPage::factory()->for($user)->create(['is_published' => false]);
        $sections = $webPage->sections;
        $sections[0]['content']['heading'] = 'Updated Heading';

        $this->actingAs($user)
            ->put(route('social-bio-links.web-pages.update', $webPage), [
                'title' => 'Updated Page',
                'slug' => 'updated-page',
                'description' => 'Updated description',
                'template_key' => 'creator',
                'sections' => $sections,
                'theme_settings' => [
                    'background_color' => '#ffffff',
                    'text_color' => '#111827',
                    'accent_color' => '#2563eb',
                ],
                'is_published' => true,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $webPage->refresh();

        $this->assertSame('Updated Page', $webPage->title);
        $this->assertSame('updated-page', $webPage->slug);
        $this->assertTrue($webPage->is_published);
        $this->assertNotNull($webPage->published_at);

        $this->actingAs($user)
            ->patch(route('social-bio-links.web-pages.publish', $webPage))
            ->assertRedirect();

        $this->assertFalse($webPage->refresh()->is_published);

        $this->actingAs($user)
            ->delete(route('social-bio-links.web-pages.destroy', $webPage))
            ->assertRedirect(route('social-bio-links.web-pages.index'));

        $this->assertModelMissing($webPage);
    }

    public function test_web_page_editor_exposes_theme_presets(): void
    {
        $this->withoutVite();
        $user = User::factory()->create(['username' => 'theme-owner']);
        $webPage = WebPage::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('social-bio-links.web-pages.edit', $webPage))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/WebPageEdit')
                ->has('theme_presets.studio')
                ->has('theme_presets.midnight')
                ->where('theme_presets.royal.settings.theme_key', 'royal')
            );
    }

    public function test_template_defaults_apply_the_matching_visual_direction(): void
    {
        $this->withoutVite();
        $user = User::factory()->create(['username' => 'launch-owner']);

        $this->actingAs($user)
            ->post(route('social-bio-links.web-pages.store'), [
                'title' => 'Signal Launch',
                'slug' => 'signal-launch',
                'description' => '',
                'template_key' => 'launch',
                'sections' => WebPage::defaultSections('launch'),
                'is_published' => false,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $webPage = WebPage::query()->where('slug', 'signal-launch')->firstOrFail();

        $this->assertSame('midnight', $webPage->theme_settings['theme_key']);
        $this->assertSame('immersive', $webPage->theme_settings['layout_style']);
        $this->assertSame('/images/web-page-templates/launch.jpg', $webPage->sections[0]['content']['image_url']);
    }

    public function test_theme_update_preserves_sections_and_template_key(): void
    {
        $this->withoutVite();
        $user = User::factory()->create(['username' => 'theme-owner']);
        $sections = WebPage::defaultSections('service');
        $webPage = WebPage::factory()->for($user)->create([
            'template_key' => 'service',
            'sections' => $sections,
        ]);

        $this->actingAs($user)
            ->put(route('social-bio-links.web-pages.update', $webPage), [
                'title' => $webPage->title,
                'slug' => $webPage->slug,
                'description' => $webPage->description,
                'template_key' => $webPage->template_key,
                'sections' => $sections,
                'theme_settings' => WebPage::defaultThemeSettings('midnight'),
                'is_published' => false,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $webPage->refresh();

        $this->assertSame('service', $webPage->template_key);
        $this->assertEquals($sections, $webPage->sections);
        $this->assertSame('midnight', $webPage->theme_settings['theme_key']);
        $this->assertSame('#0f172a', $webPage->theme_settings['background_color']);
    }

    public function test_web_page_validation_rejects_duplicate_slug_invalid_slug_and_bad_urls(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        WebPage::factory()->for($user)->create(['slug' => 'taken']);
        $webPage = WebPage::factory()->for($user)->create(['slug' => 'editable']);
        $sections = $webPage->sections;
        $sections[0]['content']['primary_url'] = 'ftp://example.com/file';

        $this->actingAs($user)
            ->post(route('social-bio-links.web-pages.store'), [
                'title' => 'Bad Create',
                'slug' => 'bad-create',
                'description' => '',
                'template_key' => 'creator',
                'sections' => $sections,
                'theme_settings' => [
                    'theme_key' => 'unknown',
                    'background_color' => 'not-a-color',
                    'button_style' => 'circle',
                ],
                'is_published' => true,
            ])
            ->assertSessionHasErrors([
                'sections.0.content.primary_url',
                'theme_settings.theme_key',
                'theme_settings.background_color',
                'theme_settings.button_style',
            ]);

        $this->actingAs($user)
            ->put(route('social-bio-links.web-pages.update', $webPage), [
                'title' => 'Bad Page',
                'slug' => 'taken',
                'description' => '',
                'template_key' => 'creator',
                'sections' => $sections,
                'theme_settings' => [],
                'is_published' => false,
            ])
            ->assertSessionHasErrors(['slug', 'sections.0.content.primary_url']);

        $this->actingAs($user)
            ->put(route('social-bio-links.web-pages.update', $webPage), [
                'title' => 'Bad Page',
                'slug' => 'pages',
                'description' => '',
                'template_key' => 'creator',
                'sections' => $webPage->sections,
                'theme_settings' => [],
                'is_published' => false,
            ])
            ->assertSessionHasErrors(['slug']);
    }

    public function test_web_page_validation_rejects_invalid_theme_settings(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $webPage = WebPage::factory()->for($user)->create();

        $this->actingAs($user)
            ->put(route('social-bio-links.web-pages.update', $webPage), [
                'title' => 'Bad Theme',
                'slug' => 'bad-theme',
                'description' => '',
                'template_key' => 'creator',
                'sections' => $webPage->sections,
                'theme_settings' => [
                    'theme_key' => 'unknown',
                    'background_color' => 'not-a-color',
                    'button_style' => 'circle',
                    'radius_style' => 'bubble',
                    'layout_style' => 'floating',
                    'font_style' => 'display',
                ],
                'is_published' => false,
            ])
            ->assertSessionHasErrors([
                'theme_settings.theme_key',
                'theme_settings.background_color',
                'theme_settings.button_style',
                'theme_settings.radius_style',
                'theme_settings.layout_style',
                'theme_settings.font_style',
            ]);
    }

    public function test_users_cannot_manage_another_users_web_pages(): void
    {
        $this->withoutVite();
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $webPage = WebPage::factory()->for($owner)->create();

        $this->actingAs($other)
            ->get(route('social-bio-links.web-pages.edit', $webPage))
            ->assertNotFound();

        $this->actingAs($other)
            ->delete(route('social-bio-links.web-pages.destroy', $webPage))
            ->assertNotFound();

        $this->actingAs($other)
            ->put(route('social-bio-links.web-pages.update', $webPage), [
                'title' => '',
                'slug' => 'owner-page',
                'sections' => [],
                'is_published' => false,
            ])
            ->assertNotFound();
    }

    public function test_public_page_renders_published_pages_and_records_view_events(): void
    {
        $this->withoutVite();
        $user = User::factory()->create(['username' => 'public-user']);
        $webPage = WebPage::factory()->for($user)->published()->create(['slug' => 'offer']);

        $this->get(route('web-pages.public.show', ['username' => 'public-user', 'slug' => 'offer']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/PublicWebPageShow')
                ->where('web_page.slug', 'offer')
            );

        $this->assertDatabaseHas('web_page_events', [
            'web_page_id' => $webPage->id,
            'type' => WebPageEvent::TYPE_VIEW,
        ]);

        $webPage->update(['is_published' => false, 'published_at' => null]);

        $this->get(route('web-pages.public.show', ['username' => 'public-user', 'slug' => 'offer']))
            ->assertNotFound();
    }

    public function test_public_cta_click_redirects_and_records_event(): void
    {
        $this->withoutVite();
        $user = User::factory()->create(['username' => 'public-user']);
        $sections = WebPage::defaultSections('creator');
        $sections[0]['content']['primary_url'] = 'https://example.com/register';
        $webPage = WebPage::factory()->for($user)->published()->create([
            'slug' => 'offer',
            'sections' => $sections,
        ]);

        $this->get(route('web-pages.public.click', [
            'username' => 'public-user',
            'slug' => 'offer',
            'blockId' => $sections[0]['id'],
        ]))
            ->assertRedirect('https://example.com/register');

        $this->assertDatabaseHas('web_page_events', [
            'web_page_id' => $webPage->id,
            'type' => WebPageEvent::TYPE_CTA_CLICK,
            'block_id' => $sections[0]['id'],
        ]);
    }

    public function test_public_secondary_cta_click_redirects_to_secondary_destination(): void
    {
        $this->withoutVite();
        $user = User::factory()->create(['username' => 'public-user']);
        $sections = WebPage::defaultSections('creator');
        $sections[0]['content']['primary_url'] = 'https://example.com/register';
        $sections[0]['content']['secondary_url'] = 'https://example.com/watch';
        $sections[0]['content']['secondary_label'] = 'Watch now';
        $webPage = WebPage::factory()->for($user)->published()->create([
            'slug' => 'offer',
            'sections' => $sections,
        ]);

        $this->get(route('web-pages.public.click', [
            'username' => 'public-user',
            'slug' => 'offer',
            'blockId' => $sections[0]['id'],
            'target' => 'secondary',
        ]))
            ->assertRedirect('https://example.com/watch');

        $event = WebPageEvent::query()
            ->where('web_page_id', $webPage->id)
            ->where('type', WebPageEvent::TYPE_CTA_CLICK)
            ->firstOrFail();

        $this->assertSame('secondary', $event->metadata['target']);
        $this->assertSame('Watch now', $event->metadata['label']);
        $this->assertSame('https://example.com/watch', $event->metadata['destination']);
    }

    public function test_public_form_submission_creates_submission_and_crm_lead(): void
    {
        $this->withoutVite();
        $user = User::factory()->create(['username' => 'lead-owner']);
        $sections = WebPage::defaultSections('service');
        $formBlock = collect($sections)->firstWhere('type', 'contact_form');
        $webPage = WebPage::factory()->for($user)->published()->create([
            'title' => 'Service Page',
            'slug' => 'service',
            'sections' => $sections,
        ]);

        $this->post(route('web-pages.public.submit', [
            'username' => 'lead-owner',
            'slug' => 'service',
            'blockId' => $formBlock['id'],
        ]), [
            'data' => [
                'name' => 'Jane Lead',
                'email' => 'jane@example.com',
                'message' => 'I want details.',
            ],
        ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('web-pages.public.show', ['username' => 'lead-owner', 'slug' => 'service']));

        $submission = WebPageSubmission::query()->firstOrFail();

        $this->assertSame($webPage->id, $submission->web_page_id);
        $this->assertDatabaseHas('leads', [
            'user_id' => $user->id,
            'source_type' => Lead::SOURCE_WEB_PAGE_SUBMISSION,
            'source_id' => $submission->id,
            'name' => 'Jane Lead',
            'email' => 'jane@example.com',
            'status' => Lead::STATUS_NEW,
        ]);
    }
}
