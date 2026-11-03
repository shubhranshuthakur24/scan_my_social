<?php

namespace Tests\Feature;

use App\Models\AutomationFlow;
use App\Models\InstagramAccount;
use App\Models\InstagramAccountMediaAnalytics;
use App\Models\User;
use App\Services\MetaApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class InstagramProfileApiFilterTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected InstagramAccount $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->account = InstagramAccount::factory()->for($this->user)->create([
            'status' => 'active',
            'username' => 'testuser',
        ]);

        $mockMetaApi = Mockery::mock(MetaApiService::class);
        $mockMetaApi->shouldReceive('fetchUserProfile')->andReturn(['success' => false]);
        $this->app->instance(MetaApiService::class, $mockMetaApi);
    }

    public function test_can_filter_profile_media_by_format(): void
    {
        // 1 Image post
        InstagramAccountMediaAnalytics::create([
            'user_id' => $this->user->id,
            'instagram_account_id' => $this->account->id,
            'instagram_media_id' => 'img_1',
            'media_type' => 'IMAGE',
            'format' => 'post',
            'caption' => 'Photo post',
            'likes' => 10,
            'posted_at' => now(),
        ]);

        // 1 Reel
        InstagramAccountMediaAnalytics::create([
            'user_id' => $this->user->id,
            'instagram_account_id' => $this->account->id,
            'instagram_media_id' => 'reel_1',
            'media_type' => 'VIDEO',
            'format' => 'reel',
            'caption' => 'Reel post',
            'likes' => 20,
            'posted_at' => now(),
        ]);

        $resAll = $this->actingAs($this->user)->getJson("/api/v1/instagram/profile?instagram_account_id={$this->account->id}&format=all");
        $resAll->assertOk();
        $this->assertCount(2, $resAll->json('posts'));

        $resImage = $this->actingAs($this->user)->getJson("/api/v1/instagram/profile?instagram_account_id={$this->account->id}&format=post");
        $resImage->assertOk();
        $this->assertCount(1, $resImage->json('posts'));
        $this->assertEquals('img_1', $resImage->json('posts.0.id'));

        $resReel = $this->actingAs($this->user)->getJson("/api/v1/instagram/profile?instagram_account_id={$this->account->id}&format=reel");
        $resReel->assertOk();
        $this->assertCount(1, $resReel->json('posts'));
        $this->assertEquals('reel_1', $resReel->json('posts.0.id'));
    }

    public function test_can_filter_profile_media_by_autodm_state(): void
    {
        InstagramAccountMediaAnalytics::create([
            'user_id' => $this->user->id,
            'instagram_account_id' => $this->account->id,
            'instagram_media_id' => 'media_with_autodm',
            'media_type' => 'IMAGE',
            'format' => 'post',
            'posted_at' => now(),
        ]);

        InstagramAccountMediaAnalytics::create([
            'user_id' => $this->user->id,
            'instagram_account_id' => $this->account->id,
            'instagram_media_id' => 'media_without_autodm',
            'media_type' => 'IMAGE',
            'format' => 'post',
            'posted_at' => now(),
        ]);

        AutomationFlow::create([
            'user_id' => $this->user->id,
            'instagram_account_id' => $this->account->id,
            'trigger_type' => 'keywords',
            'trigger_value' => 'media_with_autodm',
            'status' => 'active',
            'name' => 'AutoDM flow',
        ]);

        $resActive = $this->actingAs($this->user)->getJson("/api/v1/instagram/profile?instagram_account_id={$this->account->id}&autodm=active");
        $resActive->assertOk();
        $this->assertCount(1, $resActive->json('posts'));
        $this->assertEquals('media_with_autodm', $resActive->json('posts.0.id'));

        $resNone = $this->actingAs($this->user)->getJson("/api/v1/instagram/profile?instagram_account_id={$this->account->id}&autodm=none");
        $resNone->assertOk();
        $this->assertCount(1, $resNone->json('posts'));
        $this->assertEquals('media_without_autodm', $resNone->json('posts.0.id'));
    }

    public function test_can_filter_profile_media_by_date_range(): void
    {
        InstagramAccountMediaAnalytics::create([
            'user_id' => $this->user->id,
            'instagram_account_id' => $this->account->id,
            'instagram_media_id' => 'recent_media',
            'media_type' => 'IMAGE',
            'format' => 'post',
            'posted_at' => now()->subDays(2),
        ]);

        InstagramAccountMediaAnalytics::create([
            'user_id' => $this->user->id,
            'instagram_account_id' => $this->account->id,
            'instagram_media_id' => 'old_media',
            'media_type' => 'IMAGE',
            'format' => 'post',
            'posted_at' => now()->subDays(40),
        ]);

        $res7Days = $this->actingAs($this->user)->getJson("/api/v1/instagram/profile?instagram_account_id={$this->account->id}&date_preset=last_7_days");
        $res7Days->assertOk();
        $this->assertCount(1, $res7Days->json('posts'));
        $this->assertEquals('recent_media', $res7Days->json('posts.0.id'));

        $resAll = $this->actingAs($this->user)->getJson("/api/v1/instagram/profile?instagram_account_id={$this->account->id}&date_preset=all_time");
        $resAll->assertOk();
        $this->assertCount(2, $resAll->json('posts'));
    }
}
