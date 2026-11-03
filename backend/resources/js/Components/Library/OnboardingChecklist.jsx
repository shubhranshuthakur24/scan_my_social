import React, { useMemo } from 'react';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Plus, UsersRound, RefreshCw, Sparkles } from 'lucide-react';
import Button from '@/Components/Button';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.05 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 120, damping: 18 },
    },
};

const STEPS = [
    {
        key: 'add_channel',
        label: 'Add a competitor channel',
        description: 'Track channels from Instagram, YouTube, TikTok, or LinkedIn.',
        icon: UsersRound,
        iconColor: 'text-primary-500',
        iconBg: 'bg-primary-50',
        iconBorder: 'border-primary-100',
    },
    {
        key: 'wait_sync',
        label: 'Wait for your first sync',
        description: 'We\'ll scrape and index top posts automatically. Takes ~5 minutes.',
        icon: RefreshCw,
        iconColor: 'text-accent-500',
        iconBg: 'bg-accent-50',
        iconBorder: 'border-accent-100',
    },
    {
        key: 'explore',
        label: 'Explore top-performing content',
        description: 'Discover viral posts, filter by outlier score, and save content to projects.',
        icon: Sparkles,
        iconColor: 'text-success-500',
        iconBg: 'bg-success-50',
        iconBorder: 'border-success-100',
    },
];

/**
 * @param {{ channelsCount: number, postsCount: number }} props
 */
export default function OnboardingChecklist({ channelsCount = 0, postsCount = 0 }) {
    const completedSteps = useMemo(() => {
        const done = new Set();
        if (channelsCount > 0) {
            done.add('add_channel');
        }
        if (channelsCount > 0 && postsCount > 0) {
            done.add('wait_sync');
            done.add('explore');
        }
        return done;
    }, [channelsCount, postsCount]);

    const completedCount = completedSteps.size;
    const totalCount = STEPS.length;
    const progressPct = Math.round((completedCount / totalCount) * 100);

    return (
        <div className="flex min-h-[400px] items-center justify-center p-4  ">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full "
            >
                {/* Card */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                    {/* Top gradient wash */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-primary-50/60 to-transparent" />

                    <div className="relative p-6 sm:p-8">
                        {/* Header */}
                        <motion.div variants={itemVariants} className="mb-6 text-center">
                            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 shadow-sm">
                                <img src="/images/logo.png" alt="Logo" className="h-9 w-9" />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                Welcome to your Content Library!
                            </h2>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                                Follow these 3 steps to start discovering what makes content go viral in your niche.
                            </p>
                        </motion.div>

                        {/* Progress bar */}
                        <motion.div variants={itemVariants} className="mb-6">
                            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-500">
                                <span>{completedCount} of {totalCount} steps complete</span>
                                <span className="text-primary-600">{progressPct}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <motion.div
                                    className="h-full rounded-full bg-primary-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPct}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
                                />
                            </div>
                        </motion.div>

                        {/* Steps */}
                        <motion.div variants={containerVariants} className="space-y-3">
                            {STEPS.map((step, index) => {
                                const isDone = completedSteps.has(step.key);
                                const StepIcon = step.icon;

                                return (
                                    <motion.div
                                        key={step.key}
                                        variants={itemVariants}
                                        className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${isDone
                                                ? 'border-success-100 bg-success-50/40'
                                                : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                                            }`}
                                    >
                                        {/* Step icon */}
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${step.iconBg} ${step.iconBorder}`}>
                                            <StepIcon className={`h-5 w-5 ${isDone ? 'text-success-500' : step.iconColor}`} strokeWidth={1.75} />
                                        </div>

                                        {/* Step text */}
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-sm font-bold ${isDone ? 'text-success-700' : 'text-slate-800'}`}>
                                                <span className="mr-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    Step {index + 1}
                                                </span>
                                                {step.label}
                                            </p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                                {step.description}
                                            </p>
                                        </div>

                                        {/* Check state */}
                                        <div className="shrink-0 pt-0.5">
                                            {isDone ? (
                                                <CheckCircle2 className="h-5 w-5 text-success-500" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-slate-300" />
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>

                        {/* CTA */}
                        <motion.div variants={itemVariants} className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                            <Button
                                href={route().has('channels.create') ? route('channels.create') : '/competitors/create'}
                                variant="primary"
                                size="lg"
                                icon={Plus}
                                className="w-full sm:w-auto"
                            >
                                Add Competitor Channel
                            </Button>
                            <Link
                                href={route().has('channels') ? route('channels') : '/competitors'}
                                className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
                            >
                                View Competitors →
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
