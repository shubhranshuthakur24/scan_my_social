<?php

namespace Tests\Unit;

use App\Http\Controllers\SubscriptionController;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use ReflectionClass;
use Tests\TestCase;

class SubscriptionControllerStarterRoutingTest extends TestCase
{
    use RefreshDatabase;

    public function test_starter_checkout_uses_paid_plan_for_trial_eligible_user(): void
    {
        config([
            'services.razorpay.starter_plan_id' => 'plan_starter_paid',
        ]);

        $controller = $this->makeControllerWithoutConstructor();
        $user = new User;
        $user->has_claimed_free = false;

        $planId = $this->invokePrivate($controller, 'resolveCheckoutPlanId', ['starter']);

        $this->assertSame('plan_starter_paid', $planId);
    }

    public function test_starter_checkout_uses_paid_plan_for_trial_consumed_user(): void
    {
        config([
            'services.razorpay.starter_plan_id' => 'plan_starter_paid',
        ]);

        $controller = $this->makeControllerWithoutConstructor();
        $user = new User;
        $user->has_claimed_free = true;

        $planId = $this->invokePrivate($controller, 'resolveCheckoutPlanId', ['starter']);

        $this->assertSame('plan_starter_paid', $planId);
    }

    public function test_starter_yearly_checkout_uses_yearly_plan_id(): void
    {
        config([
            'services.razorpay.starter_plan_id' => 'plan_starter_paid',
            'services.razorpay.starter_yearly_plan_id' => 'plan_starter_yearly_paid',
        ]);

        $controller = $this->makeControllerWithoutConstructor();

        $planId = $this->invokePrivate($controller, 'resolveCheckoutPlanId', ['starter_yearly']);

        $this->assertSame('plan_starter_yearly_paid', $planId);
    }

