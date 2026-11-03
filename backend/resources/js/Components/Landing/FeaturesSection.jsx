import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Magnet, Target, Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
    {
        title: 'Deep Outlier Analysis',
        desc: 'We don\'t just look for high views. We compare video performance against the creator\'s normal median to find true breakthroughs.',
        icon: Magnet,
        color: 'from-primary-600 to-primary-400',
    },
    {
        title: 'Retention-First Scripts',
        desc: 'Our AI analyzes the exact frame where audiences typically drop off in viral videos and builds yours to avoid those traps.',
        icon: Target,
        color: 'from-primary-500 to-purple-500',
    },
    {
        title: 'Automated Viral Alerts',
        desc: 'Get notified the second a new outlier is detected in your niche. Be the first to use the framework before it saturates.',
        icon: Sparkles,
        color: 'from-purple-500 to-pink-500',
    },
];

export default function FeaturesSection() {
    const containerRef = useRef(null);

    useGSAP(() => {
        const cards = containerRef.current.querySelectorAll('.feature-card');
        const prefersReducedMotion = typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        gsap.fromTo(cards,
            { opacity: 0, y: 50 },
            {
                opacity: 1,
                y: 0,
                duration: 1,
                stagger: 0.2,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top 80%',
                    toggleActions: 'play none none none',
                }
            }
        );

        if (prefersReducedMotion) {
            return;
        }

        const cleanupFns = [];

        // Hover animations
        cards.forEach(card => {
            const icon = card.querySelector('.icon-wrapper');
            const bg = card.querySelector('.hover-reveal-bg');
            const liquidTrail = card.querySelector('.hover-reveal-trail');
            const borderGlow = card.querySelector('.hover-border-glow');
            const sheen = card.querySelector('.hover-sheen');

            gsap.set(card, { transformPerspective: 900, transformOrigin: 'center center' });

            const handleMouseEnter = () => {
                gsap.to(card, {
                    y: -10,
                    scale: 1.01,
                    boxShadow: '0 24px 48px -24px rgba(124,58,237,0.48), 0 12px 22px -14px rgba(124,58,237,0.24)',
                    duration: 0.36,
                    ease: 'power3.out'
                });
                gsap.to(icon, {
                    scale: 1.1,
                    y: -2,
                    duration: 0.45,
                    ease: 'power2.out'
                });
                if (bg) {
                    gsap.to(bg, {
                        opacity: 1,
                        scale: 1.18,
                        duration: 0.55,
                        ease: 'power2.out'
                    });
                }
                if (liquidTrail) {
                    gsap.to(liquidTrail, {
                        opacity: 0.66,
                        scale: 1.14,
                        duration: 0.65,
                        ease: 'sine.out'
                    });
                }
                if (borderGlow) {
                    gsap.to(borderGlow, { opacity: 1, duration: 0.28, ease: 'power2.out' });
                }
                if (sheen) {
                    gsap.killTweensOf(sheen);
                    gsap.fromTo(
                        sheen,
                        { xPercent: -140, opacity: 0 },
                        { xPercent: 160, opacity: 0.55, duration: 1.1, ease: 'power2.out' }
                    );
                }
            };

            const handleMouseLeave = () => {
                gsap.to(card, {
                    y: 0,
                    scale: 1,
                    rotateX: 0,
                    rotateY: 0,
                    boxShadow: '0 0 0 rgba(124,58,237,0)',
                    duration: 0.42,
                    ease: 'power3.out'
                });
                gsap.to(icon, {
                    scale: 1,
                    y: 0,
                    rotate: 0,
                    duration: 0.35,
                    ease: 'power2.inOut'
                });
                if (bg) {
                    gsap.to(bg, {
                        opacity: 0,
                        scale: 1,
                        duration: 0.45,
                        ease: 'power2.inOut'
                    });
                }
                if (liquidTrail) {
                    gsap.to(liquidTrail, {
                        opacity: 0,
                        scale: 1,
                        duration: 0.45,
                        ease: 'sine.inOut'
                    });
                }
                if (borderGlow) {
                    gsap.to(borderGlow, { opacity: 0, duration: 0.25, ease: 'power2.out' });
                }
                if (sheen) {
                    gsap.to(sheen, { opacity: 0, duration: 0.2, ease: 'power2.out' });
                }
            };

            const handleMouseMove = (event) => {
                const rect = card.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                const xRatio = (x / rect.width) - 0.5;
                const yRatio = (y / rect.height) - 0.5;

                if (bg) {
                    gsap.to(bg, { x: x - 96, y: y - 96, duration: 0.35, ease: 'power2.out' });
                }
                if (liquidTrail) {
                    gsap.to(liquidTrail, { x: x - 124, y: y - 124, duration: 0.6, ease: 'sine.out' });
                }
                gsap.to(card, {
                    rotateY: xRatio * 6,
                    rotateX: yRatio * -5,
                    duration: 0.34,
                    ease: 'power2.out'
                });
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
    }, { scope: containerRef });

    return (
        <section
            id="features"
            ref={containerRef}
            className="py-24 sm:py-32 bg-white relative"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
                    <div className="max-w-2xl">
                        <span className="inline-block px-4 py-1.5 mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-600 bg-primary-50 rounded-full border border-primary-100">
                            Features
                        </span>

                        <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tightest leading-[0.95]">
                            Engineered <span className="text-primary-600">For</span> <br />
                            Maximum <span className="text-primary-600">Virality.</span>
                        </h2>
                    </div>
                    <div className="text-slate-500 max-w-sm text-lg sm:text-xl leading-relaxed">
                        Every tool in the Scan My Social engine is built to solve one specific part of the creator growth puzzle.
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {FEATURES.map((feature, i) => (
                        <div
                            key={i}
                            className="feature-card group relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-10 shadow-[0_0_0_rgba(124,58,237,0)] transition-[border-color,transform,box-shadow] duration-500 will-change-transform [transform-style:preserve-3d]"
                        >
                            <div className="hover-reveal-trail pointer-events-none absolute left-0 top-0 h-56 w-56 rounded-full bg-primary-200/30 opacity-0 blur-[70px]" />
                            <div className="hover-reveal-bg pointer-events-none absolute left-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.42),rgba(124,58,237,0)_70%)] opacity-0 blur-3xl transition-none" />
                            <div className="hover-sheen pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0" />
                            <div className="hover-border-glow pointer-events-none absolute inset-0 rounded-[2.5rem] border border-primary-300/60 opacity-0" />

                            <div className="relative z-10">
                                <div className={`icon-wrapper flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${feature.color} text-white shadow-lg shadow-primary-500/20 transition-none`}>
                                    <feature.icon size={26} />
                                </div>

                                <h3 className="mb-6 mt-10 text-2xl font-black text-slate-900 transition-colors group-hover:text-primary-700">
                                    {feature.title}
                                </h3>

                                <p className="mb-10 text-lg leading-relaxed text-slate-500 transition-colors group-hover:text-slate-700">
                                    {feature.desc}
                                </p>
                            </div>


                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
