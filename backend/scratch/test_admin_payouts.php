<?php

use App\Http\Controllers\AdminPayoutController;
use App\Models\PayoutRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

// Setup
$admin = User::where('email', 'admin@scanmysocial.com')->first();
$user = User::factory()->create();
$payout = PayoutRequest::create([
    'user_id' => $user->id,
    'amount' => 50000,
    'status' => 'pending',
    'bank_details' => ['account_name' => 'Test', 'account_number' => '123', 'ifsc' => 'TEST001'],
]);

$controller = new AdminPayoutController;

echo "Testing Invalid Transition: Pending -> Paid (Should Fail)\n";
try {
    $request = new Request(['status' => 'paid']);
    $controller->updateStatus($request, $payout);
    echo "❌ Fail: Transition allowed incorrectly!\n";
} catch (ValidationException $e) {
    echo '✅ Success: Caught expected error: '.$e->getMessage()."\n";
}

echo "-------------------\n";

echo "Testing Valid Transition: Pending -> Approved\n";
$request = new Request(['status' => 'approved']);
$controller->updateStatus($request, $payout);
if ($payout->fresh()->status === 'approved') {
    echo "✅ Success: Status is now approved\n";
} else {
    echo "❌ Fail: Status update failed\n";
}

echo "-------------------\n";

echo "Testing Valid Transition: Approved -> Paid\n";
$request = new Request(['status' => 'paid']);
$controller->updateStatus($request, $payout->fresh());
if ($payout->fresh()->status === 'paid') {
    echo "✅ Success: Status is now paid\n";
} else {
    echo "❌ Fail: Status update failed\n";
}

// Cleanup
$payout->delete();
$user->delete();
