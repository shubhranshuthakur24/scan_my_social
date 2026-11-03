import React from 'react';
import { Rocket, Target, Zap, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/Components/Button';

export default function WelcomeOnboarding({ show, onClose, userName }) {
    if (!show) return null;

    const steps = [
        {
            title: 'Track a Channel',
            desc: 'Add your first competitor or inspiration channel to start tracking viral trends.',
            icon: Target,
            color: 'text-primary-500',
            bgColor: 'bg-primary-50',
        },
        {
            title: 'Analyze Viral Videos',
            desc: 'Discover high-performing content and extract their "Viral DNA" with AI.',
            icon: Zap,
            color: 'text-accent-500',
            bgColor: 'bg-accent-50',
        },
        {
            title: 'Create Your Scripts',
            desc: 'Turn viral insights into high-retention scripts for your next video.',
            icon: Rocket,
            color: 'text-success-500',
            bgColor: 'bg-success-50',
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.12,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15, scale: 0.98 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 100,
                damping: 15
            }
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[600] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 py-6 backdrop-blur-sm sm:items-center sm:p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                    className="my-auto w-full max-w-2xl"
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="welcome-onboarding-title"
                        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8"
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-primary-50/70 via-primary-50/20 to-transparent" />

                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="relative space-y-6 text-center"
                        >
                            <motion.div variants={itemVariants} className="space-y-2">
                                <div className="mb-1 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-600 shadow-sm">
                                    <img src="/images/logo.png" alt="Logo" className="w-10 h-10" />
                                </div>
                                <h2 id="welcome-onboarding-title" className="text-2xl font-black tracking-tight text-ink sm:text-4xl">
                                    Welcome to Scan My Social, <br /><span className="text-primary-500">{userName}</span>
                                </h2>
                                <p className="mx-auto max-w-md text-base text-muted sm:text-lg">
                                    You're 3 steps away from skyrocketing your content intelligence. Here's your roadmap:
                                </p>
                            </motion.div>

                            <div className="grid gap-3 text-left">
                                {steps.map((step, i) => (
                                    <motion.div
                                        key={i}
                                        variants={itemVariants}
                                        whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 1)' }}
                                        className="group flex cursor-default gap-3 rounded-xl border border-slate-200 bg-slate-50/75 p-3 transition-colors sm:p-3.5"
                                    >
                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white ${step.bgColor} shadow-sm transition-transform group-hover:scale-105`}>
                                            <step.icon className={`w-6 h-6 ${step.color}`} />
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <h3 className="flex items-center gap-2 font-bold text-ink">
                                                {step.title}
                                                <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                <span className="text-[10px] font-black text-muted/60 uppercase tracking-[0.2em]">Step {i + 1}</span>
                                            </h3>
                                            <p className="break-words text-sm leading-relaxed text-muted">
                                                {step.desc}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.div variants={itemVariants} className="pt-2">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="group relative h-auto w-full overflow-hidden px-10 py-3.5 text-lg sm:w-auto"
                                    onClick={onClose}
                                >
                                    <span className="relative z-10 flex items-center">
                                        Launch Dashboard <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </span>
                                    <motion.div
                                        className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        initial={false}
                                    />
                                </Button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-3 text-xs font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                >
                                    I know my way around, thanks!
                                </button>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
