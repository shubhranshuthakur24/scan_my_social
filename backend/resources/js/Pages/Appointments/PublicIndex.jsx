import Button from '@/Components/Button';
import EmptyState from '@/Components/EmptyState';
import { Head } from '@inertiajs/react';
import { ArrowRight, CalendarDays, Clock3 } from 'lucide-react';

export default function PublicIndex({ host, event_types = [] }) {
    const hostInitial = (host?.name || host?.username || '?').trim().charAt(0).toUpperCase();

    return (
        <>
            <Head title={`Meet with @${host.username}`} />
            <main className="min-h-screen bg-linear-to-br from-slate-50 via-white to-primary-50/40 px-4 py-6 sm:py-10">
                <section className="mx-auto w-full max-w-4xl space-y-5">
                    <div className="overflow-hidden rounded-brand border border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/60 backdrop-blur">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-primary-50/50 px-5 py-6 sm:px-6">
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
                                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Available meetings</p>
                                    <h1 className="mt-2 break-words text-2xl font-black leading-tight text-slate-950 sm:text-4xl">
                                        Meet with {host.name}
                                    </h1>
                                    <p className="mt-2 break-words text-sm font-semibold text-slate-600">@{host.username}</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-4 sm:px-6">
                            <p className="max-w-2xl text-sm font-semibold leading-relaxed text-slate-600 whitespace-pre-wrap">
                                {host.welcome_message || 'Choose the meeting type that fits best, then pick an available time.'}
                            </p>
                        </div>
                    </div>

                    {event_types.length === 0 ? (
                        <EmptyState
                            className="rounded-brand border-slate-200 bg-white/95 shadow-sm"
                            title="No active meeting types are available."
                            description="This booking page does not have any public event types right now. Please check back later."
                            icon={CalendarDays}
                            iconContainerClassName="rounded-brand-sm border-primary-100 bg-primary-50"
                            titleClassName="text-xl font-black text-slate-900"
                            descriptionClassName="text-sm font-semibold text-slate-600"
                        />
                    ) : (
                        <div className="grid gap-3">
                            {event_types.map((eventType) => (
                                <article key={eventType.id} className="rounded-brand border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <h2 className="break-words text-lg font-black text-slate-950">{eventType.name}</h2>
                                            {eventType.description && (
                                                <p className="mt-2 break-words text-sm leading-relaxed text-slate-600">{eventType.description}</p>
                                            )}
                                            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                                                <span className="inline-flex min-h-9 items-center gap-1.5 rounded-brand-sm border border-slate-200 bg-slate-50 px-3">
                                                    <Clock3 className="h-3.5 w-3.5 text-primary-500" />
                                                    {eventType.duration_minutes} min
                                                </span>
                                                <span className="inline-flex min-h-9 max-w-full items-center rounded-brand-sm border border-slate-200 bg-slate-50 px-3">
                                                    <span className="break-words">{eventType.timezone}</span>
                                                </span>
                                            </p>
                                        </div>

                                        <Button
                                            href={route('bookings.public.show', {
                                                username: host.username,
                                                eventType: eventType.slug,
                                            })}
                                            variant="primary"
                                            size="sm"
                                            className="min-h-11 w-full rounded-brand-sm sm:w-auto"
                                        >
                                            Schedule
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </>
    );
}