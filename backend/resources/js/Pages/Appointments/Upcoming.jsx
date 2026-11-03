import Button from "@/Components/Button";
import ActiveFilterChips from "@/Components/common/ActiveFilterChips";
import ConfirmDialog from "@/Components/common/ConfirmDialog";
import EmptyState from "@/Components/EmptyState";
import KpiCard from "@/Components/common/KpiCard";
import Modal from "@/Components/Modal";
import PageBanner, { PageBannerAction } from "@/Components/common/PageBanner";
import SearchInput from "@/Components/SearchInput";
import DropdownSelect from "@/Components/common/DropdownSelect";
import AppointmentDateFilter from "@/Components/Appointments/AppointmentDateFilter";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import axios from "axios";
import { Head, Link, router, usePage } from "@inertiajs/react";
import {
    BadgeCheck,
    CalendarClock,
    CalendarSync,
    Clock3,
    Filter,
    Phone,
    Mail,
    RotateCcw,
    XCircle,
    Users,
    CalendarDays,
    TrendingUp,
    ChevronDown,
    ChevronRight,
    Download,
} from "lucide-react";
import { useMemo, useState } from "react";

export default function Upcoming({
    auth,
    app_timezone = "UTC",
    bookings,
    event_type_options = [],
    filters = {},
    kpis = {},
}) {
    const { errors = {} } = usePage().props;
    const [searchQuery, setSearchQuery] = useState(filters.search || "");
    const [eventTypeFilter, setEventTypeFilter] = useState(
        filters.event_type || "",
    );
    const [dateFrom, setDateFrom] = useState(filters.date_from || "");
    const [dateTo, setDateTo] = useState(filters.date_to || "");
    const [sortBy, setSortBy] = useState(filters.sort_by || "starts_at_asc");
    const [bookingToCancel, setBookingToCancel] = useState(null);
    const [bookingToReschedule, setBookingToReschedule] = useState(null);
    const [rescheduleDraft, setRescheduleDraft] = useState("");
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleAvailability, setRescheduleAvailability] = useState(null);
    const [
        isLoadingRescheduleAvailability,
        setIsLoadingRescheduleAvailability,
    ] = useState(false);
    const [rescheduleAvailabilityError, setRescheduleAvailabilityError] =
        useState(null);
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const toggleGroup = (groupKey) => {
        setCollapsedGroups((prev) => ({
            ...prev,
            [groupKey]: !prev[groupKey],
        }));
    };

    const getCalendarSheet = (booking) => {
        if (booking.event_type?.schedule_type !== "one_time" || !booking.starts_at_date_key) {
            return null;
        }
        try {
            const dateObj = new Date(booking.starts_at_date_key + "T00:00:00");
            const monthStr = new Intl.DateTimeFormat("en-US", { month: "short" }).format(dateObj).toUpperCase();
            const dayStr = new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(dateObj);

            return (
                <div className="relative flex flex-col items-center justify-center w-10 h-11 rounded-brand-sm border border-slate-200 overflow-hidden bg-white shadow-sm shrink-0">
                    <div className="w-full bg-sky-600 py-0.5 text-center text-[8px] font-black text-white leading-none uppercase tracking-wider">
                        {monthStr}
                    </div>
                    <div className="flex-1 flex items-center justify-center bg-slate-50/50 w-full">
                        <span className="text-sm font-black text-slate-800 leading-none">{dayStr}</span>
                    </div>
                </div>
            );
        } catch (e) {
            return null;
        }
    };

    const rescheduleError =
        errors.bookingReschedule?.starts_at || errors.starts_at || null;
    const dateRangeInvalid =
        dateFrom !== "" && dateTo !== "" && dateFrom > dateTo;
    const filtersChanged =
        searchQuery !== (filters.search || "") ||
        eventTypeFilter !== (filters.event_type || "") ||
        dateFrom !== (filters.date_from || "") ||
        dateTo !== (filters.date_to || "") ||
        sortBy !== (filters.sort_by || "starts_at_asc");

    // Formatting is pre-computed on the backend to avoid timezone and hydration mismatch warnings

    const eventTypeNameById = useMemo(() => {
        return new Map(
            event_type_options.map((eventType) => [
                String(eventType.id),
                eventType.name,
            ]),
        );
    }, [event_type_options]);

    const rescheduleAvailableDateSet = useMemo(() => {
        return new Set(rescheduleAvailability?.available_dates || []);
    }, [rescheduleAvailability]);

    const hasActiveFilters = useMemo(() => {
        return (
            searchQuery.trim() !== "" ||
            eventTypeFilter !== "" ||
            dateFrom !== "" ||
            dateTo !== "" ||
            sortBy !== "starts_at_asc"
        );
    }, [dateFrom, dateTo, eventTypeFilter, searchQuery, sortBy]);

    const submitFilters = ({
        search = searchQuery,
        eventType = eventTypeFilter,
        from = dateFrom,
        to = dateTo,
        sort = sortBy,
    } = {}) => {
        const trimmedSearch = search.trim();

        router.get(
            route("appointments.upcoming"),
            {
                ...(trimmedSearch !== "" ? { search: trimmedSearch } : {}),
                ...(eventType !== "" ? { event_type: eventType } : {}),
                ...(from !== "" ? { date_from: from } : {}),
                ...(to !== "" ? { date_to: to } : {}),
                ...(sort !== "starts_at_asc" ? { sort_by: sort } : {}),
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const applyFilters = () => {
        if (dateRangeInvalid) {
            return;
        }

        submitFilters();
    };

    const resetFilters = () => {
        setSearchQuery("");
        setEventTypeFilter("");
        setDateFrom("");
        setDateTo("");
        setSortBy("starts_at_asc");
        router.get(
            route("appointments.upcoming"),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const cancelBooking = (bookingId) => {
        router.patch(
            route("appointments.cancel", bookingId),
            {},
            { preserveScroll: true },
        );
    };

    const loadRescheduleAvailability = async (
        booking,
        { date = null, month = null } = {},
    ) => {
        setIsLoadingRescheduleAvailability(true);
        setRescheduleAvailabilityError(null);

        try {
            const { data } = await axios.get(
                route("appointments.reschedule-availability", booking.id),
                {
                    params: {
                        ...(date ? { date } : {}),
                        ...(month ? { month } : {}),
                    },
                },
            );

            setRescheduleAvailability(data);
            setRescheduleDraft("");
        } catch (error) {
            setRescheduleAvailability(null);
            setRescheduleDraft("");
            setRescheduleAvailabilityError(
                error?.response?.data?.message ||
                    "Unable to load available slots right now.",
            );
        } finally {
            setIsLoadingRescheduleAvailability(false);
        }
    };

    const openRescheduleModal = (booking) => {
        setBookingToReschedule(booking);
        setRescheduleDraft("");
        setRescheduleAvailability(null);
        setRescheduleAvailabilityError(null);
        void loadRescheduleAvailability(booking);
    };

    const closeRescheduleModal = () => {
        setBookingToReschedule(null);
        setRescheduleDraft("");
        setRescheduleAvailability(null);
        setRescheduleAvailabilityError(null);
    };

    const confirmReschedule = () => {
        if (!bookingToReschedule || !rescheduleDraft) {
            return;
        }

        setIsRescheduling(true);
        router.patch(
            route("appointments.reschedule", bookingToReschedule.id),
            {
                starts_at: rescheduleDraft,
            },
            {
                preserveScroll: true,
                errorBag: "bookingReschedule",
                onFinish: () => {
                    setIsRescheduling(false);
                },
                onSuccess: () => {
                    closeRescheduleModal();
                },
            },
        );
    };

    // Client-side date utilities replaced by backend-formatted properties

    const changeRescheduleDate = (value) => {
        if (!bookingToReschedule || value === "") {
            return;
        }

        void loadRescheduleAvailability(bookingToReschedule, {
            date: value,
            month: value.slice(0, 7),
        });
    };

    const groupedBookings = useMemo(() => {
        const groups = [];

        bookings.data.forEach((booking) => {
            if (!booking.starts_at_date_key) {
                return;
            }

            const dateKey = booking.starts_at_date_key;
            const existingGroup = groups.find((group) => group.key === dateKey);

            if (existingGroup) {
                existingGroup.items.push(booking);
                return;
            }

            groups.push({
                key: dateKey,
                label: booking.starts_at_date_label || dateKey,
                items: [booking],
            });
        });

        return groups;
    }, [bookings.data]);

    const activeFilterChips = useMemo(() => {
        const chips = [];

        if (searchQuery.trim() !== "") {
            chips.push({
                key: "search",
                label: `Search: ${searchQuery.trim()}`,
            });
        }

        if (eventTypeFilter !== "") {
            chips.push({
                key: "event_type",
                label: `Event: ${eventTypeNameById.get(eventTypeFilter) || "Selected type"}`,
            });
        }

        if (dateFrom !== "") {
            chips.push({ key: "date_from", label: `From: ${dateFrom}` });
        }

        if (dateTo !== "") {
            chips.push({ key: "date_to", label: `To: ${dateTo}` });
        }

        return chips;
    }, [dateFrom, dateTo, eventTypeFilter, eventTypeNameById, searchQuery]);

    const removeFilterChip = (key) => {
        let nextSearch = searchQuery;
        let nextEventType = eventTypeFilter;
        let nextFrom = dateFrom;
        let nextTo = dateTo;

        if (key === "search") {
            nextSearch = "";
            setSearchQuery("");
        }

        if (key === "event_type") {
            nextEventType = "";
            setEventTypeFilter("");
        }

        if (key === "date_from") {
            nextFrom = "";
            setDateFrom("");
        }

        if (key === "date_to") {
            nextTo = "";
            setDateTo("");
        }

        submitFilters({
            search: nextSearch,
            eventType: nextEventType,
            from: nextFrom,
            to: nextTo,
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            topbarTitle="Upcoming Appointments"
            topbarDescription="Manage all upcoming appointments across event types."
        >
            <Head title="Upcoming Appointments" />
            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">
                <div className="bg-white rounded-brand shadow-sm   p-5 xl:p-4">
                    <div className="space-y-4">
                        {/* KPIs */}
                        <div className="grid gap-3 xl:gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                [
                                    "Today's Meetings",
                                    kpis.today_count ?? 0,
                                    CalendarClock,
                                    "default",
                                    "Scheduled for today",
                                ],
                                [
                                    "Unique Clients",
                                    kpis.unique_clients ?? 0,
                                    Users,
                                    "success",
                                    "Unique guest emails",
                                ],
                                [
                                    "Next 30 Days",
                                    kpis.next_30_days ?? 0,
                                    CalendarDays,
                                    "info",
                                    "Scheduled next 30 days",
                                ],
                                [
                                    "Most Popular Event",
                                    kpis.popular_event?.name &&
                                    kpis.popular_event?.name !== "N/A"
                                        ? `${kpis.popular_event.name} (${kpis.popular_event.count})`
                                        : "N/A",
                                    TrendingUp,
                                    "primary",
                                    "Most booked event type",
                                ],
                            ].map(([label, value, Icon, variant, helper]) => (
                                <KpiCard
                                    key={label}
                                    label={label}
                                    value={value}
                                    icon={Icon}
                                    helper={helper}
                                    size="compact"
                                    variant={variant}
                                />
                            ))}
                        </div>
                        {/* Filters */}
                        <div className=" mt-4 p-4 shadow-sm xl:p-3.5  border-t border-slate-200">
                            <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_auto] lg:items-end">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        Search
                                    </label>
                                    <SearchInput
                                        value={searchQuery}
                                        onChange={(event) =>
                                            setSearchQuery(event.target.value)
                                        }
                                        onClear={() => setSearchQuery("")}
                                        placeholder="Search guest, email, phone, notes, or event type..."
                                        aria-label="Search upcoming appointments"
                                        className="w-full"
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault();
                                                applyFilters();
                                            }
                                        }}
                                    />
                                </div>
                                <DropdownSelect
                                    label="Event Type"
                                    value={eventTypeFilter}
                                    onChange={setEventTypeFilter}
                                    ariaLabel="Filter by event type"
                                    buttonClassName="h-[44px]"
                                    options={[
                                        { value: "", label: "All event types" },
                                        ...event_type_options.map((eventType) => ({
                                            value: eventType.id,
                                            label: eventType.name,
                                        })),
                                    ]}
                                />
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        Date Range
                                    </label>
                                    <AppointmentDateFilter
                                        startDate={dateFrom}
                                        endDate={dateTo}
                                        onApply={(start, end) => {
                                            setDateFrom(start);
                                            setDateTo(end);
                                        }}
                                    />
                                </div>
                                <DropdownSelect
                                    label="Sort By"
                                    value={sortBy}
                                    onChange={setSortBy}
                                    ariaLabel="Sort appointments"
                                    buttonClassName="h-[44px]"
                                    options={[
                                        { value: "starts_at_asc", label: "Date (Earliest)" },
                                        { value: "starts_at_desc", label: "Date (Latest)" },
                                    ]}
                                />
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={applyFilters}
                                        disabled={dateRangeInvalid || !filtersChanged}
                                    >
                                        <Filter className="h-4 w-4" />
                                        Apply
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={resetFilters}
                                        disabled={!hasActiveFilters}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Reset
                                    </Button>
                                    <a
                                        href={dateRangeInvalid ? "#" : route("appointments.upcoming.export", {
                                            search: searchQuery,
                                            event_type: eventTypeFilter,
                                            date_from: dateFrom,
                                            date_to: dateTo,
                                            sort_by: sortBy,
                                        })}
                                        className={`inline-flex items-center justify-center gap-1.5 rounded-brand-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm h-[44px] hover:-translate-y-px duration-150 ${
                                            dateRangeInvalid ? "pointer-events-none opacity-50" : ""
                                        }`}
                                    >
                                        <Download className="h-4 w-4 text-slate-400" />
                                        Export
                                    </a>
                                </div>
                            </div>

                            {dateRangeInvalid && (
                                <p className="mt-3 text-xs font-bold text-rose-600">
                                    Date range is invalid. "From" must be
                                    earlier than or equal to "To".
                                </p>
                            )}

                            <ActiveFilterChips
                                chips={activeFilterChips.map((chip) => ({
                                    ...chip,
                                    tone: "primary",
                                }))}
                                className="mt-3"
                                label=""
                                onRemove={removeFilterChip}
                            />
                        </div>
                    </div>
                </div>

                <section className="rounded-brand  p-5   xl:p-4">
                   

                    {bookings.data.length === 0 ? (
                        <EmptyState
                            className="rounded-brand border-slate-100 bg-slate-50 shadow-none xl:py-12"
                            title="No upcoming appointments found."
                            description="Try adjusting your filters, date range, or search query."
                            icon={CalendarClock}
                            iconContainerClassName="border-primary-100 bg-primary-50"
                            titleClassName="text-xl font-bold text-slate-800 xl:text-lg"
                            descriptionClassName="text-sm text-slate-600"
                        />
                    ) : (
                        <div className="space-y-5">
                            {rescheduleError && (
                                <div className="rounded-brand-sm border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                                    {rescheduleError}
                                </div>
                            )}

                             {groupedBookings.map((group, index) => (
                                <div key={group.key} className="relative space-y-3">
                                    {index < groupedBookings.length - 1 && (
                                        <div className="absolute right-[8px] top-[24px] bottom-[-20px] w-0 border-r-2 border-dashed border-slate-200 pointer-events-none z-0"></div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group.key)}
                                        className="w-full flex items-center gap-3 text-left focus:outline-none group/header py-1 relative z-10"
                                    >
                                        <h3 className="text-xs font-heading font-black uppercase tracking-wider text-slate-500 shrink-0 group-hover/header:text-slate-800 transition-colors">
                                            {group.label}
                                        </h3>
                                        <div className="h-px bg-slate-200 flex-1"></div>
                                        <div className="flex items-center gap-2 text-slate-500 group-hover/header:text-slate-850 transition-colors shrink-0">
                                            <span className="rounded-brand-sm border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold">
                                                {group.items.length}{" "}
                                                {group.items.length === 1
                                                    ? "appointment"
                                                    : "appointments"}
                                            </span>
                                            {collapsedGroups[group.key] ? (
                                                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 transition-transform" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 transition-transform" />
                                            )}
                                        </div>
                                    </button>

                                    {!collapsedGroups[group.key] && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1 pr-8 relative z-10">
                                            {group.items.map((booking) => (
                                                <article
                                                    key={booking.id}
                                                    className="border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all rounded-brand flex flex-col justify-between h-full"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p className="text-sm font-black text-slate-900 truncate" title={booking.guest_name}>
                                                                        {booking.guest_name}
                                                                    </p>
                                                                    <span className="inline-flex items-center gap-1 rounded-brand-sm border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 shrink-0">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                        Confirmed
                                                                    </span>
                                                                </div>

                                                                <div className="flex flex-col gap-1 text-xs text-slate-650 font-semibold mt-2">
                                                                    <span className="inline-flex items-center gap-1.5 break-all" title={booking.guest_email}>
                                                                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                        {booking.guest_email}
                                                                    </span>
                                                                    {booking.guest_phone && (
                                                                        <span className="inline-flex items-center gap-1.5">
                                                                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                            {booking.guest_phone}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {getCalendarSheet(booking)}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                                            <span className={`rounded-brand-sm border px-2 py-0.5 text-[10px] font-bold truncate max-w-full ${
                                                                booking.event_type?.deleted_at
                                                                    ? "border-slate-200 bg-slate-100 text-slate-400 line-through"
                                                                    : "border-slate-200 bg-slate-50 text-slate-700"
                                                            }`} title={booking.event_type?.name}>
                                                                {booking.event_type?.name || "Event type removed"}
                                                                {booking.event_type?.deleted_at && " (Deleted)"}
                                                            </span>
                                                            {booking.event_type?.schedule_type && (
                                                                <span
                                                                    className={`inline-flex items-center rounded-brand-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                                        booking.event_type.schedule_type === "one_time"
                                                                            ? "border-sky-200 bg-sky-50 text-sky-700"
                                                                            : "border-indigo-200 bg-indigo-50 text-indigo-700"
                                                                    }`}
                                                                >
                                                                    <span
                                                                        className={`mr-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                                                                            booking.event_type.schedule_type === "one_time"
                                                                                ? "bg-sky-500"
                                                                                : "bg-indigo-500"
                                                                        }`}
                                                                    ></span>
                                                                    {booking.event_type.schedule_type === "one_time"
                                                                        ? "One-time"
                                                                        : "Recurring"}
                                                                </span>
                                                            )}
                                                            <span className="inline-flex items-center gap-1 rounded-brand-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                                <Clock3 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                {booking.slot_time_label}
                                                            </span>
                                                            <span className="rounded-brand-sm border border-primary-200 bg-primary-50 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-700">
                                                                {app_timezone}
                                                            </span>
                                                        </div>

                                                        {booking.guest_notes && (
                                                            <div className="rounded-brand-sm bg-slate-50/70 border border-slate-100/50 p-2 text-xs text-slate-600 mt-3 flex items-start gap-1.5">
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mt-0.5">Notes:</span>
                                                                <span className="italic line-clamp-3" title={booking.guest_notes}>“{booking.guest_notes}”</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                                                        {booking.event_type && !booking.event_type.deleted_at && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openRescheduleModal(
                                                                        booking,
                                                                    )
                                                                }
                                                                className="flex-1 inline-flex items-center justify-center gap-1 rounded-brand-sm border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:shadow-sm"
                                                            >
                                                                <CalendarSync className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                Reschedule
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setBookingToCancel(
                                                                    booking,
                                                                )
                                                            }
                                                            className={`inline-flex items-center justify-center gap-1 rounded-brand-sm border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100/50 hover:shadow-sm ${
                                                                booking.event_type && !booking.event_type.deleted_at ? "flex-1" : "w-full"
                                                            }`}
                                                        >
                                                            <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {bookings.links && bookings.links.length > 3 ? (
                        <div className="mt-5 flex justify-center border-t border-slate-100 pt-4">
                            <nav className="flex items-center gap-1">
                                {bookings.links.map((link, index) => (
                                    <Link
                                        key={`${link.label}-${index}`}
                                        href={link.url || "#"}
                                        preserveScroll
                                        preserveState
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                        className={`rounded-brand-sm px-3 py-1.5 text-xs font-black transition ${
                                            link.active
                                                ? "bg-primary-600 text-white"
                                                : "text-slate-600 hover:bg-slate-50"
                                        } ${!link.url ? "pointer-events-none opacity-40" : ""}`}
                                    />
                                ))}
                            </nav>
                        </div>
                    ) : null}
                </section>
            </div>

            <ConfirmDialog
                show={Boolean(bookingToCancel)}
                title="Cancel appointment?"
                message={`Cancel the appointment with ${bookingToCancel?.guest_name || "this guest"}? This action cannot be undone.`}
                confirmLabel="Cancel Appointment"
                variant="danger"
                onConfirm={() => {
                    if (!bookingToCancel) {
                        return;
                    }

                    cancelBooking(bookingToCancel.id);
                    setBookingToCancel(null);
                }}
                onCancel={() => setBookingToCancel(null)}
            />

            <Modal
                show={Boolean(bookingToReschedule)}
                maxWidth="md"
                onClose={closeRescheduleModal}
            >
                <div className="p-6 sm:p-7">
                    <div className="flex items-start gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-brand-sm bg-primary-50 text-primary-600">
                            <CalendarClock className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-lg font-heading font-black text-slate-900">
                                Reschedule appointment
                            </h4>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Choose a new start time in{" "}
                                <span className="font-black text-primary-700">
                                    {app_timezone}
                                </span>
                                .
                            </p>
                        </div>
                    </div>

                    {bookingToReschedule && (
                        <div className="mt-4 rounded-brand-sm border border-slate-200 bg-slate-55 p-3">
                            <p className="text-sm font-black text-slate-900">
                                {bookingToReschedule.guest_name}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-600">
                                Current slot:{" "}
                                {bookingToReschedule.starts_at_date_label} - {bookingToReschedule.slot_time_label}
                            </p>
                        </div>
                    )}

                    <div className="mt-4">
                        <label
                            htmlFor="reschedule-starts-at"
                            className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-500"
                        >
                            New date
                        </label>
                        <input
                            id="reschedule-starts-at"
                            type="date"
                            value={rescheduleAvailability?.selected_date || ""}
                            onChange={(event) =>
                                changeRescheduleDate(event.target.value)
                            }
                            disabled={
                                isLoadingRescheduleAvailability ||
                                rescheduleAvailability?.schedule_type ===
                                    "one_time"
                            }
                            className="h-[44px] w-full rounded-brand-sm border border-slate-200 px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10"
                        />
                    </div>

                    {rescheduleAvailability?.schedule_type === "one_time" &&
                        rescheduleAvailability.one_time_date && (
                            <p className="mt-3 text-xs font-bold text-slate-500">
                                This is a one-time event. It can only be
                                rescheduled on{" "}
                                {rescheduleAvailability.one_time_date}.
                            </p>
                        )}

                    <div className="mt-4 rounded-brand-sm border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-black text-slate-900">
                                    Available slots
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {rescheduleAvailability?.selected_date ||
                                        "Select a date"}{" "}
                                    in {app_timezone}
                                </p>
                            </div>
                            {rescheduleAvailability?.available_dates?.length ? (
                                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
                                    {
                                        rescheduleAvailability.available_dates
                                            .length
                                    }{" "}
                                    date
                                    {rescheduleAvailability.available_dates
                                        .length === 1
                                        ? ""
                                        : "s"}{" "}
                                    with slots
                                </span>
                            ) : null}
                        </div>

                        {isLoadingRescheduleAvailability ? (
                            <div className="mt-3 rounded-brand-sm border border-dashed border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-500">
                                Loading available slots...
                            </div>
                        ) : rescheduleAvailabilityError ? (
                            <div className="mt-3 rounded-brand-sm border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                                {rescheduleAvailabilityError}
                            </div>
                        ) : (rescheduleAvailability?.slots || []).length ===
                          0 ? (
                            <div className="mt-3 rounded-brand-sm border border-dashed border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-500">
                                No slots available for this date.
                            </div>
                        ) : (
                            <div className="mt-3 space-y-2">
                                {rescheduleAvailability.slots.map((slot) => {
                                    const isSelectedSlot =
                                        rescheduleDraft === slot.starts_at;

                                    return (
                                        <button
                                            key={slot.starts_at}
                                            type="button"
                                            onClick={() =>
                                                setRescheduleDraft(
                                                    slot.starts_at,
                                                )
                                            }
                                            className={`min-h-11 w-full rounded-brand-sm border px-3 py-2.5 text-left text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 ${
                                                isSelectedSlot
                                                    ? "border-primary-300 bg-primary-50 text-primary-800 shadow-sm"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                            }`}
                                            aria-pressed={isSelectedSlot}
                                        >
                                            <span className="flex items-center justify-between gap-3">
                                                <span>{slot.label}</span>
                                                {isSelectedSlot ? (
                                                    <span className="shrink-0 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">
                                                        Selected
                                                    </span>
                                                ) : null}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {!isLoadingRescheduleAvailability &&
                        rescheduleAvailability?.selected_date &&
                        !rescheduleAvailableDateSet.has(
                            rescheduleAvailability.selected_date,
                        ) ? (
                            <p className="mt-3 text-xs font-bold text-slate-500">
                                This date has no available slots for the
                                selected event type.
                            </p>
                        ) : null}
                    </div>

                    {rescheduleError && (
                        <div className="mt-3 rounded-brand-sm border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                            {rescheduleError}
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={closeRescheduleModal}
                            disabled={isRescheduling}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={confirmReschedule}
                            isLoading={isRescheduling}
                            disabled={
                                rescheduleDraft === "" ||
                                isLoadingRescheduleAvailability
                            }
                        >
                            Save Reschedule
                        </Button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
