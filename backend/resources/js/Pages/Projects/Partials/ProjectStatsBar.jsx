import React, { useMemo } from 'react';
import { FolderKanban, LayoutGrid, Clock } from 'lucide-react';

function timeAgo(dateStr) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 2) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * @param {{ projects: object[] }} props
 */
export default function ProjectStatsBar({ projects = [] }) {
    const stats = useMemo(() => {
        const projectCount = projects.length;
        const totalItems = projects.reduce((sum, p) => sum + (p.posts_count || 0), 0);

        const latestUpdated = projects.reduce((latest, p) => {
            const d = new Date(p.updated_at || p.created_at || 0);
            return d > latest ? d : latest;
        }, new Date(0));

        return {
            projectCount,
            totalItems,
            lastUpdated: latestUpdated.getTime() > 0 ? latestUpdated.toISOString() : null,
        };
    }, [projects]);

    if (stats.projectCount === 0) return null;

    const items = [
        {
            icon: FolderKanban,
            iconColor: 'text-primary-500',
            iconBg: 'bg-primary-50',
            value: stats.projectCount,
            label: stats.projectCount === 1 ? 'Project' : 'Projects',
        },
        {
            icon: LayoutGrid,
            iconColor: 'text-accent-500',
            iconBg: 'bg-accent-50',
            value: stats.totalItems,
            label: stats.totalItems === 1 ? 'Video saved' : 'Videos saved',
        },
        ...(stats.lastUpdated
            ? [
                  {
                      icon: Clock,
                      iconColor: 'text-slate-400',
                      iconBg: 'bg-slate-50',
                      value: timeAgo(stats.lastUpdated),
                      label: 'last update',
                      isText: true,
                  },
              ]
            : []),
    ];

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            {items.map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                    <React.Fragment key={item.label}>
                        <div className="flex items-center gap-2">
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
