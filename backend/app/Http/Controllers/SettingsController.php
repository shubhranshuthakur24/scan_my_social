<?php

namespace App\Http\Controllers;

use App\Models\BookingAvailabilityOverride;
use App\Models\BookingHostAvailabilityRule;
use App\Models\InstagramAccount;
use App\Models\Invoice;
use App\Models\User;
use App\Services\MetaApiService;
use App\Services\PlanService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator as ValidationValidator;
use Inertia\Inertia;

class SettingsController extends Controller
{
    /**
     * Display the user's settings profile and subscription status.
     */
    public function index(MetaApiService $metaApiService)
    {
        $user = auth()->user();
        $sub = $user->subscriptions()->latest()->first();

        $interval = 'Monthly';
        if ($sub && $sub->name === 'free' && $sub->ends_at) {
            $days = $sub->created_at->diffInDays(Carbon::parse($sub->ends_at));
            $interval = $days.' Days';
        }

        $subscriptionData = $sub ? [
            'id' => $sub->name === 'free' ? 'N/A' : ($sub->razorpay_id ?? 'N/A'),
            'status' => ucfirst($sub->status),
            'tier' => ucfirst($sub->name),
            'interval' => $interval,
            'periodStart' => $sub->created_at->format('M d, Y'),
            'periodEnd' => $sub->ends_at ? Carbon::parse($sub->ends_at)->format('M d, Y') : 'Auto Renew',
            'periodEndLabel' => $sub->ends_at || $sub->name === 'free' ? 'Expires On' : 'Next Renewal',
        ] : null;

        $cycleStart = now()->startOfMonth();
        $cycleEnd = now()->endOfMonth();
        $daysUntilReset = now()->daysInMonth - now()->day; // Fallback

        if ($sub) {
            if ($sub->next_credit_reset_at && $sub->name !== 'free') {
                $cycleEnd = Carbon::parse($sub->next_credit_reset_at);
                $cycleStart = (clone $cycleEnd)->subMonthNoOverflow();
                $days = now()->startOfDay()->diffInDays((clone $cycleEnd)->startOfDay(), false);
                $daysUntilReset = max(0, (int) $days);
            } elseif ($sub->ends_at) {
                // Free trials or cancelled plans with an explicit end date
                $cycleStart = $sub->created_at;
                $cycleEnd = Carbon::parse($sub->ends_at);
                $days = now()->startOfDay()->diffInDays($cycleEnd->startOfDay(), false);
                $daysUntilReset = max(0, (int) $days);
            } elseif ($sub->name !== 'free') {
                // Active monthly Razorpay subscription without an explicit ends_at
                $billingDay = $sub->created_at->day;

                if (now()->day >= $billingDay) {
                    $cycleStart = now()->startOfMonth()->addDays($billingDay - 1);
                    $cycleEnd = now()->addMonth()->startOfMonth()->addDays($billingDay - 1);
                } else {
                    $cycleStart = now()->subMonth()->startOfMonth()->addDays($billingDay - 1);
                    $cycleEnd = now()->startOfMonth()->addDays($billingDay - 1);
                }

                $days = now()->startOfDay()->diffInDays($cycleEnd->startOfDay(), false);
                $daysUntilReset = max(0, (int) $days);
            }
        }

        $monthUsed = abs($user->creditLedger()
            ->where('amount', '<', 0)
            ->whereBetween('created_at', [$cycleStart, $cycleEnd])
            ->sum('amount'));

        $monthTotal = $user->credits + $monthUsed;

        $channelLimit = PlanService::channelLimit($user);
        $channelCount = $user->channels()->count();

        $usageData = [
            'monthlyCredits' => [
                'used' => $monthUsed,
                'total' => $monthTotal,
            ],
            'supplementalCredits' => [
                'used' => 0,
                'total' => 0,
            ],
            'channels' => [
                'used' => $channelCount,
                'total' => $channelLimit === PHP_INT_MAX ? '∞' : $channelLimit,
            ],
            'daysUntilReset' => $daysUntilReset,
            'breakdown' => [],
        ];

        $actions = $user->creditLedger()
            ->where('amount', '<', 0)
            ->whereBetween('created_at', [$cycleStart, $cycleEnd])
            ->selectRaw('action, count(*) as count, sum(amount) as total_spent')
            ->groupBy('action')
            ->get();

        foreach ($actions as $action) {
            $nameStr = ucwords(str_replace('_', ' ', $action->action));
            $usageData['breakdown'][] = [
                'name' => $nameStr,
                'description' => 'Operations for '.$nameStr,
                'count' => $action->count,
                'cost' => abs($action->total_spent) / $action->count,
                'total' => abs($action->total_spent),
            ];
        }

        // Include channel tracking explicitly though it costs no credits
        if ($channelCount > 0) {
            $usageData['breakdown'][] = [
                'name' => 'Tracked Channels',
                'description' => 'Active channels being monitored',
                'count' => $channelCount,
                'cost' => 'Plan limit',
                'total' => 0,
            ];
        }

        $instagramAccounts = $user->instagramAccounts()
            ->select([
                'id',
                'ig_account_id',
                'username',
                'profile_url',
                'profile_picture_url',
                'access_token',
                'status',
                'token_expires_at',
                'welcome_dm_enabled',
                'welcome_dm_variants',
            ])
            ->get()
            ->map(fn (InstagramAccount $account): InstagramAccount => $this->hydrateInstagramAccountForSettings($account, $metaApiService));
        $connectedInstagramCount = $user->instagramAccounts()
            ->whereIn('status', ['active', 'disconnected'])
            ->count();
        $instagramAccountLimit = PlanService::instagramAccountLimit($user);
        $canConnectInstagramMore = PlanService::canConnectMoreInstagramAccounts($user);
        $hasPaidPlan = PlanService::hasActivePaidPlan($user);

        return Inertia::render('Settings/Index', [
            'subscriptionData' => $subscriptionData,
            'usageData' => $usageData,
            'instagramAccounts' => $instagramAccounts,
            'instagramLimitMeta' => [
                'connectedCount' => $connectedInstagramCount,
                'accountLimit' => $instagramAccountLimit,
                'canConnectMore' => $canConnectInstagramMore,
                'hasPaidPlan' => $hasPaidPlan,
                'activePlanTier' => PlanService::activePlanTier($user),
            ],
            'isApprovedAffiliate' => $user->affiliate_status === 'approved',
            'bankDetails' => [
                'bank_name' => $user->bank_name,
                'account_number' => $user->account_number,
                'ifsc_code' => $user->ifsc_code,
                'account_holder_name' => $user->account_holder_name,
            ],
        ]);
    }

