import { X } from 'lucide-react';

const toneClasses = {
    default: 'border-slate-200 bg-slate-50 text-slate-700',
    info: 'border-info-200 bg-info-50 text-info-700',
    primary: 'border-primary-200 bg-primary-50 text-primary-700',
    success: 'border-success-200 bg-success-50 text-success-700',
    warning: 'border-warning-200 bg-warning-50 text-warning-700',
    danger: 'border-danger-200 bg-danger-50 text-danger-700',
};

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default function ActiveFilterChips({
    chips = [],
    className = '',
    label = 'Active filters',
    onRemove,
}) {
    if (!chips.length) {
        return null;
    }

    return (
        <div className={classNames('flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500', className)}>
            {label ? (
                <span className="uppercase tracking-widest text-slate-400">{label}</span>
            ) : null}

            {chips.map((chip) => {
                const chipClasses = classNames(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2',
                    toneClasses[chip.tone] || toneClasses.default,
                    onRemove ? 'hover:bg-white' : '',
                );

                if (onRemove) {
                    return (
                        <button
                            key={chip.key}
                            type="button"
                            onClick={() => onRemove(chip.key)}
                            className={chipClasses}
                            aria-label={`Remove ${chip.label} filter`}
                        >
                            <span>{chip.label}</span>
                            <X className="h-3.5 w-3.5" />
                        </button>
                    );
                }

                return (
                    <span key={chip.key} className={chipClasses}>
                        {chip.label}
                    </span>
                );
            })}
        </div>
    );
}
