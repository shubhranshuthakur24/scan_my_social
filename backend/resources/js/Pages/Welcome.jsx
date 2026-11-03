import React, { useId, useRef, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import PublicLayout from '@/Layouts/PublicLayout';
import SocialProof from '@/Components/Landing/SocialProof';
import VideoExplainer from '@/Components/Landing/VideoExplainer';
import PainPoint from '@/Components/Landing/PainPoint';
import HowItWorks from '@/Components/Landing/HowItWorks';
import AutoDM from '@/Components/Landing/AutoDM';
import PlanComparison from '@/Components/Landing/PlanComparison';
import Testimonials from '@/Components/Landing/Testimonials';
import SetupService from '@/Components/Landing/SetupService';
import FinalCTA from '@/Components/Landing/FinalCTA';
import { Zap, Play, Plus, Minus, MessageCircle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);



const FAQ_ITEMS = [
    {
        topic: 'Product',
        q: "How does 'Outlier' detection work?",
        a: "We don't just look for high view counts. Our algorithm compares a video's performance against that specific creator's median views over the last 30 videos. If a video gets 10x more views than their usual baseline, it's flagged as an outlier framework you can use."
    },
    {
        topic: 'Platforms',
        q: "Do you support platforms other than Instagram?",
        a: "Currently, we are optimized for Instagram Reels and TikTok. YouTube Shorts support is coming in Q2 2026."
    },
    {
        topic: 'Plans',
        q: "What's the difference between the Basic and Creator plans?",
        a: "The Basic plan allows manual scanning and script generation. The Creator plan adds 'Outlier Alerts' which proactively notifies you the second a new viral framework is detected in your niche, plus priority AI processing."
    },
    {
        topic: 'Billing',
        q: "Can I cancel my subscription anytime?",
        a: "Yes, you can cancel at any time from your dashboard. You will maintain access until the end of your current billing cycle."
    }
];

const FAQ_SUPPORT_POINTS = [
    'No long onboarding. It takes minutes to start scanning.',
    'Transparent pricing with no hidden usage surprises.',
    'Built for creators who want signal, not noise.',
    'AI-generated scripts that are optimized for engagement.',
];

const HERO_SIGNAL_NODES = [
    { left: '14%', top: '26%', size: 7, delay: 0 },
    { left: '26%', top: '18%', size: 9, delay: 0.6 },
    { left: '39%', top: '31%', size: 6, delay: 1.2 },
    { left: '51%', top: '20%', size: 8, delay: 0.3 },
    { left: '63%', top: '28%', size: 7, delay: 1 },
    { left: '76%', top: '17%', size: 9, delay: 0.8 },
    { left: '84%', top: '33%', size: 6, delay: 1.4 },
    { left: '58%', top: '45%', size: 7, delay: 0.5 },
];

export default function Welcome() {
    const { reviewMode } = usePage().props;
    const [openFaqIndex, setOpenFaqIndex] = useState(null);
    const heroRef = useRef(null);
    const pricingCtaRef = useRef(null);

    const handleSmoothSectionScroll = (event, sectionId) => {
        event.preventDefault();
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    useGSAP(() => {
        const heroTitle = heroRef.current.querySelector('h1');
        const heroSub = heroRef.current.querySelector('.hero-sub');
        const heroCtas = heroRef.current.querySelectorAll('.hero-cta');
        const heroOrbs = heroRef.current.querySelectorAll('.hero-orb');
        const heroGeoGrid = heroRef.current.querySelector('.hero-geo-grid');
        const heroGeoLines = heroRef.current.querySelectorAll('.hero-geo-line');
        const heroGeoNodes = heroRef.current.querySelectorAll('.hero-geo-node');
        const heroSignalRing = heroRef.current.querySelector('.hero-signal-ring');
        const heroSignalBeam = heroRef.current.querySelector('.hero-signal-beam');
        const heroSignalNodes = heroRef.current.querySelectorAll('.hero-signal-node');
        const heroCenterMoon = heroRef.current.querySelector('.hero-center-moon');
        const heroCometField = heroRef.current.querySelector('.hero-comet-field');
        const heroRandomComets = heroRef.current.querySelectorAll('.hero-random-comet');
        const prefersReducedMotion = typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Hero Reveal
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.fromTo(heroTitle, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 0.2 })
            .fromTo(heroSub, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "-=0.6")
            .fromTo(heroCtas, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.1, duration: 0.6 }, "-=0.4");

        // Parallax Orbs
        heroOrbs.forEach((orb, i) => {
            gsap.to(orb, {
                y: i % 2 === 0 ? '-=40' : '+=40',
                x: i % 2 === 0 ? '+=20' : '-=20',
                duration: 6 + (i * 2),
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });

            gsap.to(orb, {
                y: '-=100',
                scrollTrigger: {
                    trigger: heroRef.current,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: true,
                }
            });
        });

        if (!prefersReducedMotion) {
            if (heroGeoGrid) {
                gsap.to(heroGeoGrid, {
                    x: 18,
                    y: 12,
                    duration: 18,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                });
            }

            heroGeoLines.forEach((line, index) => {
                const lineLength = line.getTotalLength();
                gsap.set(line, { strokeDasharray: lineLength, strokeDashoffset: lineLength });
                gsap.to(line, {
                    strokeDashoffset: 0,
                    duration: 2.2 + (index * 0.35),
                    ease: 'power2.inOut',
                    repeat: -1,
                    repeatDelay: 1.2,
                    yoyo: true,
                });
            });

            gsap.to(heroGeoNodes, {
                scale: 1.28,
                opacity: 1,
                duration: 1.15,
                stagger: {
                    each: 0.18,
                    repeat: -1,
                    yoyo: true,
                },
                transformOrigin: '50% 50%',
                ease: 'sine.inOut',
            });

            if (heroSignalRing) {
                gsap.to(heroSignalRing, {
                    scale: 1.06,
                    opacity: 0.9,
                    duration: 5.5,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                });
            }

            if (heroSignalBeam) {
                gsap.to(heroSignalBeam, {
                    rotation: 360,
                    duration: 34,
                    repeat: -1,
                    ease: 'none',
                    transformOrigin: '50% 50%',
                });
            }

            gsap.to(heroSignalNodes, {
                scale: 1.45,
                opacity: 1,
                duration: 1.4,
                stagger: {
                    each: 0.14,
                    repeat: -1,
                    yoyo: true,
                },
                transformOrigin: '50% 50%',
                ease: 'sine.inOut',
            });

            if (heroCenterMoon) {
                gsap.to(heroCenterMoon, {
                    xPercent: 2,
                    yPercent: -2,
                    duration: 7.5,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                });
            }

            const getCometFieldSize = () => {
                if (heroCometField) {
                    const { width, height } = heroCometField.getBoundingClientRect();
                    if (width > 0 && height > 0) {
                        return { width, height };
                    }
                }

                return {
                    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
                    height: typeof window !== 'undefined' ? window.innerHeight : 760,
                };
            };

            const randomHeroPoint = () => {
                const { width, height } = getCometFieldSize();
                const padding = 24;

                return {
                    x: gsap.utils.random(padding, Math.max(padding, width - padding)),
                    y: gsap.utils.random(padding, Math.max(padding, height - padding)),
                    width,
                    height,
                };
            };

            const launchComet = (comet) => {
                const start = randomHeroPoint();
                let end = randomHeroPoint();
                let safetyAttempts = 0;
                const minDistance = Math.max(180, Math.min(start.width, start.height) * 0.28);

                while (Math.hypot(end.x - start.x, end.y - start.y) < minDistance && safetyAttempts < 6) {
                    end = randomHeroPoint();
                    safetyAttempts += 1;
                }

                const directionAngle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
                const flightDuration = gsap.utils.random(1.7, 2.9);
                const cooldownDuration = gsap.utils.random(0.45, 1.2);

                gsap.set(comet, {
                    x: start.x,
                    y: start.y,
                    rotation: directionAngle,
                    opacity: 0,
                    scale: gsap.utils.random(0.85, 1.1),
                });

                gsap.timeline({
                    onComplete: () => launchComet(comet),
                })
                    .to(comet, { opacity: 1, duration: 0.18, ease: 'power2.out' })
                    .to(
                        comet,
                        {
                            x: end.x,
                            y: end.y,
                            duration: flightDuration,
                            ease: 'power2.inOut',
                        },
                        0,
                    )
                    .to(
                        comet,
                        {
                            opacity: 0,
                            duration: 0.24,
                            ease: 'power2.in',
                        },
                        Math.max(flightDuration - 0.22, 0.35),
                    )
                    .to({}, { duration: cooldownDuration });
            };

            heroRandomComets.forEach((comet, index) => {
                gsap.delayedCall(index * 0.55, () => launchComet(comet));
            });
        }


    }, { scope: heroRef });

    useGSAP(() => {
        if (!pricingCtaRef.current) return;

        // Pricing CTA Reveal & SVG Draw
        const ctaLines = pricingCtaRef.current.querySelectorAll('.cta-bg-line');

        gsap.fromTo(pricingCtaRef.current.children,
            { y: 30, opacity: 0 },
            {
                y: 0, opacity: 1,
                duration: 1,
                stagger: 0.1,
                scrollTrigger: {
                    trigger: pricingCtaRef.current,
                    start: 'top 80%',
                }
            }
        );

        ctaLines.forEach(line => {
            const length = line.getTotalLength();
            gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
            gsap.to(line, {
                strokeDashoffset: 0,
                duration: 2.5,
                ease: 'power2.inOut',
                scrollTrigger: {
                    trigger: pricingCtaRef.current,
                    start: 'top 70%',
                }
            });
        });
    }, { scope: pricingCtaRef });

    return (
        <>
            <Head title="AI Viral Video Analysis & Script Generation" />

            <main className="landing-page relative z-10">
                {/* ── HERO SECTION ── */}
                <section
                    ref={heroRef}
                    className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden bg-white"
                    id="hero"
                >
                    {/* Background Orbs */}
                    {/* left orb */}
                    <div
                        className="hero-orb absolute top-1/4 -left-20 w-[40rem] h-[40rem] rounded-full blur-[180px] pointer-events-none"
                        style={{ backgroundColor: 'var(--color-primary-200)', opacity: 0.2 }}
                    />
                    {/* right orb */}
                    <div
                        className="hero-orb absolute bottom-1/4 -right-20 w-[45rem] h-[45rem] rounded-full blur-[100px] pointer-events-none"
                        style={{ backgroundColor: 'var(--color-primary-100)', opacity: 0.2 }}
                    />
                    {/* center orb */}
                    <div
                        className="hero-orb hero-center-moon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] rounded-full blur-[120px] pointer-events-none"
                        style={{ backgroundColor: 'var(--color-primary-100)', opacity: 0.2 }}
                    />

                    <div
                        className="hero-geo-grid pointer-events-none absolute inset-0 z-[1] opacity-[0.20] mix-blend-multiply"
                        style={{
                            backgroundImage: 'radial-gradient(circle at center, rgba(99,102,241,0.62) 1.2px, transparent 1.2px)',
                            backgroundSize: '30px 30px',
                            maskImage: 'radial-gradient(circle at center, transparent 0 32%, black 38%)',
                            WebkitMaskImage: 'radial-gradient(circle at center, transparent 0 32%, black 38%)',
                        }}
                    />

                    <div className="hero-comet-field pointer-events-none absolute inset-0 z-[3] overflow-hidden" aria-hidden="true">
                        <div className="hero-random-comet absolute left-0 top-0 flex items-center gap-1.5 opacity-0">
                            <span className="h-[2px] w-10 rounded-full bg-gradient-to-r from-transparent via-primary-300/80 to-primary-100/30 blur-[1px]" />
                            <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)]" />
                        </div>
                        <div className="hero-random-comet absolute left-0 top-0 flex items-center gap-1.5 opacity-0">
                            <span className="h-[2px] w-7 rounded-full bg-gradient-to-r from-transparent via-sky-300/85 to-primary-100/20 blur-[1px]" />
                            <span className="h-2 w-2 rounded-full bg-sky-100 shadow-[0_0_12px_rgba(125,211,252,0.8)]" />
                        </div>
                        <div className="hero-random-comet absolute left-0 top-0 flex items-center gap-1.5 opacity-0">
                            <span className="h-[1.5px] w-8 rounded-full bg-gradient-to-r from-transparent via-violet-300/70 to-primary-100/20 blur-[1px]" />
                            <span className="h-2 w-2 rounded-full bg-violet-100 shadow-[0_0_12px_rgba(196,181,253,0.85)]" />
                        </div>
                    </div>

                    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden="true">
                        <div className="hero-signal-beam absolute left-1/2 top-[14%] h-[58%] w-[78%] -translate-x-1/2 rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,rgba(124,58,237,.1)_0deg,rgba(124,58,237,0.28)_42deg,rgba(59,130,246,0.18)_120deg,rgba(124,58,237,0)_180deg,rgba(124,58,237,0)_360deg)] blur-3xl opacity-70" />
                        <div className="hero-signal-ring absolute left-1/2 top-[18%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full border border-primary-200/50 shadow-[0_0_80px_rgba(124,58,237,0.28)]" />
                        {HERO_SIGNAL_NODES.map((node, index) => (
                            <span
                                key={index}
                                className="hero-signal-node absolute rounded-full bg-primary-500/70 shadow-[0_0_16px_rgba(99,102,241,0.45)]"
                                style={{
                                    left: node.left,
                                    top: node.top,
                                    width: `${node.size}px`,
                                    height: `${node.size}px`,
                                    animationDelay: `${node.delay}s`,
                                }}
                            />
                        ))}
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-[#F64A8A] border border-slate-100 shadow-sm transition-transform hover:scale-105">
                            <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Revolutionizing Viral Content</span>
                        </div>

                        <h1 className="text-5xl sm:text-[5rem] md:text-[6rem] font-black text-slate-900 tracking-tight mb-8">
                            Create <span className="text-primary-600"> Viral Videos</span> Instantly. <br />
                            Let <span className="text-primary-600 whitespace-nowrap"> Auto DM </span> Sell It.
                        </h1>

                        <p className="hero-sub sm:text-xl text-slate-500/80 max-w-3xl mx-auto mb-12 font-montserrat ">
                            Find viral outliers in competitor content, reverse engineer what made them explode, and turn them into scripts that convert followers, comments, and DMs into paying customers on autopilot.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href={reviewMode ? route('waitlist') : route('register')}
                                className="hero-cta group relative inline-flex h-16 items-center justify-center px-8 bg-primary-600 text-white rounded-2xl font-black text-lg sm:text-xl shadow-2xl shadow-primary-500/30 transition-all hover:-translate-y-1 hover:shadow-primary-500/40 active:scale-95"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    {reviewMode ? 'Join the Waitlist' : 'Start For Free'}
                                    <Zap size={20} className="group-hover:rotate-12 transition-transform" />
                                </span>
                            </Link>
                            <a
                                href="#how-it-works"
                                onClick={(event) => handleSmoothSectionScroll(event, 'how-it-works')}
                                className="hero-cta group inline-flex h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 text-slate-700 font-bold text-lg sm:text-xl shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/40 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                            >
                                <div className="w-10 h-10 rounded-full bg-primary-100 border border-primary-400 flex items-center justify-center group-hover:bg-primary-100 group-hover:border-primary-200 transition-colors">
                                    <Play size={16} className="text-primary-600 fill-primary-600 animate-pulse" />
                                </div>
                                See how it works
                            </a>
                        </div>
                    </div>

                    {/* Scroll Indicator */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-40">
                        <div className="w-[1px] h-12 bg-linear-to-b from-primary-500 to-transparent" />
                    </div>
                </section>



                {/* ── SOCIAL PROOF & VIDEO EXPLAINER ── */}
                <SocialProof />
                <VideoExplainer />

                {/* ── THE JOURNEY ── */}
                <PainPoint />
                <HowItWorks />


                {/* ── THE AUTOMATION & PROOF ── */}
                <AutoDM />
                <PlanComparison />
                <Testimonials />

                {/* ── CONVERSION ── */}
                <SetupService />
                <FinalCTA />

                {/* ── FAQ SECTION ── */}
                <section className="py-10 sm:py-16 bg-[#F8F7FF] relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.08),_transparent_42%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.06),_transparent_30%)]" />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                        <div className="pb-10 sm:pb-16 text-center">
                            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tightest leading-[0.95]">
                                Questions <span className="text-primary-600">Answered.</span>
                            </h2>
                        </div>
                        <div className="grid gap-8 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)] lg:items-start">
                            <div className="self-start">
                                <div className="relative overflow-hidden rounded-[2.75rem] border border-white/80 bg-white/90 p-8 sm:p-10 shadow-2xl shadow-primary-500/8 backdrop-blur-xl">
                                    <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-primary-500/10 blur-3xl" />
                                    <div className="relative">
                                        <div className="mb-6 flex items-center gap-4">
                                            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-600 shadow-sm">
                                                <MessageCircle size={26} />
                                            </div>
                                            <span className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                                                FAQ
                                            </span>
                                        </div>

                                        <p className="mt-5 text-slate-500 font-medium leading-relaxed font-montserrat">
                                            Common questions, clear answers, and the context behind the product.
                                        </p>
                                    </div>

                                    <div className="mt-8 space-y-3">
                                        {FAQ_SUPPORT_POINTS.map((point) => (
                                            <div key={point} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                                                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary-500 shrink-0" />
                                                <p className="text-sm font-medium text-slate-600 leading-relaxed font-montserrat">{point}</p>
                                            </div>
                                        ))}
                                    </div>


                                </div>
                            </div>

                            <div>
                                <div className="mb-6 flex flex-wrap gap-3">
                                    {['Product', 'Platforms', 'Plans', 'Billing'].map((topic) => (
                                        <span
                                            key={topic}
                                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 shadow-sm"
                                        >
                                            {topic}
                                        </span>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    {FAQ_ITEMS.map((item, i) => (
                                        <FaqItem
                                            key={item.q}
                                            topic={item.topic}
                                            question={item.q}
                                            answer={item.a}
                                            open={openFaqIndex === i}
                                            onToggle={() => setOpenFaqIndex((current) => (current === i ? null : i))}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

        </>
    );
}

Welcome.layout = (page) => <PublicLayout>{page}</PublicLayout>;

function FaqItem({ topic, question, answer, open, onToggle }) {
    const faqId = useId();
    const answerPanelId = `faq-answer-${faqId.replace(/:/g, '')}`;
    const contentRef = useRef(null);

    useGSAP(() => {
        gsap.to(contentRef.current, {
            height: open ? 'auto' : 0,
            opacity: open ? 1 : 0,
            duration: 0.4,
            ease: 'power3.inOut'
        });
    }, [open]);

    return (
        <div className="group bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <button
                onClick={onToggle}
                className="w-full px-6 sm:px-8 py-6 flex items-center justify-between gap-4 text-left"
                aria-expanded={open}
                aria-controls={answerPanelId}
            >
                <div className="min-w-0">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                        {topic}
                    </span>
                    <span className="mt-3 block font-black text-slate-800 text-lg sm:text-xl lg:text-[1.35rem] leading-snug pr-2">
                        {question}
                    </span>
                </div>
                <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${open ? 'bg-primary-600 text-white rotate-180' : 'bg-slate-50 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600'}`}>
                    {open ? <Minus size={18} /> : <Plus size={18} />}
                </div>
            </button>
            <div id={answerPanelId} ref={contentRef} className="overflow-hidden h-0 opacity-0">
                <div className="px-6 sm:px-8 pb-8 text-slate-500 text-base leading-relaxed border-t border-slate-50 pt-5 bg-linear-to-b from-slate-50/40 to-white">
                    {answer}
                </div>
            </div>
        </div>
    );
}
