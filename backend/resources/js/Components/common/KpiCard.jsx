import React from 'react';

const variants = {
    default: {
        card: 'border-slate-200 bg-white text-slate-900',
        label: 'text-slate-400',
        value: 'text-slate-900',
        helper: 'text-slate-500',
        icon: 'bg-slate-50 text-slate-500',
    },
    primary: {
        card: 'border-primary-200 bg-primary-50 text-primary-900',
        label: 'text-primary-700',
        value: 'text-primary-900',
        helper: 'text-primary-700',
        icon: 'bg-white/80 text-primary-600',
    },
    success: {
        card: 'border-success-200 bg-success-50 text-success-900',
        label: 'text-success-700',
        value: 'text-success-900',
        helper: 'text-success-700',
        icon: 'bg-white/80 text-success-600',
    },
    warning: {
        card: 'border-warning-200 bg-warning-50 text-warning-900',
        label: 'text-warning-700',
        value: 'text-warning-900',
        helper: 'text-warning-700',
        icon: 'bg-white/80 text-warning-600',
    },
    danger: {
        card: 'border-danger-200 bg-danger-50 text-danger-900',
        label: 'text-danger-700',
        value: 'text-danger-900',
        helper: 'text-danger-700',
        icon: 'bg-white/80 text-danger-600',
    },
    info: {
        card: 'border-info-200 bg-info-50 text-info-900',
        label: 'text-info-700',
        value: 'text-info-900',
        helper: 'text-info-700',
        icon: 'bg-white/80 text-info-600',
    },
    rose: {
        card: 'border-rose-200 bg-rose-50 text-rose-900',
        label: 'text-rose-700',
        value: 'text-rose-900',
        helper: 'text-rose-700',
        icon: 'bg-white/80 text-rose-600',
    },
    sky: {
        card: 'border-sky-200 bg-sky-50 text-sky-900',
        label: 'text-sky-700',
        value: 'text-sky-900',
        helper: 'text-sky-700',
        icon: 'bg-white/80 text-sky-600',
    },
    dark: {
        card: 'border-slate-800 bg-slate-900 text-white shadow-lg',
        label: 'text-slate-300',
        value: 'text-white',
        helper: 'text-slate-300',
        icon: 'bg-white/10 text-white',
    },
};

const sizes = {
    compact: {
        card: 'p-3',
        icon: 'h-9 w-9',
        iconSvg: 'h-4 w-4',
        value: 'text-xl',
        helper: 'text-xs',
    },
    default: {
        card: 'p-4',
        icon: 'h-10 w-10',
        iconSvg: 'h-5 w-5',
        value: 'text-3xl',
        helper: 'text-xs',
    },
    large: {
        card: 'p-5',
        icon: 'h-12 w-12',
        iconSvg: 'h-6 w-6',
        value: 'text-4xl',
        helper: 'text-sm',
    },
};

const trendTones = {
    neutral: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
    info: 'bg-sky-100 text-sky-700',
};

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

function renderIcon(icon, className) {
    if (!icon) {
        return null;
    }

    if (React.isValidElement(icon)) {
        return icon;
    }

    const Icon = icon;

    return <Icon className={className} />;
}

export default function KpiCard({
    className = '',
    footer = null,
    helper = null,
    icon = null,
    iconClassName = '',
    label,
    labelClassName = '',
    loading = false,
    size = 'default',
    trend = null,
    trendTone = 'neutral',
    value,
    valueClassName = '',
    variant = 'default',
}) {
    const variantClasses = variants[variant] || variants.default;
    const sizeClasses = sizes[size] || sizes.default;

    if (loading) {
        return (
            <div className={classNames('animate-pulse rounded-2xl border shadow-sm', variantClasses.card, sizeClasses.card, className)}>
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-3">
                        <div className="h-3 w-24 rounded-full bg-slate-200/80" />
                        <div className="h-8 w-20 rounded-full bg-slate-200/80" />
                    </div>
                    {icon ? <div className={classNames('shrink-0 rounded-xl bg-slate-200/80', sizeClasses.icon)} /> : null}
                </div>
            </div>
        );
    }

    return (
        <div className={classNames('rounded-2xl border shadow-sm', variantClasses.card, sizeClasses.card, className)}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className={classNames('truncate text-xs font-black uppercase', variantClasses.label, labelClassName)}>{label}</p>
                    <p className={classNames('mt-2 break-words font-black leading-none tabular-nums', sizeClasses.value, variantClasses.value, valueClassName)}>
                        {value}
                    </p>
                    {helper ? (
                        <p className={classNames('mt-2 font-semibold leading-5', sizeClasses.helper, variantClasses.helper)}>
                            {helper}
                        </p>
                    ) : null}
                </div>

                {icon ? (
                    <span className={classNames('inline-flex shrink-0 items-center justify-center rounded-xl', sizeClasses.icon, variantClasses.icon, iconClassName)}>
                        {renderIcon(icon, sizeClasses.iconSvg)}
                    </span>
                ) : null}
            </div>

            {(trend || footer) ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    {trend ? (
                        <span className={classNames('rounded-full px-2.5 py-1 text-xs font-black', trendTones[trendTone] || trendTones.neutral)}>
                            {trend}
                        </span>
                    ) : <span />}
                    {footer}
                </div>
            ) : null}
        </div>
    );
}
