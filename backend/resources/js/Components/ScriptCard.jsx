import React from 'react';
import { Link } from '@inertiajs/react';
import GlassCard from '@/Components/GlassCard';

export default React.memo(function ScriptCard({ script }) {
    const post = script.content_analysis?.post;
    const isFreshScript = !post;

    return (
        <GlassCard className="group relative overflow-hidden flex flex-col h-full !p-0">
            {isFreshScript ? (
                <div className="aspect-[16/9] w-full relative bg-linear-to-br from-primary-600 via-primary-500 to-accent-500 flex items-center justify-center">
                    <svg className="w-16 h-16 text-white/30 absolute" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                        <span className="px-2 py-1 bg-white text-primary-600 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit mb-2">
                            {script.suggested_topic}
                        </span>
                        <h3 className="text-white font-bold line-clamp-1 leading-tight">{script.title || 'Fresh AI Script'}</h3>
                    </div>
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                        <div className="px-2 py-1 bg-white/90 backdrop-blur-sm text-slate-900 rounded-full text-[10px] font-extrabold shadow-sm border border-white/20">
                            Score: {script.overall_score != null ? script.overall_score : 'N/A'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="aspect-[16/9] w-full relative">
                    <img src={post.display_url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                        <span className="px-2 py-1 bg-primary-600 text-white rounded-md text-[10px] font-bold uppercase tracking-wider w-fit mb-2">
                            {script.suggested_topic || 'Viral Script'}
                        </span>
                        <h3 className="text-white font-bold line-clamp-1 leading-tight">{script.title || script.suggested_topic || post.short_code}</h3>
                    </div>
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                        <div className="px-2 py-1 bg-white/90 backdrop-blur-sm text-slate-900 rounded-full text-[10px] font-extrabold shadow-sm border border-white/20">
                            Score: {script.overall_score != null ? script.overall_score : 'N/A'}
                        </div>
                    </div>
                </div>
            )}
            <div className="flex flex-col flex-1">
                {script.status === 'processing' ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-3">
                        <svg className="w-8 h-8 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-xs font-black uppercase tracking-widest text-primary-600 animate-pulse">AI is working...</span>
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm line-clamp-3 mb-6 italic leading-relaxed">
                        {script.script}
                    </p>
                )}
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {script.estimated_duration || '30s'}
                    </div>
                    {script.status === 'processing' ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Processing</span>
                    ) : (
                        <Link href={`/scripts/${script.id}`} className="text-primary-600 font-bold text-xs hover:text-primary-800 transition-colors">
                            View Script
                        </Link>
                    )}
                </div>
            </div>
        </GlassCard>
    );
});
