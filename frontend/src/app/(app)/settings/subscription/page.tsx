'use client';

import React, { useState, useEffect } from 'react';
import CreditUsageCard from '@/components/settings/CreditUsageCard';
import SubscriptionTierGrid from '@/components/settings/SubscriptionTierGrid';
import InvoiceHistoryTable from '@/components/settings/InvoiceHistoryTable';
import { getUserSubscriptionDetails } from '@/lib/api/authService';
import { CheckCircle2 } from 'lucide-react';

export default function SubscriptionSettingsPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [creditsDetails, setCreditsDetails] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    setIsLoading(true);
    getUserSubscriptionDetails()
      .then((res) => {
        if (res) {
          setSubscriptionDetails(res.subscription || null);
          setCreditsDetails(res.credits || null);
          setAvailablePlans(res.plans || []);
          setInvoicesList(res.invoices || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load subscription details:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSelectPlan = (planId: string) => {
    triggerToast(`Selected plan #${planId}. Redirecting to secure checkout...`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Credit Usage Overview Card */}
      <CreditUsageCard
        subscriptionDetails={subscriptionDetails}
        creditsDetails={creditsDetails}
      />

      {/* Dynamic SMS Pricing Tiers & Billing Cycle Toggle */}
      <SubscriptionTierGrid
        availablePlans={availablePlans}
        isLoading={isLoading}
        onSelectPlan={handleSelectPlan}
      />

      {/* Invoices & Receipt Downloads */}
      <InvoiceHistoryTable
        invoicesList={invoicesList}
        onToast={triggerToast}
      />
    </div>
  );
}
