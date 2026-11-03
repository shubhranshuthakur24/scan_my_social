import { Link } from '@inertiajs/react';

const actionVariants = {
    primary: 'border-white/70 bg-white/95 text-primary-800 hover:bg-white focus-visible:ring-white/70 focus-visible:ring-offset-primary-600',
    secondary: 'border-white/40 bg-white/12 text-white backdrop-blur-md hover:bg-white/20 focus-visible:ring-white/70 focus-visible:ring-offset-primary-600',
    neutralPrimary: 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-primary-500/35 focus-visible:ring-offset-white',
    neutralSecondary: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-primary-500/30 focus-visible:ring-offset-white',
    quiet: 'border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-primary-500/30 focus-visible:ring-offset-white',
    success: 'border-success-200 bg-success-50 text-success-700 hover:bg-success-100 focus-visible:ring-success-500/30 focus-visible:ring-offset-white',
};

const actionBaseClasses = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 xl:px-3 xl:text-[13px] 2xl:px-4 2xl:py-2.5 2xl:text-sm';

const bannerVariants = {
    primary: {
        section: 'rounded-[2rem] border-slate-200 bg-white shadow-sm',
        inner: 'bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 text-white',
        title: 'text-3xl text-white sm:text-4xl xl:text-[2.15rem] xl:leading-[1.05] 2xl:text-4xl',
        description: 'text-white/85',
    },
    neutral: {
        section: 'rounded-2xl border-slate-200 bg-white shadow-sm',
        inner: 'bg-white text-slate-900',
        title: 'text-2xl text-slate-950 sm:text-3xl xl:text-[1.9rem] xl:leading-tight',
        description: 'text-slate-500',
    },
    soft: {
        section: 'rounded-2xl border-slate-200 bg-white shadow-sm',
        inner: 'bg-slate-50/80 text-slate-900',
        title: 'text-2xl text-slate-950 sm:text-3xl xl:text-[1.9rem] xl:leading-tight',
        description: 'text-slate-500',
    },
};

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

export function PageBannerAction({
    children,
    className = '',
    external = false,
    href,
    rel,
    target,
    type = 'button',
    variant = 'primary',
    ...props
}) {
    const actionClasses = classNames(
        actionBaseClasses,
        actionVariants[variant] || actionVariants.primary,
        className,
    );

    if (external) {
        return (
            <a
                href={href}
                target={target || '_blank'}
                rel={rel || 'noreferrer'}
                className={actionClasses}
                {...props}
            >
                {children}
            </a>
        );
    }

    if (!href) {
        return (
            <button type={type} className={actionClasses} {...props}>
                {children}
            </button>
        );
    }

    return (
        <Link href={href} className={actionClasses} {...props}>
            {children}
        </Link>
    );
}

export default function PageBanner({
    actions,
    children,
    className = '',
    description,
    title,
    variant = 'primary',
}) {
    const actionContent = actions || children;
    const variantClasses = bannerVariants[variant] || bannerVariants.primary;

    return (
        <section className={classNames('overflow-hidden border', variantClasses.section, className)}>
            <div className={classNames('p-5 sm:p-6 xl:p-5 2xl:p-6', variantClasses.inner)}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <h1 className={classNames('font-black tracking-tight', variantClasses.title)}>{title}</h1>
                        {description ? (
                            <p className={classNames('mt-1.5 max-w-3xl text-sm font-medium xl:text-[13px] 2xl:text-sm', variantClasses.description)}>{description}</p>
                        ) : null}
                    </div>

                    {actionContent ? (
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                            {actionContent}
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
