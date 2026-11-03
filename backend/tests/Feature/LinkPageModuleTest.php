<?php

namespace Tests\Feature;

use App\Models\LinkClick;
use App\Models\LinkPage;
use App\Models\LinkPageLink;
use App\Models\ShortLink;
use App\Models\ShortLinkClick;
use App\Models\User;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LinkPageModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_from_link_page_manager(): void
    {
        $this->withoutVite();

        $this->get(route('social-bio-links.index'))
            ->assertRedirect('/login');
    }

    public function test_user_gets_default_link_page_from_existing_name(): void
    {
        $this->withoutVite();
        $user = User::factory()->create([
            'name' => 'John Smith',
            'username' => null,
        ]);

        $this->actingAs($user)
            ->get(route('social-bio-links.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/Show')
                ->where('active_tab', 'link_in_bio')
                ->where('link_page.username', 'john-smith')
                ->where('link_page.display_name', 'John Smith')
            );

        $this->assertDatabaseHas('link_pages', [
            'user_id' => $user->id,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'username' => 'john-smith',
        ]);
    }

    public function test_default_username_adds_suffix_when_taken(): void
    {
        $this->withoutVite();
        User::factory()->create(['username' => 'john-smith']);
        $user = User::factory()->create([
            'name' => 'John Smith',
            'username' => null,
        ]);

        $this->actingAs($user)->get(route('social-bio-links.index'));

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'username' => 'john-smith-2',
        ]);
    }

    public function test_social_bio_links_uses_canonical_tab_routes(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        LinkPage::factory()->for($user)->primary()->create();

        foreach ([
            'social-bio-links.index' => 'link_in_bio',
            'social-bio-links.linkshort' => 'linkshort',
            'social-bio-links.web-pages.index' => 'web_pages',
        ] as $routeName => $tab) {
            $this->actingAs($user)
                ->get(route($routeName))
                ->assertInertia(fn (Assert $page) => $page
                    ->component('LinkPage/Show')
                    ->where('active_tab', $tab)
                );
        }

        $this->actingAs($user)
            ->get('/social-bio-links')
            ->assertNotFound();

        $this->actingAs($user)
            ->get('/social-bio-links?tab=linkshort')
            ->assertNotFound();

        $this->actingAs($user)
            ->get(route('social-bio-links.index', ['tab' => 'linkshort']))
            ->assertNotFound();
    }

    public function test_link_card_overview_includes_preview_ready_card_data(): void
    {
        $this->withoutVite();
        $user = User::factory()->create([
            'username' => 'preview-owner',
            'bio' => 'Creator bio',
            'avatar_url' => '/storage/avatars/preview-owner.jpg',
        ]);
        $linkPage = LinkPage::factory()->for($user)->primary()->published()->create([
            'display_name' => 'Preview Card',
            'banner_url' => '/storage/banners/preview-card.jpg',
            'theme' => 'midnight',
            'theme_settings' => [
                'button_style' => 'pill',
            ],
        ]);

        LinkPageLink::factory()->for($linkPage)->create([
            'title' => 'Visible Link',
            'sort_order' => 1,
            'is_active' => true,
        ]);
        LinkPageLink::factory()->for($linkPage)->create([
            'title' => 'Inactive Link',
            'sort_order' => 2,
            'is_active' => false,
        ]);
        LinkPageLink::factory()->for($linkPage)->create([
            'title' => 'Future Link',
            'sort_order' => 3,
            'starts_at' => now()->addDay(),
        ]);
        LinkPageLink::factory()->for($linkPage)->create([
            'title' => 'Expired Link',
            'sort_order' => 4,
            'ends_at' => now()->subDay(),
        ]);

        $this->actingAs($user)
            ->get(route('social-bio-links.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/Show')
                ->where('link_pages.0.card_name', 'Preview Card')
                ->where('link_pages.0.username', 'preview-owner')
                ->where('link_pages.0.bio', 'Creator bio')
                ->where('link_pages.0.avatar_url', '/storage/avatars/preview-owner.jpg')
                ->where('link_pages.0.banner_url', '/storage/banners/preview-card.jpg')
                ->where('link_pages.0.theme_settings.background_color', '#090909')
                ->where('link_pages.0.theme_settings.button_style', 'pill')
                ->where('link_pages.0.theme_settings.layout', 'immersive')
                ->where('link_pages.0.links_count', 4)
                ->has('link_pages.0.preview_links', 1)
                ->where('link_pages.0.preview_links.0.title', 'Visible Link')
            );
    }

    public function test_user_can_update_profile_theme_and_publish_state(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $linkPage = LinkPage::factory()->for($user)->create(['is_published' => false]);

        $this->actingAs($user)
            ->put(route('social-bio-links.update'), [
                'theme' => 'midnight',
                'theme_settings' => [
                    'background_color' => '#0f172a',
                    'text_color' => '#f8fafc',
                    'button_background_color' => '#38bdf8',
                    'button_text_color' => '#082f49',
                    'button_style' => 'pill',
                ],
                'is_published' => true,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $linkPage->refresh();

        $this->assertSame('midnight', $linkPage->theme);
        $this->assertTrue($linkPage->is_published);
        $this->assertNotNull($linkPage->published_at);
    }

    public function test_theme_update_rejects_low_contrast_color_combinations(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        LinkPage::factory()->for($user)->create();

        $this->actingAs($user)
            ->put(route('social-bio-links.update'), [
                'theme' => 'sunrise',
                'theme_settings' => [
                    'background_color' => '#fef2f2',
                    'text_color' => '#fff1f2',
                    'button_background_color' => '#f43f5e',
                    'button_text_color' => '#fb7185',
                    'button_style' => 'rounded',
                ],
                'is_published' => false,
            ])
            ->assertSessionHasErrors([
                'theme_settings.text_color',
                'theme_settings.button_text_color',
            ]);
    }

    public function test_visual_templates_are_visible_and_can_be_saved(): void
    {
        $this->withoutVite();
        $user = User::factory()->create(['username' => 'theme-user']);
        LinkPage::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('social-bio-links.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('theme_presets', 8)
                ->where('theme_presets.sunrise.label', 'Atelier')
                ->where('theme_presets.sunrise.category', 'Fashion')
                ->where('theme_presets.sunrise.settings.layout', 'editorial')
                ->where('theme_presets.midnight.label', 'Motion')
                ->where('theme_presets.midnight.settings.cover_image', '/images/link-page-templates/motion.jpg')
                ->where('theme_presets.ocean.label', 'Field Notes')
                ->where('theme_presets.royal.label', 'Frame')
            );

        foreach (array_keys(LinkPage::themePresets()) as $theme) {
            $this->actingAs($user)
                ->put(route('social-bio-links.update'), [
                    'theme' => $theme,
                    'theme_settings' => LinkPage::defaultThemeSettings($theme),
                    'is_published' => false,
                ])
                ->assertSessionHasNoErrors()
                ->assertRedirect();
        }

        $this->assertSame('royal', $user->linkPage()->firstOrFail()->theme);
    }

    public function test_additional_link_card_rejects_an_unknown_template(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        LinkPage::factory()->for($user)->primary()->create();

        $this->actingAs($user)
            ->post(route('social-bio-links.cards.store'), [
                'display_name' => 'Unknown Theme Card',
                'slug' => 'unknown-theme',
                'theme' => 'not-a-template',
            ])
            ->assertSessionHasErrors('theme');

        $this->assertDatabaseMissing('link_pages', [
            'user_id' => $user->id,
            'slug' => 'unknown-theme',
        ]);
    }

    public function test_user_can_create_update_delete_and_reorder_links(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $linkPage = LinkPage::factory()->for($user)->create();
        $firstLink = LinkPageLink::factory()->for($linkPage)->create(['sort_order' => 1]);

        $this->actingAs($user)
            ->post(route('social-bio-links.links.store'), [
                'title' => 'Newsletter',
                'url' => 'https://example.com/newsletter',
                'description' => 'Join the list',
                'icon' => 'sharechat',
                'is_active' => true,
                'starts_at' => '',
                'ends_at' => '',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $newLink = LinkPageLink::query()->where('title', 'Newsletter')->firstOrFail();
        $this->assertSame('sharechat', $newLink->icon);

        $this->actingAs($user)
            ->put(route('social-bio-links.links.update', $newLink), [
                'title' => 'Updated Newsletter',
                'url' => 'https://example.com/updated',
                'description' => '',
                'icon' => 'threads',
                'is_active' => false,
                'starts_at' => '',
                'ends_at' => '',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->actingAs($user)
            ->patch(route('social-bio-links.links.reorder'), [
                'links' => [$newLink->id, $firstLink->id],
            ])
            ->assertRedirect();

        $newLink->refresh();
        $firstLink->refresh();

        $this->assertSame('Updated Newsletter', $newLink->title);
        $this->assertSame('threads', $newLink->icon);
        $this->assertFalse($newLink->is_active);
        $this->assertSame(1, $newLink->sort_order);
        $this->assertSame(2, $firstLink->sort_order);

        $this->actingAs($user)
            ->delete(route('social-bio-links.links.destroy', $newLink))
            ->assertRedirect();

        $this->assertModelMissing($newLink);
    }

    public function test_user_can_create_additional_link_card_and_select_it(): void
    {
        $this->withoutVite();
        $user = User::factory()->create([
            'username' => 'card-owner',
        ]);
        LinkPage::factory()->for($user)->primary()->create([
            'display_name' => 'Main Card',
        ]);

        $this->actingAs($user)
            ->get(route('social-bio-links.cards.create'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/Edit')
                ->where('mode', 'create')
                ->where('link_page.id', null)
                ->where('link_page.username', 'card-owner')
                ->has('theme_presets', 8)
            );

        $response = $this->actingAs($user)
            ->post(route('social-bio-links.cards.store'), [
                'display_name' => 'Offers Card',
                'slug' => 'offers',
                'theme' => 'ocean',
            ]);

        $offersCard = LinkPage::query()
            ->where('user_id', $user->id)
            ->where('slug', 'offers')
            ->firstOrFail();

        $response->assertRedirect(route('social-bio-links.cards.edit', ['linkPage' => $offersCard->id]));
        $this->assertSame('ocean', $offersCard->theme);
        $this->assertSame('cinematic', $offersCard->theme_settings['layout']);
        $this->assertSame('/images/link-page-templates/field-notes.jpg', $offersCard->theme_settings['cover_image']);

        $this->actingAs($user)
            ->get(route('social-bio-links.cards.edit', ['linkPage' => $offersCard->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/Edit')
                ->where('link_page.id', $offersCard->id)
                ->where('link_page.display_name', 'Offers Card')
                ->has('theme_presets', 8)
            );
    }

    public function test_reorder_requires_complete_distinct_owned_link_set(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $linkPage = LinkPage::factory()->for($user)->create();
        $first = LinkPageLink::factory()->for($linkPage)->create(['sort_order' => 1]);
        $second = LinkPageLink::factory()->for($linkPage)->create(['sort_order' => 2]);

        $this->actingAs($user)
            ->patch(route('social-bio-links.links.reorder'), [
                'links' => [$second->id],
            ])
            ->assertStatus(422);

        $this->actingAs($user)
            ->patch(route('social-bio-links.links.reorder'), [
                'links' => [$first->id, $first->id],
            ])
            ->assertSessionHasErrors(['links.1']);

        $first->refresh();
        $second->refresh();

        $this->assertSame(1, $first->sort_order);
        $this->assertSame(2, $second->sort_order);
    }

    public function test_user_cannot_manage_another_users_link(): void
    {
        $this->withoutVite();
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $linkPage = LinkPage::factory()->for($owner)->create();
        $link = LinkPageLink::factory()->for($linkPage)->create();

        $this->actingAs($otherUser)
            ->delete(route('social-bio-links.links.destroy', $link))
            ->assertForbidden();
    }

    public function test_public_page_only_shows_published_active_scheduled_links(): void
    {
        $this->withoutVite();
        $user = User::factory()->create([
            'name' => 'Creator',
            'username' => 'creator',
            'bio' => 'Everything important in one place.',
            'avatar_url' => 'https://cdn.example.com/avatar.jpg',
        ]);
        $linkPage = LinkPage::factory()->published()->create([
            'user_id' => $user->id,
            'display_name' => 'Creator Main Card',
            'banner_url' => 'https://cdn.example.com/banner.jpg',
        ]);
        $visible = LinkPageLink::factory()->for($linkPage)->create([
            'title' => 'Visible Link',
            'is_active' => true,
            'sort_order' => 1,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
        ]);
        LinkPageLink::factory()->for($linkPage)->create(['title' => 'Inactive Link', 'is_active' => false, 'sort_order' => 2]);
        LinkPageLink::factory()->for($linkPage)->create(['title' => 'Future Link', 'sort_order' => 3, 'starts_at' => now()->addDay()]);
        LinkPageLink::factory()->for($linkPage)->create(['title' => 'Expired Link', 'sort_order' => 4, 'ends_at' => now()->subDay()]);

        $this->get(route('social-bio-links.public.show', ['username' => 'creator']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/PublicShow')
                ->where('link_page.username', 'creator')
                ->where('link_page.display_name', 'Creator Main Card')
                ->where('link_page.bio', 'Everything important in one place.')
                ->where('link_page.avatar_url', 'https://cdn.example.com/avatar.jpg')
                ->where('link_page.banner_url', 'https://cdn.example.com/banner.jpg')
                ->where('link_page.links.0.id', $visible->id)
                ->has('link_page.links', 1)
            );
    }

    public function test_public_pages_support_primary_and_slug_card_routes(): void
    {
        $this->withoutVite();
        $user = User::factory()->create([
            'name' => 'Creator',
            'username' => 'creator-cards',
        ]);

        $primaryPage = LinkPage::factory()->for($user)->primary()->published()->create([
            'slug' => 'main',
            'display_name' => 'Primary Card',
        ]);
        $secondaryPage = LinkPage::factory()->for($user)->create([
            'slug' => 'offers',
            'display_name' => 'Offers Card',
            'is_primary' => false,
            'is_published' => true,
            'published_at' => now(),
        ]);

        LinkPageLink::factory()->for($primaryPage)->create(['title' => 'Primary Link', 'sort_order' => 1]);
        LinkPageLink::factory()->for($secondaryPage)->create(['title' => 'Secondary Link', 'sort_order' => 1]);

        $this->get(route('social-bio-links.public.show', ['username' => 'creator-cards']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/PublicShow')
                ->where('link_page.slug', 'main')
                ->where('link_page.is_primary', true)
                ->where('link_page.display_name', 'Primary Card')
            );

        $this->get(route('social-bio-links.public.card.show', ['username' => 'creator-cards', 'slug' => 'offers']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/PublicShow')
                ->where('link_page.slug', 'offers')
                ->where('link_page.is_primary', false)
                ->where('link_page.display_name', 'Offers Card')
            );
    }

    public function test_public_page_receives_resolved_theme_settings_with_defaults(): void
    {
        $this->withoutVite();
        $user = User::factory()->create([
            'name' => 'Creator',
            'username' => 'creator-theme',
        ]);
        LinkPage::factory()->published()->create([
            'user_id' => $user->id,
            'theme' => 'sunrise',
            'theme_settings' => [
                'background_color' => '#123456',
            ],
        ]);

        $this->get(route('social-bio-links.public.show', ['username' => 'creator-theme']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/PublicShow')
                ->where('link_page.theme_settings.background_color', '#123456')
                ->where('link_page.theme_settings.text_color', '#35121e')
                ->where('link_page.theme_settings.button_background_color', '#6f1026')
                ->where('link_page.theme_settings.button_text_color', '#ffffff')
                ->where('link_page.theme_settings.button_style', 'rounded')
                ->where('link_page.theme_settings.layout', 'editorial')
                ->where('link_page.theme_settings.cover_image', '/images/link-page-templates/atelier.jpg')
            );
    }

    public function test_click_redirect_records_hashed_ip_without_raw_ip(): void
    {
        $this->withoutVite();
        $user = User::factory()->create(['username' => 'creator']);
        $linkPage = LinkPage::factory()->for($user)->published()->create();
        $link = LinkPageLink::factory()->for($linkPage)->create(['url' => 'https://example.com']);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->get(route('social-bio-links.public.redirect', ['username' => 'creator', 'link' => $link]))
            ->assertRedirect('https://example.com');

        $click = LinkClick::query()->firstOrFail();

        $this->assertSame($link->id, $click->link_page_link_id);
        $this->assertSame(hash_hmac('sha256', '203.0.113.10', (string) config('app.key')), $click->ip_hash);
        $this->assertNotSame('203.0.113.10', $click->ip_hash);
    }

    public function test_owner_can_upload_and_remove_banner(): void
    {
        $this->withoutVite();
        config(['filesystems.upload_disk' => 'public']);
        $this->useWritablePublicDisk();

        $user = User::factory()->create();
        LinkPage::factory()->for($user)->create(['banner_url' => null]);

        $this->actingAs($user)
            ->post(route('social-bio-links.banner.store'), [
                'banner' => UploadedFile::fake()->create('banner.png', 256, 'image/png'),
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $linkPage = $user->linkPage()->firstOrFail();

        $this->assertStringStartsWith('/storage/link-page-banners/', (string) $linkPage->banner_url);
        $storedPath = str_replace('/storage/', '', (string) $linkPage->banner_url);
        $this->assertTrue(Storage::disk('public')->exists($storedPath));

        $this->actingAs($user)
            ->delete(route('social-bio-links.banner.destroy'))
            ->assertRedirect();

        $linkPage->refresh();

        $this->assertNull($linkPage->banner_url);
        $this->assertFalse(Storage::disk('public')->exists($storedPath));
    }

    public function test_banner_upload_requires_an_image(): void
    {
        $this->withoutVite();
        config(['filesystems.upload_disk' => 'public']);
        $this->useWritablePublicDisk();

        $user = User::factory()->create();
        LinkPage::factory()->for($user)->create(['banner_url' => null]);

        $this->actingAs($user)
            ->post(route('social-bio-links.banner.store'), [
                'banner' => UploadedFile::fake()->create('banner.pdf', 64, 'application/pdf'),
            ])
            ->assertSessionHasErrors(['banner']);
    }

    public function test_user_can_create_list_update_toggle_and_delete_short_links(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        LinkPage::factory()->for($user)->primary()->create();

        $this->actingAs($user)
            ->post(route('social-bio-links.short-links.store'), [
                'title' => 'Launch Offer',
                'destination_url' => 'https://example.com/launch',
                'code' => 'launch',
                'description' => 'Campaign link',
                'is_active' => true,
                'starts_at' => '',
                'ends_at' => '',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('social-bio-links.linkshort'));

        $shortLink = ShortLink::query()->where('code', 'launch')->firstOrFail();

        $this->actingAs($user)
            ->get(route('social-bio-links.linkshort'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/Show')
                ->where('active_tab', 'linkshort')
                ->where('short_links.0.code', 'launch')
                ->where('short_link_summary.total_links', 1)
                ->where('short_link_summary.active_links', 1)
            );

        $this->actingAs($user)
            ->put(route('social-bio-links.short-links.update', $shortLink), [
                'title' => 'Updated Offer',
                'destination_url' => 'https://example.com/updated',
                'code' => 'updated-offer',
                'description' => '',
                'is_active' => false,
                'starts_at' => '',
                'ends_at' => '',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $shortLink->refresh();

        $this->assertSame('Updated Offer', $shortLink->title);
        $this->assertSame('updated-offer', $shortLink->code);
        $this->assertFalse($shortLink->is_active);

        $this->actingAs($user)
            ->patch(route('social-bio-links.short-links.toggle', $shortLink))
            ->assertRedirect();

        $shortLink->refresh();
        $this->assertTrue($shortLink->is_active);

        $this->actingAs($user)
            ->delete(route('social-bio-links.short-links.destroy', $shortLink))
            ->assertRedirect(route('social-bio-links.linkshort'));

        $this->assertModelMissing($shortLink);
    }

    public function test_short_link_alias_and_destination_validation(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        ShortLink::factory()->for($user)->create(['code' => 'taken']);

        $this->actingAs($user)
            ->post(route('social-bio-links.short-links.store'), [
                'title' => 'Duplicate',
                'destination_url' => 'https://example.com',
                'code' => 'taken',
                'is_active' => true,
            ])
            ->assertSessionHasErrors(['code']);

        $this->actingAs($user)
            ->post(route('social-bio-links.short-links.store'), [
                'title' => 'Unsafe',
                'destination_url' => 'javascript:alert(1)',
                'code' => 'safe-code',
                'is_active' => true,
            ])
            ->assertSessionHasErrors(['destination_url']);

        $this->actingAs($user)
            ->post(route('social-bio-links.short-links.store'), [
                'title' => 'Reserved',
                'destination_url' => 'https://example.com',
                'code' => 'admin',
                'is_active' => true,
            ])
            ->assertSessionHasErrors(['code']);
    }

    public function test_short_link_auto_generates_unique_code(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('social-bio-links.short-links.store'), [
                'title' => 'Generated',
                'destination_url' => 'https://example.com/generated',
                'code' => '',
                'is_active' => true,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('social-bio-links.linkshort'));

        $shortLink = ShortLink::query()->firstOrFail();

        $this->assertNotSame('', $shortLink->code);
        $this->assertNotContains($shortLink->code, ShortLink::reservedCodes());
    }

    public function test_public_short_link_redirect_records_click_metadata(): void
    {
        $this->withoutVite();
        $shortLink = ShortLink::factory()->create([
            'code' => 'launch',
            'destination_url' => 'https://example.com/launch',
        ]);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->withHeader('referer', 'https://referrer.example.com/post')
            ->get(route('short-links.redirect', ['shortLink' => 'launch']))
            ->assertRedirect('https://example.com/launch');

        $click = ShortLinkClick::query()->firstOrFail();

        $this->assertSame($shortLink->id, $click->short_link_id);
        $this->assertSame('https://referrer.example.com/post', $click->referrer);
        $this->assertSame(hash_hmac('sha256', '203.0.113.10', (string) config('app.key')), $click->ip_hash);
        $this->assertNotSame('203.0.113.10', $click->ip_hash);
    }

    public function test_public_short_link_respects_active_state_and_schedule(): void
    {
        $this->withoutVite();
        ShortLink::factory()->create(['code' => 'inactive', 'is_active' => false]);
        ShortLink::factory()->create(['code' => 'future', 'starts_at' => now()->addDay()]);
        ShortLink::factory()->create(['code' => 'expired', 'ends_at' => now()->subDay()]);

        foreach (['inactive', 'future', 'expired', 'missing'] as $code) {
            $this->get(route('short-links.redirect', ['shortLink' => $code]))
                ->assertNotFound();
        }

        $this->assertDatabaseCount('short_link_clicks', 0);
    }

    public function test_user_cannot_manage_another_users_short_link(): void
    {
        $this->withoutVite();
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $shortLink = ShortLink::factory()->for($owner)->create();

        $this->actingAs($otherUser)
            ->get(route('social-bio-links.short-links.show', $shortLink))
            ->assertForbidden();
    }

    public function test_short_link_detail_page_exposes_analytics_for_owner(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $shortLink = ShortLink::factory()->for($user)->create([
            'title' => 'Analytics Link',
            'code' => 'analytics',
        ]);

        ShortLinkClick::factory()->for($shortLink)->create([
            'clicked_at' => now()->subDay(),
            'referrer' => 'https://instagram.com',
            'ip_hash' => 'same-hash',
        ]);
        ShortLinkClick::factory()->for($shortLink)->create([
            'clicked_at' => now(),
            'referrer' => null,
            'ip_hash' => 'same-hash',
        ]);

        $this->actingAs($user)
            ->get(route('social-bio-links.short-links.show', $shortLink))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LinkPage/ShortLinkShow')
                ->where('short_link.code', 'analytics')
                ->where('short_link.title', 'Analytics Link')
                ->where('analytics.total_clicks', 2)
                ->where('analytics.unique_visitors', 1)
                ->has('analytics.daily_clicks', 30)
                ->has('analytics.top_referrers', 2)
                ->has('analytics.recent_clicks', 2)
            );
    }

    private function useWritablePublicDisk(): void
    {
        $root = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'viralyzer-link-page-test-'.Str::uuid();

        config([
            'filesystems.disks.public.root' => $root,
            'filesystems.disks.public.url' => '/storage',
            'filesystems.disks.public.throw' => true,
        ]);

        $this->beforeApplicationDestroyed(function () use ($root): void {
            if (str_starts_with($root, rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR))) {
                (new Filesystem)->deleteDirectory($root);
            }
        });
    }
}
