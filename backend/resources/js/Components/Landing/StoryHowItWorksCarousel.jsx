import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link, usePage } from '@inertiajs/react';
import { toAbsoluteRoute } from '@/Utils/routeHelper';
import { Target, Search, Sparkles, BookOpen, PenTool, MessageSquarePlus, DollarSign, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const MOCKUP_IMG = '/images/dashboard-mockup-1.png';

const STEPS = [
    {
        title: 'Add Your Competitors',
        desc: 'Tell us who to watch. We do the rest.',
        icon: Target,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        image: MOCKUP_IMG,
    },
    {
        title: 'We Scan Everything',
        desc: 'Every video they ever posted, analyzed instantly.',
        icon: Search,
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10',
        image: MOCKUP_IMG,
    },
    {
        title: 'Find The Outliers',
        desc: 'See exactly which videos exploded and why.',
        icon: Sparkles,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
        image: MOCKUP_IMG,
    },
    {
        title: 'Reverse Engineer The Winner',
        desc: 'Break it down - hook, story, CTA - all decoded.',
        icon: BookOpen,
        color: 'text-fuchsia-500',
        bg: 'bg-fuchsia-500/10',
        image: MOCKUP_IMG,
    },
    {
        title: 'Recreate It For Your Brand',
        desc: 'Turn their winning formula into your next viral video.',
        icon: PenTool,
        color: 'text-pink-500',
        bg: 'bg-pink-500/10',
        image: MOCKUP_IMG,
    },
    {
        title: 'Turn Engagement Into Conversations',
        desc: 'Every follow, comment, and DM now triggers the right reply automatically.',
        icon: MessageSquarePlus,
        color: 'text-rose-500',
        bg: 'bg-rose-500/10',
        image: MOCKUP_IMG,
    },
    {
        title: 'Watch Revenue Come In',
        desc: 'Your content runs. Your pipeline fills. You grow.',
        icon: DollarSign,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        image: MOCKUP_IMG,
    },
];

export default function StoryHowItWorksCarousel() {
    const { reviewMode } = usePage().props;
    const sectionRef = useRef(null);
    const lastActiveRef = useRef(0);
    const [activeIndex, setActiveIndex] = useState(0);

    const anglePerItem = 360 / STEPS.length;
    const maxRotation = anglePerItem * (STEPS.length - 1);

    useGSAP(
        () => {
            const mm = gsap.matchMedia();
            const heading = sectionRef.current?.querySelector('.carousel-heading');
            const orb = sectionRef.current?.querySelector('.carousel-orb');
            const prefersReducedMotion =
                typeof window !== 'undefined'
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (heading && sectionRef.current) {
                gsap.fromTo(
                    heading,
                    { y: 28, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.9,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: 'top 75%',
                        },
                    },
                );
            }

            if (prefersReducedMotion) {
                gsap.set('.carousel-item', { opacity: 1, scale: 1 });

                return undefined;
            }

            if (orb) {
                gsap.to(orb, {
                    yPercent: -8,
                    duration: 5,
                    ease: 'sine.inOut',
                    repeat: -1,
                    yoyo: true,
                });
            }

            mm.add('(min-width: 1024px)', () => {
                const wheel = sectionRef.current?.querySelector('.carousel-wheel');
                const progressBar = sectionRef.current?.querySelector('.carousel-progress');
                const items = gsap.utils.toArray('.carousel-item');
                const minProgress = 1 / STEPS.length;

                if (!wheel || !progressBar || items.length === 0) {
                    return;
                }

                gsap.set(progressBar, {
                    scaleX: minProgress,
                    transformOrigin: 'left center',
                });

                gsap.to(wheel, {
                    y: -14,
                    duration: 3.2,
                    ease: 'sine.inOut',
                    repeat: -1,
                    yoyo: true,
                });

                gsap.to(wheel, {
                    rotationX: maxRotation,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        pin: true,
                        scrub: 0.85,
                        start: 'top top',
                        end: '+=3000',
                        onUpdate: (self) => {
                            const index = Math.round(self.progress * (STEPS.length - 1));
                            const progress = Math.max(self.progress, minProgress);

                            gsap.set(progressBar, { scaleX: progress });

                            if (index === lastActiveRef.current) {
                                return;
                            }

                            const previousIndex = lastActiveRef.current;

                            lastActiveRef.current = index;
                            setActiveIndex(index);

                            if (items[previousIndex]) {
                                gsap.to(items[previousIndex], {
                                    opacity: 0.01,
                                    scale: 0.88,
                                    filter: 'saturate(0.75) blur(1.5px)',
                                    duration: 0.28,
                                    overwrite: 'auto',
                                });
                            }

                            if (items[index]) {
                                gsap.to(items[index], {
                                    opacity: 1,
                                    scale: 1.16,
                                    filter: 'saturate(1) blur(0px)',
                                    duration: 0.28,
                                    overwrite: 'auto',
                                });
                            }
                        },
                    },
                });
            });

            mm.add('(max-width: 1023px)', () => {
                gsap.utils.toArray('.mobile-step').forEach((step, index) => {
                    gsap.fromTo(
                        step,
                        { opacity: 0, y: 44, scale: 0.95 },
                        {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            duration: 0.7,
                            ease: 'power2.out',
                            delay: index * 0.05,
                            scrollTrigger: {
                                trigger: step,
                                start: 'top 86%',
                            },
                        },
                    );
                });
            });

            return () => {
                mm.revert();
            };
        },
        { scope: sectionRef },
    );

    const isFinalStep = activeIndex === STEPS.length - 1;

    return (
        <section
            ref={sectionRef}
            className="bg-[#0B0F19] text-white relative overflow-hidden border-t border-slate-800"
            id="how-it-works-carousel"
        >
            <div className="carousel-orb absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-900/10 via-[#0B0F19] to-[#0B0F19] pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-primary-900/20 to-transparent pointer-events-none mix-blend-screen" />

            <div className="hidden lg:flex h-screen items-center relative z-10 max-w-7xl mx-auto px-8 py-24">
                <div className="w-[40%] flex flex-col justify-center relative z-20">
                    <h2 className="carousel-heading text-7xl font-black mb-8 leading-tight">
                        How It <span className="text-primary-400">Works</span>
                    </h2>

                    <div className="relative min-h-[20rem]">
                        {STEPS.map((step, index) => {
                            const isActive = index === activeIndex;
                            const Icon = step.icon;

                            return (
                                <div
                                    key={index}
                                    className={`absolute top-0 left-0 w-full transition-all duration-500 transform ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
                                >
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${step.bg} ${step.color} shadow-lg border border-slate-700/50`}>
                                            <Icon size={24} />
                                        </div>
                                        <span className="text-white font-bold tracking-widest uppercase text-sm">Step 0{index + 1}</span>
                                    </div>
                                    <h3 className="text-5xl font-black text-white mb-4 leading-tight">{step.title}</h3>
                                    <p className="text-xl text-white font-medium font-montserrat">{step.desc}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-12 w-[360px] max-w-full">
                        <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">

                            <span>{String(activeIndex + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-800/80 overflow-hidden">
                            <div
                                className="carousel-progress h-full w-full bg-gradient-to-r from-primary-500 via-fuchsia-500 to-primary-300"
                                style={{ transform: `scaleX(${1 / STEPS.length})`, transformOrigin: 'left center' }}
                            />
                        </div>
                    </div>

                    <div
                        className={`mt-8 transition-opacity duration-500 ${isFinalStep ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                        aria-hidden={!isFinalStep}
                    >
                        <Link
                            href={reviewMode ? toAbsoluteRoute('waitlist') : toAbsoluteRoute('register')}
                            tabIndex={isFinalStep ? 0 : -1}
                            className="inline-flex items-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-500 transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:-translate-y-1"
                        >
                            {reviewMode ? 'Join the Waitlist' : 'Deploy This Pipeline'}
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                <div className="w-[60%] h-[600px] flex items-center justify-center relative perspective-[1500px]">
                    <div className="carousel-wheel relative w-[400px] h-[280px] [transform-style:preserve-3d]">
                        {STEPS.map((step, index) => {
                            const angle = index * anglePerItem;

                            return (
                                <div
                                    key={index}
                                    className="carousel-item absolute inset-0 bg-[#141A28] rounded-[2rem] border border-slate-700 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden"
                                    style={{
                                        transform: `rotateX(${-angle}deg) translateZ(480px) scale(${index === 0 ? 1.16 : 0.88})`,
                                        opacity: index === 0 ? 1 : 0.08,
                                        filter: index === 0 ? 'saturate(1)' : 'saturate(0.75) blur(1.5px)',
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 pointer-events-none" />
                                    <div className="px-6 py-4 border-b border-slate-800 bg-[#0B0F19]/80 flex justify-between items-center z-20 relative">
                                        <span className="text-sm font-bold text-white uppercase tracking-widest">{step.title}</span>
                                        <span className="text-primary-300 text-xl">0{index + 1}</span>
                                    </div>
                                    <img src={step.image} className="w-full h-full object-cover p-2 rounded-b-[2rem]" alt={step.title} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="lg:hidden px-4 py-24 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl sm:text-5xl font-black mb-4">
                        How It <span className="text-primary-400">Works</span>
                    </h2>
                </div>
                <div className="space-y-10">
                    {STEPS.map((step, index) => {
                        const Icon = step.icon;

                        return (
                            <div key={index} className="mobile-step p-6 rounded-3xl bg-[#141A28] border border-slate-700 shadow-xl relative overflow-hidden">
                                <div className="absolute top-4 right-4 text-4xl sm:text-5xl font-black text-slate-200 opacity-40 z-0 pointer-events-none">
                                    0{index + 1}
                                </div>
                                <div className="relative z-10">
                                    <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${step.bg} ${step.color} shadow-lg border border-slate-700/50`}>
                                        <Icon size={24} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{step.title}</h3>
                                    <p className="text-slate-200 mb-6">{step.desc}</p>
                                    <div className="rounded-xl overflow-hidden border border-slate-700 aspect-video">
                                        <img src={step.image} className="w-full h-full object-cover" alt={step.title} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
