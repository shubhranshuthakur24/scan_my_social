import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import Icon from '@/Components/Icon';

export default function VideoShowHeader({
    title,
    ownerUsername,
    postedAgo,
    breakoutLabel,
    outlierScore,
    breakoutClasses,
}) {
    return (
        <div className="mb-6">


            <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-snug mb-3">{title}</h1>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <Icon name="instagram" size={24} />
                    <span className="text-sm font-semibold text-slate-700">@{ownerUsername}</span>
                </div>

                <span className="text-slate-300">|</span>
                <span className="text-sm font-medium text-slate-500">{postedAgo}</span>

                {breakoutLabel && breakoutLabel !== 'Insufficient Data' ? (
                    <>
                        <span className="text-slate-300">|</span>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${breakoutClasses.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${breakoutClasses.dot}`} />
                            {breakoutLabel} - {typeof outlierScore === 'number' ? outlierScore.toFixed(1) : outlierScore}x
                        </span>
                    </>
                ) : null}
            </div>
        </div>
    );
}
