'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Check, Sparkles, Zap, RefreshCw } from 'lucide-react';

interface SubscriptionTierGridProps {
  availablePlans: any[];
  isLoading?: boolean;
  onSelectPlan: (planId: string) => void;
}

export default function SubscriptionTierGrid({
  availablePlans = [],
  isLoading = false,
  onSelectPlan,
}: SubscriptionTierGridProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <div className="space-y-6">
      {/* Billing Cycle Pill Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-sm font-black text-slate-900">Subscription Plans & Dynamic Pricing Tiers</h3>
          <p className="text-xs text-slate-500 mt-0.5">Select a plan to unlock higher competitor limits and AI generation credits</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${billingCycle === 'annual' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            <span>Annual</span>
            <span className="text-[9px] font-black bg-emerald-400 text-slate-950 px-1.5 py-0.5 rounded-md uppercase">20% OFF</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
          <RefreshCw className="mx-auto text-primary-600 animate-spin" size={24} />
          <p className="text-xs font-bold text-slate-700 mt-2">Loading Available Pricing Tiers...</p>
        </div>
      ) : (
        /* Plan Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {availablePlans.map((plan: any) => {
            const isPopular = Boolean(plan.popular);
            const displayPrice = billingCycle === 'annual' ? (plan.price_annual ?? plan.price_monthly) : plan.price_monthly;
            const displayInrPrice = billingCycle === 'annual' ? (plan.price_inr_annual ?? plan.price_inr_monthly) : plan.price_inr_monthly;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between p-6 rounded-3xl bg-white border transition-all duration-200 ${isPopular
                    ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-xl shadow-purple-500/10'
                    : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                  }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="purple" className="shadow-md shadow-purple-500/20 font-black uppercase text-[10px] tracking-wider px-3">
                      Most Popular Choice
                    </Badge>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-black text-slate-900">{plan.name}</h4>
                    <p className="text-xs font-semibold text-primary-600 mt-0.5">{plan.tagline}</p>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="py-3 border-y border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">${displayPrice}</span>
                      <span className="text-xs font-semibold text-slate-500">/ month</span>
                    </div>
                    {displayInrPrice && (
                      <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                        Billed {billingCycle === 'annual' ? 'annually' : 'monthly'} ({displayInrPrice})
                      </div>
                    )}
                  </div>

                  <ul className="space-y-2.5">
                    {(plan.features || []).map((feat: any, idx: number) => {
                      const text = typeof feat === 'string' ? feat : feat.text;
                      return (
                        <li key={idx} className="flex items-start gap-2 text-xs">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                            <Check size={10} strokeWidth={3} />
                          </div>
                          <span className="text-slate-700 font-medium">{text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <Button
                    type="button"
                    variant={isPopular ? 'primary' : 'secondary'}
                    size="md"
                    onClick={() => onSelectPlan(plan.id)}
                    className="w-full justify-center"
                    icon={isPopular ? <Sparkles size={16} /> : <Zap size={16} />}
                  >
                    {plan.cta || `Select ${plan.name}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
