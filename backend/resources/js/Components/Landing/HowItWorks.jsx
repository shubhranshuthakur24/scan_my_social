import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Target, Search, Sparkles, BookOpen, PenTool, MessageSquarePlus, DollarSign, ArrowRight } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { toAbsoluteRoute } from '@/Utils/routeHelper';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
    {
        title: 'Add Your Competitors',
        description: 'Tell us who to watch. We do the rest.',
        icon: Target,
    },
    {
        title: 'We Scan Everything',
        description: 'Every video they ever posted, analysed instantly.',
        icon: Search,
    },
    {
        title: 'Find The Outliers',
        description: 'See exactly which videos exploded and why.',
        icon: Sparkles,
    },
    {
        title: 'Reverse Engineer The Winner',
        description: 'Break it down - hook, story, CTA - all decoded.',
        icon: BookOpen,
    },
    {
        title: 'Recreate It For Your Brand',
        description: 'Turn their winning formula into your next viral video.',
        icon: PenTool,
    },
    {
        title: 'Turn Engagement Into Conversations',
        description: 'Every follow, comment, and DM now triggers the right reply automatically.',
        icon: MessageSquarePlus,
    },
    {
        title: 'Watch Revenue Come In',
        description: 'Your content runs. Your pipeline fills. You grow.',
        icon: DollarSign,
    },
];

