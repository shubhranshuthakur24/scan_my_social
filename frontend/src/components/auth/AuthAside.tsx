'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

interface AuthAsideProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  children?: React.ReactNode;
}

export default function AuthAside({
  badge = 'Creator Intelligence',
  title = 'Welcome to',
  subtitle = 'Scan My Social',
  description = 'Track what works, spot trends early, and make faster content decisions with real performance data.',
  children,
}: AuthAsideProps) {
  return (
    <aside className="relative hidden h-full overflow-hidden lg:flex flex-col justify-between border-r border-slate-800/70 bg-[radial-gradient(1200px_circle_at_8%_8%,rgba(139,92,246,0.26),transparent_44%),radial-gradient(1000px_circle_at_90%_15%,rgba(244,63,94,0.15),transparent_36%),linear-gradient(160deg,#020617,#0b1222_58%,#111827)] px-12 py-10 text-white min-h-screen select-none">
      {/* Background Orbits & Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-b from-slate-950/5 via-slate-950/25 to-slate-950/45" />

        {/* Stars */}
        <div className="absolute left-[14%] top-[16%] h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
        <div className="absolute left-[29%] top-[24%] h-1 w-1 rounded-full bg-purple-200/80 animate-pulse" />
        <div className="absolute left-[72%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
        <div className="absolute left-[80%] top-[34%] h-1 w-1 rounded-full bg-pink-200/80 animate-pulse" />
        <div className="absolute left-[22%] top-[64%] h-1 w-1 rounded-full bg-white/70 animate-pulse" />
        <div className="absolute left-[67%] top-[74%] h-1.5 w-1.5 rounded-full bg-purple-200/85 animate-pulse" />

        {/* Center Orbital Ring Glow */}
        <div className="absolute left-1/2 top-1/2 z-20 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.22),rgba(196,181,253,0.16)_35%,rgba(15,23,42,0.34)_74%)] shadow-[0_0_80px_rgba(167,139,250,0.22)]" />
      </div>

      {/* Brand Header */}
      <Link href="/" className="relative z-10 flex w-fit items-center gap-3">
        <img
          src="/images/logo.webp"
          alt="ScanMySocial Logo"
          className="h-11 w-11 rounded-2xl object-cover shadow-lg shadow-purple-500/30"
        />
        <img
          src="/images/ScanMySocial.avif"
          alt="ScanMySocial"
          className="hidden h-10 w-auto object-contain invert brightness-0 sm:block"
        />
      </Link>

      {/* Hero Messaging */}
      <div className="relative z-10 max-w-lg space-y-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-200">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          {badge}
        </p>
        <h1 className="text-5xl font-black leading-tight">
          {title}{' '}
          {subtitle && (
            <span className="block bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] bg-clip-text text-transparent">
              {subtitle}
            </span>
          )}
        </h1>
        {description && (
          <p className="text-lg font-medium leading-relaxed text-slate-300 font-montserrat">
            {description}
          </p>
        )}
      </div>

      {/* Social Proof Badge Footer */}
      {children && <div className="relative z-10 pt-4">{children}</div>}
    </aside>
  );
}
