import { UploadCloud, X } from 'lucide-react';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

export function formatSchedulerFileSize(bytes) {
    const size = Number(bytes || 0);
    if (size < 1024 * 1024) {
        return `${Math.max(1, Math.round(size / 1024))} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function SchedulerModalOverlay({ children, className = '', zIndexClass = 'z-[400]' }) {
    return (
        <div className={classNames('fixed inset-0 flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm', zIndexClass, className)}>
            {children}
        </div>
    );
}

export function SchedulerModalShell({
    as: Component = 'div',
    bodyClassName = '',
    children,
    className = '',
    closeDisabled = false,
    closeLabel = 'Close modal',
    description,
    footer,
    footerClassName = '',
    icon: Icon,
    onClose,
    title,
    ...props
}) {
    return (
        <Component
            className={classNames('flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15', className)}
            {...props}
        >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-start gap-3">
                    {Icon ? (
                        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-primary-50 text-primary-600">
                            <Icon className="h-5 w-5" />
                        </span>
                    ) : null}
                    <div className="min-w-0">
                        <h2 className="text-lg font-black text-slate-950">{title}</h2>
                        {description ? (
                            <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{description}</p>
                        ) : null}
                    </div>
                </div>

                {onClose ? (
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={closeDisabled}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={closeLabel}
                    >
                        <X className="h-4 w-4" />
                    </button>
                ) : null}
            </div>

            <div className={classNames('min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>
                {children}
            </div>

            {footer ? (
                <div className={classNames('border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6', footerClassName)}>
                    {footer}
                </div>
            ) : null}
        </Component>
    );
}

export function SchedulerUploadDropzone({
    accept,
    error,
    file,
    helper = 'JPG, PNG, WEBP, MP4, MOV up to 200 MB',
    icon: Icon = UploadCloud,
    id,
    label = 'File',
    onChange,
}) {
    return (
        <div className="block">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
            <label
                htmlFor={id}
                className="mt-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition hover:border-primary-300 hover:bg-primary-50/40 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/20"
            >
                <input
                    id={id}
                    type="file"
                    accept={accept}
                    onChange={onChange}
                    className="sr-only"
                />
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-primary-600 shadow-sm">
                    <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">
                        {file ? file.name : 'Choose image or video'}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        {helper}
                    </p>
                </div>
            </label>
            {error ? <span className="mt-1.5 block text-xs font-bold text-rose-600">{error}</span> : null}
        </div>
    );
}

export function SchedulerUploadPreview({
    file,
    isImagePreview,
    isVideoPreview,
    previewUrl,
}) {
    if (!file) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-black uppercase text-slate-600">
                    {file.type || 'file'}
                </span>
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-black uppercase text-slate-600">
                    {formatSchedulerFileSize(file.size)}
                </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {previewUrl && isImagePreview && (
                    <img src={previewUrl} alt="Upload preview" className="max-h-[320px] w-full object-contain" />
                )}
                {previewUrl && isVideoPreview && (
                    <video src={previewUrl} className="max-h-[320px] w-full bg-black object-contain" controls muted />
                )}
                {!previewUrl && (
                    <div className="flex h-44 items-center justify-center text-sm font-semibold text-slate-500">
                        Preview unavailable for this file.
                    </div>
                )}
            </div>
        </div>
    );
}

export function SchedulerUploadProgress({ progress }) {
    if (!progress) {
        return null;
    }

    return (
        <div className="space-y-2 rounded-xl border border-primary-100 bg-primary-50/70 p-3">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-primary-700">
                <span>Uploading</span>
                <span>{Math.round(progress.percentage)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-primary-100">
                <div
                    className="h-full rounded-full bg-primary-600 transition-all duration-150"
                    style={{ width: `${progress.percentage}%` }}
                />
            </div>
        </div>
    );
}
