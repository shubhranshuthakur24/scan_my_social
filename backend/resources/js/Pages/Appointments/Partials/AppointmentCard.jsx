import Icon from '@/Components/Icon';
import { Link } from '@inertiajs/react';
import { Clock3, Copy, ExternalLink, Rows3, Trash2, Calendar, User, Globe, CalendarCheck2, RefreshCw, Users } from 'lucide-react';

export default function AppointmentCard({
    eventType,
    host,
    publicBaseUrl,
    copyEventLink,
    onDeleteClick,
    hasUpcomingAppointmentsRoute
}) {
    const isOneTime = eventType.schedule_type === 'one_time';

    const calendarSheet = (() => {
        if (!isOneTime || !eventType.one_time_date) {
            return null;
        }
        try {
            const dateObj = new Date(eventType.one_time_date + 'T00:00:00');
            const monthStr = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(dateObj).toUpperCase();
            const dayStr = new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(dateObj);

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
    })();

    const formattedTimeRange = (() => {
        if (!isOneTime || !eventType.one_time_start_time || !eventType.one_time_end_time) {
            return null;
        }

        const formatTimeStr = (time24) => {
            const [hourStr, minStr] = time24.split(':');
            const hour = parseInt(hourStr, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minStr}${ampm}`;
        };

        try {
            return `${formatTimeStr(eventType.one_time_start_time)} - ${formatTimeStr(eventType.one_time_end_time)}`;
        } catch (e) {
            return `${eventType.one_time_start_time} - ${eventType.one_time_end_time}`;
        }
    })();

    const cardBgClass = isOneTime
        ? 'border-l-[4px] border-l-sky-500 hover:bg-linear-to-br hover:from-white hover:to-sky-50/10'
        : 'border-l-[4px] border-l-indigo-500 hover:bg-linear-to-br hover:from-white hover:to-indigo-50/10';

    return (
        <article className={`group h-full flex flex-col justify-between rounded-brand border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md ${cardBgClass} hover:-translate-y-0.5`}>
            <div>
                {/* Header: Title, Calendar Sheet and Type Badge */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                            <span
                                className={`inline-flex items-center rounded-brand-sm border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${isOneTime
                                        ? 'border-sky-200 bg-sky-50 text-sky-700'
                                        : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                    }`}
                            >
                                <span className={`mr-1 h-1 w-1 rounded-full shrink-0 ${isOneTime ? 'bg-sky-500' : 'bg-indigo-500'}`}></span>
                                {isOneTime ? 'One-time' : 'Recurring'}
                            </span>
                            <span
                                className={`inline-flex items-center rounded-brand-sm border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${eventType.is_active
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-slate-100 text-slate-500'
                                    }`}
                            >
                                <span className={`mr-1 h-1 w-1 rounded-full shrink-0 ${eventType.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                {eventType.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <h3 className="mt-1.5 text-base font-heading font-black text-slate-900 group-hover:text-primary-700 transition-colors line-clamp-1">
                            {eventType.name}
                        </h3>
                    </div>
                    {calendarSheet}
                </div>

                {/* Description */}
                <p className={`mt-1 text-xs line-clamp-1 min-h-[16px] ${eventType.description ? 'text-slate-500 font-medium' : 'text-slate-400 italic'}`}>
                    {eventType.description || 'No description.'}
                </p>

                {/* Meta details Grid */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-500 font-semibold">
                    <span className="inline-flex items-center gap-1 rounded-brand-sm border border-slate-100 bg-slate-50 px-2 py-0.5 text-slate-600">
                        <Clock3 className="h-3 w-3 text-slate-400" />
                        {eventType.duration_minutes}m
                    </span>
                    {eventType.buffer_minutes > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-brand-sm border border-slate-100 bg-slate-50 px-2 py-0.5 text-slate-600">
                            buf: {eventType.buffer_minutes}m
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-brand-sm border border-slate-100 bg-slate-50 px-2 py-0.5 text-slate-600 max-w-[130px] truncate">
                        <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                        {eventType.timezone}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-brand-sm border border-slate-100 bg-slate-50 px-2 py-0.5 text-slate-600">
                        {eventType.allows_multi_seat_booking ? (
                            <>
                                <Users className="h-3 w-3 text-slate-400" />
                                {eventType.seat_capacity} seats
                            </>
                        ) : (
                            <>
                                <User className="h-3 w-3 text-slate-400" />
                                1-on-1
                            </>
                        )}
                    </span>
                </div>

                {/* Specific details for One-time and Weekly */}
                {isOneTime ? (
                    <div className="mt-3 rounded-brand-sm bg-sky-50/25 border border-sky-100/30 p-2 space-y-0.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-sky-950 font-black uppercase tracking-wider text-[8px]">
                            <CalendarCheck2 className="h-3 w-3 text-sky-500 shrink-0" />
                            <span>Event Date & Time</span>
                        </div>
                        <div className="text-slate-700 font-bold pl-4">
                            {(() => {
                                try {
                                    return new Intl.DateTimeFormat('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    }).format(new Date(eventType.one_time_date + 'T00:00:00'));
                                } catch (e) {
                                    return eventType.one_time_date;
                                }
                            })()}
                            {formattedTimeRange && <span className="text-slate-500 font-medium ml-1.5">{formattedTimeRange}</span>}
                        </div>
                    </div>
                ) : (
                    <div className="mt-3 rounded-brand-sm bg-indigo-50/15 border border-indigo-100/20 p-2 space-y-0.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-indigo-950 font-black uppercase tracking-wider text-[8px]">
                            <RefreshCw className="h-3 w-3 text-indigo-500 shrink-0" />
                            <span>Recurring Schedule</span>
                        </div>
                        <div className="text-slate-700 font-bold pl-4">
                            Accepts weekly bookings
                            {eventType.booking_window_days && (
                                <span className="text-slate-500 font-medium ml-1.5">
                                    (up to {eventType.booking_window_days}d in advance)
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Booking link preview */}
                <div className="mt-3 flex items-center gap-2 bg-slate-50/60 border border-slate-100 rounded-brand-sm p-1 pl-2 transition-colors hover:bg-slate-50">
                    <span className="text-[11px] text-slate-650 font-mono truncate flex-1 flex items-center gap-1.5 font-medium">
                        <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                        {`/cal/@${host.username}/${eventType.slug}`}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                        <a
                            href={`${publicBaseUrl}/${eventType.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open booking page"
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-150 rounded-brand-sm shadow-none hover:shadow-sm transition-all"
                        >
                            <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                            type="button"
                            onClick={() => copyEventLink(eventType.slug)}
                            title="Copy link"
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-150 rounded-brand-sm shadow-none hover:shadow-sm transition-all"
                        >
                            <Copy className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Upcoming Appointments section */}
            <div className="mt-3.5 border-t border-slate-100 pt-2.5">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-heading font-black text-slate-400 uppercase tracking-wider">
                        Upcoming Appointments
                    </h4>
                    <span className="text-[11px] font-bold text-slate-600">
                        {eventType.upcoming_bookings_count > 0
                            ? `${eventType.upcoming_bookings_count} scheduled`
                            : 'None'}
                    </span>
                </div>

                {eventType.next_booking && (
                    <div className="mt-2 bg-slate-50 border border-slate-100 rounded-brand-sm p-2 text-[11px] text-slate-600 space-y-1 font-semibold">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                                {eventType.next_booking.starts_at_formatted || new Date(eventType.next_booking.starts_at).toLocaleString()}
                            </span>
                        </div>
                        {eventType.next_booking.guest_name && (
                            <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">
                                    With {eventType.next_booking.guest_name}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <Link
                        href={hasUpcomingAppointmentsRoute ? route('appointments.upcoming', { event_type: eventType.id }) : '#'}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-brand-sm transition-colors"
                    >
                        <Rows3 className="h-3 w-3 text-slate-400" />
                        List
                    </Link>

                    <div className="flex items-center gap-1">
                        <Link
                            href={route('appointments.event-types.edit', eventType.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-brand-sm transition-colors border border-primary-100/50"
                        >
                            <Icon name="edit" size={3} className="text-primary-400" /> Edit
                        </Link>
                        <button
                            type="button"
                            onClick={() => onDeleteClick(eventType)}
                            className="inline-flex items-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-brand-sm transition-colors"
                            title="Delete event type"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}
