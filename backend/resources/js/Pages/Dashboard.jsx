import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { CalendarClock, FilePlus2, Users2 } from 'lucide-react';
import AppointmentsSection from './Dashboard/Partials/AppointmentsSection';
import CrmFunnelSection from './Dashboard/Partials/CrmFunnelSection';
import InstagramAnalyticsSection from './Dashboard/Partials/InstagramAnalyticsSection';
// import KpiSummarySection from './Dashboard/Partials/KpiSummarySection';
import RecentActivitySection from './Dashboard/Partials/RecentActivitySection';
import SchedulerQueueSection from './Dashboard/Partials/SchedulerQueueSection';

const quickActions = [
    {
        key: 'schedule_post',
        label: 'Schedule Post',
        description: 'Queue your next Instagram post.',
        icon: CalendarClock,
        href: '/instagram/schedule',
    },
    {
        key: 'capture_leads',
        label: 'Open CRM',
        description: 'Review leads and move pipeline.',
        icon: Users2,
        href: '/crm',
    },
    {
        key: 'create_script',
        label: 'Create Script',
        description: 'Draft a new AI-assisted script.',
        icon: FilePlus2,
        href: '/scripts',
    },
];

export default function Dashboard({
    kpi_summary = [],
    instagram_overview = {},
    scheduler_overview = {},
    crm_funnel = {},
    appointments_overview = {},
    recent_activity_overview = {},
}) {
    const kpiItems = Array.isArray(kpi_summary) ? kpi_summary : [];

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Dashboard</h1>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Balanced view of performance, pipeline, and execution.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {quickActions.map((action) => {
                                const ActionIcon = action.icon;

                                return (
                                    <Link
                                        key={action.key}
                                        href={action.href}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                                    >
                                        <ActionIcon className="h-4 w-4 text-primary-600" />
                                        <span>{action.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {quickActions.map((action) => (
                            <div key={`${action.key}-hint`} className="rounded-lg border border-slate-200 px-3 py-2">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">{action.label}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-600">{action.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Temporarily hidden per request:
                <KpiSummarySection items={kpiItems} />
                */}

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <InstagramAnalyticsSection overview={instagram_overview} />
                    <SchedulerQueueSection overview={scheduler_overview} />
                </section>

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <CrmFunnelSection funnel={crm_funnel} />
                    <AppointmentsSection overview={appointments_overview} />
                </section>

                <RecentActivitySection overview={recent_activity_overview} />
            </div>
        </AuthenticatedLayout>
    );
}