export default function HowItWorks() {
    const { reviewMode } = usePage().props;
    const sectionRef = useRef(null);
    const scrollTrackRef = useRef(null);
    const headerRef = useRef(null);
    const cardsContainerRef = useRef(null);
    const splitWrapperRef = useRef(null);

    useGSAP(() => {
        const mm = gsap.matchMedia();
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        mm.add('(min-width: 1024px)', () => {
            if (!sectionRef.current || !scrollTrackRef.current) return undefined;
            if (prefersReducedMotion) return undefined;

            const getHorizontalDistance = () => {
                const scrollWidth = scrollTrackRef.current.scrollWidth;
                const containerWidth = cardsContainerRef.current.offsetWidth;
                return scrollWidth - containerWidth + 100;
            };

            // Set initial states cleanly
            gsap.set(headerRef.current, { xPercent: 75, scale: 1.08, opacity: 1 });
            gsap.set(cardsContainerRef.current, { x: '100%', opacity: 0 });

            const timeline = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'center center',
                    end: () => `+=${getHorizontalDistance() * 2.5}`,
                    pin: true,
                    scrub: 1.8,          // Increased scrub lag for buttery feel
                    invalidateOnRefresh: true,
                    anticipatePin: 1,
                    fastScrollEnd: true, // Snaps cleanly when fast-scrolling stops
                },
            });

            // PHASE 1: Header slides to sidebar   smooth power3 curve
            timeline.to(headerRef.current, {
                xPercent: 0,
                scale: 0.95,
                duration: 1,
                ease: 'power3.inOut',
            }, 0);

            // PHASE 2: Cards reveal   synchronized with header to prevent overlap
            timeline.to(cardsContainerRef.current, {
                x: 0,
                opacity: 1,
                duration: 1,
                ease: 'power3.inOut',
            }, 0);

            // PHASE 3: Horizontal scrub   linear so it feels 1:1 with scroll
            timeline.to(scrollTrackRef.current, {
                x: () => -getHorizontalDistance(),
                ease: 'none',
                duration: 2.2,
            }, 0.8);

            // PHASE 4: Hold at end
            timeline.to({}, { duration: 0.6 });

            return () => {
                timeline.scrollTrigger?.kill();
                timeline.kill();
            };
        });

        mm.add('(max-width: 1023px)', () => {
            const cards = gsap.utils.toArray('.how-it-card-mobile');
            cards.forEach((card, i) => {
                gsap.fromTo(
                    card,
                    { opacity: 0, y: 44, scale: 0.96 },
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.7,
                        ease: 'power4.out',
                        // Subtle stagger so adjacent cards don't pop simultaneously
                        delay: i * 0.04,
                        scrollTrigger: {
                            trigger: card,
                            start: 'top 93%',
                            toggleActions: 'play none none reverse',
                        },
                    }
                );
            });
        });

        return () => mm.revert();
    }, { scope: sectionRef });

    return (
        <section
            ref={sectionRef}
            className="relative w-full bg-rose-100 text-slate-900 py-16 md:py-24 lg:py-48 overflow-visible"
            id="how-it-works"
        >
            {/* Top arc */}
            <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] translate-y-[-1px] pointer-events-none z-20">
                <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="relative block w-full h-[60px] md:h-[120px]">
                    <path d="M0,0 C600,0 840,120 1440,120 L1440,0 L0,0 Z" className="fill-rose-100" />
                </svg>
            </div>

            <div
                ref={splitWrapperRef}
                className="relative flex flex-col lg:flex-row h-auto lg:h-[80vh] items-center lg:items-stretch overflow-hidden rounded-[2rem] lg:rounded-[5rem] bg-rose-50/70 border border-rose-200/50 shadow-2xl mx-4 lg:mx-20"
            >
                {/* Left Sidebar */}
                <div
                    ref={headerRef}
                    className="z-30 flex w-full lg:w-[40%] shrink-0 flex-col justify-center px-4 md:px-10 py-16 lg:py-0 relative bg-rose-50/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none border-b lg:border-b-0"
                >
                    <div className="how-it-header-content text-center">
                        <h2 className="mb-6 text-3xl sm:text-6xl lg:text-[5rem] xl:text-[5rem] font-black leading-[1.1] tracking-tight text-slate-900 lg:whitespace-nowrap">
                            How It <span className="text-primary-500 italic capitalize">Works</span>
                        </h2>

                        <p className="max-w-[280px] sm:max-w-xs font-montserrat text-base sm:text-lg leading-relaxed text-slate-600 lg:max-w-sm mx-auto">
                            From finding <span className="text-rose-500 italic capitalize">viral content</span> to generating{' '}
                            <span className="text-rose-500 italic capitalize">revenue</span>   in 7 simple steps.
                        </p>

                        <div className="mt-8 mx-auto max-w-sm rounded-[2rem] border border-primary-200/80 bg-white/95 px-8 py-4 text-lg xl:text-xl font-bold  text-slate-900 shadow-[0_20px_50px_-30px_rgba(99,102,241,0.4)] backdrop-blur-sm ">
                            Your content gets <span className="text-primary-600">Views</span>.
                            <br />
                            Your auto DM fills <span className="text-primary-700">Leads</span>.
                            <Link
                                href={toAbsoluteRoute('register')}

                                className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-primary-500 text-white rounded-2xl font-black text-lg hover:bg-primary-500 transition-all hover:shadow-xl hover:-translate-y-1 group"

                            >
                                Start For Free
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Scroll Pane */}
                <div
                    ref={cardsContainerRef}
                    className="relative z-10 flex h-full flex-1 flex-col justify-center py-10 lg:py-0 overflow-hidden bg-white/10"
                >
                    {/* Left edge fade */}
                    <div
                        className="hidden lg:block absolute -left-28 top-0 bottom-0 w-60 z-20 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to left, transparent, rgba(253,242,248,0.6) 50%, rgba(253,242,248,0.95))',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            maskImage: 'linear-gradient(to left, transparent, black)',
                            WebkitMaskImage: 'linear-gradient(to left, transparent, black)',
                        }}
                    />
                    {/* Right edge fade */}
                    <div
                        className="hidden lg:block absolute right-0 top-0 bottom-0 w-20 z-20 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to right, transparent, rgba(253,242,248,0.6) 50%, rgba(253,242,248,0.95))',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            maskImage: 'linear-gradient(to right, transparent, black)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black)',
                        }}
                    />

                    <div className="relative w-full lg:h-full overflow-visible no-scrollbar">
                        <div
                            ref={scrollTrackRef}
                            className="flex flex-col lg:flex-row items-center gap-6 px-4 py-10 lg:gap-14 lg:px-16 lg:w-max h-full"
                        >
                            {STEPS.map((step, index) => {
                                const Icon = step.icon;
                                return (
                                    <div
                                        key={step.title}
                                        className="how-it-card-mobile group relative min-h-[250px] w-full lg:h-[480px] lg:w-[440px] shrink-0 overflow-hidden rounded-[2.5rem] lg:rounded-[4rem] border border-white/20 bg-linear-to-br from-primary-600 to-primary-500 p-8 shadow-[0_30px_80px_-40px_rgba(79,70,229,0.5)] transition-all duration-500 hover:-translate-y-2 lg:p-14 flex flex-col justify-center"
                                    >
                                        <div className="absolute inset-0 z-0 select-none flex items-center justify-center opacity-10 pointer-events-none">
                                            <span className="text-[12rem] lg:text-[20rem] font-black text-white/40">{index + 1}</span>
                                        </div>

                                        <div className="relative z-10 flex h-16 w-16 lg:h-20 lg:w-20 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 text-white shadow-xl group-hover:bg-white group-hover:text-primary-600 transition-all duration-500">
                                            <Icon size={32} strokeWidth={1.5} />
                                        </div>

                                        <div className="relative z-10 mt-6 lg:mt-8">
                                            <p className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.4em] text-amber-300 mb-2">
                                                Step 0{index + 1}
                                            </p>
                                            <h3 className="text-2xl lg:text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight mb-4">
                                                {step.title}
                                            </h3>
                                            <p className="text-lg lg:text-xl font-medium text-white/85 leading-snug font-montserrat opacity-90">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom arc */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] translate-y-[1px] pointer-events-none z-30">
                <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="relative block w-full h-[60px] md:h-[120px]">
                    <path d="M0,120 C600,120 840,0 1440,0 L1440,120 L0,120 Z" fill="#f8fafc" />
                </svg>
            </div>
        </section>
    );
}