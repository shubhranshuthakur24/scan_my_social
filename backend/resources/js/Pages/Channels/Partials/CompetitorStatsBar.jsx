import React, { useMemo } from 'react';
import { UsersRound, BookMarked, LayoutGrid } from 'lucide-react';

const PLATFORM_LABELS = {
    instagram: 'Instagram',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    twitter: 'Twitter / X',
};

/**
 * @param {{ channels: object[], watchlists: object[] }} props
 */
export default function CompetitorStatsBar({ channels = [], watchlists = [] }) {
    const stats = useMemo(() => {
        const channelCount = channels.length;
        const watchlistCount = watchlists.length;

        const platformSet = new Set(
            channels.map((c) => c.platform).filter(Boolean),
        );
        const platformCount = platformSet.size;

        const platformNames = [...platformSet]
            .map((p) => PLATFORM_LABELS[p] || p)
            .join(', ');

        return { channelCount, watchlistCount, platformCount, platformNames };
    }, [channels, watchlists]);

    if (stats.channelCount === 0) return null;

    const items = [
        {
            icon: UsersRound,
            iconColor: 'text-primary-500',
            iconBg: 'bg-primary-50',
            value: stats.channelCount,
            label: stats.channelCount === 1 ? 'Channel tracked' : 'Channels tracked',
        },
        {
            icon: BookMarked,
            iconColor: 'text-accent-500',
            iconBg: 'bg-accent-50',
            value: stats.watchlistCount,
            label: stats.watchlistCount === 1 ? 'Watchlist' : 'Watchlists',
        },
        {
            icon: LayoutGrid,
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-50',
            value: stats.platformCount,
            label: stats.platformCount === 1 ? 'Platform' : 'Platforms',
            tooltip: stats.platformNames || undefined,
        },
    ];

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            {items.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                    <React.Fragment key={item.label}>
                        <div
                            className="flex items-center gap-2"
                            title={item.tooltip}
                        >
                            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.iconBg}`}>
                                <ItemIcon className={`h-3.5 w-3.5 ${item.iconColor}`} strokeWidth={2} />
                            </span>
                            <span className="text-sm font-black text-slate-800">
                                {item.value}
                            </span>
                            <span className="text-sm text-slate-500">
                                {item.label}
                            </span>
                        </div>
                        {idx < items.length - 1 && (
                            <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
