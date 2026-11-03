export const formatNumber = (value) => {
    return new Intl.NumberFormat().format(Number(value || 0));
};

export const formatPercent = (value, digits = 1) => {
    const normalized = Number(value || 0);

    return `${normalized.toFixed(digits).replace(/\.0$/, '')}%`;
};

export const formatDateTime = (value) => {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

export const formatDate = (value) => {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};
