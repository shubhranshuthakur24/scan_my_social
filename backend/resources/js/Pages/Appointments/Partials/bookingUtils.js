export const DAYS = [
    { key: 0, label: 'Sun' },
    { key: 1, label: 'Mon' },
    { key: 2, label: 'Tue' },
    { key: 3, label: 'Wed' },
    { key: 4, label: 'Thu' },
    { key: 5, label: 'Fri' },
    { key: 6, label: 'Sat' },
];

export const LOCATION_OPTIONS = [
    { value: 'google_meet', label: 'Google Meet', icon: '🎥' },
    { value: 'zoom_call', label: 'Zoom Call', icon: '📹' },
    { value: 'in_person', label: 'In Person (Address)', icon: '📍' },
    { value: 'phone', label: 'Phone Call', icon: '📞' },
    { value: 'custom', label: 'Custom', icon: '🔗' },
];

export const TIME_STEP_SECONDS = 900;
export const DURATION_OPTIONS = Array.from({ length: 32 }, (_, index) => (index + 1) * 15);
export const SCHEDULE_TYPE_OPTIONS = [
    {
        value: 'weekly',
        label: 'Weekly recurring',
        description: 'Use weekday-based availability that repeats every week.',
    },
    {
        value: 'one_time',
        label: 'One-time event',
        description: 'Make this event bookable only on one exact date and time window.',
    },
];

export function defaultDaySchedules() {
    return DAYS.map((day) => ({
        day_of_week: day.key,
        is_open: day.key >= 1 && day.key <= 5,
        slots: [{ start_time: '09:00', end_time: '17:00' }],
    }));
}

export function normalizeRulesToDaySchedules(rules = []) {
    const grouped = new Map();
    const dayActiveStatus = new Map();

    if (Array.isArray(rules)) {
        rules.forEach((rule) => {
            const isActive = Boolean(rule?.is_active ?? true);
            const dayOfWeek = Number(rule?.day_of_week);

            if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
                return;
            }

            if (!grouped.has(dayOfWeek)) {
                grouped.set(dayOfWeek, []);
            }

            grouped.get(dayOfWeek).push({
                start_time: rule?.start_time || '09:00',
                end_time: rule?.end_time || '17:00',
            });

            if (isActive) {
                dayActiveStatus.set(dayOfWeek, true);
            }
        });
    }

    return DAYS.map((day) => {
        const slots = (grouped.get(day.key) || [])
            .sort((left, right) => `${left.start_time}${left.end_time}`.localeCompare(`${right.start_time}${right.end_time}`));

        const hasSlots = slots.length > 0;
        const is_open = hasSlots && Boolean(dayActiveStatus.get(day.key));

        return {
            day_of_week: day.key,
            is_open: is_open,
            slots: hasSlots ? slots : [{ start_time: '09:00', end_time: '17:00' }],
        };
    });
}

export function buildInitialDaySchedules(eventType, globalRules = []) {
    if (eventType?.availability_rules) {
        return normalizeRulesToDaySchedules(eventType.availability_rules);
    }

    if (Array.isArray(globalRules) && globalRules.length > 0) {
        return normalizeRulesToDaySchedules(globalRules);
    }

    return defaultDaySchedules();
}

export function flattenDaySchedules(daySchedules = []) {
    const flattened = daySchedules.flatMap((daySchedule) => {
        return daySchedule.slots.map((slot) => ({
            day_of_week: daySchedule.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_active: Boolean(daySchedule.is_open),
        }));
    });

    if (flattened.length > 0) {
        return flattened;
    }

    const fallbackDay = daySchedules[0] || { day_of_week: 0 };

    return [{
        day_of_week: fallbackDay.day_of_week,
        start_time: '09:00',
        end_time: '17:00',
        is_active: false,
    }];
}

export function firstErrorMessage(errors) {
    if (!errors || typeof errors !== 'object') {
        return null;
    }

    for (const value of Object.values(errors)) {
        if (typeof value === 'string' && value.trim() !== '') {
            return value;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                if (typeof item === 'string' && item.trim() !== '') {
                    return item;
                }
            }
        }

        if (value && typeof value === 'object') {
            const nestedMessage = firstErrorMessage(value);
            if (nestedMessage) {
                return nestedMessage;
            }
        }
    }

    return null;
}

export function toMinutes(time) {
    const [hourRaw, minuteRaw] = String(time || '').split(':');
    const hour = Number.parseInt(hourRaw, 10);
    const minute = Number.parseInt(minuteRaw, 10);

    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    return hour * 60 + minute;
}

export function formatDuration(minutes) {
    if (minutes <= 0) {
        return '0m';
    }

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    if (hours > 0 && remainder > 0) {
        return `${hours}h ${remainder}m`;
    }

    if (hours > 0) {
        return `${hours}h`;
    }

    return `${remainder}m`;
}

export function findScheduleErrors(daySchedules = []) {
    const errors = new Map();

    daySchedules.forEach((daySchedule, dayIndex) => {
        if (!daySchedule.is_open) {
            return;
        }

        if (daySchedule.slots.length === 0) {
            errors.set(dayIndex, 'Open days must have at least one slot.');
            return;
        }

        const ranges = [];
        let hasRangeError = false;

        daySchedule.slots.forEach((slot) => {
            const startMinutes = toMinutes(slot.start_time);
            const endMinutes = toMinutes(slot.end_time);

            if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
                hasRangeError = true;
                return;
            }

            ranges.push({
                start: startMinutes,
                end: endMinutes,
            });
        });

        if (hasRangeError) {
            errors.set(dayIndex, 'Each slot must have an end time later than start time.');
            return;
        }

        ranges.sort((left, right) => left.start - right.start);
        for (let rangeIndex = 1; rangeIndex < ranges.length; rangeIndex += 1) {
            if (ranges[rangeIndex].start < ranges[rangeIndex - 1].end) {
                errors.set(dayIndex, 'Slots on the same day cannot overlap.');
                return;
            }
        }
    });

    return errors;
}

export function findOneTimeWindowError(scheduleType, oneTimeDate, oneTimeStartTime, oneTimeEndTime, durationMinutes) {
    if (scheduleType !== 'one_time') {
        return null;
    }

    if (!oneTimeDate || !oneTimeStartTime || !oneTimeEndTime) {
        return 'Pick a date, start time, and end time for the one-time event.';
    }

    const startMinutes = toMinutes(oneTimeStartTime);
    const endMinutes = toMinutes(oneTimeEndTime);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return 'The one-time event must end after it starts.';
    }

    if ((endMinutes - startMinutes) < durationMinutes) {
        return 'The one-time window must be long enough to fit the selected duration.';
    }

    return null;
}
