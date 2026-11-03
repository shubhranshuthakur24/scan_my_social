import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import EventTypeForm from '@/Pages/Appointments/Partials/EventTypeForm';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import { Head, Link } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { useMemo } from 'react';

export default function Edit({
    auth,
    host,
    app_timezone = 'UTC',
    event_type,
    lock_time_slots_across_event_types = false,
}) {
    const publicEventUrl = `/cal/@${host.username}/${event_type.slug}`;

    const resolvedTimezone = useMemo(() => {
        if (!app_timezone || app_timezone === 'UTC') {
            try {
                return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
            } catch (e) {
                return 'UTC';
            }
        }
        return app_timezone;
    }, [app_timezone]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            topbarTitle={`Edit ${event_type.name}`}
            topbarDescription="Update event details and availability schedule."
            moduleTabsAction={(
                <Link
                    href={route('appointments.index')}
                    className="inline-flex items-center gap-1.5 rounded-brand-sm border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
                >
                    Back to Event Types
                </Link>
            )}
        >
            <Head title={`Edit ${event_type.name}`} />
            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">

                <EventTypeForm
                    appTimezone={resolvedTimezone}
                    eventType={event_type}
                    lockTimeSlotsAcrossEventTypes={lock_time_slots_across_event_types}
                />
            </div>
        </AuthenticatedLayout>
    );
}
