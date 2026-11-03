import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Anchor, Zap, TrendingUp } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const FORMULA_PILLARS = [
    {
        icon: Anchor,
        label: 'The Hook',
        desc: 'Stops the scroll in',
        highlight: '2 seconds.'
    },
    {
        icon: TrendingUp,
        label: 'The Story',
        desc: 'Builds emotion that',
        highlight: 'forces a share.'
    },
    {
        icon: Zap,
        label: 'The CTA',
        desc: 'Turns views into leads on',
        highlight: 'autopilot.'
    },
];

export default function StoryPainPointOutro() {
    const sectionRef = useRef(null);
    const containerRef = useRef(null);

    useGSAP(() => {
        const sectionElement = sectionRef.current;
        if (!sectionElement) return;

        const prefersReducedMotion = typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) return;

        const mm = gsap.matchMedia();

        mm.add('(min-width: 1024px)', () => {
            const OUTRO_SCROLL_DISTANCE = '+=560%';

            const mainTl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top top',
                    end: OUTRO_SCROLL_DISTANCE,
                    pin: true,
                    scrub: 1.1,
                }
            });

            mainTl.to('[data-section="intro"] [data-animate]', {
                y: -60,
                opacity: 0,
                filter: 'blur(10px)',
                scale: 0.95,
                stagger: 0.1,
                duration: 2.2
            })
                .fromTo('[data-section="truth"]',
                    { opacity: 0, y: 100, filter: 'blur(20px)', display: 'none' },
                    { opacity: 1, y: 0, filter: 'blur(0px)', display: 'flex', duration: 2.6, ease: 'power2.out' },
                    "-=0.8"
                )
                .fromTo('.outro-truth-glint',
                    { left: '-100%', opacity: 0 },
                    { left: '150%', opacity: 1, duration: 1.8, ease: 'power1.inOut' },
                    "-=1.2"
                )
                .to({}, { duration: 1.4 })
                .to('[data-section="truth"]', {
                    opacity: 0,
                    y: -100,
                    filter: 'blur(20px)',
                    scale: 1.1,
                    duration: 2.2,
                    display: 'none'
                }, "+=0.2")
                .fromTo('[data-section="quote"]',
                    { opacity: 0, scale: 0.8, rotationX: -15, y: 200, display: 'none' },
                    { opacity: 1, scale: 1, rotationX: 0, y: 0, display: 'flex', duration: 3.4, ease: 'power3.out' },
                    "-=0.8"
                )
                .to({}, { duration: 1.7 })
                .to('[data-section="quote"]', {
                    opacity: 0,
                    scale: 0.9,
                    y: -50,
                    duration: 2.2,
                    display: 'none'
                }, "+=0.2")
                .fromTo('[data-section="formula"]',
                    { opacity: 0, y: 100, display: 'none' },
                    { opacity: 1, y: 0, display: 'flex', duration: 2.8 },
                    "-=0.8"
                )
                .fromTo('.outro-pillar',
                    { y: 50, opacity: 0, scale: 0.9, filter: 'blur(10px)' },
                    { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', stagger: 0.24, duration: 2.6, ease: 'back.out(1.7)' },
                    "-=1.4"
                );

            gsap.to('.outro-intro-ambient', {
                y: 30,
                x: 20,
                duration: 3,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                stagger: { amount: 2, from: "random" }
            });

            gsap.to('.outro-grid-parallax', {
                yPercent: -20,
                ease: 'none',
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                },
            });
        });

        mm.add('(max-width: 1023px)', () => {
            ['intro', 'truth', 'quote', 'formula'].forEach((blockName) => {
                const targets = sectionElement.querySelectorAll(`[data-section="${blockName}"] [data-animate], [data-section="${blockName}"] .outro-pillar`);
                gsap.from(targets, {
                    y: 22,
                    opacity: 0,
                    duration: 0.95,
                    stagger: 0.12,
                    scrollTrigger: {
                        trigger: sectionElement.querySelector(`[data-section="${blockName}"]`),
                        start: 'top 88%',
                    }
                });
            });
        });

        return () => mm.revert();
    }, { scope: sectionRef });

    return (
        <section ref={sectionRef} className="v3-section-outro relative bg-slate-950 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="outro-grid-parallax absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at center, #6366f1 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>

            <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent via-slate-950/70 to-slate-950 pointer-events-none z-[5]" />

            <div ref={containerRef} className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-8 min-h-screen lg:h-screen lg:flex lg:items-center lg:justify-center">

                {/* 1. INTRO BLOCK */}
                <section
                    data-section="intro"
                    className="relative min-h-[70vh] lg:absolute lg:inset-0 flex flex-col items-center justify-center text-center py-16 lg:py-0"
                >
                    <div className="outro-intro-ambient absolute left-[10%] top-[18%] h-44 w-44 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />
                    <div className="outro-intro-ambient absolute right-[12%] bottom-[22%] h-52 w-52 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />

                    <div className="v3-outro-content px-2 max-w-4xl">
                        <h3 data-animate className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight mb-8 leading-tight">
                            Does this <span className="text-primary-500">feel like you?</span>
                        </h3>
                        <p data-animate className="text-lg md:text-2xl text-slate-400 font-montserrat font-medium leading-relaxed max-w-2xl mx-auto">
                            You are not failing because you are lazy - you are failing because <br className="hidden md:block" />
                            <span className="text-white font-bold inline-block border-b-2 border-primary-500 pb-1">you cannot see the pattern</span> your competitors are using.
                        </p>
                    </div>
                </section>

                {/* 2. TRUTH BLOCK */}
                <section
                    data-section="truth"
                    className="min-h-[70vh] lg:absolute lg:inset-0 hidden flex-col items-center justify-center py-16 lg:py-0 text-center"
                >
                    <img data-animate src="/images/the-truth.png" alt="" className="w-32 h-32 md:w-56 md:h-56 mx-auto mb-12 object-contain" />

                    <div className="relative inline-block overflow-hidden">
                        <h2 data-animate className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black leading-[0.9] tracking-tighter text-white uppercase italic">
                            Here is the <br />
                            <span className="text-primary-500">Truth</span>
                        </h2>
                        <div className="outro-truth-glint absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] pointer-events-none" />
                    </div>
                </section>

                {/* 3. QUOTE BLOCK */}
                <section
                    data-section="quote"
                    className="min-h-[70vh] lg:absolute lg:inset-0 hidden items-center justify-center py-16 lg:py-0"
                    style={{ perspective: '1000px' }}
                >
                    <div data-animate className="relative w-full max-w-4xl p-10 md:p-20 rounded-[3rem] md:rounded-[5rem] bg-linear-to-br from-primary-600 to-primary-900 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5),0_0_50px_rgba(99,102,241,0.2)] overflow-hidden group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.1),_transparent_60%)] pointer-events-none" />
                        <div className="absolute top-0 right-10 h-full opacity-[0.08] grayscale brightness-150 group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                            <img src="/images/happy.png" alt="" className="h-full w-auto object-cover object-right" />
                        </div>

                        <h4 className="relative z-10 text-3xl md:text-6xl font-black text-white italic tracking-tightest leading-[1.1]">
                            "Viral content is not luck. <br />
                            <span className="text-amber-300">It is a simple pattern </span> <br className="hidden md:block" />
                            <span className="text-pink-300">you can copy."</span>
                        </h4>

                        <div className="mt-12 md:mt-16 h-1 w-24 md:w-32 bg-white/40 rounded-full" />
                    </div>
                </section>

                {/* 4. FORMULA BLOCK */}
                <section
                    data-section="formula"
                    className="min-h-[80vh] lg:absolute lg:inset-0 hidden flex-col items-center justify-center py-16 lg:py-0"
                >
                    <p data-animate className="mb-20 max-w-4xl text-center text-xl font-bold leading-relaxed text-slate-400 sm:text-3xl font-montserrat px-4">
                        Every breakout video has a formula. Your competitors have already cracked it -
                        and <span className="text-amber-400 underline decoration-primary-500 decoration-4 underline-offset-8">they are using it against you every single day.</span>
                    </p>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 w-full max-w-6xl">
                        {FORMULA_PILLARS.map((pillar) => {
                            const Icon = pillar.icon;
                            return (
                                <div
                                    key={pillar.label}
                                    className="outro-pillar group relative flex flex-col items-center overflow-hidden rounded-[3rem] border border-primary-200/90 bg-linear-to-br from-primary-600 to-primary-900 p-12 text-center transition-all duration-500 hover:border-primary-50/90 hover:shadow-[0_30px_90px_-35px_rgba(129,140,248,0.75)] shadow-[0_24px_60px_-28px_rgba(79,70,229,0.65)]"
                                >
                                    <div className="pointer-events-none absolute inset-0 z-0 scale-110 opacity-0 bg-white/18 blur-2xl transition-all duration-700 ease-out group-hover:scale-100 group-hover:opacity-100" />

                                    <div className="relative z-10 mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/65 bg-white text-amber-500 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:bg-white/16">
                                        <Icon size={40} strokeWidth={1.5} />
                                    </div>

                                    <div className="relative z-10">
                                        <p className="mb-4 text-3xl font-black italic tracking-tight text-white transition-all duration-500 group-hover:tracking-wider">
                                            {pillar.label}
                                        </p>
                                        <p className="text-lg font-medium leading-relaxed text-white/85 transition-colors duration-500 font-montserrat px-2">
                                            {pillar.desc} <span className="text-amber-300 font-bold font-montserrat">{pillar.highlight}</span>
                                        </p>
                                    </div>

                                    <div className="absolute bottom-6 h-1 w-12 bg-white/35 rounded-full transition-all duration-500 group-hover:w-24 group-hover:bg-white/85" />
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </section>
    );
}