    public function updateBookingWorkingHours(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = auth()->user();

        $validator = Validator::make($request->all(), [
            'global_availability_rules' => ['required', 'array', 'min:1'],
            'global_availability_rules.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'global_availability_rules.*.start_time' => ['required', 'date_format:H:i'],
            'global_availability_rules.*.end_time' => ['required', 'date_format:H:i'],
            'global_availability_rules.*.is_active' => ['sometimes', 'boolean'],
            'lock_time_slots_across_event_types' => ['sometimes', 'boolean'],
        ]);

        $validator->after(function ($validator) use ($request): void {
            $globalRules = $request->input('global_availability_rules', []);

            $this->validateWeeklyRules($validator, $globalRules, 'global_availability_rules');
            $this->validateOverlappingRangesByDay($validator, $globalRules, 'global_availability_rules');
        });

        $validated = $validator->validate();

        $this->replaceBookingAvailabilityRules($user, $validated['global_availability_rules']);
        $lockAcrossEventTypes = array_key_exists('lock_time_slots_across_event_types', $validated)
            ? (bool) $validated['lock_time_slots_across_event_types']
            : (bool) $user->lock_time_slots_across_event_types;
        $user->forceFill([
            'lock_time_slots_across_event_types' => $lockAcrossEventTypes,
        ])->save();

        $response = back()->with('success', 'Global working hours updated.');

        $this->logBookingSettingsResponse(
            request: $request,
            user: $user,
            response: $response,
            action: 'working_hours',
            payloadSummary: [
                'rules_count' => count($validated['global_availability_rules']),
                'lock_time_slots_across_event_types' => $lockAcrossEventTypes,
            ],
        );

        return $response;
    }

