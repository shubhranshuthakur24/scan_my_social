<?php

namespace App\Services;

use App\Models\User;

class PlanService
{
    /**
     * Credit costs per billable AI action.
     */
    const CREDIT_COSTS = [
        'generate_script' => 50,
        'auto_refine' => 50,
        'generate_audio' => 100,
        'transcribe_post' => 50,
        'analyze_post' => 50,
    ];

    /**
     * Max channels allowed per plan.
     */
    const CHANNEL_LIMITS = [
        'free' => 5,
        'starter' => 5,
        'pro' => 25,
        'creator' => 100,
    ];

    /**
     * Max number of times a user can untrack channels.
     */
    const CHANNEL_UNTRACK_LIMIT = 5;

    /**
     * Max Instagram accounts allowed per paid plan.
     */
    const INSTAGRAM_ACCOUNT_LIMITS = [
        'starter' => 1,
        'pro' => 2,
        'creator' => 5,
    ];

    /**
     * Monthly credit allowance by subscription plan.
     */
    const MONTHLY_CREDIT_ALLOWANCES = [
        'free' => 0,
        'starter' => 0,
        'starter_yearly' => 0,
        'pro' => 20000,
        'pro_yearly' => 22000,
        'creator' => 50000,
        'creator_yearly' => 55000,
    ];

    /**
     * Plan aliases that should behave as the same paid tier.
     */
    const PLAN_ALIASES = [
        'starter_yearly' => 'starter',
        'pro_yearly' => 'pro',
        'creator_yearly' => 'creator',
    ];

    /**
     * Returns the name of the user's current active plan ('starter', 'pro', 'creator'),
     * or null if no active subscription exists.
     */
    public static function activePlan(User $user): ?string
    {
        return $user->subscriptions()
            ->where('status', 'active')
            ->latest()
            ->value('name');
    }

    /**
     * Returns the normalized active plan tier ('starter', 'pro', 'creator', etc.).
     */
    public static function activePlanTier(User $user): ?string
    {
        return self::normalizePlanName(self::activePlan($user));
    }

    /**
     * Returns true if the user has an active paid subscription tier.
     */
    public static function hasActivePlan(User $user): bool
    {
        return self::hasActivePaidPlan($user);
    }

    /**
     * Returns true when the user has an active paid plan tier supported for Instagram caps.
     */
    public static function hasActivePaidPlan(User $user): bool
    {
        $tier = self::activePlanTier($user);

        return $tier !== null && array_key_exists($tier, self::INSTAGRAM_ACCOUNT_LIMITS);
    }

    /**
     * Returns the maximum number of channels the user can track.
     */
    public static function channelLimit(User $user): int
    {
        if ($user->isSuperAdmin()) {
            return PHP_INT_MAX;
        }

        $plan = self::activePlanTier($user) ?? 'starter';

        return self::CHANNEL_LIMITS[$plan] ?? 5;
    }

    /**
     * Returns the maximum number of times a user can untrack channels.
     */
    public static function channelUntrackLimit(): int
    {
        return self::CHANNEL_UNTRACK_LIMIT;
    }

    /**
     * Returns how many untracks the user can still perform.
     */
    public static function remainingChannelUntracks(User $user): int
    {
        $usedUntracks = (int) $user->channel_untrack_count;

        return max(0, self::channelUntrackLimit() - $usedUntracks);
    }

    /**
     * Returns the active Instagram account limit for the user.
     */
    public static function instagramAccountLimit(User $user): int
    {
        $tier = self::activePlanTier($user);

        if ($tier === null) {
            return 0;
        }

        return self::INSTAGRAM_ACCOUNT_LIMITS[$tier] ?? 0;
    }

    /**
     * Returns count of currently active connected Instagram accounts.
     */
    public static function connectedInstagramAccountsCount(User $user): int
    {
        return $user->instagramAccounts()
            ->where('status', 'active')
            ->count();
    }

    /**
     * Returns true when the user can connect another Instagram account.
     */
    public static function canConnectMoreInstagramAccounts(User $user): bool
    {
        if (! self::hasActivePaidPlan($user)) {
            return false;
        }

        return self::connectedInstagramAccountsCount($user) < self::instagramAccountLimit($user);
    }

    /**
     * Returns true when the user can connect/reconnect the given IG account.
     * Existing connected accounts are always reconnectable by owner.
     */
    public static function canConnectInstagramAccount(User $user, ?string $igAccountId = null): bool
    {
        $normalizedIgAccountId = trim((string) $igAccountId);
        if ($normalizedIgAccountId !== '') {
            $alreadyConnected = $user->instagramAccounts()
                ->where('ig_account_id', $normalizedIgAccountId)
                ->exists();

            if ($alreadyConnected) {
                return true;
            }
        }

        return self::canConnectMoreInstagramAccounts($user);
    }

    /**
     * Returns the credit cost for a given AI action key.
     */
    public static function creditCost(string $action): int
    {
        return self::CREDIT_COSTS[$action] ?? 0;
    }

    /**
     * Returns monthly credit allowance for the user's active subscription.
     */
    public static function monthlyCreditAllowance(User $user): int
    {
        return self::monthlyCreditAllowanceForPlan(self::activePlan($user));
    }

    /**
     * Returns monthly credit allowance for a plan code.
     */
    public static function monthlyCreditAllowanceForPlan(?string $plan): int
    {
        $normalizedPlan = trim((string) $plan);
        if ($normalizedPlan === '') {
            return 0;
        }

        if (array_key_exists($normalizedPlan, self::MONTHLY_CREDIT_ALLOWANCES)) {
            return self::MONTHLY_CREDIT_ALLOWANCES[$normalizedPlan];
        }

        $tier = self::normalizePlanName($normalizedPlan);
        if ($tier === null) {
            return 0;
        }

        return self::MONTHLY_CREDIT_ALLOWANCES[$tier] ?? 0;
    }

    /**
     * Normalizes plan naming variants to a stable tier key.
     */
    public static function normalizePlanName(?string $plan): ?string
    {
        $normalized = trim((string) $plan);
        if ($normalized === '') {
            return null;
        }

        return self::PLAN_ALIASES[$normalized] ?? $normalized;
    }
}
