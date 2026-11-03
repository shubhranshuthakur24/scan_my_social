<?php

use App\Models\User;
use Razorpay\Api\Api;

// Setup mock user
$user = User::first();
if (! $user) {
    echo "No user found\n";
    exit;
}

$api = new Api(config('services.razorpay.key'), config('services.razorpay.secret'));

$plans = ['starter', 'pro', 'creator', 'pro_yearly', 'creator_yearly'];

foreach ($plans as $planType) {
    echo "Testing plan: $planType\n";

    $planId = match ($planType) {
        'starter' => config('services.razorpay.starter_plan_id'),
        'creator_yearly' => config('services.razorpay.creator_yearly_plan_id') ?? config('services.razorpay.creator_plan_id'),
        'pro_yearly' => config('services.razorpay.pro_yearly_plan_id') ?? config('services.razorpay.pro_plan_id'),
        'creator' => config('services.razorpay.creator_plan_id'),
        'pro' => config('services.razorpay.pro_plan_id'),
        default => null,
    };

    if (! $planId) {
        echo "No plan ID for $planType\n";

        continue;
    }

    $payload = [
        'plan_id' => $planId,
        'customer_notify' => 1,
        'total_count' => str_ends_with($planType, '_yearly') ? 10 : 120,
        'notes' => [
            'user_id' => (string) $user->id,
            'plan' => $planType,
        ],
    ];

    if ($planType === 'starter' && ! $user->has_claimed_free) {
        $payload['start_at'] = now()->addDays(14)->timestamp;
    }

    try {
        echo 'Payload: '.json_encode($payload)."\n";
        $subscription = $api->subscription->create($payload);
        echo 'Success: '.$subscription->id."\n";
    } catch (Exception $e) {
        echo "Error for $planType: ".$e->getMessage()."\n";
    }
    echo "-------------------\n";
}