    public function updateBookingDateOverrides(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = auth()->user();

        $validator = Validator::make($request->all(), [
            'availability_overrides' => ['nullable', 'array'],
            'availability_overrides.*.override_date' => ['required', 'date_format:Y-m-d'],
            'availability_overrides.*.is_full_day' => ['required', 'boolean'],
            'availability_overrides.*.start_time' => ['nullable', 'date_format:H:i'],
            'availability_overrides.*.end_time' => ['nullable', 'date_format:H:i'],
            'availability_overrides.*.reason' => ['nullable', 'string', 'max:255'],
        ]);

        $validator->after(function ($validator) use ($request): void {
            $overrides = $request->input('availability_overrides', []);

            $this->validateDateOverrides($validator, $overrides, 'availability_overrides');
        });

        $validated = $validator->validate();

        $this->replaceBookingAvailabilityOverrides($user, $validated['availability_overrides'] ?? []);

        $response = back()->with('success', 'Date overrides updated.');

        $this->logBookingSettingsResponse(
            request: $request,
            user: $user,
            response: $response,
            action: 'date_overrides',
            payloadSummary: [
                'overrides_count' => count($validated['availability_overrides'] ?? []),
            ],
        );

        return $response;
    }

    public function updateWelcomeDm(Request $request, InstagramAccount $instagramAccount): RedirectResponse
    {
        if ($instagramAccount->user_id !== (int) auth()->id()) {
            abort(403);
        }

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'variants' => ['required_if:enabled,true', 'array', 'size:3'],
            'variants.*' => ['nullable', 'string', 'max:500'],
        ]);

        $enabled = (bool) $validated['enabled'];
        $variants = collect($validated['variants'] ?? ($instagramAccount->welcome_dm_variants ?? []))
            ->map(fn ($variant) => trim((string) $variant))
            ->take(3)
            ->pad(3, '')
            ->values()
            ->all();

        if ($enabled) {
            $errors = [];
            foreach ($variants as $index => $variant) {
                if ($variant === '') {
                    $errors['variants.'.$index] = 'This welcome message variant is required.';
                }
            }

            if (! empty($errors)) {
                throw ValidationException::withMessages($errors);
            }
        }

        $instagramAccount->fill([
            'welcome_dm_enabled' => $enabled,
            'welcome_dm_variants' => $variants,
        ])->save();

        return back()->with('success', $enabled
            ? 'Welcome DM enabled for this account.'
            : 'Welcome DM disabled for this account.');
    }

    private function hydrateInstagramAccountForSettings(InstagramAccount $account, MetaApiService $metaApiService): InstagramAccount
    {
        if ($account->status !== 'active') {
            return $account;
        }

        $profilePictureUrl = Cache::remember($this->liveProfilePictureCacheKey((int) $account->id), now()->addMinutes(15), function () use ($account, $metaApiService) {
            try {
                $accounts = $metaApiService->fetchInstagramAccountsFromToken((string) $account->access_token, (int) $account->id);
            } catch (\Throwable $exception) {
                Log::warning('Settings live profile picture lookup failed', [
                    'instagram_account_id' => $account->id,
                    'ig_account_id' => $account->ig_account_id,
                    'error' => $exception->getMessage(),
                ]);

                return null;
            }

            if (empty($accounts)) {
                return null;
            }

            $selected = collect($accounts)->first(function ($item) use ($account) {
                return (string) ($item['ig_id'] ?? '') === (string) $account->ig_account_id;
            }) ?? $accounts[0];

            return $this->normalizeOptionalUrl($selected['profile_picture_url'] ?? null);
        });

        if ($profilePictureUrl) {
            $account->setAttribute('profile_picture_url', $profilePictureUrl);
        }

        return $account;
    }

    private function normalizeOptionalUrl(?string $url): ?string
    {
        $normalizedUrl = trim((string) $url);

        return $normalizedUrl !== '' ? $normalizedUrl : null;
    }

    private function liveProfilePictureCacheKey(int $instagramAccountId): string
    {
        return "autodm:live-profile-picture-url:{$instagramAccountId}";
    }

    /**
     * @param  array<string, mixed>  $payloadSummary
     */
    private function logBookingSettingsResponse(
        Request $request,
        User $user,
        RedirectResponse $response,
        string $action,
        array $payloadSummary
    ): void {
        if ($response->getStatusCode() < 400) {
            return;
        }

        Log::warning('Booking settings response', [
            'action' => $action,
            'user_id' => $user->id,
            'method' => $request->method(),
            'path' => $request->path(),
            'status' => $response->getStatusCode(),
            'location' => $response->headers->get('Location'),
            'payload_summary' => $payloadSummary,
        ]);
    }

    private function ensureBookingAvailabilityRules(User $user): void
    {
        $hasRules = BookingHostAvailabilityRule::query()
            ->where('host_user_id', $user->id)
            ->exists();

        if ($hasRules) {
            return;
        }

        $defaultRules = [
            ['day_of_week' => 1, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => true],
            ['day_of_week' => 2, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => true],
            ['day_of_week' => 3, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => true],
            ['day_of_week' => 4, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => true],
            ['day_of_week' => 5, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_active' => true],
        ];

        foreach ($defaultRules as $rule) {
            BookingHostAvailabilityRule::query()->create([
                'host_user_id' => $user->id,
                'day_of_week' => $rule['day_of_week'],
                'start_time' => $rule['start_time'],
                'end_time' => $rule['end_time'],
                'is_active' => true,
            ]);
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function formatBookingAvailabilityRules(User $user): array
    {
        return BookingHostAvailabilityRule::query()
            ->where('host_user_id', $user->id)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->map(fn (BookingHostAvailabilityRule $rule): array => [
                'day_of_week' => (int) $rule->day_of_week,
                'start_time' => substr((string) $rule->start_time, 0, 5),
                'end_time' => substr((string) $rule->end_time, 0, 5),
                'is_active' => (bool) $rule->is_active,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function formatBookingAvailabilityOverrides(User $user): array
    {
        return BookingAvailabilityOverride::query()
            ->where('host_user_id', $user->id)
            ->whereNull('booking_event_type_id')
            ->orderBy('override_date')
            ->orderBy('id')
            ->get()
            ->map(fn (BookingAvailabilityOverride $override): array => [
                'override_date' => $override->override_date?->toDateString(),
                'is_full_day' => $override->start_time === null || $override->end_time === null,
                'start_time' => $override->start_time ? substr((string) $override->start_time, 0, 5) : '09:00',
                'end_time' => $override->end_time ? substr((string) $override->end_time, 0, 5) : '17:00',
                'reason' => $override->reason,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     */
    private function replaceBookingAvailabilityRules(User $user, array $rules): void
    {
        BookingHostAvailabilityRule::query()
            ->where('host_user_id', $user->id)
            ->delete();

        foreach ($rules as $rule) {
            $isActive = filter_var($rule['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;

            BookingHostAvailabilityRule::query()->create([
                'host_user_id' => $user->id,
                'day_of_week' => (int) $rule['day_of_week'],
                'start_time' => (string) $rule['start_time'].':00',
                'end_time' => (string) $rule['end_time'].':00',
                'is_active' => $isActive,
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $overrides
     */
    private function replaceBookingAvailabilityOverrides(User $user, array $overrides): void
    {
        BookingAvailabilityOverride::query()
            ->where('host_user_id', $user->id)
            ->whereNull('booking_event_type_id')
            ->delete();

        foreach ($overrides as $override) {
            if (! isset($override['override_date'])) {
                continue;
            }

            $isFullDay = (bool) ($override['is_full_day'] ?? false);

            BookingAvailabilityOverride::query()->create([
                'host_user_id' => $user->id,
                'booking_event_type_id' => null,
                'override_date' => (string) $override['override_date'],
                'start_time' => $isFullDay ? null : (string) $override['start_time'].':00',
                'end_time' => $isFullDay ? null : (string) $override['end_time'].':00',
                'is_available' => false,
                'reason' => isset($override['reason']) ? trim((string) $override['reason']) : null,
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     */
    private function validateWeeklyRules(ValidationValidator $validator, array $rules, string $path): void
    {
        foreach ($rules as $index => $rule) {
            $isActive = filter_var($rule['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
            if (! $isActive) {
                continue;
            }

            $start = (string) ($rule['start_time'] ?? '');
            $end = (string) ($rule['end_time'] ?? '');

            if ($start !== '' && $end !== '' && $end <= $start) {
                $validator->errors()->add("{$path}.{$index}.end_time", 'End time must be after start time.');
            }
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $rules
     */
    private function validateOverlappingRangesByDay(ValidationValidator $validator, array $rules, string $path): void
    {
        $activeRangesByDay = [];

        foreach ($rules as $index => $rule) {
            $isActive = filter_var($rule['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
            if (! $isActive) {
                continue;
            }

            $dayOfWeek = isset($rule['day_of_week']) ? (int) $rule['day_of_week'] : -1;
            if ($dayOfWeek < 0 || $dayOfWeek > 6) {
                continue;
            }

            $start = (string) ($rule['start_time'] ?? '');
            $end = (string) ($rule['end_time'] ?? '');
            if ($start === '' || $end === '' || $end <= $start) {
                continue;
            }

            $activeRangesByDay[$dayOfWeek][] = [
                'index' => $index,
                'start' => $start,
                'end' => $end,
            ];
        }

        foreach ($activeRangesByDay as $ranges) {
            usort(
                $ranges,
                fn (array $left, array $right): int => [$left['start'], $left['end']] <=> [$right['start'], $right['end']]
            );

            for ($position = 1, $length = count($ranges); $position < $length; $position++) {
                $previous = $ranges[$position - 1];
                $current = $ranges[$position];

                if ($current['start'] < $previous['end']) {
                    $validator->errors()->add("{$path}.{$current['index']}.start_time", 'Time slots for the same day cannot overlap.');
                }
            }
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $overrides
     */
    private function validateDateOverrides(ValidationValidator $validator, array $overrides, string $path): void
    {
        $rangesByDate = [];
        $fullDayDates = [];

        foreach ($overrides as $index => $override) {
            $isFullDay = filter_var($override['is_full_day'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
            $start = (string) ($override['start_time'] ?? '');
            $end = (string) ($override['end_time'] ?? '');
            $date = (string) ($override['override_date'] ?? '');

            if ($date === '') {
                continue;
            }

            if ($isFullDay) {
                $fullDayDates[$date][] = $index;

                continue;
            }

            if ($start === '' || $end === '') {
                $validator->errors()->add("{$path}.{$index}.start_time", 'Start and end time are required for partial-day overrides.');

                continue;
            }

            if ($end <= $start) {
                $validator->errors()->add("{$path}.{$index}.end_time", 'End time must be after start time.');

                continue;
            }

            $rangesByDate[$date][] = [
                'index' => $index,
                'start' => $start,
                'end' => $end,
            ];
        }

        foreach ($fullDayDates as $date => $indices) {
            if (count($indices) > 1) {
                foreach (array_slice($indices, 1) as $index) {
                    $validator->errors()->add("{$path}.{$index}.override_date", 'Only one full-day override is allowed per date.');
                }
            }

            if (isset($rangesByDate[$date])) {
                foreach ($rangesByDate[$date] as $range) {
                    $validator->errors()->add("{$path}.{$range['index']}.override_date", 'Partial-day overrides cannot be combined with a full-day override on the same date.');
                }
            }
        }

        foreach ($rangesByDate as $ranges) {
            usort(
                $ranges,
                fn (array $left, array $right): int => [$left['start'], $left['end']] <=> [$right['start'], $right['end']]
            );

            for ($position = 1, $length = count($ranges); $position < $length; $position++) {
                $previous = $ranges[$position - 1];
                $current = $ranges[$position];

                if ($current['start'] < $previous['end']) {
                    $validator->errors()->add("{$path}.{$current['index']}.start_time", 'Override time ranges on the same date cannot overlap.');
                }
            }
        }
    }

    /**
     * Display the user's billing history and invoices.
     */
    public function billing()
    {
        $user = auth()->user();
        $invoices = $user->invoices()->latest()->get();
        $sub = $user->subscriptions()->latest()->first();

        return Inertia::render('Settings/BillingHistory', [
            'invoices' => $invoices,
            'subscriptionStatus' => $sub?->status ?? 'none',
            'subscriptionName' => $sub?->name ?? 'none',
        ]);
    }

    /**
     * Download an invoice receipt as PDF.
     */
    public function downloadInvoice(Invoice $invoice)
    {
        // Ensure the user owns the invoice
        if ($invoice->user_id !== auth()->id()) {
            abort(403);
        }

        $invoice->loadMissing('subscription');

        $pdf = Pdf::loadView('emails.invoices.pdf', [
            'invoice' => $invoice,
            'user' => auth()->user(),
        ]);

        return $pdf->download('Scan My Social_Invoice_'.($invoice->razorpay_payment_id ?? $invoice->id).'.pdf');
    }
}
