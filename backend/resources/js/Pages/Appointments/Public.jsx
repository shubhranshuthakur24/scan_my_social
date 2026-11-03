import Button from '@/Components/Button';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react';
import { useMemo } from 'react';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseMonthKey(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1);
}

function formatMonthKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function getTodayKey(timezone) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';
    const day = parts.find((part) => part.type === 'day')?.value ?? '01';

    return `${year}-${month}-${day}`;
}

export default function PublicBooking({ host, event_type, selected_date, calendar_month, available_dates = [], slots = [] }) {
    const hostInitial = (host?.name || host?.username || '?').trim().charAt(0).toUpperCase();
    const { flash = {} } = usePage().props;
    const bookingForm = useForm({
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        guest_notes: '',
        guest_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        starts_at: '',
    });

    const todayKey = useMemo(() => getTodayKey(event_type.timezone), [event_type.timezone]);
    const availableDateSet = useMemo(() => new Set(available_dates), [available_dates]);
    const selectedDate = useMemo(() => parseDateKey(selected_date), [selected_date]);
    const viewMonth = useMemo(() => parseMonthKey(calendar_month), [calendar_month]);

    const monthLabel = useMemo(() => new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
    }).format(viewMonth), [viewMonth]);

    const selectedDateLabel = useMemo(() => new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    }).format(selectedDate), [selectedDate]);

    const selectedSlot = useMemo(() => (
        slots.find((slot) => slot.starts_at === bookingForm.data.starts_at) || null
    ), [bookingForm.data.starts_at, slots]);

    const resolvedLocationLabel = (() => {
        if (event_type.location_label && event_type.location_label.trim() !== '') {
            return event_type.location_label.trim();
        }

        const labels = {
            google_meet: 'Google Meet',
            zoom_call: 'Zoom Call',
            in_person: 'In Person',
            phone: 'Phone Call',
            custom: 'Custom',
        };

        return labels[event_type.location_type] || '';
    })();

    const calendarCells = useMemo(() => {
        const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
        const startWeekday = firstDay.getDay();
        const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
        const cells = [];

        for (let index = 0; index < startWeekday; index += 1) {
            cells.push(null);
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
        }

        while (cells.length % 7 !== 0) {
            cells.push(null);
        }

        return cells;
    }, [viewMonth]);

    const loadCalendar = (dateValue, monthKey) => {
        bookingForm.setData('starts_at', '');

        router.get(route('bookings.public.show', {
            username: host.username,
            eventType: event_type.slug,
        }), { date: dateValue, month: monthKey }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const selectDate = (value) => {
        if (value < todayKey || !availableDateSet.has(value)) {
            return;
        }

        loadCalendar(value, calendar_month);
    };

    const viewPreviousMonth = () => {
        const previousMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
        loadCalendar(selected_date, formatMonthKey(previousMonth));
    };

    const viewNextMonth = () => {
        const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
        loadCalendar(selected_date, formatMonthKey(nextMonth));
    };

    const submitBooking = (e) => {
        e.preventDefault();
        bookingForm.post(route('bookings.public.store', {
            username: host.username,
            eventType: event_type.slug,
        }), {
            preserveScroll: true,
            onSuccess: () => bookingForm.reset('guest_name', 'guest_email', 'guest_phone', 'guest_notes', 'starts_at'),
        });
    };

    return (
        <>
            <Head title={`${event_type.name} | @${host.username}`} />
            <main className="min-h-screen bg-linear-to-br from-slate-50 via-white to-primary-50/40 px-4 py-5 sm:py-10">
                <section className="mx-auto w-full max-w-7xl space-y-5">
                    <div className="overflow-hidden rounded-brand border border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/60 backdrop-blur">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-primary-50/50 px-5 py-5 sm:px-6">
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Book a meeting</p>
                            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
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
                                    <h1 className="break-words text-2xl font-black leading-tight text-slate-950 sm:text-4xl">{event_type.name}</h1>
                                    <p className="mt-2 break-words text-sm font-semibold text-slate-600">
                                        with {host.name} <span className="text-slate-400">@{host.username}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-4 sm:px-6">
                            {event_type.description && <p className="max-w-4xl break-words text-sm leading-relaxed text-slate-600">{event_type.description}</p>}
                            <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                                <span className="inline-flex min-h-9 items-center gap-1.5 rounded-brand-sm border border-slate-200 bg-slate-50 px-3">
                                    <Clock3 className="h-3.5 w-3.5 text-primary-500" />
                                    {event_type.duration_minutes} min
                                </span>
                                <span className="inline-flex min-h-9 items-center rounded-brand-sm border border-slate-200 bg-slate-50 px-3">
                                    {event_type.timezone}
                                </span>
                                {resolvedLocationLabel ? (
                                    <span className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-brand-sm border border-slate-200 bg-slate-50 px-3">
                                        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                                        <span className="break-words">{resolvedLocationLabel}</span>
                                    </span>
                                ) : null}
                            </div>
                            {event_type.location_value ? (
                                <p className="mt-2 break-words text-xs font-semibold text-slate-500">{event_type.location_value}</p>
                            ) : null}
                        </div>
                    </div>

                    {flash.success && (
                        <div className="rounded-brand-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm">
                            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {flash.success}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
                        <div className="overflow-hidden rounded-brand border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Choose a time</p>
                                    <h2 className="mt-1 text-lg font-black text-slate-950">Pick a date and available slot</h2>
                                </div>
                                <span className="inline-flex w-fit items-center gap-1.5 rounded-brand-sm border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-black text-primary-700">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {selectedDateLabel}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1.2fr,1fr]">
                                <section>
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <h3 className="break-words text-xl font-black tracking-tight text-slate-900">{monthLabel}</h3>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={viewPreviousMonth}
                                                className="inline-flex h-11 w-11 items-center justify-center rounded-brand-sm border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                                aria-label="Previous month"
                                                title="Previous month"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={viewNextMonth}
                                                className="inline-flex h-11 w-11 items-center justify-center rounded-brand-sm border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                                aria-label="Next month"
                                                title="Next month"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-7 gap-1.5">
                                        {WEEKDAY_LABELS.map((label) => (
                                            <p key={label} className="py-1 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                                                {label}
                                            </p>
                                        ))}
                                    </div>

                                    <div className="mt-2 grid grid-cols-7 gap-1.5">
                                        {calendarCells.map((cellDate, index) => {
                                            if (cellDate === null) {
                                                return <div key={`empty-${index}`} className="h-11" />;
                                            }

                                            const dateKey = formatDateKey(cellDate);
                                            const isPast = dateKey < todayKey;
                                            const isSelected = dateKey === selected_date;
                                            const isAvailable = availableDateSet.has(dateKey);
                                            const isDisabled = isPast || !isAvailable;

                                            return (
                                                <button
                                                    key={dateKey}
                                                    type="button"
                                                    onClick={() => selectDate(dateKey)}
                                                    disabled={isDisabled}
                                                    className={`h-11 rounded-brand-sm text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 ${isSelected
                                                            ? 'bg-slate-950 text-white shadow-sm shadow-slate-900/20'
                                                            : isDisabled
                                                                ? 'cursor-not-allowed bg-slate-50 text-slate-300'
                                                                : 'text-slate-700 hover:bg-slate-100'
                                                        }`}
                                                    aria-pressed={isSelected}
                                                    aria-label={`${isSelected ? 'Selected date' : isAvailable ? 'Choose date' : 'Unavailable date'} ${dateKey}`}
                                                >
                                                    {cellDate.getDate()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                <section className="min-w-0 space-y-3 rounded-brand-sm border border-slate-100 bg-slate-50 p-4">
                                    <div>
                                        <p className="break-words text-sm font-black text-slate-900">{selectedDateLabel}</p>
                                        <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">Available slots</p>
                                    </div>
                                    <div className="max-h-[23rem] space-y-2 overflow-y-auto pr-1">
                                        {slots.length === 0 ? (
                                            <p className="rounded-brand-sm border border-dashed border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-500">No slots available for this date.</p>
                                        ) : slots.map((slot) => {
                                            const isSelectedSlot = bookingForm.data.starts_at === slot.starts_at;

                                            return (
                                                <button
                                                    key={slot.starts_at}
                                                    type="button"
                                                    onClick={() => bookingForm.setData('starts_at', slot.starts_at)}
                                                    className={`min-h-11 w-full rounded-brand-sm border px-3 py-2.5 text-left text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 ${isSelectedSlot
                                                            ? 'border-primary-300 bg-primary-50 text-primary-800 shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                                        }`}
                                                    aria-pressed={isSelectedSlot}
                                                >
                                                    <span className="flex items-center justify-between gap-3">
                                                        <span className="break-words">{slot.label}</span>
                                                        {isSelectedSlot ? <span className="shrink-0 rounded-brand-sm bg-primary-600 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">Selected</span> : null}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            </div>
                        </div>

                        <form onSubmit={submitBooking} className="space-y-4 rounded-brand border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
                            <div className="rounded-brand-sm border border-slate-100 bg-slate-50 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Booking details</p>
                                <h2 className="mt-1 text-lg font-black text-slate-950">Confirm your spot</h2>
                                <p className="mt-2 break-words text-sm font-semibold text-slate-600">
                                    {selectedSlot ? `Selected: ${selectedDateLabel}, ${selectedSlot.label}` : 'Select a date and slot to continue.'}
                                </p>
                            </div>

                            <div>
                                <label htmlFor="guest-name" className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">Your Name</label>
                                <input
                                    id="guest-name"
                                    value={bookingForm.data.guest_name}
                                    onChange={(e) => bookingForm.setData('guest_name', e.target.value)}
                                    autoComplete="name"
                                    className="min-h-11 w-full rounded-brand-sm border-slate-200 text-sm font-semibold text-slate-800 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
                                />
                                {bookingForm.errors.guest_name && <p className="mt-1 break-words text-xs font-bold text-rose-500">{bookingForm.errors.guest_name}</p>}
                            </div>
                            <div>
                                <label htmlFor="guest-email" className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">Email</label>
                                <input
                                    id="guest-email"
                                    type="email"
                                    value={bookingForm.data.guest_email}
                                    onChange={(e) => bookingForm.setData('guest_email', e.target.value)}
                                    autoComplete="email"
                                    className="min-h-11 w-full rounded-brand-sm border-slate-200 text-sm font-semibold text-slate-800 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
                                />
                                {bookingForm.errors.guest_email && <p className="mt-1 break-words text-xs font-bold text-rose-500">{bookingForm.errors.guest_email}</p>}
                            </div>
                            <div>
                                <label htmlFor="guest-phone" className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">Contact Number</label>
                                <input
                                    id="guest-phone"
                                    type="tel"
                                    value={bookingForm.data.guest_phone}
                                    onChange={(e) => bookingForm.setData('guest_phone', e.target.value)}
                                    autoComplete="tel"
                                    className="min-h-11 w-full rounded-brand-sm border-slate-200 text-sm font-semibold text-slate-800 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
                                />
                                {bookingForm.errors.guest_phone && <p className="mt-1 break-words text-xs font-bold text-rose-500">{bookingForm.errors.guest_phone}</p>}
                            </div>
                            {bookingForm.errors.guest_timezone && <p className="break-words text-xs font-bold text-rose-500">{bookingForm.errors.guest_timezone}</p>}
                            <div>
                                <label htmlFor="guest-notes" className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-500">Notes</label>
                                <textarea
                                    id="guest-notes"
                                    rows={3}
                                    value={bookingForm.data.guest_notes}
                                    onChange={(e) => bookingForm.setData('guest_notes', e.target.value)}
                                    className="w-full rounded-brand-sm border-slate-200 text-sm font-semibold text-slate-800 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
                                    placeholder="Optional context for the meeting"
                                />
                                {bookingForm.errors.guest_notes && <p className="mt-1 break-words text-xs font-bold text-rose-500">{bookingForm.errors.guest_notes}</p>}
                            </div>
                            {bookingForm.errors.starts_at && <p className="break-words text-xs font-bold text-rose-500">{bookingForm.errors.starts_at}</p>}
                            <Button type="submit" disabled={bookingForm.processing || bookingForm.data.starts_at === ''} isLoading={bookingForm.processing} className="min-h-12 w-full rounded-brand-sm">
                                {bookingForm.processing ? 'Confirming...' : 'Confirm Meeting'}
                            </Button>
                            <p className="text-center text-xs font-semibold leading-relaxed text-slate-500">Your details are only used to confirm and manage this appointment.</p>
                        </form>
                    </div>
                </section>
            </main>
        </>
    );
}