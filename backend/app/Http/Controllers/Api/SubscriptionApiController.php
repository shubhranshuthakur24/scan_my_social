<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Subscription;
use App\Services\PlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SubscriptionApiController extends Controller
{
    /**
     * Get user active subscription, credits, and billing invoices.
     */
    public function show(Request $request): JsonResponse
    {
        $user = Auth::user();

        $activeSubscription = $user->subscriptions()
            ->where('status', 'active')
            ->latest()
            ->first();

        $rawPlanName = $activeSubscription ? $activeSubscription->name : 'free';
        $activeTier = PlanService::normalizePlanName($rawPlanName) ?? 'free';
        $isYearly = str_ends_with((string) $rawPlanName, '_yearly');

        $invoices = $user->invoices()
            ->latest()
            ->get()
            ->map(function (Invoice $inv) {
                return [
                    'id' => 'INV-' . str_pad((string) $inv->id, 5, '0', STR_PAD_LEFT),
                    'raw_id' => (string) $inv->id,
                    'plan' => $inv->lineItemTitle(),
                    'date' => $inv->created_at ? $inv->created_at->format('M d, Y') : now()->format('M d, Y'),
                    'amount' => '$' . number_format(($inv->amount ?? 0) / 100, 2),
                    'amount_cents' => (int) ($inv->amount ?? 0),
                    'status' => strtolower((string) ($inv->status ?? 'paid')),
                    'billing_period' => $inv->billingPeriodLabel(),
                ];
            });

        $monthlyAllowance = PlanService::monthlyCreditAllowance($user);

        $plansCatalog = [
            [
                'id' => 'starter',
                'name' => 'Starter',
                'tagline' => 'Repeatable Growth System',
                'description' => 'Perfect for getting your first repeatable growth system live.',
                'price_monthly' => 14,
                'price_annual' => 10,
                'price_inr_monthly' => '₹1,099/mo',
                'price_inr_annual' => '₹799/mo',
                'monthly_credits' => 0,
                'cta' => 'Choose Starter',
                'features' => [
                    ['text' => '1 Instagram Account', 'included' => true],
                    ['text' => 'Track up to 5 Competitors', 'included' => true],
                    ['text' => 'Custom Feed of Viral Videos in Your Niche', 'included' => true],
                    ['text' => 'Outlier Detection & Scoring', 'included' => true],
                    ['text' => 'Unlimited Automations & Comment-to-DM', 'included' => true],
                    ['text' => 'Ask To Follow Before DM', 'included' => true],
                    ['text' => 'AutoDM Template Library & Random Replies', 'included' => true],
                    ['text' => 'Unlimited Projects & Watchlists', 'included' => true],
                ],
            ],
            [
                'id' => 'pro',
                'name' => 'Pro',
                'tagline' => 'Growth Engine',
                'description' => 'For teams and creators ready to scale across platforms.',
                'price_monthly' => 49,
                'price_annual' => 35,
                'price_inr_monthly' => '₹3,499/mo',
                'price_inr_annual' => '₹2,499/mo',
                'monthly_credits' => PlanService::MONTHLY_CREDIT_ALLOWANCES['pro'] ?? 20000,
                'popular' => true,
                'cta' => 'Choose Pro',
                'features' => [
                    ['text' => 'Everything in Starter', 'included' => true],
                    ['text' => '2 Instagram Accounts', 'included' => true],
                    ['text' => 'Track up to 25 Competitors', 'included' => true],
                    ['text' => '20,000 Monthly AI Script Credits', 'included' => true],
                    ['text' => 'Story Comment Automation & Greeting DMs', 'included' => true],
                    ['text' => 'Competitor Post Transcription & Analysis', 'included' => true],
                    ['text' => 'Custom Lead Forms & Email Collection', 'included' => true],
                    ['text' => 'Re-create Competitor\'s Post & Viral Scripts', 'included' => true],
                ],
            ],
            [
                'id' => 'creator',
                'name' => 'Creator',
                'tagline' => 'Scale Engine',
                'description' => 'For high-volume creators and operators who want full control.',
                'price_monthly' => 89,
                'price_annual' => 69,
                'price_inr_monthly' => '₹6,999/mo',
                'price_inr_annual' => '₹4,999/mo',
                'monthly_credits' => PlanService::MONTHLY_CREDIT_ALLOWANCES['creator'] ?? 50000,
                'cta' => 'Scale with Creator',
                'features' => [
                    ['text' => 'Everything in Pro', 'included' => true],
                    ['text' => '5 Instagram Accounts', 'included' => true],
                    ['text' => 'Track up to 100 Competitors', 'included' => true],
                    ['text' => '50,000 Monthly AI Script Credits', 'included' => true],
                    ['text' => 'AI Hook / Script Copilot', 'included' => true],
                    ['text' => 'Campaign Attribution (DM to Lead)', 'included' => true],
                    ['text' => 'A/B Testing for Automations', 'included' => true],
                ],
            ],
            [
                'id' => 'enterprise',
                'name' => 'Business / Enterprise',
                'tagline' => 'Agency Scale',
                'description' => 'For agencies and businesses running large-scale automation.',
                'price_monthly' => 249,
                'price_annual' => 199,
                'price_inr_monthly' => '₹19,999+/mo',
                'price_inr_annual' => 'Custom',
                'monthly_credits' => 'Custom',
                'cta' => 'Contact Sales',
                'features' => [
                    ['text' => 'Custom / Enterprise Setup & Tracking Limits', 'included' => true],
                    ['text' => 'Up to 5 Team Seats', 'included' => true],
                    ['text' => 'Dedicated Success Manager', 'included' => true],
                    ['text' => 'White-glove Onboarding & Compliance', 'included' => true],
                ],
            ],
        ];

        return response()->json([
            'subscription' => [
                'name' => $rawPlanName,
                'tier' => $activeTier, // 'free', 'starter', 'pro', 'creator'
                'status' => $activeSubscription ? $activeSubscription->status : 'free',
                'interval' => $isYearly ? 'annual' : 'monthly',
                'ends_at' => $activeSubscription?->ends_at?->toIso8601String(),
                'next_credit_reset_at' => $activeSubscription?->next_credit_reset_at?->toIso8601String(),
            ],
            'credits' => [
                'balance' => (int) $user->credits,
                'monthly_allowance' => $monthlyAllowance,
                'wallet_balance' => (int) $user->wallet_balance,
            ],
            'plans' => $plansCatalog,
            'invoices' => $invoices,
        ]);
    }

    /**
     * Download official PDF invoice receipt.
     */
    public function downloadInvoice(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();

        $invoice = $user->invoices()
            ->where('id', $id)
            ->first();

        if (!$invoice) {
            return response()->json([
                'message' => 'Invoice receipt not found or access denied.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Invoice receipt download initiated.',
            'invoice' => [
                'id' => 'INV-' . str_pad((string) $invoice->id, 5, '0', STR_PAD_LEFT),
                'plan' => $invoice->lineItemTitle(),
                'amount' => '$' . number_format(($invoice->amount ?? 0) / 100, 2),
                'date' => $invoice->created_at ? $invoice->created_at->format('M d, Y') : now()->format('M d, Y'),
                'download_url' => url("/api/v1/user/invoices/{$invoice->id}/pdf"),
            ],
        ]);
    }
}
