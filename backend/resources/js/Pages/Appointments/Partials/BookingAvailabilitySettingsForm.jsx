import InputError from '@/Components/InputError';
import { useToast } from '@/Contexts/ToastContext';
import { useForm } from '@inertiajs/react';
import { CalendarDays, CalendarX2, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import {
    DAYS,
    TIME_STEP_SECONDS,
    normalizeRulesToDaySchedules,
    flattenDaySchedules,
    toMinutes,
    firstErrorMessage,
    findScheduleErrors
} from './bookingUtils';

function normalizeOverrides(overrides = []) {
    if (!Array.isArray(overrides)) {
        return [];
    }

    return overrides.map((item) => ({
        override_date: item.override_date || '',
        is_full_day: Boolean(item.is_full_day),
        start_time: item.start_time || '09:00',
        end_time: item.end_time || '17:00',
        reason: item.reason || '',
    }));
}

export default function BookingAvailabilitySettingsForm({ bookingAvailability = null }) {
    const { addToast } = useToast();
    const [daySchedules, setDaySchedules] = useState(() => normalizeRulesToDaySchedules(bookingAvailability?.global_availability_rules || []));

    const [showConfirmHours, setShowConfirmHours] = useState(false);
    const [showConfirmOverrides, setShowConfirmOverrides] = useState(false);
    const [overrideToDelete, setOverrideToDelete] = useState(null);

    const workingHoursForm = useForm({
        global_availability_rules: flattenDaySchedules(daySchedules),
        lock_time_slots_across_event_types: Boolean(bookingAvailability?.lock_time_slots_across_event_types),
    });

    const overridesForm = useForm({
        availability_overrides: normalizeOverrides(bookingAvailability?.availability_overrides || []),
    });

    const scheduleErrors = useMemo(() => findScheduleErrors(daySchedules), [daySchedules]);

    useEffect(() => {
        workingHoursForm.setData('global_availability_rules', flattenDaySchedules(daySchedules));
    }, [daySchedules]);

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

    const addOverride = () => {
        overridesForm.setData('availability_overrides', [
            ...overridesForm.data.availability_overrides,
            {
                override_date: '',
                is_full_day: true,
                start_time: '09:00',
                end_time: '17:00',
                reason: '',
            },
        ]);
    };

    const updateOverride = (index, key, value) => {
        overridesForm.setData('availability_overrides', overridesForm.data.availability_overrides.map((override, overrideIndex) => (
            overrideIndex === index ? { ...override, [key]: value } : override
        )));
    };

    const removeOverride = (index) => {
        setOverrideToDelete(index);
    };

    const confirmRemoveOverride = () => {
        if (overrideToDelete !== null) {
            overridesForm.setData(
                'availability_overrides',
                overridesForm.data.availability_overrides.filter((_, overrideIndex) => overrideIndex !== overrideToDelete)
            );
            setOverrideToDelete(null);
        }
    };

    const hasOverrideErrors = overridesForm.data.availability_overrides.some((override) => {
        if (!override.override_date) {
            return true;
        }

        if (override.is_full_day) {
            return false;
        }

        const start = toMinutes(override.start_time);
        const end = toMinutes(override.end_time);

        return start === null || end === null || end <= start;
    });

    const submitWorkingHours = (event) => {
        event.preventDefault();

        if (scheduleErrors.size > 0) {
            addToast('Please fix invalid global working-hour slots before saving.', 'error');
            return;
        }

        setShowConfirmHours(true);
    };

    const confirmSubmitWorkingHours = () => {
        setShowConfirmHours(false);
        const payload = flattenDaySchedules(daySchedules);

        workingHoursForm.transform(() => ({
            global_availability_rules: payload,
            lock_time_slots_across_event_types: Boolean(workingHoursForm.data.lock_time_slots_across_event_types),
        }));

        workingHoursForm.patch(route('settings.bookings.working-hours.update'), {
            preserveScroll: true,
            onError: (errors) => addToast(firstErrorMessage(errors) || 'Please review global working hours.', 'error'),
            onFinish: () => {
                workingHoursForm.transform((data) => data);
            },
        });
    };

    const submitOverrides = (event) => {
        event.preventDefault();

        if (hasOverrideErrors) {
            addToast('Please fix invalid date overrides before saving.', 'error');
            return;
        }

        setShowConfirmOverrides(true);
    };

    const confirmSubmitOverrides = () => {
        setShowConfirmOverrides(false);
        overridesForm.patch(route('settings.bookings.date-overrides.update'), {
            preserveScroll: true,
            onError: (errors) => addToast(firstErrorMessage(errors) || 'Please review date overrides.', 'error'),
        });
    };

    return (
        <div className="space-y-6">
             <form onSubmit={submitOverrides} className="rounded-brand border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                            <CalendarX2 className="h-4 w-4 text-primary-600" />
                            Date Overrides
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Add full-day or partial-day overrides. Use the same date multiple times for multiple slots.</p>
                    </div>
                    <button type="button" onClick={addOverride} className="inline-flex items-center gap-1 rounded-brand-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800">
                        <Plus className="h-3.5 w-3.5" />
                        Add override
                    </button>
                </div>

                <div className="space-y-2">
                    {overridesForm.data.availability_overrides.length === 0 ? (
                        <p className="rounded-brand-sm border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">No date overrides added yet.</p>
                    ) : overridesForm.data.availability_overrides.map((override, index) => (
                        <div key={`override-${index}`} className="rounded-brand-sm border border-slate-200 bg-slate-50 p-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr),110px,minmax(0,1fr),minmax(0,1fr),auto] md:items-end">
                                <div>
                                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Date</label>
                                    <input type="date" value={override.override_date} onChange={(e) => updateOverride(index, 'override_date', e.target.value)} className="w-full rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10" />
                                </div>
                                <label className="flex h-10 items-center gap-2 rounded-brand-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
                                    <input type="checkbox" checked={override.is_full_day} onChange={(e) => updateOverride(index, 'is_full_day', e.target.checked)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                                    Full day
                                </label>
                                <div>
                                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">From</label>
                                    <input type="time" step={TIME_STEP_SECONDS} value={override.start_time} disabled={override.is_full_day} onChange={(e) => updateOverride(index, 'start_time', e.target.value)} className="w-full rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10 disabled:bg-slate-100" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">To</label>
                                    <input type="time" step={TIME_STEP_SECONDS} value={override.end_time} disabled={override.is_full_day} onChange={(e) => updateOverride(index, 'end_time', e.target.value)} className="w-full rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10 disabled:bg-slate-100" />
                                </div>
                                <button type="button" onClick={() => removeOverride(index)} className="inline-flex h-10 items-center justify-center rounded-brand-sm border border-rose-200 bg-rose-50 px-3 text-rose-600 transition hover:bg-rose-100">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <div className="mt-3">
                                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Reason (optional)</label>
                                <input value={override.reason} onChange={(e) => updateOverride(index, 'reason', e.target.value)} className="w-full rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10" placeholder="Holiday, personal leave, offsite..." />
                            </div>
                            <InputError message={overridesForm.errors[`availability_overrides.${index}.override_date`] || overridesForm.errors[`availability_overrides.${index}.start_time`] || overridesForm.errors[`availability_overrides.${index}.end_time`]} className="mt-2" />
                        </div>
                    ))}
                </div>

                <InputError message={overridesForm.errors.availability_overrides || overridesForm.errors['availability_overrides.0.override_date'] || overridesForm.errors['availability_overrides.0.start_time'] || overridesForm.errors['availability_overrides.0.end_time']} className="mt-2" />

                <div className="mt-4 flex justify-end">
                    <button type="submit" disabled={overridesForm.processing || hasOverrideErrors || !overridesForm.isDirty} className="inline-flex items-center gap-2 rounded-brand-sm bg-primary-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50">
                        <Save className="h-4 w-4" />
                        {overridesForm.processing ? 'Saving...' : 'Save Date Overrides'}
                    </button>
                </div>
            </form>
            <form onSubmit={submitWorkingHours} className="rounded-brand border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                            <CalendarDays className="h-4 w-4 text-primary-600" />
                            Global Working Hours
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Add multiple slots per day. Applies to all event types by default.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={applyWeekdayPreset} className="rounded-brand-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800">
                            Apply Mon-Fri 9-5
                        </button>
                        <button type="button" onClick={copyMondayToWeekdays} className="rounded-brand-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800">
                            Copy Monday
                        </button>
                        <button type="button" onClick={openAllDays} className="rounded-brand-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800">
                            Open all days
                        </button>
                        <button type="button" onClick={closeWeekends} className="rounded-brand-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800">
                            Close weekends
                        </button>
                    </div>
                </div>

                <label className="mb-4 flex items-start gap-3 rounded-brand-sm border border-primary-200 bg-primary-100 px-3 py-2.5 text-sm font-semibold text-slate-700">
                    <input
                        type="checkbox"
                        checked={Boolean(workingHoursForm.data.lock_time_slots_across_event_types)}
                        onChange={(e) => workingHoursForm.setData('lock_time_slots_across_event_types', e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="space-y-1">
                        <span className="block">Lock overlapping slots across all event types</span>
                        <span className="block text-xs font-medium text-slate-500">
                            If 12:00-12:30 is booked in one event, the same overlapping time is blocked in other events (except events explicitly excluded).
                        </span>
                    </span>
                </label>
                <InputError message={workingHoursForm.errors.lock_time_slots_across_event_types} className="-mt-2 mb-2" />

                <div className="space-y-2">
                    {daySchedules.map((daySchedule, dayIndex) => (
                        <div key={daySchedule.day_of_week} className="rounded-brand-sm border border-slate-200 bg-slate-55 p-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <p className="w-12 text-xs font-black uppercase tracking-widest text-slate-500">{DAYS[dayIndex].label}</p>
                                <label className="flex items-center">
                                    <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
                                        <input type="checkbox" checked={daySchedule.is_open} onChange={(e) => setDayOpen(dayIndex, e.target.checked)} className="peer sr-only" />
                                        <span className="h-5 w-9 rounded-full bg-slate-200 transition-colors peer-checked:bg-primary-500" />
                                        <span className="pointer-events-none absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                                    </span>
                                </label>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{daySchedule.is_open ? 'Open' : 'Closed'}</p>
                                <button type="button" onClick={() => addDaySlot(dayIndex)} className="ml-auto inline-flex items-center gap-1 rounded-brand-sm border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 transition hover:border-slate-300 hover:text-slate-800">
                                    <Plus className="h-3.5 w-3.5" />
                                    Slot
                                </button>
                            </div>

                            <div className="mt-2 space-y-2">
                                {daySchedule.slots.map((slot, slotIndex) => (
                                    <div key={`${daySchedule.day_of_week}-${slotIndex}`} className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr),minmax(0,1fr),auto] md:items-center">
                                        <input type="time" step={TIME_STEP_SECONDS} value={slot.start_time} disabled={!daySchedule.is_open} onChange={(e) => updateDaySlot(dayIndex, slotIndex, 'start_time', e.target.value)} className="w-full rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10 disabled:bg-slate-100" />
                                        <input type="time" step={TIME_STEP_SECONDS} value={slot.end_time} disabled={!daySchedule.is_open} onChange={(e) => updateDaySlot(dayIndex, slotIndex, 'end_time', e.target.value)} className="w-full rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10 disabled:bg-slate-100" />
                                        <button type="button" onClick={() => removeDaySlot(dayIndex, slotIndex)} disabled={daySchedule.slots.length === 1} className="inline-flex h-10 items-center justify-center rounded-brand-sm border border-rose-200 bg-rose-50 px-3 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <InputError message={scheduleErrors.get(dayIndex)} className="mt-2" />
                        </div>
                    ))}
                </div>

                <InputError message={workingHoursForm.errors.global_availability_rules || workingHoursForm.errors['global_availability_rules.0.start_time'] || workingHoursForm.errors['global_availability_rules.0.end_time']} className="mt-2" />

                <div className="mt-4 flex justify-end">
                    <button type="submit" disabled={workingHoursForm.processing || scheduleErrors.size > 0 || !workingHoursForm.isDirty} className="inline-flex items-center gap-2 rounded-brand-sm bg-primary-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50">
                        <Save className="h-4 w-4" />
                        {workingHoursForm.processing ? 'Saving...' : 'Save Global Working Hours'}
                    </button>
                </div>
            </form>

            <ConfirmDialog
                show={showConfirmHours}
                title="Save Global Working Hours?"
                message="Are you sure you want to update your global availability rules and settings?"
                onConfirm={confirmSubmitWorkingHours}
                onCancel={() => setShowConfirmHours(false)}
                isLoading={workingHoursForm.processing}
            />

            <ConfirmDialog
                show={showConfirmOverrides}
                title="Save Date Overrides?"
                message="Are you sure you want to save these date overrides?"
                onConfirm={confirmSubmitOverrides}
                onCancel={() => setShowConfirmOverrides(false)}
                isLoading={overridesForm.processing}
            />

            <ConfirmDialog
                show={overrideToDelete !== null}
                title="Remove Date Override?"
                message="Are you sure you want to remove this date override? You will need to save the form to persist this change."
                confirmLabel="Remove"
                variant="danger"
                onConfirm={confirmRemoveOverride}
                onCancel={() => setOverrideToDelete(null)}
            />
        </div>
    );
}
