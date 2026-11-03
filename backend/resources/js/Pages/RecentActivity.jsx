import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Icon from '@/Components/Icon';
import Button from '@/Components/Button';
import EmptyState from '@/Components/EmptyState';
import PageBanner from '@/Components/common/PageBanner';


export default function RecentActivity({ activities = { data: [] } }) {
    const activityData = activities.data || [];
    const decodePaginatorLabel = (label) =>
        String(label || '')
            .replace(/<[^>]+>/g, '')
            .replace(/&laquo;/g, '«')
            .replace(/&raquo;/g, '»')
            .replace(/&amp;/g, '&')
            .replace(/&#039;/g, "'")
            .replace(/&quot;/g, '"')
            .trim();

    return (
        <AuthenticatedLayout>
            <Head title="Recent Activity" />

            <div className="mx-auto w-full max-w-5xl space-y-5">
                <PageBanner
                    title="Recent Activity"
                    description="Review what's been happening in your workspace."
                    variant="neutral"
                />

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {activityData.length > 0 ? (
                        <div className="relative px-4 py-5 sm:px-5 sm:py-6">
                            <div className="pointer-events-none absolute bottom-20 left-9 top-12 hidden w-px bg-slate-200 sm:block" />

                            <div className="space-y-4">
                                {activityData.map((item) => (
                                    <div key={item.id} className="relative group">
                                        <div className="absolute left-9 top-7 z-10 hidden h-3 w-3 -translate-x-1.5 transform rounded-full border-2 border-white bg-primary-500 shadow-sm ring-1 ring-slate-300 transition-colors group-hover:ring-primary-300 sm:block" />
                                        <div
                                            className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition sm:ml-12 sm:flex-row sm:p-5"
                                        >
                                            <div className="relative z-10 flex w-full flex-1 flex-row items-start gap-4 sm:gap-5">
                                                <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 shadow-inner sm:h-16 sm:w-16 ${item.bgColor}`}>
                                                    <div className={`absolute inset-0 ${item.iconBgColor} opacity-10`} />
                                                    <Icon name={item.icon} size={24} className={item.color} />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                        <p className="text-base font-bold leading-tight text-slate-900 sm:text-lg">
                                                            {item.title}
                                                        </p>
                                                        {item.category && (
                                                            <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${item.bgColor} ${item.color}`}>
                                                                {item.category}
                                                            </span>
                                                        )}
                                                        <div className="flex items-center gap-1.5 text-slate-400 sm:ml-auto">
                                                            <Icon name="clock" size={14} />
                                                            <span className="text-sm font-medium">{item.time}</span>
                                                        </div>
                                                    </div>

                                                    <p className="break-words text-sm leading-relaxed text-slate-500">
                                                        {item.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {activities.links && activities.links.length > 3 && (
                                <div className="mt-6 border-t border-slate-100 pt-5">
                                    <nav
                                        className="flex flex-wrap items-center justify-center gap-2"
                                        aria-label="Recent activity pagination"
                                    >
                                        {activities.links.map((link, i) => (
                                            <Link
                                                key={i}
                                                href={link.url || '#'}
                                                aria-current={link.active ? 'page' : undefined}
                                                aria-disabled={!link.url}
                                                tabIndex={!link.url ? -1 : undefined}
                                                className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border px-3 py-2 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 ${
                                                    link.active
                                                        ? 'border-primary-600 bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                                } ${!link.url ? 'pointer-events-none cursor-not-allowed opacity-45' : ''}`}
                                            >
                                                {decodePaginatorLabel(link.label)}
                                            </Link>
                                        ))}
                                    </nav>
                                </div>
                            )}
                        </div>
                    ) : (
                        <EmptyState
                            variant="transparent"
                            className="py-16 sm:py-20"
                            title="No activity yet"
                            description="Your workspace is quiet right now. Start by adding a channel or processing your first video."
                            iconContainerClassName="rounded-2xl border-slate-200 bg-slate-50"
                            iconClassName="text-slate-400"
                            titleClassName="text-xl font-bold text-slate-900"
                            descriptionClassName="max-w-md text-sm leading-relaxed text-slate-500"
                            action={(
                                <div className="flex flex-wrap items-center justify-center gap-3">
                                    <Button href="/competitors/create">
                                    Add Channel
                                    </Button>
                                    <Button href="/Library" variant="secondary">
                                    Browse Videos
                                    </Button>
                                </div>
                            )}
                        />
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
