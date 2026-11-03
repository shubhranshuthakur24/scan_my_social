import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Search, PenTool, Sparkles, Send } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
    {
        id: 1,
        title: 'Discover Outliers',
        desc: 'Our engine scans thousands of creators to find videos that outperformed their own average by 5-100x.',
        icon: Search,
        color: 'bg-primary-600',
        visualSrc: '/images/gif/step1gif.gif',
    },
    {
        id: 2,
        title: 'Deconstruct Winners',
        desc: 'We analyze the hook, pacing, and retention triggers that made that specific video a viral hit.',
        icon: PenTool,
        color: 'bg-primary-600',
    },
    {
        id: 3,
        title: 'Generate Scripts',
        desc: 'AI generates a context-aware script for your niche, using the same proven viral framework.',
        icon: Sparkles,
        color: 'bg-primary-600',
    },
    {
        id: 4,
        title: 'Daily Viral Alerts',
        desc: 'Get proactive alerts when new outliers are detected in your category. Never miss a trend again.',
        icon: Send,
        color: 'bg-primary-600',
    },
];

export default function HowItWorks() {
    const triggerRef = useRef(null);

    useGSAP(() => {
        const prefersReducedMotion = typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const cards = Array.from(triggerRef.current.querySelectorAll('.step-card'));

        if (prefersReducedMotion) {
            return;
        }

        const finalCard = cards[cards.length - 1];
        const cleanupHandlers = [];

        cards.forEach((card, i) => {
            if (i === cards.length - 1) return; // Last card doesn't need to scale down

            ScrollTrigger.create({
                trigger: card,
                start: 'top 15%',
                // Release pinned cards when the last step reaches the pin point
                // so steps 1-3 scroll away together with step 4.
                endTrigger: finalCard,
                end: 'top 15%',
                pin: true,
                pinSpacing: false,
                scrub: true,
                onUpdate: (self) => {
                    // Optional: additive scale down effect handled in separate tween
                }
            });

            // Scale down and dim the card as the NEXT card comes in
            gsap.to(card, {
                scale: 0.92,
                opacity: 0.5,
                scrollTrigger: {
                    trigger: cards[i + 1],
                    start: 'top 80%',
                    end: 'top 15%',
                    scrub: true,
                }
            });
        });

        // Icon Hover animations
        cards.forEach((card) => {
            const icon = card.querySelector('.icon-wrapper');
            const handleMouseEnter = () => {
                gsap.to(icon, { rotate: 360, duration: 0.8, ease: 'power2.out' });
            };
            const handleMouseLeave = () => {
                gsap.to(icon, { rotate: 0, duration: 0.6, ease: 'power2.inOut' });
            };

            card.addEventListener('mouseenter', handleMouseEnter);
            card.addEventListener('mouseleave', handleMouseLeave);
            cleanupHandlers.push(() => {
                card.removeEventListener('mouseenter', handleMouseEnter);
                card.removeEventListener('mouseleave', handleMouseLeave);
            });
        });

        return () => {
            cleanupHandlers.forEach((cleanup) => cleanup());
        };
    }, { scope: triggerRef });

    return (
        <section
            id="how-it-works"
            ref={triggerRef}
            className="py-24 sm:py-32 bg-white relative"
        >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-24">
                    <span className="inline-block px-4 py-1.5 mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-600 bg-primary-50 rounded-full border border-primary-100">
                        The Workflow
                    </span>
                    <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tightest leading-[0.95] text-center">
                        Surgical <span className="text-primary-600">Research.</span> <br />
                        Kinetic <span className="text-primary-600">Growth.</span>
                    </h2>
                </div>

                <div className="relative space-y-4">
                    {STEPS.map((step, i) => (
                        <div
                            key={step.id}
                            className="step-card group relative bg-white border border-slate-100 rounded-[2.5rem] p-10 sm:p-16 shadow-2xl shadow-slate-200/50 flex flex-col md:flex-row gap-10 items-center overflow-hidden"
                            style={{ height: '500px' }}
                        >
                            {/* Step Number Background */}
                            <div className="absolute top-0 right-0 p-12 text-slate-50 font-black text-[12rem] leading-none select-none pointer-events-none transition-transform group-hover:scale-110 group-hover:text-primary-50">
                                0{step.id}
                            </div>

                            <div className="relative z-10 flex-1">
                                <div className={`icon-wrapper w-14 h-14 ${step.color} text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-primary-500/20 transition-none`}>
                                    <step.icon size={28} />
                                </div>
                                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 mb-6 capitalize">
                                    {step.title}
                                </h3>
                                <p className="text-lg sm:text-xl text-slate-500 leading-relaxed max-w-md">
                                    {step.desc}
                                </p>
                            </div>

                            <div className="relative z-10 hidden md:block w-72 h-72 rounded-[2rem] bg-slate-50 border border-slate-100 p-4 shadow-inner overflow-hidden">
                                {step.visualSrc ? (
                                    <img
                                        src={step.visualSrc}
                                        alt={`${step.title} preview`}
                                        className="w-full h-full rounded-2xl object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-2xl bg-linear-to-br from-slate-100 to-slate-200 animate-pulse flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                                        Step {step.id} Reveal
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
