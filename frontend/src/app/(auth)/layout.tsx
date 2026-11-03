'use client';

import React from 'react';
import Link from 'next/link';
import AuthAside from '@/components/auth/AuthAside';
import SocialProofBadge from '@/components/auth/SocialProofBadge';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 font-sans selection:bg-purple-500/30 selection:text-purple-700">
      {/* Background ambient color blurs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-purple-300/30 blur-3xl lg:opacity-100 opacity-60" />
        <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-rose-300/20 blur-3xl lg:opacity-100 opacity-60" />
        <div className="absolute -bottom-28 left-1/3 h-96 w-96 rounded-full bg-purple-300/20 blur-3xl lg:opacity-100 opacity-60" />
      </div>

      {/* 2-Column Responsive Grid Container */}
      <div className="relative min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Left Side: Cosmic Auth Aside (Desktop Only) */}
        <AuthAside
          badge="Creator Intelligence"
          title="Welcome to"
          subtitle="Scan My Social"
          description="Track what works, spot trends early, and make faster content decisions with real performance data."
        >
          <SocialProofBadge />
        </AuthAside>

        {/* Right Side: Main Auth Card Container */}
        <main className="flex min-h-screen items-start justify-center px-4 py-6 sm:px-8 sm:py-10 lg:items-center lg:px-14 lg:py-12">
          <div className="w-full max-w-lg">
            {/* Mobile Header Logo */}
            <Link href="/" className="mb-4 inline-flex items-center gap-3 lg:hidden">
              <img
                src="/images/logo.webp"
                alt="ScanMySocial Logo"
                className="h-9 w-9 rounded-xl object-cover shadow-md shadow-purple-500/25"
              />
              <img
                src="/images/ScanMySocial.avif"
                alt="ScanMySocial"
                className="h-10 w-auto object-contain brightness-0 sm:block"
              />
            </Link>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
