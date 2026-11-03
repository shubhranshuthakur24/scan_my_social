import { Link } from '@inertiajs/react';
import { Bell, Clock3 } from 'lucide-react';
import Icon from '@/Components/Icon';
import { formatNumber } from './formatters';

export default function RecentActivitySection({ overview = {} }) {
    const items = Array.isArray(overview?.items) ? overview.items : [];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                        <Clock3 className="h-4.5 w-4.5" />
                    </span>
                    <div>
                        <h2 className="text-base font-black text-slate-900">Recent Activity</h2>
                        <p className="text-xs font-semibold text-slate-500">Latest actions and system movement from your workspace.</p>
                    </div>
                </div>

                <Link
                    href={route().has('recent-activity') ? route('recent-activity') : '/recent-activity'}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                >
                    View All
                </Link>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                    <Bell className="h-3.5 w-3.5" />
                    {formatNumber(overview?.unread_notifications || 0)} unread notifications
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatNumber(overview?.last_7_days || 0)} activities in 7 days
                </span>
            </div>

            {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs font-semibold text-slate-500">
                    No recent activity yet. Your workspace actions will appear here.
                </p>
            ) : (
                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                    {items.map((item, index) => (
                        <Link
                            key={`${item?.href || 'activity'}-${index}`}
                            href={item?.href || '#'}
                            className="flex items-start gap-3 px-3 py-2.5 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                        >
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <Icon name={item?.icon || 'activity'} size={4} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800">{item?.title || 'Activity'}</p>
                                <p className="truncate text-xs font-semibold text-slate-500">{item?.desc || ''}</p>
                            </div>
                            <span className="shrink-0 text-[11px] font-semibold text-slate-400">{item?.date || ''}</span>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
