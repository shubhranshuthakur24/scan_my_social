<?php

namespace Tests\Feature;

use App\Models\AutomationFlow;
use App\Models\InstagramAccount;
use App\Models\InstagramAccountMediaAnalytics;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutomationFlowMediaAnalyticsRelationshipTest extends TestCase
{
    use RefreshDatabase;

    public function test_story_trigger_flow_belongs_to_matching_media_analytics(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        $analytics = InstagramAccountMediaAnalytics::factory()
            ->for($user)
            ->for($account)
            ->create([
                'instagram_media_id' => 'story-media-relationship-1',
            ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Story Linked Flow',
            'trigger_type' => 'story',
            'trigger_value' => 'story-media-relationship-1',
            'status' => 'active',
        ]);

        $this->assertTrue($flow->triggerMediaAnalytics()->exists());
        $this->assertSame($analytics->id, $flow->triggerMediaAnalytics?->id);
        $this->assertSame($flow->id, $analytics->automationFlow?->id);
    }

    public function test_media_analytics_can_exist_without_linked_automation_flow(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::factory()->for($user)->create();

        $analytics = InstagramAccountMediaAnalytics::factory()
            ->for($user)
            ->for($account)
            ->create([
                'instagram_media_id' => 'no-flow-media-relationship-1',
            ]);

        $this->assertNull($analytics->automationFlow);
    }
}
