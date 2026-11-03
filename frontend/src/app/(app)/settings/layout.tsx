'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import {
  User,
  CreditCard,
  Camera,
  Key,
  Bell,
  ShieldCheck,
} from 'lucide-react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { id: 'profile', label: 'Profile & Payouts', href: '/settings/profile', icon: User },
    { id: 'subscription', label: 'Subscription & Credits', href: '/settings/subscription', icon: CreditCard },
    { id: 'integrations', label: 'Instagram Accounts', href: '/settings/integrations', icon: Camera },
    { id: 'api', label: 'API Keys & Workers', href: '/settings/api', icon: Key },
    { id: 'notifications', label: 'Notifications', href: '/settings/notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Account & System Settings"
        description="Configure your Scan My Social PRO subscription, connected Instagram accounts, background scraping workers, and payout details."
        actions={
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3.5 py-1.5 text-xs font-black text-purple-700 border border-purple-200 shadow-2xs">
            <ShieldCheck size={14} className="text-primary-600" /> Active Plan: Scan My Social PRO Studio
          </div>
        }
      />

      {/* Navigation Sub-route Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || (tab.id === 'profile' && pathname === '/settings');

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Sub-route Content Container */}
      <main className="mt-6">{children}</main>
    </div>
  );
}
