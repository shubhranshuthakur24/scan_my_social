'use client';

import React from 'react';
import { Zap, Lock, Sparkles, Globe, ShieldCheck } from 'lucide-react';

/**
 * Top header pills: Processed Locally, Fast Processing, Your Media Stays Private
 */
export function WatermarkHeaderPills() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200/90 text-slate-700 shadow-2xs">
        <Zap size={13} className="text-amber-500 fill-amber-500" />
        <span>Processed Locally</span>
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200/90 text-slate-700 shadow-2xs">
        <Sparkles size={13} className="text-primary-600" />
        <span>Fast Processing</span>
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200/90 text-slate-700 shadow-2xs">
        <Lock size={13} className="text-emerald-600" />
        <span>Your Media Stays Private</span>
      </div>
    </div>
  );
}

/**
 * Bottom 4-benefit feature bar matching reference mockup:
 * High Quality Output, Browser Powered, Safe & Private, Fast & Easy
 */
export function WatermarkBenefitsBar() {
  const benefits = [
    {
      title: 'High Quality Output',
      desc: 'Lossless quality retention',
      icon: Sparkles,
      iconColor: 'text-primary-600',
      bgColor: 'bg-primary-50 border-primary-100',
    },
    {
      title: 'Browser Powered',
      desc: 'No server uploads needed',
      icon: Globe,
      iconColor: 'text-sky-600',
      bgColor: 'bg-sky-50 border-sky-100',
    },
    {
      title: 'Safe & Private',
      desc: 'Files stay on your device',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Fast & Easy',
      desc: 'One-click cleanup process',
      icon: Zap,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 border-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
      {benefits.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200/80 bg-white p-3.5 flex items-start gap-3 shadow-2xs"
          >
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${item.bgColor}`}
            >
              <Icon size={16} className={item.iconColor} />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                {item.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
