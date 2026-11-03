'use client';

import React from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  ArrowRight,
  Film,
  MessageSquare,
  Layers,
} from 'lucide-react';

export default function PublicWatermarkShell({
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
                  Free AI Tools
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-slate-200">
              <Badge variant="subtle" color="emerald" dot pulse size="sm">
                Free Browser AI
              </Badge>
              <Badge variant="subtle" color="purple" size="sm">
                No Cloud Uploads
              </Badge>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm" icon={ArrowRight}>
                <span>Get Full Suite</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Tool Workspace Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-12">
        {children}

        {/* 3. Conversion / Platform Capabilities Section */}
        <section className="rounded-3xl bg-white border border-slate-200/80 p-8 sm:p-10 shadow-xs space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="subtle" color="purple" size="sm">
              The All-in-One Creator Growth Suite
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Ready to automate your entire social growth engine?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Viralyzer gives creators and marketing agencies the tools to spy on viral competitor reels, schedule multi-format posts, and automatically send DMs when viewers comment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-6 space-y-3 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                <Film size={20} />
              </div>
              <h3 className="text-base font-black text-slate-900">Viral Reel Outlier Engine</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Benchmark competitor reels against their 30-day baseline to instantly spot 10x viral frameworks and adapt them for your niche.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-6 space-y-3 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <MessageSquare size={20} />
              </div>
              <h3 className="text-base font-black text-slate-900">Instagram AutoDM Funnels</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically reply to reel and carousel comments with personalized direct messages, PDFs, and lead magnet links in seconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-6 space-y-3 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Layers size={20} />
              </div>
              <h3 className="text-base font-black text-slate-900">Smart Content Scheduler</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Plan, organize, and publish Reels, Carousels, Stories, and Photos with built-in ratio croppers and live device preview mockups.
              </p>
            </div>
          </div>

          {/* Bottom Conversion CTA Strip */}
          <div className="rounded-2xl bg-linear-to-r from-primary-600 to-indigo-700 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md shadow-primary-600/20">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-lg font-black tracking-tight">Create your free Viralyzer account</h4>
              <p className="text-xs text-primary-100">
                Unlock competitor tracking, multi-video batch watermark clean &amp; merge, and AutoDM growth pipelines.
              </p>
            </div>
            <Link href="/register" className="shrink-0">
              <Button
                variant="secondary"
                size="lg"
                icon={ArrowRight}
                className="bg-white text-slate-900 hover:bg-slate-100 shadow-md font-black"
              >
                Sign Up Free
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* 4. Public Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/logo.webp" alt="Scan My Social" className="w-5 h-5 rounded-md" />
            <span className="font-bold text-slate-700">Scan My Social &bull; Viralyzer</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <Link href="/login" className="hover:text-slate-900 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-slate-900 transition-colors">
              Sign Up
            </Link>
            <Link href="/tools/watermark-remover" className="text-primary-600 font-bold">
              Watermark Remover
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