    public function test_starter_trial_start_at_is_set_for_trial_eligible_user(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-18 10:00:00'));

        try {
            $controller = $this->makeControllerWithoutConstructor();
            $user = new User;
            $user->has_claimed_free = false;

            $startAt = $this->invokePrivate($controller, 'resolveTrialStartAt', ['starter', $user]);

            $this->assertSame(now()->addDays(14)->timestamp, $startAt);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_starter_trial_start_at_is_not_set_for_trial_consumed_user(): void
    {
        $controller = $this->makeControllerWithoutConstructor();
        $user = new User;
        $user->has_claimed_free = true;

        $startAt = $this->invokePrivate($controller, 'resolveTrialStartAt', ['starter', $user]);

        $this->assertNull($startAt);
    }

    public function test_plan_id_resolution_maps_starter_plan_id_to_starter(): void
    {
        config([
            'services.razorpay.starter_plan_id' => 'plan_starter_paid',
        ]);

        $controller = $this->makeControllerWithoutConstructor();

        $this->assertSame(
            'starter',
            $this->invokePrivate($controller, 'resolvePlanNameFromPlanId', ['plan_starter_paid'])
        );
    }

    public function test_plan_id_resolution_maps_starter_yearly_plan_id_to_starter_yearly(): void
    {
        config([
            'services.razorpay.starter_yearly_plan_id' => 'plan_starter_yearly_paid',
        ]);

        $controller = $this->makeControllerWithoutConstructor();

        $this->assertSame(
            'starter_yearly',
            $this->invokePrivate($controller, 'resolvePlanNameFromPlanId', ['plan_starter_yearly_paid'])
        );
    }

    public function test_verification_context_prefers_checkout_state_values_over_notes(): void
    {
        $controller = $this->makeControllerWithoutConstructor();
        $subscriptionDetails = (object) [
            'notes' => (object) [
                'user_id' => 777,
                'plan' => 'pro',
            ],
        ];

        $context = $this->invokePrivate($controller, 'resolveVerificationContext', [
            ['user_id' => 42, 'plan' => 'starter_yearly'],
            $subscriptionDetails,
            99,
        ]);

        $this->assertSame(['user_id' => 42, 'plan' => 'starter_yearly'], $context);
    }

    public function test_verification_context_uses_subscription_notes_when_checkout_state_is_missing(): void
    {
        $controller = $this->makeControllerWithoutConstructor();
        $subscriptionDetails = (object) [
            'notes' => (object) [
                'user_id' => 55,
                'plan' => 'creator_yearly',
            ],
        ];

        $context = $this->invokePrivate($controller, 'resolveVerificationContext', [
            null,
            $subscriptionDetails,
            null,
        ]);

        $this->assertSame(['user_id' => 55, 'plan' => 'creator_yearly'], $context);
    }

    public function test_verification_context_uses_local_owner_when_checkout_and_notes_are_missing(): void
    {
        $controller = $this->makeControllerWithoutConstructor();
        $subscriptionDetails = (object) [
            'notes' => null,
        ];

        $context = $this->invokePrivate($controller, 'resolveVerificationContext', [
            null,
            $subscriptionDetails,
            18,
        ]);

        $this->assertSame(['user_id' => 18, 'plan' => ''], $context);
    }

    public function test_customer_id_resolution_returns_existing_razorpay_customer_id_without_api_call(): void
    {
        $controller = $this->makeControllerWithoutConstructor();
        $user = new User;
        $user->razorpay_customer_id = 'cust_existing_123';

        $api = (object) [
            'customer' => new class
            {
                public function create(array $payload): object
                {
                    throw new \RuntimeException('Customer create should not be called when customer id already exists.');
                }
            },
        ];
        $this->setPrivateProperty($controller, 'api', $api);

        $customerId = $this->invokePrivate($controller, 'resolveOrCreateRazorpayCustomerId', [$user]);

        $this->assertSame('cust_existing_123', $customerId);
    }

    public function test_customer_id_resolution_creates_customer_when_missing(): void
    {
        $controller = $this->makeControllerWithoutConstructor();
        $user = User::factory()->create([
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'affiliate_contact' => '+91 98765-43210',
            'razorpay_customer_id' => null,
        ]);

        $customerResource = new class
        {
            /** @var array<string, mixed>|null */
            public ?array $capturedPayload = null;

            public function create(array $payload): object
            {
                $this->capturedPayload = $payload;

                return (object) ['id' => 'cust_new_456'];
            }
        };

        $this->setPrivateProperty($controller, 'api', (object) ['customer' => $customerResource]);

        $customerId = $this->invokePrivate($controller, 'resolveOrCreateRazorpayCustomerId', [$user]);
        $user->refresh();

        $this->assertSame('cust_new_456', $customerId);
        $this->assertSame('cust_new_456', $user->razorpay_customer_id);
        $this->assertSame('Jane Doe', $customerResource->capturedPayload['name']);
        $this->assertSame('jane@example.com', $customerResource->capturedPayload['email']);
        $this->assertSame('919876543210', $customerResource->capturedPayload['contact']);
        $this->assertSame('0', $customerResource->capturedPayload['fail_existing']);
    }

    private function makeControllerWithoutConstructor(): SubscriptionController
    {
        $reflection = new ReflectionClass(SubscriptionController::class);

        /** @var SubscriptionController $controller */
        $controller = $reflection->newInstanceWithoutConstructor();

        return $controller;
    }

    /**
     * @param  array<int, mixed>  $arguments
     */
    private function invokePrivate(object $instance, string $method, array $arguments = []): mixed
    {
        $reflection = new ReflectionClass($instance);
        $methodReflection = $reflection->getMethod($method);
        $methodReflection->setAccessible(true);

        return $methodReflection->invokeArgs($instance, $arguments);
    }

    private function setPrivateProperty(object $instance, string $property, mixed $value): void
    {
        $reflection = new ReflectionClass($instance);
        $propertyReflection = $reflection->getProperty($property);
        $propertyReflection->setAccessible(true);
        $propertyReflection->setValue($instance, $value);
    }
}
