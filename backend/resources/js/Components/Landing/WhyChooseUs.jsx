import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { BarChart3, Bell, Cpu, Gauge, Layout, Search, Target, Zap } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
    {
        title: 'Subscription Killer',
        desc: 'Replace your dedicated scraper, script writer, AI analyzer, and trend-spotter with one unified app.',
        icon: Layout,
    },
    {
        title: 'Robust Outlier Logic',
        desc: 'Elite-level validation, including median-based and log-scaled algorithms, to truly identify breakthrough content.',
        icon: Target,
    },
    {
        title: 'Script Deconstruction',
        desc: 'Complete breakdown: Hook detection, Story identification, and CTA analysis for every winning video.',
        icon: Cpu,
    },
    {
        title: 'Research Velocity',
        desc: 'What used to take an agency strategist 4 hours now takes our engine 4 minutes of automated scanning.',
        icon: Gauge,
    },
    {
        title: 'AI Explanation',
        desc: 'We provide a detailed AI explanation of why a script worked, feeding knowledge directly back into your content.',
        icon: Zap,
    },
    {
        title: 'Proactive Alerts',
        desc: 'With our Creator plan, you get Outlier Alerts for new viral content, ensuring you are first to capitalize.',
        icon: Bell,
    },
    {
        title: 'Outlier Discovery',
        desc: 'We track performance relative to creator medians, flagging 10x-performing outliers that others miss.',
        icon: Search,
    },
    {
        title: 'Context-Aware Scripts',
        desc: 'Scripts are generated based on the specific pacing, hooks, and retention-triggers of the winning video.',
        icon: BarChart3,
    },
];

