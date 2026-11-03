<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WatchlistNavigationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_from_watchlists_index(): void
    {
        $this->withoutVite();

        $this->get(route('watchlists.index'))
            ->assertRedirect('/login');
    }

    public function test_authenticated_user_can_view_all_watchlists_index(): void
    {
        $this->withoutVite();

        $user = User::factory()->create();
        $user->watchlists()->create([
            'name' => 'Top Creators',
            'description' => 'Track main competitors',
            'is_favorite' => true,
        ]);
        $user->watchlists()->create([
            'name' => 'Emerging Accounts',
            'description' => null,
            'is_favorite' => false,
        ]);

        $this->actingAs($user)
            ->get(route('watchlists.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Watchlists/Index')
                ->has('watchlists', 2)
            );
    }
}
