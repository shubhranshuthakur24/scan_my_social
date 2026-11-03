import { Link } from '@inertiajs/react';
import { CalendarClock } from 'lucide-react';
import { formatDateTime, formatNumber } from './formatters';

const formatLabelMap = {
    image: 'Image',
    video: 'Video',
    reel: 'Reel',
    story: 'Story',
    carousel: 'Carousel',
};

export default function SchedulerQueueSection({ overview = {} }) {
    const queueRows = Array.isArray(overview?.next_queue) ? overview.next_queue : [];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                        <CalendarClock className="h-4.5 w-4.5" />
                    </span>
                    <div>
                        <h2 className="text-base font-black text-slate-900">Scheduler Queue</h2>
                        <p className="text-xs font-semibold text-slate-500">Publishing health for your upcoming Instagram pipeline.</p>
                    </div>
                </div>

                <Link
                    href={route().has('instagram.schedule') ? route('instagram.schedule') : '/instagram/schedule'}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                >
                    Open Schedule
                </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 sm:grid-cols-5">
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p>Draft</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formatNumber(overview?.draft || 0)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p>Scheduled</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formatNumber(overview?.scheduled || 0)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p>Publishing</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formatNumber(overview?.publishing || 0)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p>Failed</p>
                    <p className="mt-1 text-lg font-black text-rose-600">{formatNumber(overview?.failed || 0)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p>Due Now</p>
                    <p className="mt-1 text-lg font-black text-amber-600">{formatNumber(overview?.due_now || 0)}</p>
                </div>
            </div>

            <div className="mt-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Next Scheduled Posts</h3>
                {queueRows.length === 0 ? (
                    <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 text-xs font-semibold text-slate-500">
                        No scheduled posts in the queue.
                    </p>
                ) : (
                    <div className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
                        {queueRows.map((row) => (
                            <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-800">{row.title || 'Scheduled post'}</p>
                                    <p className="text-xs font-semibold text-slate-500">
                                        {formatLabelMap[row?.format] || 'Post'} {row?.instagram_username ? `• @${row.instagram_username}` : ''}
                                    </p>
                                </div>
                                <p className="text-xs font-black text-slate-600">{formatDateTime(row.scheduled_at)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