export default function WhyChooseUs() {
    const sectionRef = useRef(null);
    const containerRef = useRef(null);

    useGSAP(() => {
        const cards = containerRef.current.querySelectorAll('.feature-card');
        const prefersReducedMotion = typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        gsap.fromTo(cards,
            { opacity: 0, y: 24, scale: 0.98 },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.8,
                stagger: 0.08,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top 90%',
                    toggleActions: 'play none none none',
                }
            }
        );

        if (prefersReducedMotion) {
            return;
        }

        const cleanupFns = [];

        cards.forEach((card) => {
            const icon = card.querySelector('.icon-wrapper');
            const glow = card.querySelector('.card-glow');
            const liquidTrail = card.querySelector('.card-liquid-trail');
            const borderDraw = card.querySelector('.card-border-draw');

            let borderLength = 0;
            let borderOrbitTween = null;
            if (borderDraw) {
                borderLength = borderDraw.getTotalLength();
                gsap.set(borderDraw, {
                    opacity: 0,
                    strokeDasharray: `0 ${borderLength}`,
                    strokeDashoffset: 0,
                    strokeLinecap: 'round',
                });
            }

            const handleMouseEnter = () => {
                gsap.to(card, {
                    y: -8,
                    scale: 1.015,
                    boxShadow: '0 28px 56px -26px rgba(124,58,237,0.58), 0 10px 22px -12px rgba(124,58,237,0.3)',
                    duration: 0.42,
                    ease: 'power3.out',
                });
                gsap.to(icon, { rotate: 360, scale: 1.15, duration: 0.8, ease: 'power2.out' });
                if (glow) {
                    gsap.to(glow, { opacity: 1, scale: 1.14, duration: 0.55, ease: 'sine.out' });
                }
                if (liquidTrail) {
                    gsap.to(liquidTrail, { opacity: 0.8, scale: 1.2, duration: 0.75, ease: 'sine.out' });
                }
                if (borderDraw && borderLength > 0) {
                    const orbitSegment = Math.max(borderLength * 0.2, 96);
                    if (borderOrbitTween) {
                        borderOrbitTween.kill();
                        borderOrbitTween = null;
                    }
                    gsap.killTweensOf(borderDraw);
                    gsap.set(borderDraw, { opacity: 1, strokeDasharray: `0 ${borderLength}`, strokeDashoffset: 0 });
                    gsap.to(borderDraw, {
                        strokeDasharray: `${orbitSegment} ${Math.max(borderLength - orbitSegment, 1)}`,
                        duration: 0.45,
                        ease: 'power2.out',
                        onComplete: () => {
                            borderOrbitTween = gsap.to(borderDraw, {
                                strokeDashoffset: -borderLength,
                                duration: 3.2,
                                ease: 'none',
                                repeat: -1,
                            });
                        },
                    });
                }
            };

            const handleMouseLeave = () => {
                gsap.to(card, {
                    y: 0,
                    scale: 1,
                    boxShadow: '0 0 0 rgba(124,58,237,0)',
                    duration: 0.38,
                    ease: 'power2.out',
                });
                gsap.to(icon, { rotate: 0, scale: 1, duration: 0.4, ease: 'power2.inOut' });
                if (glow) {
                    gsap.to(glow, { opacity: 0, scale: 1, duration: 0.35, ease: 'sine.inOut' });
                }
                if (liquidTrail) {
                    gsap.to(liquidTrail, { opacity: 0, scale: 1, duration: 0.5, ease: 'sine.inOut' });
                }
                if (borderDraw && borderLength > 0) {
                    if (borderOrbitTween) {
                        borderOrbitTween.kill();
                        borderOrbitTween = null;
                    }
                    gsap.killTweensOf(borderDraw);
                    gsap.to(borderDraw, {
                        opacity: 0,
                        duration: 0.28,
                        ease: 'power2.inOut',
                        onComplete: () => {
                            gsap.set(borderDraw, {
                                strokeDasharray: `0 ${borderLength}`,
                                strokeDashoffset: 0,
                            });
                        }
                    });
                }
            };

            const handleMouseMove = (event) => {
                const rect = card.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;

                if (glow) {
                    gsap.to(glow, { x: x - 88, y: y - 88, duration: 0.35, ease: 'power2.out' });
                }
                if (liquidTrail) {
                    gsap.to(liquidTrail, { x: x - 118, y: y - 118, duration: 0.65, ease: 'sine.out' });
                }
            };

            card.addEventListener('mouseenter', handleMouseEnter);
            card.addEventListener('mouseleave', handleMouseLeave);
            card.addEventListener('mousemove', handleMouseMove);

            cleanupFns.push(() => {
                card.removeEventListener('mouseenter', handleMouseEnter);
                card.removeEventListener('mouseleave', handleMouseLeave);
                card.removeEventListener('mousemove', handleMouseMove);
            });
        });

        return () => {
            cleanupFns.forEach((cleanup) => cleanup());
        };
    }, { scope: sectionRef });

    return (
        <section
            id="why-choose-us"
            ref={sectionRef}
            className="relative overflow-hidden bg-slate-50/40 py-24 sm:py-32"
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(124,58,237,0.06),transparent_36%),radial-gradient(circle_at_88%_14%,rgba(124,58,237,0.01),transparent_32%),linear-gradient(to_bottom,rgba(248,247,255,0.75),rgba(255,255,255,1))]" />
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{ backgroundImage: 'radial-gradient(#4F46E5 1px, transparent 1px)', backgroundSize: '36px 36px' }}
            />
            <div className="pointer-events-none absolute top-0 right-0 h-full w-1/3 translate-x-1/2 -skew-x-12 bg-primary-50/35" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-16 flex flex-col justify-between gap-8 lg:mb-24 lg:flex-row lg:items-end">
                    <div className="max-w-3xl">
                        <span className="mb-6 inline-block rounded-full border border-primary-100 bg-primary-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-600">
                            The All-In-One Solution
                        </span>
                        <h2 className="text-4xl font-black leading-[0.95] tracking-tightest text-slate-900 md:text-7xl">
                            Stop juggling <span className="text-primary-600">subscriptions.</span> <br />
                            One clear viral <span className="whitespace-nowrap text-primary-600">workflow.</span>
                        </h2>
                    </div>
                    <div className="lg:mb-4">
                        <p className="max-w-sm text-lg leading-relaxed text-slate-500 sm:text-xl">
                            Stop paying for five different monthly tools. Scan My Social gives you the full outlier-to-script pipeline in one place.
                        </p>
                    </div>
                </div>

                <div
                    ref={containerRef}
                    className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4"
                >
                    {FEATURES.map((item, i) => (
                        <div
                            key={i}
                            className="feature-card group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-8 shadow-[0_0_0_rgba(124,58,237,0)] transition-[border-color,transform,box-shadow] duration-500"
                        >
                            <div className="card-liquid-trail pointer-events-none absolute left-0 top-0 h-52 w-52 rounded-full bg-primary-200/35 opacity-0 blur-[68px]" />
                            <div className="card-glow pointer-events-none absolute left-0 top-0 h-44 w-44 rounded-full bg-primary-300/45 opacity-0 blur-3xl" />
                            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" focusable="false" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id={`editorial-violet-border-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="rgba(124,58,237,0.96)" />
                                        <stop offset="60%" stopColor="rgba(124,58,237,0.45)" />
                                        <stop offset="100%" stopColor="rgba(124,58,237,0)" />
                                    </linearGradient>
                                </defs>
                                <rect
                                    className="card-border-draw"
                                    x="2"
                                    y="2"
                                    width="996"
                                    height="996"
                                    rx="120"
                                    fill="none"
                                    stroke={`url(#editorial-violet-border-${i})`}
                                    strokeWidth="2"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </svg>

                            <div className="relative z-10 mb-6 flex items-center gap-4">
                                <div className="icon-wrapper flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-primary-100 text-primary-600 shadow-sm transition-all duration-300 group-hover:border-primary-600 group-hover:bg-primary-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary-500/25">
                                    <item.icon size={22} className="transition-none" />
                                </div>
                                <h3 className="text-xl font-bold capitalize leading-tight text-slate-900 transition-colors group-hover:text-primary-700">
                                    {item.title}
                                </h3>
                            </div>

                            <p className="relative z-10 flex-grow text-base leading-relaxed text-slate-500 transition-colors group-hover:text-slate-700 sm:text-lg">
                                {item.desc}
                            </p>


                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
