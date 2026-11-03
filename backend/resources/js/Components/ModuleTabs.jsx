import { cloneElement, isValidElement } from 'react';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';

const TAB_ACCENTS = [
    {
        gradient: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(37,99,235,0.08) 52%, rgba(29,78,216,0) 100%)',
        iconColorClass: 'text-blue-500',
        underlineClass: 'bg-blue-500/90',
    },
    {
        gradient: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, rgba(219,39,119,0.08) 52%, rgba(190,24,93,0) 100%)',
        iconColorClass: 'text-pink-500',
        underlineClass: 'bg-pink-500/90',
    },
    {
        gradient: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, rgba(234,88,12,0.08) 52%, rgba(194,65,12,0) 100%)',
        iconColorClass: 'text-orange-500',
        underlineClass: 'bg-orange-500/90',
    },
    {
        gradient: 'radial-gradient(circle, rgba(234,179,8,0.18) 0%, rgba(202,138,4,0.08) 52%, rgba(161,98,7,0) 100%)',
        iconColorClass: 'text-yellow-500',
        underlineClass: 'bg-yellow-500/90',
    },
    {
        gradient: 'radial-gradient(circle, rgba(34,197,94,0.18) 0%, rgba(22,163,74,0.08) 52%, rgba(21,128,61,0) 100%)',
        iconColorClass: 'text-emerald-500',
        underlineClass: 'bg-emerald-500/90',
    },
];

const itemVariants = {
    initial: { rotateX: 0, opacity: 1 },
    hover: { rotateX: -90, opacity: 0 },
};

const backVariants = {
    initial: { rotateX: 90, opacity: 0 },
    hover: { rotateX: 0, opacity: 1 },
};

const glowVariants = {
    initial: { opacity: 0, scale: 0.8 },
    hover: {
        opacity: 1,
        scale: 2,
        transition: {
            opacity: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
            scale: { duration: 0.45, type: 'spring', stiffness: 280, damping: 24 },
        },
    },
};

const navGlowVariants = {
    initial: { opacity: 0 },
    hover: {
        opacity: 1,
        transition: {
            duration: 0.45,
            ease: [0.4, 0, 0.2, 1],
        },
    },
};

const sharedTransition = {
    type: 'spring',
    stiffness: 100,
    damping: 20,
    duration: 0.5,
};

const resolveAccent = (tab, index) => {
    const fallback = TAB_ACCENTS[index % TAB_ACCENTS.length];

    return {
        gradient: String(tab?.gradient || tab?.accent?.gradient || fallback.gradient),
        iconColorClass: String(tab?.iconColorClass || tab?.iconColor || tab?.accent?.iconColorClass || fallback.iconColorClass),
        underlineClass: String(tab?.underlineClass || tab?.accent?.underlineClass || fallback.underlineClass),
    };
};

export default function ModuleTabs({ moduleTabs, variant = 'stacked', className = '' }) {
    if (!moduleTabs) {
        return null;
    }

    const isInline = variant === 'inline';
    const tabs = Array.isArray(moduleTabs.tabs) ? moduleTabs.tabs : [];

    if (tabs.length === 0) {
        return null;
    }

    const wrapperClasses = isInline
        ? `flex items-center min-w-0 ${className}`.trim()
        : `border-t border-slate-200/80 px-2 pb-2 sm:px-2.5 lg:px-2 ${className}`.trim();
    const scrollClasses = isInline
        ? 'w-full flex items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
        : 'overflow-x-auto pb-1 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';
    const listClasses = isInline
        ? 'relative inline-flex min-w-max items-stretch gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm shadow-slate-200/60 backdrop-blur'
        : 'relative inline-flex min-w-full items-stretch gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm shadow-slate-200/60 backdrop-blur';

    return (
        <div className={wrapperClasses}>
            <div className={scrollClasses}>
                <motion.div
                    className={listClasses}
                    initial="initial"
                    whileHover="hover"
                >
                    <motion.div
                        className="pointer-events-none absolute -inset-1 rounded-3xl bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(59,130,246,0.07)_30%,rgba(99,102,241,0.07)_58%,rgba(236,72,153,0.07)_84%,transparent_100%)]"
                        variants={navGlowVariants}
                    />

                    {tabs.map((tab, index) => {
                        const accent = resolveAccent(tab, index);
                        const TabIcon = tab.icon;
                        const iconClassName = `h-4 w-4 shrink-0 transition-colors duration-300 ${tab.active ? accent.iconColorClass : 'text-slate-400 group-hover:text-slate-700'}`;

                        return (
                            <Link
                                key={tab.key}
                                href={tab.href}
                                className="group relative block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35"
                                aria-current={tab.active ? 'page' : undefined}
                            >
                                <motion.div
                                    className="relative overflow-visible rounded-xl"
                                    style={{ perspective: '640px' }}
                                    initial="initial"
                                    whileHover="hover"
                                >
                                    <motion.div
                                        className="pointer-events-none absolute inset-0 z-0 rounded-xl"
                                        variants={glowVariants}
                                        animate={tab.active ? 'hover' : 'initial'}
                                        style={{ background: accent.gradient }}
                                    />

                                    <motion.div
                                        className={`relative z-10 inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-normal transition-colors duration-300 sm:text-sm ${tab.active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-900'}`}
                                        variants={itemVariants}
                                        transition={sharedTransition}
                                        style={{
                                            transformStyle: 'preserve-3d',
                                            transformOrigin: 'center bottom',
                                        }}
                                    >
                                        {TabIcon && (
                                            isValidElement(TabIcon) ? (
                                                cloneElement(TabIcon, {
                                                    className: [iconClassName, TabIcon.props.className].filter(Boolean).join(' '),
                                                    'aria-hidden': TabIcon.props['aria-hidden'] ?? true,
                                                })
                                            ) : (
                                                <TabIcon
                                                    className={iconClassName}
                                                    strokeWidth={2.1}
                                                    aria-hidden="true"
                                                />
                                            )
                                        )}

                                        <span className="whitespace-nowrap">{tab.name}</span>
                                    </motion.div>

                                    <motion.div
                                        className={`absolute inset-0 z-10 inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-normal transition-colors duration-300 sm:text-sm ${tab.active ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-900'}`}
                                        variants={backVariants}
                                        transition={sharedTransition}
                                        style={{
                                            transformStyle: 'preserve-3d',
                                            transformOrigin: 'center top',
                                        }}
                                    >
                                        {TabIcon && (
                                            isValidElement(TabIcon) ? (
                                                cloneElement(TabIcon, {
                                                    className: [iconClassName, TabIcon.props.className].filter(Boolean).join(' '),
                                                    'aria-hidden': TabIcon.props['aria-hidden'] ?? true,
                                                })
                                            ) : (
                                                <TabIcon
                                                    className={iconClassName}
                                                    strokeWidth={2.1}
                                                    aria-hidden="true"
                                                />
                                            )
                                        )}

                                        <span className="whitespace-nowrap">{tab.name}</span>
                                    </motion.div>

                                    {tab.active && (
                                        <motion.span
                                            layoutId={`module-tab-active-${moduleTabs.group || 'default'}`}
                                            className={`absolute bottom-0 left-3.5 right-3.5 z-20 h-[3px] rounded-full ${accent.underlineClass}`}
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </motion.div>
                            </Link>
                        );
                    })}
                </motion.div>
            </div>
        </div>
    );
}
