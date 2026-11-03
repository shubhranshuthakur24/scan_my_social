'use client';

import React from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ArrowRight, Volume2, ShieldCheck } from 'lucide-react';

export default function PublicAudioNoiseShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-primary-500/20 selection:text-primary-900">
      {/* 1. Public Sticky Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src="/images/logo.webp"
                alt="Scan My Social"
                className="w-9 h-9 rounded-xl object-cover shadow-xs border border-slate-200 group-hover:scale-105 transition-transform shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-slate-900 leading-none">
                  Scan My Social
                </span>
                <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mt-0.5">
                  Audio Workbench
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-slate-200">
              <Badge variant="subtle" color="emerald" dot pulse size="sm">
                100% Client-Side DSP
              </Badge>
            </div>
          </div>

          {/* Navigation Links & CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/tools/watermark-remover"
              className="hidden sm:inline-flex text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Watermark Remover
            </Link>
            <Link href="/login">
              <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} ScanMySocial. High-Precision Browser-Local Audio DSP.</p>
          <div className="flex items-center gap-4 text-slate-600">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/contact" className="hover:underline">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
