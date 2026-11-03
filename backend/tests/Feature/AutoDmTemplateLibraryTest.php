<?php

namespace Tests\Feature;

use App\Models\AutoDmTemplateUseCase;
use App\Models\InstagramAccount;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AutoDmTemplateLibraryTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_page_exposes_db_backed_template_catalog(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-template-catalog-1',
            'fb_page_id' => 'page-template-catalog-1',
            'username' => 'templatelibrary',
            'access_token' => 'token-template-catalog',
            'status' => 'active',
        ]);

        Cache::put("autodm:live-profile-picture-url:{$account->id}", 'https://example.com/avatar.jpg', now()->addMinutes(15));

        $response = $this->actingAs($user)->get(route('autodm.create'));

        $response->assertInertia(fn (Assert $page) => $page
            ->component('AutoDM/Create')
            ->has('autodm_templates.use_cases', 10)
            ->has('autodm_templates.templates', 10)
            ->where('autodm_templates.templates.0.is_system', true)
        );
    }

    public function test_user_can_save_personal_template(): void
    {
        $user = User::factory()->create();
        $useCase = AutoDmTemplateUseCase::query()->where('slug', 'pricing-inquiry')->firstOrFail();

        $response = $this->actingAs($user)->post(route('autodm.templates.store'), [
            'use_case_id' => $useCase->id,
            'title' => 'My Personal Pricing Template',
            'name' => 'Pricing Personal',
            'badge' => 'Personal',
            'description' => 'Personal pricing reply flow.',
            'trigger_type' => 'post',
            'content_source' => 'media',
            'keywords' => ['pricing', 'plans'],
            'reply_messages' => [
                [
                    'message_text' => 'Here is pricing: https://example.com/pricing',
                    'media_url' => '',
                ],
            ],
            'opening_message_enabled' => false,
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Check your inbox.'],
            'public_reply_limit_enabled' => true,
            'public_reply_limit_count' => 200,
            'ask_to_follow_enabled' => false,
            'reminder_enabled' => false,
            'is_default' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('autodm_templates', [
            'created_by' => $user->id,
            'is_system' => 0,
            'use_case_id' => $useCase->id,
            'title' => 'My Personal Pricing Template',
            'name' => 'Pricing Personal',
            'trigger_type' => 'post',
            'content_source' => 'media',
        ]);
    }

    public function test_non_super_admin_cannot_save_system_template(): void
    {
        $user = User::factory()->create();
        $useCase = AutoDmTemplateUseCase::query()->where('slug', 'service-details')->firstOrFail();

        $response = $this->actingAs($user)->post(route('autodm.templates.store'), [
            'use_case_id' => $useCase->id,
            'title' => 'System Service Template',
            'name' => 'System Service',
            'trigger_type' => 'post',
            'content_source' => 'media',
            'keywords' => ['service'],
            'reply_messages' => [
                [
                    'message_text' => 'Service details: https://example.com/service',
                    'media_url' => '',
                ],
            ],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Sent in DM.'],
            'is_system' => true,
        ]);

        $response->assertForbidden();
    }

    public function test_super_admin_can_save_system_template(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::SuperAdmin,
        ]);
        $useCase = AutoDmTemplateUseCase::query()->where('slug', 'dm-keyword-campaign')->firstOrFail();

        $response = $this->actingAs($admin)->post(route('autodm.templates.store'), [
            'use_case_id' => $useCase->id,
            'title' => 'System Campaign Template',
            'name' => 'System Campaign',
            'trigger_type' => 'post',
            'content_source' => 'media',
            'keywords' => ['campaign'],
            'reply_messages' => [
                [
                    'message_text' => 'Campaign details: https://example.com/campaign',
                    'media_url' => '',
                ],
            ],
            'public_reply_enabled' => true,
            'public_comment_reply' => ['Done, sent in DM.'],
            'is_system' => true,
            'is_default' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('autodm_templates', [
            'created_by' => $admin->id,
            'is_system' => 1,
            'use_case_id' => $useCase->id,
            'title' => 'System Campaign Template',
        ]);
    }
}
