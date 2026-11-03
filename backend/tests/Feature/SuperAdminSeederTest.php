<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use App\Services\PlanService;
use App\UserRole;
use Database\Seeders\SuperAdminPlanSeeder;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SuperAdminSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        $this->setEnv('SUPER_ADMIN_NAME', null);
        $this->setEnv('SUPER_ADMIN_EMAIL', null);
        $this->setEnv('SUPER_ADMIN_PASSWORD', null);
        $this->setEnv('SUPER_ADMIN_PLAN', null);

        parent::tearDown();
    }

    public function test_it_seeds_or_updates_super_admin_from_environment_values(): void
    {
        $testPassword = 'not-a-real-secret-test-password';

        $this->setEnv('SUPER_ADMIN_NAME', 'Scan My Social Admin');
        $this->setEnv('SUPER_ADMIN_EMAIL', 'admin@scanmysocial.com');
        $this->setEnv('SUPER_ADMIN_PASSWORD', $testPassword);

        app(SuperAdminSeeder::class)->run();
        app(SuperAdminSeeder::class)->run();

        $this->assertSame(1, User::query()->where('email', 'admin@scanmysocial.com')->count());

        $admin = User::query()->where('email', 'admin@scanmysocial.com')->first();

        $this->assertNotNull($admin);
        $this->assertSame(UserRole::SuperAdmin, $admin->role);
        $this->assertSame('Scan My Social Admin', $admin->name);
        $this->assertTrue(Hash::check($testPassword, (string) $admin->password));
        $this->assertNotNull($admin->email_verified_at);
    }

    public function test_it_skips_when_email_or_password_are_missing(): void
    {
        $this->setEnv('SUPER_ADMIN_NAME', 'Scan My Social Admin');
        $this->setEnv('SUPER_ADMIN_EMAIL', 'seeded-super-admin@example.com');
        $this->setEnv('SUPER_ADMIN_PASSWORD', '');

        app(SuperAdminSeeder::class)->run();

        $this->assertDatabaseMissing('users', [
            'email' => 'seeded-super-admin@example.com',
        ]);
    }

    public function test_it_seeds_an_active_fake_plan_for_the_super_admin(): void
    {
        $this->setEnv('SUPER_ADMIN_NAME', 'Scan My Social Admin');
        $this->setEnv('SUPER_ADMIN_EMAIL', 'admin@scanmysocial.com');
        $this->setEnv('SUPER_ADMIN_PASSWORD', 'not-a-real-secret-test-password');

        app(SuperAdminSeeder::class)->run();
        app(SuperAdminPlanSeeder::class)->run();
        app(SuperAdminPlanSeeder::class)->run();

        $admin = User::query()->where('email', 'admin@scanmysocial.com')->firstOrFail();
        $subscriptionId = 'seeded_super_admin_'.$admin->id;

        $this->assertSame(1, Subscription::query()->where('razorpay_id', $subscriptionId)->count());
        $this->assertSame('creator_yearly', PlanService::activePlan($admin));
        $this->assertSame('creator', PlanService::activePlanTier($admin));
        $this->assertTrue(PlanService::hasActivePaidPlan($admin));
        $this->assertSame(PlanService::monthlyCreditAllowanceForPlan('creator_yearly'), (int) $admin->fresh()->credits);

        $subscription = Subscription::query()->where('razorpay_id', $subscriptionId)->firstOrFail();

        $this->assertSame($admin->id, $subscription->user_id);
        $this->assertSame('creator_yearly', $subscription->name);
        $this->assertSame('seeded_creator_yearly', $subscription->razorpay_plan_id);
        $this->assertSame('active', $subscription->status);
        $this->assertNull($subscription->ends_at);
        $this->assertNotNull($subscription->next_credit_reset_at);
        $this->assertTrue($subscription->next_credit_reset_at->isFuture());
    }

    private function setEnv(string $key, ?string $value): void
    {
        if ($value === null) {
            putenv($key);
            unset($_ENV[$key], $_SERVER[$key]);

            return;
        }

        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}
