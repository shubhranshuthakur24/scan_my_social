import { Link } from '@inertiajs/react';
import { CalendarDays } from 'lucide-react';
import { formatDateTime, formatNumber } from './formatters';

export default function AppointmentsSection({ overview = {} }) {
    const nextBookings = Array.isArray(overview?.next_bookings) ? overview.next_bookings : [];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                        <CalendarDays className="h-4.5 w-4.5" />
                    </span>
                    <div>
                        <h2 className="text-base font-black text-slate-900">Appointments</h2>
                        <p className="text-xs font-semibold text-slate-500">Upcoming calendar workload and booking status.</p>
                    </div>
                </div>

                <Link
                    href={route().has('appointments.upcoming') ? route('appointments.upcoming') : '/appointments/upcoming'}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                >
                    View Upcoming
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Active Event Types</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{formatNumber(overview?.active_event_types || 0)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Upcoming</p>
                    <p className="mt-1 text-lg font-black text-emerald-600">{formatNumber(overview?.upcoming_bookings_count || 0)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Cancelled (30d)</p>
                    <p className="mt-1 text-lg font-black text-rose-600">{formatNumber(overview?.cancelled_bookings_last_30_days || 0)}</p>
                </div>
            </div>

            <div className="mt-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Next Bookings</h3>
                {nextBookings.length === 0 ? (
                    <p className="mt-2 rounded-lg border border-dashed border-slate-300 p-3 text-xs font-semibold text-slate-500">
                        No upcoming bookings yet.
                    </p>
                ) : (
                    <div className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
                        {nextBookings.map((booking) => (
                            <div key={booking.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-800">{booking.guest_name || 'Guest'}</p>
                                    <p className="truncate text-xs font-semibold text-slate-500">
                                        {booking.event_type_name || 'Event type'} {booking.guest_timezone ? `• ${booking.guest_timezone}` : ''}
                                    </p>
                                </div>
                                <p className="text-xs font-black text-slate-600">{formatDateTime(booking.starts_at)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
