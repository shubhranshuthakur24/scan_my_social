'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Tv,
  Film,
  MessageSquare,
  Flame,
  CheckCircle2,
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  TrendingUp,
  Layers
} from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: "How does 'Outlier' detection work?",
    a: "We don't just look for high view counts. Our algorithm compares a video's performance against that specific creator's median views over their last 30 videos. If a video gets 10x more views than their usual baseline, it is flagged as an outlier viral framework you can adapt.",
  },
  {
    q: "How does the AutoDM feature work?",
    a: "Connect your Instagram profile and specify trigger keywords (e.g. 'PLAYBOOK' or 'LINK'). Whenever someone comments that word on your Reels or carousels, our background worker dispatches a personalized direct message within seconds.",
  },
  {
    q: "What is Localized Media Download?",
    a: "Instagram URLs can expire or get throttled. Viralyzer automatically mirrors all scraped videos, audio, and cover images to high-speed Cloudflare R2 storage so you can preview and download them anytime in HD.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes! You can cancel with 1 click directly from your Settings dashboard. You will keep full PRO access until the end of your billing cycle.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-96 right-0 w-[400px] h-[400px] bg-rose-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/images/logo.webp"
              alt="Scan My Social"
              className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-purple-600/30 shrink-0"
            />
            <img
              src="/images/ScanMySocial.avif"
              alt="Scan My Social"
              className="h-7 w-auto object-contain brightness-0 invert"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-rose-500 px-4 py-2 text-xs font-black text-white shadow-lg shadow-purple-600/25 hover:opacity-95 transition-opacity"
            >
              <span>Launch Studio</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 text-xs font-bold text-purple-300 backdrop-blur-md">
          <Sparkles size={14} className="text-purple-400" />
          <span>The Outlier Intelligence & AutoDM Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Turn Viral Creator Outliers Into{' '}
          <span className="bg-gradient-to-r from-purple-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
            Your Winning Scripts.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
          Automatically scrape top creator profiles, flag 10x viral video frameworks, extract hooks, and convert reel comments into paid leads with instant AutoDM.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/register"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-500 px-8 py-4 text-sm font-black text-white shadow-xl shadow-purple-600/30 hover:opacity-95 transition-all"
          >
            <span>Start Free Creator Trial</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md px-8 py-4 text-sm font-bold text-white hover:bg-white/10 transition-colors"
          >
            <span>Explore Demo Studio</span>
          </Link>
        </div>

        {/* Feature Cards Showcase */}
        <div id="features" className="pt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 space-y-4 hover:border-purple-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Flame size={24} />
            </div>
            <h3 className="text-lg font-black text-white">10x Outlier Detection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Never copy average reels. Our statistical model flags content that dramatically outperformed the creator's median benchmark.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 space-y-4 hover:border-purple-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-lg font-black text-white">Instant AutoDM Webhooks</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Auto-respond to Reel comments within 5 seconds with links to your lead magnets, digital products, or calendars.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8 space-y-4 hover:border-purple-500/40 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Film size={24} />
            </div>
            <h3 className="text-lg font-black text-white">Localized Media Storage</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Remote Instagram media files are localized directly to high-speed Cloudflare R2 storage so you never lose assets.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-slate-400">Everything you need to know about Scan My Social</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-white hover:text-purple-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="rounded-3xl border border-white/10 bg-linear-to-b from-purple-950/40 to-slate-950 p-8 sm:p-14 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Ready to automate your viral growth?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              Join elite creators and growth agencies using Scan My Social to produce 10x viral content.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-rose-500 px-8 py-3.5 text-xs font-black text-white shadow-xl hover:opacity-95"
              >
                <span>Create Free Account</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="border-t border-white/10 py-10 px-4 sm:px-6 text-center text-xs text-slate-500 space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-6 font-bold text-slate-400">
          <Link href="/login" className="hover:text-white">Sign In</Link>
          <Link href="/register" className="hover:text-white">Sign Up</Link>
          <Link href="/tools/watermark-remover" className="hover:text-white text-purple-400">Free Watermark Remover</Link>
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
          <Link href="/settings" className="hover:text-white">Pricing</Link>
        </div>
        <p>© 2026 Scan My Social Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
