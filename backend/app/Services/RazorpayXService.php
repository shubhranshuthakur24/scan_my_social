<?php

namespace App\Services;

use App\Models\PayoutRequest;
use App\Models\User;
use Razorpay\Api\Api;

class RazorpayXService
{
    private Api $api;

    private string $accountNumber;

    public function __construct()
    {
        $this->api = new Api(
            config('services.razorpay.key'),
            config('services.razorpay.secret')
        );
        $this->accountNumber = (string) config('services.razorpay.payout_account_number');
    }

    /**
     * Find or create a RazorpayX Contact for a user.
     *
     * @return string The RazorpayX Contact ID.
     *
     * @throws \Exception If the contact cannot be created.
     */
    public function findOrCreateContact(User $user): string
    {
        if (! empty($user->razorpay_contact_id)) {
            return (string) $user->razorpay_contact_id;
        }

        $contact = $this->api->request->request(
            'POST',
            'contacts',
            [
                'name' => $user->name,
                'email' => $user->email,
                'type' => 'sms affiliate',
                'reference_id' => 'user_'.$user->id,
                'notes' => [
                    'platform' => 'ScanMySocial',
                    'user_id' => (string) $user->id,
                ],
            ]
        );

        $contactId = (string) $contact['id'];
        $user->update(['razorpay_contact_id' => $contactId]);

        return $contactId;
    }

    /**
     * Create a Fund Account linked to a contact.
     *
     * @param  array{account_name: string, account_number: string, ifsc: string}  $bankDetails
     * @return string The RazorpayX Fund Account ID.
     *
     * @throws \Exception If the fund account cannot be created.
     */
    public function createFundAccount(string $contactId, array $bankDetails): string
    {
        $fundAccount = $this->api->request->request(
            'POST',
            'fund_accounts',
            [
                'contact_id' => $contactId,
                'account_type' => 'bank_account',
                'bank_account' => [
                    'name' => $bankDetails['account_name'],
                    'ifsc' => $bankDetails['ifsc'],
                    'account_number' => $bankDetails['account_number'],
                ],
            ]
        );

        return (string) $fundAccount['id'];
    }

    /**
     * Execute the full payout flow: Contact → Fund Account → Payout.
     *
     * @return array{payout_id: string, fund_account_id: string}
     *
     * @throws \Exception If any step fails.
     */
    public function createPayout(PayoutRequest $payoutRequest): array
    {
        $user = $payoutRequest->user;

        // Step 1: Ensure we have a contact
        $contactId = $this->findOrCreateContact($user);

        // Step 2: Create fund account with the payout's bank details
        $bankDetails = $payoutRequest->bank_details;
        $fundAccountId = $this->createFundAccount($contactId, $bankDetails);

        // Step 3: Create the actual payout
        $payout = $this->api->request->request(
            'POST',
            'payouts',
            [
                'account_number' => $this->accountNumber,
                'fund_account_id' => $fundAccountId,
                'amount' => $payoutRequest->amount,
                'currency' => 'INR',
                'mode' => 'NEFT',
                'purpose' => 'payout',
                'reference_id' => 'payout_'.$payoutRequest->id,
                'narration' => 'ScanMySocial Referral Payout',
                'notes' => [
                    'payout_request_id' => (string) $payoutRequest->id,
                    'user_id' => (string) $user->id,
                ],
            ]
        );

        return [
            'payout_id' => (string) $payout['id'],
            'fund_account_id' => $fundAccountId,
        ];
    }
}
