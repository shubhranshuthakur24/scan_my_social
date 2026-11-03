import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';

export default function Show({ prompt, relatedPrompts = [] }) {
    const [copied, setCopied] = useState(false);

    const normalizedPromptText = useMemo(() => String(prompt?.prompt || '').trim(), [prompt?.prompt]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(normalizedPromptText);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    };

    return (
        <>
            <Head title={`${prompt?.title || 'Prompt'} - Prompt Details`} />

            <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl" />
                <div className="absolute bottom-[-80px] right-[-60px] h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <main className="relative min-h-screen bg-[#FAFAFA] px-4 pb-20 pt-24 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl">
                    <Link
                        href={route('viral-image-prompts.index')}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back To Prompts
                    </Link>

                    <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
                        <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 shadow-2xl shadow-primary-500/10 backdrop-blur-xl">
                            {prompt?.image_path ? (
                                <img
                                    src={prompt.image_path}
                                    alt={prompt?.title || 'Prompt image'}
                                    className="h-full min-h-[280px] w-full object-cover"
                                />
                            ) : (
                                <div className="flex min-h-[280px] items-center justify-center bg-[linear-gradient(135deg,rgba(248,247,255,0.95),rgba(238,242,255,0.92))] px-8 text-center text-sm font-semibold text-slate-500">
                                    No preview image available for this prompt.
                                </div>
                            )}
                        </div>

                        <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-2xl shadow-primary-500/10 backdrop-blur-xl">
                            <span className="inline-flex rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary-700">
                                {prompt?.category || 'Uncategorized'}
                            </span>
                            <h1 className="mt-3 text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
                                {prompt?.title || 'Untitled Prompt'}
                            </h1>

                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Prompt</p>
                                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                                    {normalizedPromptText || 'No prompt text found.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleCopy}
                                className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-colors ${
                                    copied
                                        ? 'border border-emerald-200 bg-emerald-500 text-white'
                                        : 'border border-primary-200 bg-primary-600 text-white hover:bg-primary-700'
                                }`}
                            >
                                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copied ? 'Copied' : 'Copy Prompt'}
                            </button>
                        </div>
                    </section>

                    {relatedPrompts.length > 0 && (
                        <section className="mt-8">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <h2 className="text-lg font-black text-slate-900">Related Prompts</h2>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{relatedPrompts.length} items</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {relatedPrompts.map((item) => (
                                    <article key={item.id} className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-lg shadow-primary-500/5">
                                        <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                                            {item.image_path ? (
                                                <img src={item.image_path} alt={item.title} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">No image</div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-700">{item.category}</p>
                                            <h3 className="mt-1 line-clamp-2 text-sm font-black text-slate-900">{item.title}</h3>
                                            <Link
                                                href={route('viral-image-prompts.show', item.slug)}
                                                className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 transition-colors hover:bg-slate-50"
                                            >
                                                View Details
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}

Show.layout = (page) => <PublicLayout>{page}</PublicLayout>;
