import React from 'react';
import { motion } from 'framer-motion';

export default function AnalysisItem({ icon, label, value, score, fullWidth = false }) {
    const getScoreColor = (s) => {
        if (!s) return 'bg-slate-100 text-slate-400 border-slate-200';
        if (s >= 9) return 'bg-emerald-500 text-white border-emerald-400';
        if (s >= 7) return 'bg-primary-500 text-white border-primary-400';
        if (s >= 5) return 'bg-amber-500 text-white border-amber-400';
        return 'bg-rose-500 text-white border-rose-400';
    };

    const getAccentBorder = (s) => {
        if (!s) return 'border-l-slate-200';
        if (s >= 9) return 'border-l-emerald-400';
        if (s >= 7) return 'border-l-primary-400';
        if (s >= 5) return 'border-l-amber-400';
        return 'border-l-rose-400';
    };

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, scale: 0.95, y: 15 },
                visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
            }}
            className={`group flex flex-col gap-3 p-5 rounded-2xl bg-white/60 backdrop-blur-md border border-slate-200/40 border-l-[3px] ${getAccentBorder(score)} shadow-sm hover:shadow-lg hover:shadow-slate-200/30 transition-all duration-300 ${fullWidth ? 'sm:col-span-2' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform duration-300 border border-slate-100">
                        {icon}
                    </div>
                    <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 block mb-0.5">{label}</span>
                        {score !== null && score !== undefined ? (
                            <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${getScoreColor(score)}`}
                                        style={{ width: `${score * 10}%` }}
                                    />
                                </div>
                                <span className={`text-[11px] font-black ${score >= 7 ? 'text-emerald-600' : 'text-slate-500'}`}>{score}/10</span>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
            <p className="text-[14px] text-slate-600 font-medium leading-relaxed tracking-tight">{value}</p>
        </motion.div>
    );
}

