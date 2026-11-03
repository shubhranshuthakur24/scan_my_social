import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function VideoExplainer() {
    const sectionRef = useRef(null);
    const videoContainerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useGSAP(
        () => {
            const title = sectionRef.current?.querySelector('.explainer-title');
            const sub = sectionRef.current?.querySelector('.explainer-sub');
            const badge = sectionRef.current?.querySelector('.explainer-kicker');
            const orb = sectionRef.current?.querySelector('.explainer-orb');
            const pulseRing = sectionRef.current?.querySelector('.play-pulse-ring');
            const sheen = sectionRef.current?.querySelector('.explainer-sheen');
            const prefersReducedMotion =
                typeof window !== 'undefined'
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (badge && title && sub && sectionRef.current) {
                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 78%',
                    },
                });

                tl.fromTo(badge, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' })
                    .fromTo(title, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, ease: 'power3.out' }, '-=0.35')
                    .fromTo(sub, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out' }, '-=0.5');
            }

            if (videoContainerRef.current) {
                gsap.fromTo(
                    videoContainerRef.current,
                    { scale: 0.9, opacity: 0.45, y: 70, rotateX: -6 },
                    {
                        scale: 1,
                        opacity: 1,
                        y: 0,
                        rotateX: 0,
                        duration: 1.2,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: videoContainerRef.current,
                            start: 'top 86%',
                        },
                    },
                );
            }

            if (!prefersReducedMotion) {
                if (orb) {
                    gsap.to(orb, {
                        xPercent: 4,
                        yPercent: -5,
                        duration: 6,
                        ease: 'sine.inOut',
                        yoyo: true,
                        repeat: -1,
                    });
                }

                if (pulseRing) {
                    gsap.to(pulseRing, {
                        scale: 1.22,
                        opacity: 0,
                        duration: 1.6,
                        ease: 'power1.out',
                        repeat: -1,
                    });
                }

                if (sheen) {
                    gsap.to(sheen, {
                        xPercent: 130,
                        duration: 2.8,
                        ease: 'power2.inOut',
                        repeat: -1,
                        repeatDelay: 1.4,
                    });
                }

                if (videoContainerRef.current && sectionRef.current) {
                    gsap.to(videoContainerRef.current, {
                        yPercent: -3,
                        scrollTrigger: {
                            trigger: sectionRef.current,
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: true,
                        },
                    });
                }
            }

            if (videoContainerRef.current) {
                ScrollTrigger.create({
                    trigger: videoContainerRef.current,
                    start: 'top bottom',
                    end: 'bottom top',
                    onLeave: () => setIsPlaying(false),
                    onLeaveBack: () => setIsPlaying(false),
                });
            }
        },
        { scope: sectionRef },
    );

    return (
        <section ref={sectionRef} className="py-24 bg-[#FAFAFA] relative overflow-hidden" id="explainer">
            <div className="explainer-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] rounded-full bg-primary-50/50 blur-[100px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <span className="explainer-kicker inline-flex items-center rounded-full border border-primary-200 bg-white/90 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-700 mb-6 shadow-sm">
                        Product Walkthrough
                    </span>
                    <h2 className="explainer-title text-5xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
                        See Scan My Social <span className="text-primary-600">In Action</span>
                    </h2>
                    <p className="explainer-sub text-lg sm:text-xl text-slate-500 font-medium font-montserrat">
                        A quick tour of the dashboard - how we find viral content, break it down, and connect Auto DM to turn engagement into leads.
                    </p>
                </div>

                <div
                    ref={videoContainerRef}
                    className="relative max-w-6xl mx-auto aspect-video rounded-3xl overflow-hidden shadow-2xl shadow-primary-500/20 border border-white/50 bg-slate-900 group [transform-style:preserve-3d]"
                >
                    <div className="explainer-sheen absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-20" />

                    {!isPlaying ? (
                        <button
                            type="button"
                            className="absolute inset-0 cursor-pointer flex items-center justify-center bg-slate-800"
                            onClick={() => setIsPlaying(true)}
                            aria-label="Play product explainer video"
                        >
                            <video
                                src="/scanmysocial-product-demo.mp4"
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                                muted
                                playsInline
                                preload="metadata"
                            />
                            <div className="absolute inset-0 bg-slate-900/35 group-hover:bg-slate-900/10 transition-colors duration-500" />

                            <span className="play-pulse-ring absolute z-10 w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-primary-300/70" />
                            <span className="relative z-10 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary-600/90 group-hover:border-primary-400">
                                <Play className="w-10 h-10 sm:w-14 sm:h-14 text-white ml-2" fill="currentColor" />
                            </span>

                            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/25 bg-black/35 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
                                Watch 90-second walkthrough
                            </span>
                        </button>
                    ) : (
                        <video
                            src="/scanmysocial-product-demo.mp4"
                            controls
                            autoPlay
                            playsInline
                            className="absolute inset-0 w-full h-full"
                        />
                    )}
                </div>
            </div>
        </section>
    );
}

