import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import EventTypeForm from "@/Pages/Appointments/Partials/EventTypeForm";
import PageBanner, { PageBannerAction } from "@/Components/common/PageBanner";
import { Head, Link, router } from "@inertiajs/react";
import { ExternalLink } from "lucide-react";
import Icon from "@/Components/Icon";
import Button from "@/Components/Button";
import { useMemo } from "react";

export default function Create({
    auth,
    host,
    app_timezone = "UTC",
    global_availability_rules = [],
    lock_time_slots_across_event_types = false,
}) {
    const publicBaseUrl = `/cal/@${host.username}`;

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
            topbarTitle="Create Appointment Event"
            topbarDescription="Set up a new event type and availability schedule."
            moduleTabsAction={
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.visit(route("appointments.index"))}
                    size="sm"
                >
                    <Icon name="arrowLeft" size={4} />
                    Back to Events
                </Button>
            }
        >
            <Head title="Create Appointment Event" />
            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">
                <EventTypeForm
                    appTimezone={resolvedTimezone}
                    globalAvailabilityRules={global_availability_rules}
                    lockTimeSlotsAcrossEventTypes={
                        lock_time_slots_across_event_types
                    }
                />
            </div>
        </AuthenticatedLayout>
    );
}
