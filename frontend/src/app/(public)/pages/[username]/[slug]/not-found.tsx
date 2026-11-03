import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function PublicWebPageNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="max-w-md w-full rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 text-slate-300 flex items-center justify-center mx-auto">
          <ShieldAlert size={26} className="text-amber-400" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">404 Error</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Page Not Found</h1>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
          This Web Page may be private, unpublished, or the link may be outdated.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100 active:scale-98 shadow-sm min-h-[44px]"
          >
            <ArrowLeft size={16} />
            <span>Back to home</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
