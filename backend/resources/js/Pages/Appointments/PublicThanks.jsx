import Button from '@/Components/Button';
import { Head } from '@inertiajs/react';
import { ArrowLeft, CalendarPlus, CheckCircle2, Clock3, Mail, MapPin, Phone, UserRound } from 'lucide-react';

export default function PublicThanks({ host, event_type, booking }) {
    const hostInitial = (host?.name || host?.username || '?').trim().charAt(0).toUpperCase();

    return (
        <>
            <Head title={`Booking Confirmed | ${event_type.name}`} />
            <main className="min-h-screen bg-linear-to-br from-slate-50 via-white to-primary-50/40 px-4 py-6 sm:py-10">
                <section className="mx-auto w-full max-w-4xl space-y-5">
                    <div className="overflow-hidden rounded-brand border border-emerald-200 bg-white shadow-sm">
                        <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-5 sm:px-6">
                            <p className="inline-flex items-center gap-2 text-sm font-black text-emerald-700">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-brand-sm bg-white text-emerald-600 shadow-sm">
                                    <CheckCircle2 className="h-5 w-5" />
                                </span>
                                Appointment confirmed
                            </p>
                            <h1 className="mt-4 break-words text-2xl font-black leading-tight text-emerald-950 sm:text-4xl">
                                Thanks, your booking is set.
                            </h1>
                            <p className="mt-2 break-words text-sm font-semibold leading-relaxed text-emerald-800">
                                A confirmation email has been sent to {booking.guest_email}.
                            </p>
                        </div>

                        <div className="p-5 sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-brand-sm border border-white bg-slate-100 shadow-sm ring-1 ring-slate-200">
                                    {host.avatar_url ? (
                                        <img src={host.avatar_url} alt={host.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-2xl font-black text-slate-600">
                                            {hostInitial}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Confirmed meeting</p>
                                    <h2 className="mt-2 break-words text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{event_type.name}</h2>
                                    <p className="mt-2 break-words text-sm font-semibold text-slate-600">
                                        with {host.name} <span className="text-slate-400">@{host.username}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-3 rounded-brand-sm border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                <p className="inline-flex items-center gap-2 break-words font-black text-slate-950">
                                    <Clock3 className="h-4 w-4 shrink-0 text-primary-500" />
                                    <span>{booking.date_label} {booking.time_label ? `, ${booking.time_label}` : ''}</span>
                                </p>
                                <p className="break-words text-xs font-black uppercase tracking-widest text-slate-500">{event_type.timezone}</p>

                                <p className="inline-flex items-center gap-2 break-words">
                                    <UserRound className="h-4 w-4 shrink-0 text-slate-500" />
                                    <span>{booking.guest_name}</span>
                                </p>
                                <p className="inline-flex items-center gap-2 break-all">
                                    <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                                    <span>{booking.guest_email}</span>
                                </p>
                                <p className="inline-flex items-center gap-2 break-all">
                                    <Phone className="h-4 w-4 shrink-0 text-slate-500" />
                                    <span>{booking.guest_phone}</span>
                                </p>

                                {event_type.location_label ? (
                                    <p className="inline-flex items-start gap-2 break-words">
                                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                        <span className="min-w-0">
                                            <span className="font-bold text-slate-900">{event_type.location_label}</span>
                                            {event_type.location_value ? <span className="block break-words text-xs text-slate-500">{event_type.location_value}</span> : null}
                                        </span>
                                    </p>
                                ) : null}

                                {booking.guest_notes ? (
                                    <div className="rounded-brand-sm border border-slate-200 bg-white px-3 py-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes</p>
                                        <p className="mt-1 break-words text-sm text-slate-700">{booking.guest_notes}</p>
                                    </div>
                                ) : null}
                            </div>

                            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                <Button
                                    href={route('bookings.public.show', { username: host.username, eventType: event_type.slug })}
                                    className="min-h-11 rounded-brand-sm"
                                    icon={CalendarPlus}
                                >
                                    Book Another Slot
                                </Button>
                                <Button
                                    href={route('bookings.public.index', { username: host.username })}
                                    variant="secondary"
                                    className="min-h-11 rounded-brand-sm"
                                    icon={ArrowLeft}
                                >
                                    Back to Event Types
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}