import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AppointmentCalendar from '@/Components/Appointments/AppointmentCalendar';
import EmptyState from '@/Components/EmptyState';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, Clock3, Plus, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const formatDateKey = (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    const d = parts.find(p => p.type === 'day').value;
    return `${y}-${m}-${d}`;
};

export default function Calendar({
    auth,
    app_timezone = 'UTC',
    calendar_month,
    selected_date,
    daily_counts = {},
    selected_day_bookings = [],
}) {
    const resolvedTimezone = useMemo(() => {
        return app_timezone || 'UTC';
    }, [app_timezone]);

    const selectedDateLabel = useMemo(() => new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: resolvedTimezone,
    }).format(new Date(`${selected_date}T00:00:00`)), [resolvedTimezone, selected_date]);

    const navigateCalendar = ({ month, date }) => {
        router.get(route('appointments.calendar'), {
            month,
            date,
        }, {
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            topbarTitle="Appointment Calendar"
            topbarDescription="Monthly overview for appointments and daily booking counts."
            moduleTabsAction={(
                <Link
                    href={route('appointments.create')}
                    className="inline-flex items-center gap-1.5 rounded-brand-sm bg-primary-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-primary-700 transition"
                >
                    <Plus className="h-4 w-4" />
                    Create New Event
                </Link>
            )}
        >
            <Head title="Appointment Calendar" />
            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">

                <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-stretch">
                    <div
                        className="min-w-0 overflow-hidden rounded-brand border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
                    >
                        <div className="mb-4 flex items-center gap-3">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-brand-sm bg-primary-50 text-primary-600">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-black text-slate-900">
                                    Appointment Calendar
                                </h2>
                                <p className="text-sm font-semibold text-slate-500">
                                    Click a date to view bookings. Each badge
                                    shows confirmed appointments for that day.
                                </p>
                            </div>
                        </div>
                        <AppointmentCalendar
                            initialDate={`${calendar_month}-01`}
                            selectedDate={selected_date}
                            timeZone={resolvedTimezone}
                            dailyCounts={daily_counts}
                            onMonthChange={(nextMonth) => {
                                if (nextMonth === calendar_month) {
                                    return;
                                }

                                navigateCalendar({
                                    month: nextMonth,
                                    date: `${nextMonth}-01`,
                                });
                            }}
                            onDateSelect={(nextDate) => {
                                if (nextDate === selected_date) {
                                    return;
                                }

                                navigateCalendar({
                                    month: calendar_month,
                                    date: nextDate,
                                });
                            }}
                            onTodaySelect={() => {
                                const todayDate = formatDateKey(
                                    new Date(),
                                    resolvedTimezone,
                                );

                                if (todayDate === selected_date) {
                                    return;
                                }

                                navigateCalendar({
                                    month: todayDate.slice(0, 7),
                                    date: todayDate,
                                });
                            }}
                        />
                    </div>

                    <div
                        className="min-w-0 rounded-brand border border-slate-200 bg-white p-5 shadow-sm lg:flex lg:flex-col lg:h-full lg:overflow-hidden"
                    >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900">
                                    Appointments
                                </h3>
                                <p className="text-sm font-semibold text-slate-500">
                                    {selectedDateLabel}
                                </p>
                            </div>
                            <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-black text-primary-700">
                                {selected_day_bookings.length}
                            </span>
                        </div>

                        <div className="mt-4 space-y-3 lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1">
                            {selected_day_bookings.length === 0 ? (
                                <EmptyState
                                    variant="transparent"
                                    className="rounded-brand border border-slate-100 bg-slate-50 px-4 py-6 xl:py-5"
                                    title="No confirmed appointments."
                                    description="No bookings are scheduled for this date."
                                    icon={CalendarDays}
                                    iconContainerClassName="border-primary-100 bg-primary-50"
                                    titleClassName="text-lg font-bold text-slate-800"
                                    descriptionClassName="text-sm text-slate-600"
                                />
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {selected_day_bookings.map((booking) => (
                                        <article
                                            key={booking.id}
                                            className="py-4 first:pt-0 last:pb-0"
                                        >
                                            <p className="text-sm font-black text-slate-900">
                                                {booking.event_type_name ||
                                                    "Appointment"}
                                            </p>
                                            <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600">
                                                <p className="flex items-center gap-1.5">
                                                    <Clock3 className="h-3.5 w-3.5" />
                                                    {booking.starts_at_local} -{" "}
                                                    {booking.ends_at_local}
                                                </p>
                                                <p className="flex items-center gap-1.5">
                                                    <User className="h-3.5 w-3.5" />
                                                    {booking.guest_name}
                                                </p>
                                                <p className="break-all">
                                                    {booking.guest_email}
                                                </p>
                                                {booking.guest_phone ? (
                                                    <p className="break-all">
                                                        {booking.guest_phone}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
