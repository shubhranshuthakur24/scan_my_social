import React from 'react';
import Icon from '@/Components/Icon';

export default function MetricCard({ icon, value, label, color }) {
    const colorClasses = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200/40',
        primary: 'bg-primary-50 text-primary-600 border-primary-200/40',
        orange: 'bg-accent-50 text-accent-600 border-accent-200/40',
        pink: 'bg-pink-50 text-pink-600 border-pink-200/40',
        slate: 'bg-slate-50 text-slate-500 border-slate-200/40',
        accent: 'bg-accent-50 text-accent-600 border-accent-200/40',
    };

    return (
        <div
            className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 bg-white/40 backdrop-blur-sm ${colorClasses[color] || colorClasses.slate}`}
        >
            <div className="opacity-80 scale-90">
                {typeof icon === 'string' ? <Icon name={icon} size={20} /> : icon}
            </div>
            <span className="text-[14px] font-black tracking-tighter text-center leading-none mt-0.5">{value}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center px-1 line-clamp-1">{label}</span>
        </div>
    );
}

