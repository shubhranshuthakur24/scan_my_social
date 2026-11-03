import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';

function formatNumber(value) {
    return Number(value || 0).toLocaleString('en-IN');
}

export default function Home({ adminStats }) {
    const actionCards = [
        {
            title: 'Channels Console',
            description: 'Inspect scrape runs and retry profile or post jobs.',
            href: route('admin.channels.index'),
            icon: 'channel',
            cta: 'Open Channels',
        },
        {
            title: 'Payout Requests',
            description: 'Review and process referral payout requests.',
            href: route('admin.payouts.index'),
            icon: 'landmark',
            cta: 'Manage Payouts',
        },
        {
            title: 'Push Notifications',
            description: 'Broadcast product updates or urgent announcements.',
            href: route('admin.notifications.index'),
            icon: 'bell',
            cta: 'Send Notification',
        },
        {
            title: 'Viral Prompts',
            description: 'Create and maintain the viral image prompts catalog.',
            href: route('viral-image-prompts.manage'),
            icon: 'prompts',
            cta: 'Manage Prompts',
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Admin Home" />

            <div className="mx-auto max-w-7xl space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Super Admin</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Control Center</h1>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        Monitor system-level operations and jump into your admin modules.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Channels Monitored</p>
                        <p className="mt-2 text-3xl font-black text-slate-900">{formatNumber(adminStats.channels_monitored)}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-widest text-rose-500">Failed Scrapes</p>
                        <p className="mt-2 text-3xl font-black text-rose-700">{formatNumber(adminStats.failed_scrapes)}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-widest text-amber-600">Pending Payouts</p>
                        <p className="mt-2 text-3xl font-black text-amber-700">{formatNumber(adminStats.pending_payouts)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white shadow-lg">
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">Notifications Sent</p>
                        <p className="mt-2 text-3xl font-black">{formatNumber(adminStats.notifications_sent)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {actionCards.map((card) => (
                        <Link
                            key={card.title}
                            href={card.href}
                            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-black tracking-tight text-slate-900">{card.title}</h2>
                                    <p className="mt-1 text-sm font-medium text-slate-500">{card.description}</p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                    <Icon name={card.icon} size={18} />
                                </div>
                            </div>

                            <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                                {card.cta}
                                <Icon name="arrowRight" size={14} className="transition-transform group-hover:translate-x-0.5" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
