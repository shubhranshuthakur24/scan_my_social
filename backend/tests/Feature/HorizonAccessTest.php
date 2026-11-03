<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HorizonAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_view_horizon_dashboard(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)->get('/horizon');

        $response->assertOk();
    }

    public function test_regular_user_cannot_view_horizon_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/horizon');

        $response->assertForbidden();
    }
}
