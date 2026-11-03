<?php

use App\Models\Subscription;
use App\Models\User;

// Setup test data
$referrer = User::factory()->create(['wallet_balance' => 0]);
$referee = User::factory()->create(['referred_by_id' => $referrer->id]);

// Test Case 1: Monthly Plan (₹999)
echo "Testing Monthly Plan (20%)...\n";
$monthlySub = Subscription::create([
    'user_id' => $referee->id,
    'name' => 'creator',
    'razorpay_id' => 'sub_monthly_test_'.uniqid(),
    'razorpay_plan_id' => 'plan_999',
    'status' => 'active',
]);

$payload = [
    'payload' => [
        'payment' => [
            'entity' => [
                'amount' => 99900, // ₹999 in Paisa
                'id' => 'pay_monthly_'.uniqid(),
            ],
        ],
    ],
];

// Replicate logic
$isYearly = str_ends_with($monthlySub->name, '_yearly');
$percentage = $isYearly
    ? config('services.razorpay.referral_reward_yearly_percent', 15)
    : config('services.razorpay.referral_reward_monthly_percent', 20);
$paymentAmount = (int) $payload['payload']['payment']['entity']['amount'];
$rewardPaisa = (int) ($paymentAmount * ($percentage / 100));

echo 'Plan: '.$monthlySub->name."\n";
echo 'Payment: ₹'.($paymentAmount / 100)."\n";
echo 'Percentage: '.$percentage."%\n";
echo 'Calculated Reward: ₹'.($rewardPaisa / 100).' ('.$rewardPaisa." Paisa)\n";

if ($rewardPaisa === 19980) { // 20% of 99900 = 19980
    echo "✅ Monthly Reward Correct!\n";
} else {
    echo "❌ Monthly Reward Incorrect! Expected 19980, got $rewardPaisa\n";
}

echo "-------------------\n";

// Test Case 2: Yearly Plan (₹9,999)
echo "Testing Yearly Plan (15%)...\n";
$yearlySub = Subscription::create([
    'user_id' => $referee->id,
    'name' => 'creator_yearly',
    'razorpay_id' => 'sub_yearly_test_'.uniqid(),
    'razorpay_plan_id' => 'plan_9999',
    'status' => 'active',
]);

$payloadYearly = [
    'payload' => [
        'payment' => [
            'entity' => [
                'amount' => 999900, // ₹9,999 in Paisa
                'id' => 'pay_yearly_'.uniqid(),
            ],
        ],
    ],
];

// Replicate logic
$isYearly = str_ends_with($yearlySub->name, '_yearly');
$percentage = $isYearly
    ? config('services.razorpay.referral_reward_yearly_percent', 15)
    : config('services.razorpay.referral_reward_monthly_percent', 20);
$paymentAmount = (int) $payloadYearly['payload']['payment']['entity']['amount'];
$rewardPaisa = (int) ($paymentAmount * ($percentage / 100));

echo 'Plan: '.$yearlySub->name."\n";
echo 'Payment: ₹'.($paymentAmount / 100)."\n";
echo 'Percentage: '.$percentage."%\n";
echo 'Calculated Reward: ₹'.($rewardPaisa / 100).' ('.$rewardPaisa." Paisa)\n";

if ($rewardPaisa === 149985) { // 15% of 999900 = 149985
    echo "✅ Yearly Reward Correct!\n";
} else {
    echo "❌ Yearly Reward Incorrect! Expected 149985, got $rewardPaisa\n";
}

// Cleanup
$monthlySub->delete();
$yearlySub->delete();
$referee->delete();
$referrer->delete();
