'use client';

import React from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react';

export default function PublicWebPageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="max-w-md w-full rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
          <AlertCircle size={26} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.35em] text-rose-400">Service Notice</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Unable to Load Page</h1>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
          We encountered an issue loading this page. Please try again in a few moments.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-500 px-5 py-3 text-sm font-black text-white transition active:scale-98 shadow-sm min-h-[44px]"
          >
            <RefreshCw size={15} />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-5 py-3 text-sm font-black text-slate-200 transition active:scale-98 min-h-[44px]"
          >
            <ArrowLeft size={15} />
            <span>Back to home</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
