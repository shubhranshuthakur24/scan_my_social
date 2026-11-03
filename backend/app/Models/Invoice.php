<?php

namespace App\Models;

use App\Services\PlanService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class Invoice extends Model
{
    protected $guarded = [];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function lineItemTitle(): string
    {
        $plan = trim((string) $this->subscription?->name);

        if ($plan === '' || $plan === 'free') {
            return 'ScanMySocial AI Subscription';
        }

        $tier = PlanService::normalizePlanName($plan) ?? $plan;
        $tierDisplayName = Str::of($tier)->replace('_', ' ')->headline()->toString();
        $interval = str_ends_with($plan, '_yearly') ? 'Yearly' : 'Monthly';

        return "ScanMySocial {$tierDisplayName} {$interval} Subscription";
    }

    public function billingPeriodLabel(): ?string
    {
        if (! $this->created_at instanceof Carbon) {
            return null;
        }

        $start = $this->created_at->copy();
        $end = $this->billingPeriodEnd($start);

        return $start->format('M d, Y').' - '.$end->format('M d, Y');
    }

    private function billingPeriodEnd(Carbon $start): Carbon
    {
        $plan = trim((string) $this->subscription?->name);
        $end = $start->copy();

        if (str_ends_with($plan, '_yearly')) {
            return $end->addYearNoOverflow()->subDay();
        }

        return $end->addMonthNoOverflow()->subDay();
    }
}
