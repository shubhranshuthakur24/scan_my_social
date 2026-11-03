import InputError from '@/Components/InputError';
import Button from '@/Components/Button';
import { useToast } from '@/Contexts/ToastContext';
import { useForm } from '@inertiajs/react';
import { CalendarDays, MapPin, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DAYS,
    LOCATION_OPTIONS,
    TIME_STEP_SECONDS,
    DURATION_OPTIONS,
    SCHEDULE_TYPE_OPTIONS,
    buildInitialDaySchedules,
    flattenDaySchedules,
    firstErrorMessage,
    toMinutes,
    formatDuration,
    findScheduleErrors,
    findOneTimeWindowError
} from './bookingUtils';

const formControlClasses = 'w-full rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20';
const compactControlButtonClasses = 'rounded-brand-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2';

export default function EventTypeForm({
    appTimezone = 'UTC',
    eventType = null,
    globalAvailabilityRules = [],
    lockTimeSlotsAcrossEventTypes = false,
}) {
    const { addToast } = useToast();
    const isEditing = Boolean(eventType?.id);
    const [daySchedules, setDaySchedules] = useState(() => buildInitialDaySchedules(eventType, globalAvailabilityRules));
    const [copyTargets, setCopyTargets] = useState(() => DAYS.map((_, index) => [(index + 1) % DAYS.length]));
    const [activeCopyDayIndex, setActiveCopyDayIndex] = useState(null);

    const eventTypeForm = useForm({
        name: eventType?.name || '',
        description: eventType?.description || '',
        schedule_type: eventType?.schedule_type || 'weekly',
        one_time_date: eventType?.one_time_date || '',
        one_time_start_time: eventType?.one_time_start_time || '10:00',
        one_time_end_time: eventType?.one_time_end_time || '12:00',
        duration_minutes: eventType?.duration_minutes || 30,
        buffer_minutes: eventType?.buffer_minutes || 0,
        timezone: appTimezone,
        location_type: eventType?.location_type || 'google_meet',
        location_value: eventType?.location_value || '',
        location_label: eventType?.location_label || '',
        allows_multi_seat_booking: Boolean(eventType?.allows_multi_seat_booking),
        seat_limit_mode: eventType?.allows_multi_seat_booking
            ? (eventType?.seat_capacity === null ? 'unlimited' : 'limited')
            : 'limited',
        seat_capacity: eventType?.seat_capacity ?? 2,
        exclude_from_global_slot_lock: Boolean(eventType?.exclude_from_global_slot_lock),
        is_active: eventType ? Boolean(eventType.is_active) : true,
        override_minimum_booking_notice: Boolean(eventType?.minimum_booking_notice_minutes !== null),
        minimum_booking_notice_minutes: eventType?.minimum_booking_notice_minutes ?? 120,
        override_booking_window: Boolean(eventType?.booking_window_days !== null),
        booking_window_days: eventType?.booking_window_days ?? 60,
        availability_rules: flattenDaySchedules(daySchedules),
    });

    const isOneTimeSchedule = eventTypeForm.data.schedule_type === 'one_time';
    const scheduleErrors = useMemo(() => findScheduleErrors(daySchedules), [daySchedules]);
    const oneTimeWindowError = useMemo(() => findOneTimeWindowError(
        eventTypeForm.data.schedule_type,
        eventTypeForm.data.one_time_date,
        eventTypeForm.data.one_time_start_time,
        eventTypeForm.data.one_time_end_time,
        Number(eventTypeForm.data.duration_minutes) || 0,
    ), [
        eventTypeForm.data.schedule_type,
        eventTypeForm.data.one_time_date,
        eventTypeForm.data.one_time_start_time,
        eventTypeForm.data.one_time_end_time,
        eventTypeForm.data.duration_minutes,
    ]);
    const firstAvailabilityError = Object.entries(eventTypeForm.errors).find(([key]) => key.startsWith('availability_rules.'))?.[1] || null;

    const setDayOpen = (dayIndex, isOpen) => {
        setDaySchedules((previous) => previous.map((daySchedule, index) => (
            index === dayIndex
                ? {
                    ...daySchedule,
                    is_open: isOpen,
                    slots: daySchedule.slots.length > 0 ? daySchedule.slots : [{ start_time: '09:00', end_time: '17:00' }],
                }
                : daySchedule
        )));
    };

    const updateDaySlot = (dayIndex, slotIndex, key, value) => {
        setDaySchedules((previous) => previous.map((daySchedule, index) => {
            if (index !== dayIndex) {
                return daySchedule;
            }

            return {
                ...daySchedule,
                slots: daySchedule.slots.map((slot, indexOfSlot) => (
                    indexOfSlot === slotIndex ? { ...slot, [key]: value } : slot
                )),
            };
        }));
    };

    const addDaySlot = (dayIndex) => {
        setDaySchedules((previous) => previous.map((daySchedule, index) => (
            index === dayIndex
                ? {
                    ...daySchedule,
                    is_open: true,
                    slots: [
                        ...daySchedule.slots,
                        { start_time: '09:00', end_time: '17:00' },
                    ],
                }
                : daySchedule
        )));
    };

    const removeDaySlot = (dayIndex, slotIndex) => {
        setDaySchedules((previous) => previous.map((daySchedule, index) => {
            if (index !== dayIndex) {
                return daySchedule;
            }

            const nextSlots = daySchedule.slots.filter((_, indexOfSlot) => indexOfSlot !== slotIndex);

            return {
                ...daySchedule,
                slots: nextSlots.length > 0 ? nextSlots : [{ start_time: '09:00', end_time: '17:00' }],
            };
        }));
    };

    const applyWeekdayPreset = () => {
        setDaySchedules((previous) => previous.map((daySchedule) => (
            daySchedule.day_of_week >= 1 && daySchedule.day_of_week <= 5
                ? { ...daySchedule, is_open: true, slots: [{ start_time: '09:00', end_time: '17:00' }] }
                : { ...daySchedule, is_open: false }
        )));
    };

    const copyMondayToWeekdays = () => {
        setDaySchedules((previous) => {
            const monday = previous.find((daySchedule) => daySchedule.day_of_week === 1);
            if (!monday) {
                return previous;
            }

            return previous.map((daySchedule) => (
                daySchedule.day_of_week >= 1 && daySchedule.day_of_week <= 5
                    ? {
                        ...daySchedule,
                        is_open: monday.is_open,
                        slots: monday.slots.map((slot) => ({ ...slot })),
                    }
                    : daySchedule
            ));
        });
    };

    const openAllDays = () => {
        setDaySchedules((previous) => previous.map((daySchedule) => ({
            ...daySchedule,
            is_open: true,
            slots: daySchedule.slots.length > 0 ? daySchedule.slots : [{ start_time: '09:00', end_time: '17:00' }],
        })));
    };

    const closeWeekends = () => {
        setDaySchedules((previous) => previous.map((daySchedule) => (
            daySchedule.day_of_week === 0 || daySchedule.day_of_week === 6
                ? { ...daySchedule, is_open: false }
                : daySchedule
        )));
    };

    const toggleCopyTarget = (sourceDayIndex, targetDayIndex) => {
        if (sourceDayIndex === targetDayIndex) {
            return;
        }

        setCopyTargets((previous) => previous.map((targets, dayIndex) => {
            if (dayIndex !== sourceDayIndex) {
                return targets;
            }

            const hasTarget = targets.includes(targetDayIndex);

            if (hasTarget) {
                return targets.filter((target) => target !== targetDayIndex);
            }

            return [...targets, targetDayIndex];
        }));
    };

    const copyToDays = (sourceDayIndex, targetDayIndexes) => {
        if (!Array.isArray(targetDayIndexes) || targetDayIndexes.length === 0) {
            return;
        }

        const validTargets = targetDayIndexes.filter((targetIndex) => targetIndex !== sourceDayIndex);
        if (validTargets.length === 0) {
            return;
        }

        setDaySchedules((previous) => previous.map((daySchedule, index) => {
            if (!validTargets.includes(index)) {
                return daySchedule;
            }

            const source = previous[sourceDayIndex];

            if (!source) {
                return daySchedule;
            }

            return {
                ...daySchedule,
                is_open: source.is_open,
                slots: source.slots.map((slot) => ({ ...slot })),
            };
        }));
    };

    const toggleCopyMenu = (dayIndex) => {
        setActiveCopyDayIndex((previous) => (previous === dayIndex ? null : dayIndex));
    };

    const applyCopySelection = (sourceDayIndex) => {
        copyToDays(sourceDayIndex, copyTargets[sourceDayIndex] || []);
        setActiveCopyDayIndex(null);
    };

    const submitEventType = (e) => {
        e.preventDefault();

        if (!isOneTimeSchedule && scheduleErrors.size > 0) {
            addToast('Please fix invalid availability slots before saving.', 'error');
            return;
        }

        if (oneTimeWindowError) {
            addToast(oneTimeWindowError, 'error');
            return;
        }

        const payload = isOneTimeSchedule ? [] : flattenDaySchedules(daySchedules);

        try {
            const onError = (errors) => {
                addToast(firstErrorMessage(errors) || 'Please review the form and try again.', 'error');
            };
            const onFinish = () => {
                eventTypeForm.transform((data) => data);
            };

            eventTypeForm.transform((data) => ({
                ...data,
                availability_rules: payload,
                one_time_date: data.schedule_type === 'one_time' ? data.one_time_date : null,
                one_time_start_time: data.schedule_type === 'one_time' ? data.one_time_start_time : null,
                one_time_end_time: data.schedule_type === 'one_time' ? data.one_time_end_time : null,
                minimum_booking_notice_minutes: data.override_minimum_booking_notice ? Number(data.minimum_booking_notice_minutes) : null,
                booking_window_days: data.override_booking_window ? Number(data.booking_window_days) : null,
            }));

            if (isEditing) {
                eventTypeForm.put(route('appointments.event-types.update', eventType.id), {
                    preserveScroll: true,
                    onError,
                    onFinish,
                });
                return;
            }

            eventTypeForm.post(route('appointments.event-types.store'), {
                preserveScroll: true,
                onError,
                onFinish,
            });
        } catch {
            addToast('Something went wrong while saving this event type.', 'error');
        }
    };

    return (
        <form onSubmit={submitEventType} className="space-y-5">
            <section className="rounded-brand border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch">
                    <section className="flex h-full flex-col space-y-5">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900">{isEditing ? 'Edit Event Type' : 'Create Event Type'}</h2>
                                <p className="mt-1 text-sm text-slate-500">Default durations are optimized for consult calls.</p>
                            </div>
                             
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Event Name</label>
                                <input value={eventTypeForm.data.name} onChange={(e) => eventTypeForm.setData('name', e.target.value)} className={formControlClasses} placeholder="30 Minute Consultation" />
                                <InputError message={eventTypeForm.errors.name} className="mt-1" />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Timezone</label>
                                <input value={eventTypeForm.data.timezone} readOnly disabled className="w-full cursor-not-allowed rounded-brand-sm border-slate-200 bg-slate-100 text-sm text-slate-600 shadow-sm focus-visible:outline-none" />
                                <InputError message={eventTypeForm.errors.timezone} className="mt-1" />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                            <textarea value={eventTypeForm.data.description} onChange={(e) => eventTypeForm.setData('description', e.target.value)} rows={2} className={formControlClasses} placeholder="Quick discovery call to understand goals." />
                            <InputError message={eventTypeForm.errors.description} className="mt-1" />
                        </div>

                        <section className="space-y-3 rounded-brand-sm border border-slate-200 bg-slate-50/70 p-4">
                            <h3 className="text-sm font-black text-slate-900">Schedule Type</h3>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {SCHEDULE_TYPE_OPTIONS.map((option) => {
                                    const isSelected = eventTypeForm.data.schedule_type === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => eventTypeForm.setData('schedule_type', option.value)}
                                            className={`rounded-brand-sm border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 ${isSelected ? 'border-primary-300 bg-primary-50 text-primary-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                                        >
                                            <span className="block text-sm font-black">{option.label}</span>
                                            <span className="mt-1 block text-xs font-semibold text-slate-500">{option.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <InputError message={eventTypeForm.errors.schedule_type} />
                        </section>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-start">
                            <div className="md:col-span-3">
                                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</label>
                                <select value={eventTypeForm.data.duration_minutes} onChange={(e) => eventTypeForm.setData('duration_minutes', Number(e.target.value))} className={formControlClasses}>
                                    {DURATION_OPTIONS.map((minutes) => (
                                        <option key={minutes} value={minutes}>
                                            {minutes >= 60
                                                ? `${Math.floor(minutes / 60)}h${minutes % 60 === 0 ? '' : ` ${minutes % 60}m`}`
                                                : `${minutes} minutes`}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={eventTypeForm.errors.duration_minutes} className="mt-1" />
                            </div>
                            <div className="md:col-span-3">
                                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Buffer (minutes)</label>
                                <input type="number" min={0} max={60} value={eventTypeForm.data.buffer_minutes} onChange={(e) => eventTypeForm.setData('buffer_minutes', Number(e.target.value))} className={formControlClasses} />
                                <p className="mt-1 min-h-[2.2rem] text-xs text-slate-500">Gap between consecutive bookings.</p>
                                <InputError message={eventTypeForm.errors.buffer_minutes} className="mt-1" />
                            </div>
                            <label className="flex h-11 items-center gap-3 self-start rounded-brand-sm border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 md:col-span-6 md:mt-6">
                                <input type="checkbox" checked={Boolean(eventTypeForm.data.is_active)} onChange={(e) => eventTypeForm.setData('is_active', e.target.checked)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                                Active on public page
                            </label>
                        </div>

                        <section className="space-y-3 rounded-brand-sm border border-slate-200 bg-slate-50/70 p-4">
                            <h3 className="text-sm font-black text-slate-900">Slot Capacity</h3>
                            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(eventTypeForm.data.allows_multi_seat_booking)}
                                    onChange={(e) => {
                                        const enabled = e.target.checked;
                                        eventTypeForm.setData('allows_multi_seat_booking', enabled);
                                        if (!enabled) {
                                            eventTypeForm.setData('seat_limit_mode', 'limited');
                                            eventTypeForm.setData('seat_capacity', 1);
                                        } else if (eventTypeForm.data.seat_capacity < 2) {
                                            eventTypeForm.setData('seat_capacity', 2);
                                        }
                                    }}
                                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                Allow multiple bookings in the same slot
                            </label>

                            {eventTypeForm.data.allows_multi_seat_booking ? (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="md:col-span-2">
                                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Capacity Mode</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => eventTypeForm.setData('seat_limit_mode', 'limited')}
                                                className={`rounded-brand-sm border px-3 py-2 text-xs font-black uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 ${eventTypeForm.data.seat_limit_mode === 'limited' ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-800'}`}
                                            >
                                                Limited
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => eventTypeForm.setData('seat_limit_mode', 'unlimited')}
                                                className={`rounded-brand-sm border px-3 py-2 text-xs font-black uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 ${eventTypeForm.data.seat_limit_mode === 'unlimited' ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:text-slate-800'}`}
                                            >
                                                Unlimited
                                            </button>
                                        </div>
                                        <InputError message={eventTypeForm.errors.seat_limit_mode} className="mt-1" />
                                    </div>

                                    {eventTypeForm.data.seat_limit_mode === 'limited' ? (
                                        <div>
                                            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Seat Capacity</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={500}
                                                value={eventTypeForm.data.seat_capacity}
                                                onChange={(e) => eventTypeForm.setData('seat_capacity', Number(e.target.value))}
                                                className={formControlClasses}
                                            />
                                            <InputError message={eventTypeForm.errors.seat_capacity} className="mt-1" />
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </section>

                        <section className="space-y-2 rounded-brand-sm border border-slate-200 bg-slate-50/70 p-4">
                            <h3 className="text-sm font-black text-slate-900">Global Slot Lock</h3>
                            <label className="flex items-start gap-3 rounded-brand-sm border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(eventTypeForm.data.exclude_from_global_slot_lock)}
                                    onChange={(e) => eventTypeForm.setData('exclude_from_global_slot_lock', e.target.checked)}
                                    className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="space-y-1 break-words">
                                    <span className="block">Exclude this event from host-wide slot lock</span>
                                    <span className="block text-xs font-medium text-slate-500">
                                        {lockTimeSlotsAcrossEventTypes
                                            ? 'When enabled, bookings in this event will not block other events, and other events will not block this one.'
                                            : 'Host-wide slot lock is currently OFF in settings. This option will apply when that setting is enabled.'}
                                    </span>
                                </span>
                            </label>
                            <InputError message={eventTypeForm.errors.exclude_from_global_slot_lock} />
                        </section>
 
                        <section className="space-y-4 rounded-brand-sm border border-slate-200 bg-slate-50/70 p-4">
                            <h3 className="text-sm font-black text-slate-900">Advanced Scheduling Limits</h3>
                            
                            {/* Minimum Booking Notice Override */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(eventTypeForm.data.override_minimum_booking_notice)}
                                        onChange={(e) => {
                                            eventTypeForm.setData('override_minimum_booking_notice', e.target.checked);
                                        }}
                                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    Override global minimum booking notice
                                </label>
 
                                {eventTypeForm.data.override_minimum_booking_notice ? (
                                    <div className="grid grid-cols-1 gap-2 max-w-xs pl-6">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Notice Period (minutes)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={eventTypeForm.data.minimum_booking_notice_minutes}
                                            onChange={(e) => eventTypeForm.setData('minimum_booking_notice_minutes', Number(e.target.value))}
                                            className={formControlClasses}
                                            placeholder="120"
                                        />
                                        <InputError message={eventTypeForm.errors.minimum_booking_notice_minutes} />
                                    </div>
                                ) : (
                                    <p className="pl-6 text-xs font-semibold text-slate-500">
                                        Inherits global minimum notice (2 hours or your custom settings).
                                    </p>
                                )}
                            </div>
 
                            <hr className="border-slate-200" />
 
                            {/* Booking Window Override */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(eventTypeForm.data.override_booking_window)}
                                        onChange={(e) => {
                                            eventTypeForm.setData('override_booking_window', e.target.checked);
                                        }}
                                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    Override global booking window
                                </label>
 
                                {eventTypeForm.data.override_booking_window ? (
                                    <div className="grid grid-cols-1 gap-2 max-w-xs pl-6">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Booking Window (days)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={365}
                                            value={eventTypeForm.data.booking_window_days}
                                            onChange={(e) => eventTypeForm.setData('booking_window_days', Number(e.target.value))}
                                            className={formControlClasses}
                                            placeholder="60"
                                        />
                                        <InputError message={eventTypeForm.errors.booking_window_days} />
                                    </div>
                                ) : (
                                    <p className="pl-6 text-xs font-semibold text-slate-500">
                                        Inherits global booking window (60 days or your custom settings).
                                    </p>
                                )}
                            </div>
                        </section>

                        <section className="space-y-3 rounded-brand-sm border border-slate-200 bg-slate-50/70 p-4">
                            <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                                <MapPin className="h-4 w-4 text-primary-600" />
                                Location
                            </h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Location Type</label>
                                    <select
                                        value={eventTypeForm.data.location_type}
                                        onChange={(e) => eventTypeForm.setData('location_type', e.target.value)}
                                        className={formControlClasses}
                                    >
                                        {LOCATION_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>{option.icon} {option.label}</option>
                                        ))}
                                    </select>
                                    <InputError message={eventTypeForm.errors.location_type} className="mt-1" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Label</label>
                                    <input
                                        value={eventTypeForm.data.location_label}
                                        onChange={(e) => eventTypeForm.setData('location_label', e.target.value)}
                                        className={formControlClasses}
                                        placeholder="Showroom Visit / Zoom Room"
                                    />
                                    <InputError message={eventTypeForm.errors.location_label} className="mt-1" />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Location Value</label>
                                <input
                                    value={eventTypeForm.data.location_value}
                                    onChange={(e) => eventTypeForm.setData('location_value', e.target.value)}
                                    className={formControlClasses}
                                    placeholder="Meet link, address, or phone number"
                                
                                />
                                <InputError message={eventTypeForm.errors.location_value} className="mt-1" />
                            </div>
                        </section>
                    </section>

                    <section className="rounded-brand-sm border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                        {isOneTimeSchedule ? (
                            <>
                                <div>
                                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><CalendarDays className="h-4 w-4 text-primary-600" /> One-Time Availability</h3>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">Choose the exact date and time window when this event can be booked.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Date</label>
                                        <input
                                            type="date"
                                            value={eventTypeForm.data.one_time_date}
                                            onChange={(e) => eventTypeForm.setData('one_time_date', e.target.value)}
                                            className={formControlClasses}
                                        />
                                        <InputError message={eventTypeForm.errors.one_time_date} className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">From</label>
                                        <input
                                            type="time"
                                            step={TIME_STEP_SECONDS}
                                            value={eventTypeForm.data.one_time_start_time}
                                            onChange={(e) => eventTypeForm.setData('one_time_start_time', e.target.value)}
                                            className={formControlClasses}
                                        />
                                        <InputError message={eventTypeForm.errors.one_time_start_time} className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">To</label>
                                        <input
                                            type="time"
                                            step={TIME_STEP_SECONDS}
                                            value={eventTypeForm.data.one_time_end_time}
                                            onChange={(e) => eventTypeForm.setData('one_time_end_time', e.target.value)}
                                            className={formControlClasses}
                                        />
                                        <InputError message={eventTypeForm.errors.one_time_end_time} className="mt-1" />
                                    </div>
                                </div>
                                <div className="rounded-brand-sm border border-slate-200 bg-white px-4 py-3">
                                    <p className="text-sm font-black text-slate-900">Booking window summary</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        The event stays public until this one-time window passes. Slot duration and buffer still apply inside this window.
                                    </p>
                                    <InputError message={oneTimeWindowError} className="mt-2" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900"><CalendarDays className="h-4 w-4 text-primary-600" /> Event Type Availability</h3>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">Timezone: {eventTypeForm.data.timezone}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={applyWeekdayPreset} className={compactControlButtonClasses}>
                                            Apply Mon-Fri 9-5
                                        </button>
                                        <button type="button" onClick={copyMondayToWeekdays} className={compactControlButtonClasses}>
                                            Copy Monday
                                        </button>
                                        <button type="button" onClick={openAllDays} className={compactControlButtonClasses}>
                                            Open all days
                                        </button>
                                        <button type="button" onClick={closeWeekends} className={compactControlButtonClasses}>
                                            Close weekends
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 max-h-auto overflow-y-auto pr-1">
                                    <div className="sticky top-0 z-10 rounded-brand-sm border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 md:grid md:grid-cols-[72px,64px,minmax(0,1fr)] md:items-center md:gap-x-2">
                                        <span>Day</span>
                                        <span className="hidden md:block">Open</span>
                                        <div className="hidden md:grid md:grid-cols-[minmax(0,1fr),minmax(0,1fr),120px] md:gap-x-2">
                                            <span>From</span>
                                            <span>To</span>
                                            <span>Action</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 space-y-2">
                                        {daySchedules.map((daySchedule, dayIndex) => {
                                            const totalMinutes = daySchedule.slots.reduce((minutes, slot) => {
                                                if (!daySchedule.is_open) {
                                                    return minutes;
                                                }
 
                                                const start = toMinutes(slot.start_time);
                                                const end = toMinutes(slot.end_time);
 
                                                if (start === null || end === null || end <= start) {
                                                    return minutes;
                                                }
 
                                                return minutes + (end - start);
                                            }, 0);
 
                                            return (
                                                <div
                                                    key={daySchedule.day_of_week}
                                                    className={`grid grid-cols-1 gap-y-2 rounded-brand-sm border bg-white px-3 py-2.5 md:grid-cols-[72px,64px,minmax(0,1fr)] md:items-start md:gap-x-2 ${scheduleErrors.get(dayIndex) ? 'border-rose-300' : 'border-slate-200'} ${!daySchedule.is_open ? 'opacity-70' : ''}`}
                                                >
                                                    <div className="space-y-1 md:pt-1">
                                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{DAYS[dayIndex].label}</p>
                                                        {daySchedule.is_open ? (
                                                            <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{formatDuration(totalMinutes)}</span>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex items-center md:pt-1">
                                                        <p className="mr-2 text-[10px] font-black uppercase tracking-widest text-slate-400 md:hidden">Open</p>
                                                        <label className="flex items-center">
                                                            <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
                                                                <input type="checkbox" checked={daySchedule.is_open} onChange={(e) => setDayOpen(dayIndex, e.target.checked)} className="peer sr-only" />
                                                                <span className="h-5 w-9 rounded-full bg-slate-200 transition-colors peer-checked:bg-primary-500" />
                                                                <span className="pointer-events-none absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                                                            </span>
                                                        </label>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="space-y-2">
                                                            {daySchedule.slots.map((slot, slotIndex) => (
                                                                <div key={`${daySchedule.day_of_week}-${slotIndex}`} className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr),minmax(0,1fr),120px] md:items-center">
                                                                    <div>
                                                                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 md:hidden">From</p>
                                                                        <input
                                                                            type="time"
                                                                            step={TIME_STEP_SECONDS}
                                                                            value={slot.start_time}
                                                                            disabled={!daySchedule.is_open}
                                                                            onChange={(e) => updateDaySlot(dayIndex, slotIndex, 'start_time', e.target.value)}
                                                                            className="w-full rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 disabled:bg-slate-100"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 md:hidden">To</p>
                                                                        <input
                                                                            type="time"
                                                                            step={TIME_STEP_SECONDS}
                                                                            value={slot.end_time}
                                                                            disabled={!daySchedule.is_open}
                                                                            onChange={(e) => updateDaySlot(dayIndex, slotIndex, 'end_time', e.target.value)}
                                                                            className="w-full rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 disabled:bg-slate-100"
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-2 md:justify-start">
                                                                        <p className="mr-2 text-[10px] font-black uppercase tracking-widest text-slate-400 md:hidden">Action</p>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => addDaySlot(dayIndex)}
                                                                            className="inline-flex h-10 w-10 items-center justify-center rounded-brand-sm border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2"
                                                                            aria-label={`Add slot for ${DAYS[dayIndex].label}`}
                                                                            title={`Add slot for ${DAYS[dayIndex].label}`}
                                                                        >
                                                                            <Plus className="h-3.5 w-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeDaySlot(dayIndex, slotIndex)}
                                                                            disabled={daySchedule.slots.length === 1}
                                                                            className="inline-flex h-10 w-10 items-center justify-center rounded-brand-sm border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                                                                            aria-label={`Remove slot ${slotIndex + 1} for ${DAYS[dayIndex].label}`}
                                                                            title={`Remove slot ${slotIndex + 1} for ${DAYS[dayIndex].label}`}
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex flex-wrap items-center justify-start gap-1 md:justify-end">
                                                            <div className="relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleCopyMenu(dayIndex)}
                                                                    className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2"
                                                                    aria-label={`Select copy target days for ${DAYS[dayIndex].label}`}
                                                                >
                                                                    Select days ({copyTargets[dayIndex]?.length || 0})
                                                                </button>
                                                                {activeCopyDayIndex === dayIndex ? (
                                                                    <div className="absolute left-0 z-20 mt-2 w-72 rounded-brand-sm border border-slate-200 bg-white p-3 shadow-lg md:left-auto md:right-0">
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Copy to weekdays</p>
                                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                                            {DAYS.map((day, targetDayIndex) => {
                                                                                if (targetDayIndex === dayIndex) {
                                                                                    return null;
                                                                                }
 
                                                                                const isSelected = copyTargets[dayIndex]?.includes(targetDayIndex);
 
                                                                                return (
                                                                                    <button
                                                                                        key={`copy-target-${day.key}`}
                                                                                        type="button"
                                                                                        onClick={() => toggleCopyTarget(dayIndex, targetDayIndex)}
                                                                                        className={`rounded-md border px-1.5 py-1 text-[10px] font-black uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 ${isSelected ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
                                                                                    >
                                                                                        {day.label}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                        <div className="mt-3 flex justify-end gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setActiveCopyDayIndex(null)}
                                                                                className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2"
                                                                            >
                                                                                Close
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => applyCopySelection(dayIndex)}
                                                                                disabled={!copyTargets[dayIndex] || copyTargets[dayIndex].length === 0}
                                                                                className="rounded-md border border-primary-200 bg-primary-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary-700 transition hover:border-primary-300 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                                                                            >
                                                                                Apply
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <InputError message={scheduleErrors.get(dayIndex)} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <InputError message={firstAvailabilityError || eventTypeForm.errors.availability_rules} className="mt-2" />
                            </>
                        )}
                    </section>
                </div>
                <div className="mt-5 flex justify-end">
                <Button
                    type="submit"
                    disabled={eventTypeForm.processing || (!isOneTimeSchedule && scheduleErrors.size > 0) || Boolean(oneTimeWindowError)}
                    isLoading={eventTypeForm.processing}
                    icon={Plus}
                    className="gap-2 rounded-brand-sm px-5 py-2.5"
                >
                    {eventTypeForm.processing ? 'Saving...' : isEditing ? 'Update Event Type' : 'Create Event Type'}
                </Button>
            </div>
            </section>
            
        </form>
    );
}
