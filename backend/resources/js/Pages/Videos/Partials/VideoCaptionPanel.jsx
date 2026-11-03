import React from 'react';
import SectionHeader from './components/SectionHeader';
import Icon from '@/Components/Icon';

export default function VideoCaptionPanel({
    caption,
    truncatedCaption,
    showFullCaption,
    onExpand,
    onCollapse,
}) {
    const isLongCaption = caption.length > 200;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
                icon={<Icon name="fileText" />}
                title="Post Caption"
                subtitle="Original creator copy and context."
            />

            <div className="relative mt-4 rounded-2xl border border-slate-100 bg-slate-50/40 p-5 overflow-hidden">
                {/* Decorative Quotes */}
                <span className="absolute -top-3 -left-1 font-serif text-8xl text-slate-200/50 pointer-events-none select-none">“</span>
                <span className="absolute -bottom-14 -right-1 font-serif text-8xl text-slate-200/30 pointer-events-none select-none">”</span>

                <div className={`relative z-10 transition-all duration-300 ${!showFullCaption && isLongCaption ? 'max-h-[140px] overflow-hidden' : ''}`}>
                    <p className="break-words text-[14px] leading-relaxed tracking-tight text-slate-600 whitespace-pre-line">
                        {caption}
                    </p>
                </div>

                {!showFullCaption && isLongCaption && (
                    <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent flex items-end justify-center pb-2 z-20">
                        <button
                            type="button"
                            onClick={onExpand}
                            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary-600 shadow-sm transition hover:text-primary-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 active:scale-95"
                        >
                            Expand Caption
                        </button>
                    </div>
                )}
            </div>

            {showFullCaption && isLongCaption && (
                <button
                    type="button"
                    onClick={onCollapse}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 active:scale-95 border border-slate-100 hover:border-slate-200 bg-white shadow-sm"
                >
                    <Icon name="chevronUp" className="w-3.5 h-3.5" />
                    Minimize
                </button>
            )}
        </section>
    );
}
