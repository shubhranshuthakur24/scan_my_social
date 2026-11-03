import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { TrendingUp, Users, Clock, Zap } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const STATS = [
    {
        label: 'Outliers Scanned',
        value: 50,
        suffix: 'K+',
        icon: Search,
        color: 'text-primary-700',
        accent: 'bg-primary-500',
        helper: 'Live creator benchmarks',
        copy: 'Across actively tracked channels and niches.',
        featured: true,
    },
    {
        label: 'Detection Speed',
        value: 30,
        suffix: 's',
        icon: Zap,
        color: 'text-primary-600',
        accent: 'bg-primary-500',
        helper: 'From signal to alert',
        copy: 'Fast enough to catch trends before they cool.',
    },
    {
        label: 'Research Saved',
        value: 6,
        suffix: 'hr',
        icon: Clock,
        color: 'text-primary-600',
        accent: 'bg-purple-500',
        helper: 'Per creator cycle',
        copy: 'Less manual digging, more output.',
    },
    {
        label: 'Growth Increase',
        value: 3,
        suffix: '.1x',
        icon: TrendingUp,
        color: 'text-pink-600',
        accent: 'bg-pink-500',
        helper: 'Typical lift pattern',
        copy: 'Used as a repeatable framework, not a guess.',
    },
];

function Search({ size = 24, className = "" }) { return <Users size={size} className={className} />; }

export default function OutcomeStatsSection() {
    const containerRef = useRef(null);
    const PrimaryIcon = STATS[0].icon;

    useGSAP(() => {
        const cards = containerRef.current.querySelectorAll('.stat-card');
        const numbers = containerRef.current.querySelectorAll('.stat-number');
        const signalRing = containerRef.current.querySelector('.stat-signal-ring');
        const signalBeam = containerRef.current.querySelector('.stat-signal-beam');
        const prefersReducedMotion = typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        gsap.fromTo(cards,
            { opacity: 0, y: 40 },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.12,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                }
            }
        );

        // CountUp Animation
        numbers.forEach((num, i) => {
            const target = STATS[i].value;
            const obj = { val: 0 };

            gsap.to(obj, {
                val: target,
                duration: 2.5,
                delay: 0.2 + (i * 0.1),
                ease: 'power4.out',
                onUpdate: () => {
                    num.textContent = Math.floor(obj.val);
                },
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top 85%',
                }
            });
        });

        if (prefersReducedMotion) {
            return;
        }

        if (signalRing) {
            gsap.to(signalRing, {
                scale: 1.04,
                opacity: 0.9,
                duration: 5.5,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            });
        }

        if (signalBeam) {
            gsap.to(signalBeam, {
                rotation: 360,
                duration: 36,
                repeat: -1,
                ease: 'none',
                transformOrigin: '50% 50%',
            });
        }

        // Icon Hover animations
        cards.forEach(card => {
            const icon = card.querySelector('.stat-icon');
            if (!icon) {
                return;
            }
            card.addEventListener('mouseenter', () => {
                gsap.to(icon, { rotate: 360, duration: 0.8, ease: 'power2.out' });
            });
            card.addEventListener('mouseleave', () => {
                gsap.to(icon, { rotate: 0, duration: 0.6, ease: 'power2.inOut' });
            });
        });
    }, { scope: containerRef });

    return (
        <section className="py-24 sm:py-28 bg-[#F8F7FF] relative overflow-hidden" ref={containerRef}>
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4F46E5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.14),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.08),_transparent_22%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.04),_transparent_35%)]" />
            <div className="stat-signal-beam absolute left-1/2 top-[12%] h-[70%] w-[74%] -translate-x-1/2 rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,rgba(124,58,237,0)_0deg,rgba(124,58,237,0.18)_38deg,rgba(59,130,246,0.12)_118deg,rgba(124,58,237,0)_180deg,rgba(124,58,237,0)_360deg)] blur-3xl opacity-50 pointer-events-none" />
            <div className="stat-signal-ring absolute left-1/2 top-[18%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-primary-200/45 shadow-[0_0_80px_rgba(124,58,237,0.06)] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="max-w-2xl mb-12 sm:mb-14">
                    <span className="inline-block px-4 py-1.5 mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-600 bg-primary-50 rounded-full border border-primary-100">
                        Proof in Numbers
                    </span>
                    <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tightest leading-[0.95]">
                        Signal, speed, and saved time.
                    </h2>
                    <p className="mt-5 text-base sm:text-lg text-slate-500 leading-relaxed max-w-xl">
                        The stats below are meant to read like product proof, not decorative counters. One metric leads, the rest back it up.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <div className="stat-card group relative overflow-hidden bg-white p-8 sm:p-10 lg:p-12 rounded-[2.75rem] border border-slate-100 shadow-2xl shadow-primary-500/5 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-500/10">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-300/70 to-transparent" />
                        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />

                        <div className="relative flex h-full flex-col justify-between gap-8">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`icon-wrapper p-4 rounded-2xl bg-primary-100 border border-slate-50 shadow-sm flex items-center justify-center w-fit ${STATS[0].color} transition-none`}>
                                        <PrimaryIcon size={24} className="stat-icon transition-none" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Primary signal</p>
                                        <p className="mt-2 text-sm font-bold text-slate-500">{STATS[0].helper}</p>
                                    </div>
                                </div>
                                <span className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-primary-600">
                                    Live
                                </span>
                            </div>

                            <div>
                                <div className="flex items-end gap-2">
                                    <span className={`stat-number text-6xl sm:text-7xl lg:text-[6.5rem] font-black tracking-tighter ${STATS[0].color}`}>0</span>
                                    <span className={`mb-2 text-3xl sm:text-4xl lg:text-5xl font-black ${STATS[0].color}`}>{STATS[0].suffix}</span>
                                </div>
                                <h3 className="mt-4 text-2xl sm:text-3xl font-black text-slate-900">{STATS[0].label}</h3>
                                <p className="mt-4 max-w-xl text-base sm:text-lg text-slate-500 leading-relaxed">
                                    {STATS[0].copy}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {['Scan depth', 'Response time', 'Signal quality'].map((label, index) => (
                                    <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                                        <div className={`h-1.5 rounded-full ${index === 0 ? 'bg-primary-500' : index === 1 ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
                        {STATS.slice(1).map((stat) => {
                            const StatIcon = stat.icon;

                            return (
                                <div
                                    key={stat.label}
                                    className="stat-card group relative overflow-hidden bg-white p-6 sm:p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-primary-500/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-500/10"
                                >
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                                    <div className="relative flex items-start gap-4">
                                        <div className={`icon-wrapper p-3.5 rounded-2xl bg-primary-100 border border-slate-50 shadow-sm flex items-center justify-center w-fit ${stat.color} transition-none`}>
                                            <StatIcon size={22} className="stat-icon transition-none" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-end gap-1">
                                                <span className={`stat-number text-3xl sm:text-4xl font-black tracking-tighter ${stat.color}`}>0</span>
                                                <span className={`mb-1 text-xl sm:text-2xl font-black ${stat.color}`}>{stat.suffix}</span>
                                            </div>

                                            <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">{stat.label}</p>
                                            <p className="mt-2 text-sm text-slate-500 leading-relaxed">{stat.copy}</p>
                                            <div className="mt-4 flex items-center gap-2">
                                                <span className={`h-1.5 w-1.5 rounded-full ${stat.accent}`} />
                                                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{stat.helper}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
