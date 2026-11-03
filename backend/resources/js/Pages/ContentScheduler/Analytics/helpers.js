export const formatNumber = (value) => {
    return new Intl.NumberFormat().format(Number(value || 0));
};

export const formatPercent = (value, digits = 1) => {
    const normalized = Number(value || 0);

    return `${normalized.toFixed(digits).replace(/\.0$/, '')}%`;
};

export const toLocalDateValue = (date) => {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());

    return localDate.toISOString().slice(0, 10);
};

export const resolvePresetRange = (preset) => {
    const today = new Date();

    if (preset === 'last_7_days') {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);

        return {
            start: toLocalDateValue(startDate),
            end: toLocalDateValue(today),
        };
    }

    if (preset === 'last_30_days') {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29);

        return {
            start: toLocalDateValue(startDate),
            end: toLocalDateValue(today),
        };
    }

    if (preset === 'this_month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        return {
            start: toLocalDateValue(monthStart),
            end: toLocalDateValue(monthEnd),
        };
    }

    return null;
};

export const toChartDateLabel = (dateValue, totalDays) => {
    const date = new Date(`${String(dateValue || '')}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return String(dateValue || '');
    }

    if (totalDays > 45) {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    if (totalDays > 15) {
        return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
    }

    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};
