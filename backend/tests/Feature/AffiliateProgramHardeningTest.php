<?php

namespace Tests\Feature;

use App\Mail\AffiliateApplicationApprovedMail;
use App\Mail\AffiliateApplicationRejectedMail;
use App\Mail\AffiliateApplicationSubmittedMail;
use App\Mail\AffiliateClaimLinkMail;
use App\Models\AffiliateApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AffiliateProgramHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_affiliate_apply_works_for_guest(): void
    {
        Mail::fake();

        $response = $this->post(route('affiliate.apply'), [
            'name' => 'Guest Applicant',
            'email' => 'guest.aff@example.com',
            'contact' => '+91 98765-43210',
            'note' => 'I run creator content pages.',
            'website' => '',
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('affiliate_applications', [
            'email' => 'guest.aff@example.com',
            'contact' => '+919876543210',
            'status' => 'pending',
            'claimed_user_id' => null,
        ]);

        Mail::assertSent(AffiliateApplicationSubmittedMail::class, function (AffiliateApplicationSubmittedMail $mail): bool {
            return strtolower((string) $mail->application->email) === 'guest.aff@example.com';
        });
    }

    public function test_admin_approval_of_unclaimed_application_does_not_update_existing_user_by_email(): void
    {
        Mail::fake();

        $admin = User::factory()->superAdmin()->create();
        $victimUser = User::factory()->create([
            'email' => 'victim@example.com',
            'affiliate_status' => null,
        ]);

        $application = AffiliateApplication::query()->create([
            'name' => 'Attacker Applicant',
            'email' => 'victim@example.com',
            'contact' => '+919999999999',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->patch(route('admin.affiliates.update-status', $application), [
            'status' => 'approved',
        ]);

        $response->assertRedirect();

        $application->refresh();
        $victimUser->refresh();

        $this->assertSame('approved_unclaimed', $application->status);
        $this->assertNull($application->claimed_user_id);
        $this->assertNull($victimUser->affiliate_status);

        Mail::assertSent(AffiliateApplicationApprovedMail::class, function (AffiliateApplicationApprovedMail $mail): bool {
            return strtolower((string) $mail->application->email) === 'victim@example.com';
        });
    }

    public function test_claim_flow_binds_application_and_syncs_approved_affiliate_status(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'owner@example.com',
        ]);

        $application = AffiliateApplication::query()->create([
            'name' => 'Owner Applicant',
            'email' => 'owner@example.com',
            'contact' => '+919888888888',
            'status' => 'approved_unclaimed',
        ]);

        $this->actingAs($user)->post(route('affiliate.claim-link'), [
            'email' => 'owner@example.com',
        ])->assertRedirect();

        Mail::assertSent(AffiliateClaimLinkMail::class, 1);

        $sentMail = null;
        Mail::assertSent(AffiliateClaimLinkMail::class, function (AffiliateClaimLinkMail $mail) use (&$sentMail): bool {
            $sentMail = $mail;

            return true;
        });

        $this->assertNotNull($sentMail);
        $this->assertNotEmpty($sentMail->claimUrl);

        $this->actingAs($user)->get($sentMail->claimUrl)->assertRedirect(route('affiliate'));

        $application->refresh();
        $user->refresh();

        $this->assertSame($user->id, $application->claimed_user_id);
        $this->assertSame('approved_claimed', $application->status);
        $this->assertNotNull($application->claimed_at);
        $this->assertNull($application->claim_token);

        $this->assertSame('approved', $user->affiliate_status);
        $this->assertNotNull($user->affiliate_approved_at);
        $this->assertNotNull($user->affiliate_code);
    }

    public function test_non_matching_logged_in_user_cannot_claim_another_email_application(): void
    {
        Mail::fake();

        $owner = User::factory()->create([
            'email' => 'owner@example.com',
        ]);
        $attacker = User::factory()->create([
            'email' => 'attacker@example.com',
        ]);

        $application = AffiliateApplication::query()->create([
            'name' => 'Owner Applicant',
            'email' => 'owner@example.com',
            'contact' => '+919777777777',
            'status' => 'approved_unclaimed',
        ]);

        $this->actingAs($owner)->post(route('affiliate.claim-link'), [
            'email' => 'owner@example.com',
        ])->assertRedirect();

        $sentMail = null;
        Mail::assertSent(AffiliateClaimLinkMail::class, function (AffiliateClaimLinkMail $mail) use (&$sentMail): bool {
            $sentMail = $mail;

            return true;
        });

        $this->actingAs($attacker)->get($sentMail->claimUrl)->assertRedirect(route('affiliate'));

        $application->refresh();
        $attacker->refresh();

        $this->assertNull($application->claimed_user_id);
        $this->assertSame('approved_unclaimed', $application->status);
        $this->assertNull($attacker->affiliate_status);
    }

    public function test_affiliate_wallet_routes_require_approved_affiliate_status(): void
    {
        $normalUser = User::factory()->create([
            'affiliate_status' => 'pending',
        ]);

        $this->actingAs($normalUser)
            ->from(route('referrals'))
            ->post(route('affiliate.wallet.bank-details'), [
                'bank_name' => 'HDFC',
                'account_number' => '1234567890',
                'ifsc_code' => 'HDFC0001234',
                'account_holder_name' => 'Normal User',
            ])
            ->assertRedirect(route('referrals'));

        $approvedUser = User::factory()->create([
            'affiliate_status' => 'approved',
        ]);

        $this->actingAs($approvedUser)
            ->post(route('affiliate.wallet.bank-details'), [
                'bank_name' => 'ICICI',
                'account_number' => '9876543210',
                'ifsc_code' => 'ICIC0001234',
                'account_holder_name' => 'Approved User',
            ])
            ->assertRedirect();

        $approvedUser->refresh();
        $this->assertSame('ICICI', $approvedUser->bank_name);
    }

    public function test_duplicate_pending_application_is_blocked_within_cooldown_window(): void
    {
        AffiliateApplication::query()->create([
            'name' => 'Earlier Applicant',
            'email' => 'cooldown@example.com',
            'contact' => '+919666666666',
            'status' => 'pending',
        ]);

        $response = $this->post(route('affiliate.apply'), [
            'name' => 'Retry Applicant',
            'email' => 'cooldown@example.com',
            'contact' => '+91 96666 66666',
            'note' => 'Retrying quickly',
            'website' => '',
        ]);

        $response->assertRedirect();
        $response->assertSessionHasErrors('contact');
    }

    public function test_affiliate_apply_route_is_throttled(): void
    {
        foreach (range(1, 5) as $index) {
            $this->post(route('affiliate.apply'), [
                'name' => 'Throttle Applicant '.$index,
                'email' => 'throttle'.$index.'@example.com',
                'contact' => '+91955555'.str_pad((string) $index, 5, '0', STR_PAD_LEFT),
                'note' => 'Load test',
                'website' => '',
            ])->assertRedirect();
        }

        $this->post(route('affiliate.apply'), [
            'name' => 'Throttle Applicant 6',
            'email' => 'throttle6@example.com',
            'contact' => '+9195555599999',
            'note' => 'Should throttle',
            'website' => '',
        ])->assertStatus(429);
    }

    public function test_admin_rejection_sends_rejection_email(): void
    {
        Mail::fake();

        $admin = User::factory()->superAdmin()->create();
        $application = AffiliateApplication::query()->create([
            'name' => 'Rejected Applicant',
            'email' => 'rejected.aff@example.com',
            'contact' => '+919444444444',
            'status' => 'pending',
        ]);

        $this->actingAs($admin)->patch(route('admin.affiliates.update-status', $application), [
            'status' => 'rejected',
            'reason' => 'Profile does not match program quality requirements.',
        ])->assertRedirect();

        $application->refresh();
        $this->assertSame('rejected', $application->status);

        Mail::assertSent(AffiliateApplicationRejectedMail::class, function (AffiliateApplicationRejectedMail $mail): bool {
            return strtolower((string) $mail->application->email) === 'rejected.aff@example.com'
                && str_contains((string) $mail->application->rejection_reason, 'quality requirements');
        });
    }
}
