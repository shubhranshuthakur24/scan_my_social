import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import EmptyState from '@/Components/EmptyState';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import SearchInput from '@/Components/SearchInput';
import DropdownSelect from '@/Components/common/DropdownSelect';
import AppointmentCard from './Partials/AppointmentCard';
import { useToast } from '@/Contexts/ToastContext';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search, ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function Index({ auth, host, event_types = [] }) {
    const [eventTypeToDelete, setEventTypeToDelete] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [scheduleTypeFilter, setScheduleTypeFilter] = useState('all');
    const [capacityFilter, setCapacityFilter] = useState('all');
    const [globalLockFilter, setGlobalLockFilter] = useState('all');
    const { addToast } = useToast();
    const publicBaseUrl = `/cal/@${host.username}`;
    const hasUpcomingAppointmentsRoute = route().has('appointments.upcoming');
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setScheduleTypeFilter('all');
        setCapacityFilter('all');
        setGlobalLockFilter('all');
    };

    const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || scheduleTypeFilter !== 'all' || capacityFilter !== 'all' || globalLockFilter !== 'all';

    const filteredEventTypes = useMemo(() => {
        return event_types.filter((eventType) => {
            if (normalizedSearchQuery !== '') {
                const eventTypeFields = [
                    eventType.name,
                    eventType.slug,
                    eventType.description,
                    eventType.timezone,
                    eventType.is_active ? 'active' : 'inactive',
                ].filter(Boolean).join(' ').toLowerCase();

                if (!eventTypeFields.includes(normalizedSearchQuery)) {
                    return false;
                }
            }

            if (statusFilter === 'active' && !eventType.is_active) {
                return false;
            }
            if (statusFilter === 'inactive' && eventType.is_active) {
                return false;
            }

            if (scheduleTypeFilter !== 'all' && eventType.schedule_type !== scheduleTypeFilter) {
                return false;
            }

            if (capacityFilter === 'single' && eventType.allows_multi_seat_booking) {
                return false;
            }
            if (capacityFilter === 'multi' && !eventType.allows_multi_seat_booking) {
                return false;
            }

            if (globalLockFilter === 'locked' && eventType.exclude_from_global_slot_lock) {
                return false;
            }
            if (globalLockFilter === 'excluded' && !eventType.exclude_from_global_slot_lock) {
                return false;
            }

            return true;
        });
    }, [event_types, normalizedSearchQuery, statusFilter, scheduleTypeFilter, capacityFilter, globalLockFilter]);

    const copyEventLink = async (slug) => {
        try {
            if (typeof window === 'undefined') {
                return;
            }

            const absoluteUrl = `${window.location.origin}${publicBaseUrl}/${slug}`;
            await navigator.clipboard.writeText(absoluteUrl);
            addToast('Event link copied.', 'success');
        } catch (_error) {
            addToast('Unable to copy link. Please try again.', 'error');
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            topbarTitle="Appointment Settings"
            topbarDescription="Manage your event types and booking settings."
            moduleTabsAction={(
                <div className="flex items-center gap-2">
                    <Link
                        href={route('appointments.create')}
                        className="inline-flex items-center gap-1.5 rounded-brand-sm bg-primary-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-primary-700 transition"
                    >
                        <Plus className="h-4 w-4" />
                        Create Event Type
                    </Link>
                    <a
                        href={publicBaseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-brand-sm border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
                    >
                        <ExternalLink className="h-4 w-4" />
                        My Appointment Page
                    </a>
                </div>
            )}
        >
            <Head title="Appointment Calendar Settings" />
            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">

                <section className="space-y-3 xl:space-y-2.5">
                    <div className="rounded-brand border border-slate-200 bg-white p-4 shadow-sm xl:p-3.5">
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <SearchInput
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        onClear={() => setSearchQuery('')}
                                        placeholder="Search event type name, slug, or description..."
                                        aria-label="Search booking event types"
                                        className="w-full"
                                    />
                                </div>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="rounded-brand-sm border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition shrink-0"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                                {/* Status Filter */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Status
                                    </label>
                                    <DropdownSelect
                                        value={statusFilter}
                                        onChange={setStatusFilter}
                                        options={[
                                            { value: 'all', label: 'All Statuses' },
                                            { value: 'active', label: 'Active Only' },
                                            { value: 'inactive', label: 'Inactive Only' },
                                        ]}
                                    />
                                </div>

                                {/* Schedule Type Filter */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Schedule Type
                                    </label>
                                    <DropdownSelect
                                        value={scheduleTypeFilter}
                                        onChange={setScheduleTypeFilter}
                                        options={[
                                            { value: 'all', label: 'All Schedule Types' },
                                            { value: 'weekly', label: 'Weekly Availability' },
                                            { value: 'one_time', label: 'One-Time Event' },
                                        ]}
                                    />
                                </div>

                                {/* Slot Capacity Filter */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Slot Capacity
                                    </label>
                                    <DropdownSelect
                                        value={capacityFilter}
                                        onChange={setCapacityFilter}
                                        options={[
                                            { value: 'all', label: 'All Capacities' },
                                            { value: 'single', label: 'Single Seat (1 person)' },
                                            { value: 'multi', label: 'Group Booking (multiple seats)' },
                                        ]}
                                    />
                                </div>

                                {/* Global Slot Lock Filter */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Global Slot Lock
                                    </label>
                                    <DropdownSelect
                                        value={globalLockFilter}
                                        onChange={setGlobalLockFilter}
                                        options={[
                                            { value: 'all', label: 'All Lock Modes' },
                                            { value: 'locked', label: 'Respects Global Lock' },
                                            { value: 'excluded', label: 'Excluded from Lock' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {event_types.length === 0 ? (
                        <EmptyState
                            className="xl:py-14"
                            title="No appointment event types yet."
                            description="Create your first event type to start accepting bookings."
                            icon={Plus}
                            titleClassName="text-xl font-bold text-slate-800 xl:text-lg"
                            descriptionClassName="text-sm text-slate-600"
                        />
                    ) : filteredEventTypes.length === 0 ? (
                        <EmptyState
                            className="xl:py-14"
                            title="No matching event types found."
                            description="Try a different search term, slug, status, or timezone filter."
                            icon={Search}
                            iconContainerClassName="rounded-full border-slate-200 bg-slate-50"
                            iconClassName="text-slate-400"
                            titleClassName="text-xl font-bold text-slate-800 xl:text-lg"
                            descriptionClassName="text-sm text-slate-600"
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {filteredEventTypes.map((eventType) => (
                                <AppointmentCard
                                    key={eventType.id}
                                    eventType={eventType}
                                    host={host}
                                    publicBaseUrl={publicBaseUrl}
                                    copyEventLink={copyEventLink}
                                    onDeleteClick={setEventTypeToDelete}
                                    hasUpcomingAppointmentsRoute={hasUpcomingAppointmentsRoute}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <ConfirmDialog
                show={Boolean(eventTypeToDelete)}
                title="Delete Event Type?"
                message={`Are you sure you want to delete "${eventTypeToDelete?.name || 'this event type'}"? Historical bookings will be preserved, but new bookings will no longer be allowed.`}
                confirmLabel="Delete Event Type"
                variant="danger"
                onConfirm={() => {
                    if (!eventTypeToDelete) {
                        return;
                    }

                    router.delete(route('appointments.event-types.destroy', eventTypeToDelete.id), {
                        preserveScroll: true,
                        onFinish: () => setEventTypeToDelete(null),
                    });
                }}
                onCancel={() => setEventTypeToDelete(null)}
            />
        </AuthenticatedLayout>
    );
}
