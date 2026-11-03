import { Link } from '@inertiajs/react';
import {
    CalendarClock,
    FolderKanban,
    PlayCircle,
    ScrollText,
    Users,
    UsersRound,
} from 'lucide-react';
import { formatNumber } from './formatters';

const iconMap = {
    CalendarClock,
    FolderKanban,
    PlayCircle,
    ScrollText,
    Users,
    UsersRound,
};

const toneClassMap = {
    primary: 'text-primary-600',
    sky: 'text-sky-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    violet: 'text-violet-600',
    rose: 'text-rose-600',
};

export default function KpiSummarySection({ items = [] }) {
    const safeItems = Array.isArray(items) ? items : [];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-black text-slate-900">KPI Summary</h2>
                    <p className="text-xs font-semibold text-slate-500">Core numbers for your current workspace health.</p>
                </div>
            </div>

            {safeItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">
                    KPI metrics will appear here after activity starts.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {safeItems.map((item, index) => {
                        const IconComponent = iconMap[item?.icon] || UsersRound;
                        const toneClass = toneClassMap[item?.tone] || toneClassMap.primary;

                        return (
                            <Link
                                key={`${item?.key || 'metric'}-${index}`}
                                href={item?.href || '#'}
                                className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-black uppercase tracking-widest text-slate-400">
                                        {item?.label || 'Metric'}
                                    </p>
                                    <p className="mt-1 text-xl font-black text-slate-900">
                                        {formatNumber(item?.value || 0)}
                                    </p>
                                </div>
                                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 ${toneClass}`}>
                                    <IconComponent className="h-5 w-5" />
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
