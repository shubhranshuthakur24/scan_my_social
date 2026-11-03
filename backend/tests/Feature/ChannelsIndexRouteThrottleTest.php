<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChannelsIndexRouteThrottleTest extends TestCase
{
    use RefreshDatabase;

    public function test_channels_index_is_not_throttled_for_authenticated_users(): void
    {
        $user = User::factory()->create();
        $response = null;

        for ($i = 0; $i < 65; $i++) {
            $response = $this->actingAs($user)->getJson('/api/channels');
        }

        $response->assertOk();
    }
}
