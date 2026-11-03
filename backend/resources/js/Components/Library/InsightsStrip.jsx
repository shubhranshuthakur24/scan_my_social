import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Flame, Zap, Eye, Heart } from 'lucide-react';
import { QUICK_FILTER_PRESETS } from '@/constants/quickFilterPresets';

const STORAGE_KEY = 'scanmysocial.library.insights_collapsed';

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return String(Math.round(num));
}

function formatMultiplier(num) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return `${parseFloat(num).toFixed(1)}×`;
}

function formatPercent(num) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return `${parseFloat(num).toFixed(1)}%`;
}

function avg(arr, key) {
    const valid = arr
        .map((p) => parseFloat(p[key] ?? 0))
        .filter((v) => !isNaN(v));
    if (valid.length === 0) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * @param {{
 *   posts: object[],
 *   onApplyPreset: (preset: import('@/constants/quickFilterPresets').QuickFilterPreset) => void,
 * }} props
 */
export default function InsightsStrip({ posts, onApplyPreset }) {
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return window.localStorage.getItem(STORAGE_KEY) === '1';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
        } catch {
            // ignore
        }
    }, [collapsed]);

    const insights = useMemo(() => {
        if (!posts || posts.length === 0) return null;

        const explosiveCount = posts.filter(
            (p) => parseFloat(p.breakout_multiplier ?? 0) >= 5,
        ).length;

        const avgOutlier = avg(posts, 'breakout_multiplier');
        const avgViews = avg(posts, 'views');
        const avgEngagement = avg(posts, 'engagement_rate');

        return { explosiveCount, avgOutlier, avgViews, avgEngagement };
    }, [posts]);

    if (!insights) return null;

    const explosivePreset = QUICK_FILTER_PRESETS.find((p) => p.key === 'explosive');
    const engagementPreset = QUICK_FILTER_PRESETS.find((p) => p.key === 'high_engagement');

    const kpis = [
        {
            label: 'Explosive Posts',
            value: insights.explosiveCount,
            format: (v) => String(v),
            suffix: insights.explosiveCount === 1 ? 'outlier' : 'outliers',
            icon: Flame,
            iconColor: 'text-rose-500',
            iconBg: 'bg-rose-50',
            borderColor: 'hover:border-rose-200',
            clickable: insights.explosiveCount > 0,
            onClick: () => explosivePreset && onApplyPreset(explosivePreset),
            tooltip: 'Filter to explosive posts (>5× multiplier)',
        },
        {
            label: 'Avg. Outlier Score',
            value: insights.avgOutlier,
            format: formatMultiplier,
            suffix: 'avg score',
            icon: Zap,
            iconColor: 'text-amber-500',
            iconBg: 'bg-amber-50',
            borderColor: 'hover:border-amber-200',
            clickable: false,
            onClick: null,
            tooltip: 'Average breakout multiplier across visible posts',
        },
        {
            label: 'Avg. Views',
            value: insights.avgViews,
            format: formatNumber,
            suffix: 'per post',
            icon: Eye,
            iconColor: 'text-blue-500',
            iconBg: 'bg-blue-50',
            borderColor: 'hover:border-blue-200',
            clickable: false,
            onClick: null,
            tooltip: 'Average view count across visible posts',
        },
        {
            label: 'Avg. Engagement',
            value: insights.avgEngagement,
            format: formatPercent,
            suffix: 'rate',
            icon: Heart,
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-50',
            borderColor: 'hover:border-emerald-200',
            clickable: true,
            onClick: () => engagementPreset && onApplyPreset(engagementPreset),
            tooltip: 'Filter to high-engagement posts (>5%)',
        },
    ];

    return (
        <div className="mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Header row */}
            <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="flex w-full items-center justify-between px-4 py-2.5 transition-colors hover:bg-slate-50"
                aria-expanded={!collapsed}
                aria-controls="insights-strip-body"
            >
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                        📊 Insights
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        {posts.length} {posts.length === 1 ? 'video' : 'videos'}
                    </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    {collapsed ? (
                        <>
                            Expand <ChevronDown className="h-3.5 w-3.5" />
                        </>
                    ) : (
                        <>
                            Collapse <ChevronUp className="h-3.5 w-3.5" />
                        </>
                    )}
                </div>
            </button>

            {/* KPI cards */}
            <AnimatePresence initial={false}>
                {!collapsed && (
                    <motion.div
                        id="insights-strip-body"
                        key="insights-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-4">
                            {kpis.map((kpi) => {
                                const KpiIcon = kpi.icon;
                                const Tag = kpi.clickable ? 'button' : 'div';

                                return (
                                    <Tag
                                        key={kpi.label}
                                        type={kpi.clickable ? 'button' : undefined}
                                        onClick={kpi.clickable ? kpi.onClick : undefined}
                                        title={kpi.tooltip}
                                        className={`group flex flex-col gap-1.5 bg-white p-4 transition-colors ${
                                            kpi.clickable
                                                ? `cursor-pointer border border-transparent ${kpi.borderColor} hover:bg-slate-50/80`
                                                : 'cursor-default'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`flex h-6 w-6 items-center justify-center rounded-lg ${kpi.iconBg}`}
                                            >
                                                <KpiIcon
                                                    className={`h-3.5 w-3.5 ${kpi.iconColor}`}
                                                    strokeWidth={2}
                                                />
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                {kpi.label}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-xl font-black tabular-nums text-slate-900">
                                                {kpi.format(kpi.value)}
                                            </span>
                                            <span className="text-[11px] font-medium text-slate-400">
                                                {kpi.suffix}
                                            </span>
                                        </div>
                                        {kpi.clickable && (
                                            <span className="text-[10px] font-semibold text-slate-400 transition-colors group-hover:text-primary-500">
                                                Click to filter →
                                            </span>
                                        )}
                                    </Tag>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
