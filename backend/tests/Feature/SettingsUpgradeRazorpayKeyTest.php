<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SettingsUpgradeRazorpayKeyTest extends TestCase
{
    use RefreshDatabase;

    public function test_upgrade_page_receives_runtime_razorpay_key_prop(): void
    {
        config(['services.razorpay.key' => 'rzp_test_runtime_key']);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('settings.upgrade'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Settings/Upgrade')
                ->where('razorpayKey', 'rzp_test_runtime_key')
            );
    }
}
