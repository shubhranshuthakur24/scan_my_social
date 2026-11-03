<?php

namespace Tests\Feature;

use App\Models\InstagramAccount;
use App\Models\User;
use App\Services\PlanService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstagramAccountPlanCapTest extends TestCase
{
    use RefreshDatabase;

    public function test_instagram_account_limits_match_paid_tiers(): void
    {
        $starter = User::factory()->create();
        $starter->subscriptions()->create([
            'name' => 'starter',
            'status' => 'active',
            'razorpay_id' => 'sub-starter-limit',
            'razorpay_plan_id' => 'plan_starter_limit',
        ]);

        $pro = User::factory()->create();
        $pro->subscriptions()->create([
            'name' => 'pro',
            'status' => 'active',
            'razorpay_id' => 'sub-pro-limit',
            'razorpay_plan_id' => 'plan_pro_limit',
        ]);

        $creator = User::factory()->create();
        $creator->subscriptions()->create([
            'name' => 'creator',
            'status' => 'active',
            'razorpay_id' => 'sub-creator-limit',
            'razorpay_plan_id' => 'plan_creator_limit',
        ]);

        $this->assertSame(1, PlanService::instagramAccountLimit($starter));
        $this->assertSame(2, PlanService::instagramAccountLimit($pro));
        $this->assertSame(5, PlanService::instagramAccountLimit($creator));
    }

    public function test_user_without_active_paid_plan_cannot_connect_new_instagram_account(): void
    {
        $user = User::factory()->create();

        $this->assertFalse(PlanService::hasActivePaidPlan($user));
        $this->assertFalse(PlanService::canConnectMoreInstagramAccounts($user));
        $this->assertFalse(PlanService::canConnectInstagramAccount($user, 'ig-new-1'));
    }

    public function test_starter_user_at_cap_can_reconnect_existing_but_not_add_new_account(): void
    {
        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'starter',
            'status' => 'active',
            'razorpay_id' => 'sub-starter-reconnect',
            'razorpay_plan_id' => 'plan_starter_reconnect',
        ]);

        InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-existing-1',
            'fb_page_id' => 'page-existing-1',
            'access_token' => 'token-existing-1',
            'status' => 'active',
        ]);

        $this->assertSame(1, PlanService::connectedInstagramAccountsCount($user));
        $this->assertFalse(PlanService::canConnectMoreInstagramAccounts($user));
        $this->assertTrue(PlanService::canConnectInstagramAccount($user, 'ig-existing-1'));
        $this->assertFalse(PlanService::canConnectInstagramAccount($user, 'ig-new-2'));
    }

    public function test_pro_user_can_connect_second_account_when_one_is_already_connected(): void
    {
        $user = User::factory()->create();
        $user->subscriptions()->create([
            'name' => 'pro',
            'status' => 'active',
            'razorpay_id' => 'sub-pro-cap',
            'razorpay_plan_id' => 'plan_pro_cap',
        ]);

        InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig-pro-1',
            'fb_page_id' => 'page-pro-1',
            'access_token' => 'token-pro-1',
            'status' => 'active',
        ]);

        $this->assertTrue(PlanService::canConnectInstagramAccount($user, 'ig-pro-2'));
    }
}
