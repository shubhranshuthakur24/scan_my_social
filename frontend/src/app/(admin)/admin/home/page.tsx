'use client';

import React from 'react';
import Link from 'next/link';
import { formatNumber } from '@/lib/format';
import {
  Tv,
  Landmark,
  Bell,
  Sparkles,
  FileCode,
  Briefcase,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function AdminHomePage() {
  const stats = {
    channels_monitored: 842,
    failed_scrapes: 3,
    pending_payouts: 4,
    notifications_sent: 28,
  };

  const actionCards = [
    {
      title: 'Channels Console',
      description: 'Inspect scrape runs, monitor Apify workers, and retry profile/post jobs.',
      href: '/admin/channels',
      icon: Tv,
      cta: 'Open Channels',
    },
    {
      title: 'Payout Requests',
      description: 'Review and process affiliate referral payout requests.',
      href: '/admin/payouts',
      icon: Landmark,
      cta: 'Manage Payouts',
    },
    {
      title: 'Push Notifications',
      description: 'Broadcast product updates or system announcements to all users.',
      href: '/admin/notifications',
      icon: Bell,
      cta: 'Send Notification',
    },
    {
      title: 'Viral Prompts Catalog',
      description: 'Create and maintain the prompt library for image and script generation.',
      href: '/admin/prompts',
      icon: Sparkles,
      cta: 'Manage Prompts',
    },
    {
      title: 'Script Intelligence Hub',
      description: 'Analyze viral angles, benchmark retention patterns across creators.',
      href: '/admin/script-intelligence',
      icon: FileCode,
      cta: 'View Intelligence',
    },
    {
      title: 'Affiliates Directory',
      description: 'Manage creator partner accounts, commission tiers, and approvals.',
      href: '/admin/affiliates',
      icon: Briefcase,
      cta: 'Manage Affiliates',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Super Admin Control Center Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-700">
          <ShieldCheck size={14} className="text-primary-600" /> Super Admin
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          System Control Center
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
          Monitor background Apify scraping workers, queues, affiliate balances, and global platform health.
        </p>
      </div>

      {/* Global Stat Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Channels Monitored</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{formatNumber(stats.channels_monitored)}</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-xs">
          <p className="text-[11px] font-black uppercase tracking-widest text-rose-500">Failed Scrapes</p>
          <p className="mt-2 text-3xl font-black text-rose-700">{stats.failed_scrapes}</p>
          <span className="text-[10px] font-bold text-rose-600">Requires worker retry</span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-xs">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-600">Pending Payouts</p>
          <p className="mt-2 text-3xl font-black text-amber-700">{stats.pending_payouts}</p>
          <span className="text-[10px] font-bold text-amber-600">$1,420 awaiting transfer</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white shadow-lg">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">Notifications Sent</p>
          <p className="mt-2 text-3xl font-black">{stats.notifications_sent}</p>
          <span className="text-[10px] font-bold text-slate-400">Broadcasts delivered</span>
        </div>
      </div>

      {/* Action Navigation Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {actionCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black tracking-tight text-slate-900">{card.title}</h2>
                  <p className="mt-1 text-xs font-medium text-slate-500 leading-relaxed">{card.description}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-primary-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Icon size={20} />
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary-600 group-hover:text-primary-800 pt-2 border-t border-slate-100">
                <span>{card.cta}</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
