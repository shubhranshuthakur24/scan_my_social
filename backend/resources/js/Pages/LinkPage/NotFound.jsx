import { Head, Link } from '@inertiajs/react';

export default function NotFound({ username }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
            <Head title="Link page not found" />
            <section className="max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">404</p>
                <h1 className="mt-4 text-3xl font-black">@{username} is not available</h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">This Social Bio Links page may be unpublished, renamed, or removed.</p>
                <Link href="/" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100">
                    Back to home
                </Link>
            </section>
        </main>
    );
}

