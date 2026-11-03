import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, X, ArrowRight, Sparkles } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { toAbsoluteRoute } from '@/Utils/routeHelper';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
    { name: "Auto DM Delivery", mc: true, sc: false, vz: true },
    { name: "Comment & Story Replies", mc: true, sc: false, vz: true },
    { name: "Viral Outlier Detection", mc: false, sc: true, vz: true },
    { name: "Competitor Tracking", mc: false, sc: true, vz: true },
    { name: "1-Click Transcripts", mc: false, sc: true, vz: true },
    { name: "Hook / Story Breakdowns", mc: false, sc: true, vz: true },
    { name: "AI Script Generator", mc: false, sc: true, vz: true },
    { name: "Follow-to-Unlock Funnels", mc: false, sc: false, vz: true },
    { name: "Tools to Manage", mcText: "2", scText: "2", vzText: "1" },
    { name: "Monthly Cost", mcText: "$$$", scText: "$$$", vzText: "Best Value" }
];

export default function PlanComparison() {
    const { reviewMode } = usePage().props;
    const sectionRef = useRef(null);

    useGSAP(() => {
        const mm = gsap.matchMedia();

        mm.add('(min-width: 1024px)', () => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current.querySelector('.comp-container'),
                    start: 'top 75%',
                }
            });

            tl.fromTo('.comp-header', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" });

            tl.fromTo('.comp-row',
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out" },
                "-=0.4"
            );

            tl.fromTo('.vz-highlight',
                { scale: 0.95, opacity: 0, y: 10 },
                {
                    scale: 1,
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: "elastic.out(1, 0.8)"
                },
                "-=0.5"
            );

            const checks = gsap.utils.toArray('.vz-check');
            tl.fromTo(checks,
                { scale: 0, opacity: 0, rotation: -45 },
                { scale: 1, opacity: 1, rotation: 0, stagger: 0.05, duration: 0.5, ease: 'back.out(2)' },
                "-=0.4"
            );
        });

        mm.add('(max-width: 1023px)', () => {
            // Reveal everything as a single cinematic block
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: '.comp-container',
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            });

            tl.fromTo('.comp-header',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
            );

            tl.fromTo('.comp-table-card',
                { y: 40, opacity: 0, scale: 0.96 },
                {
                    y: 0, opacity: 1, scale: 1,
                    duration: 1,
                    ease: 'power4.out'
                },
                "-=0.5"
            );

            tl.fromTo('.vz-highlight-mobile',
                { opacity: 0, scale: 0.9 },
                { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' },
                "-=0.6"
            );
        });

        return () => mm.revert();
    }, { scope: sectionRef });

    return (
        <section ref={sectionRef} className="pt-24 pb-32 sm:pt-32 sm:pb-48 bg-slate-50 relative overflow-visible" id="comparison">
            {/* The Asymmetrical Bottom Arc */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] translate-y-[1px] pointer-events-none">
                <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="relative block w-full h-[60px] md:h-[120px]">
                    <path
                        d="M0,120 C600,120 840,0 1440,0 L1440,120 L0,120 Z"
                        className="fill-white"
                    />
                </svg>
            </div>

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary-100/50 rounded-full blur-[100px] opacity-60 pointer-events-none" />
                <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-fuchsia-100/50 rounded-full blur-[100px] opacity-60 pointer-events-none" />
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 comp-container">
                <div className="text-center mb-20 max-w-3xl mx-auto comp-header">
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-bold text-slate-500 tracking-widest uppercase mb-6">
                        <Sparkles className="w-4 h-4 mr-2 text-primary-500" /> The Ultimate Stack
                    </div>
                    <h2 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight mb-8 leading-tight">
                        Why Pay More <span className="text-primary-600">For Less?</span>
                    </h2>
                    <p className="text-lg sm:text-xl text-slate-600 font-medium font-montserrat leading-relaxed">
                        ManyChat charges a premium for Auto DMs. Sandcastle charges even more for viral research. <strong className="text-primary-600 font-bold">Scan My Social does both</strong>   at a fraction of the cost.
                    </p>
                </div>

                <div className="comp-table-card relative max-w-5xl mx-auto rounded-3xl bg-white border border-slate-200/60 shadow-xl shadow-slate-200/50 h-auto overflow-visible">

                    {/* The glowing highlight column backing for Scan My Social (Desktop) */}
                    <div className="vz-highlight absolute top-[-16px] bottom-[-16px] right-0 w-[28%] sm:w-[25%] bg-linear-to-b from-primary-400 to-primary-600 rounded-[2rem] shadow-2xl shadow-primary-500/20 hidden sm:block z-0" />

                    <div className="relative z-10">
                        {/* Header Row */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 border-b border-slate-100">
                            <div className="p-6 hidden sm:block"></div>

                            <div className="p-4 sm:p-6 text-center flex flex-col justify-end pb-4">
                                <span className="text-xs sm:text-lg font-black text-slate-700 uppercase tracking-widest">ManyChat</span>
                            </div>

                            <div className="p-4 sm:p-6 text-center flex flex-col justify-end pb-4">
                                <span className="text-xs sm:text-lg font-black text-slate-700 uppercase tracking-widest">Sandcastle</span>
                            </div>

                            <div className="p-4 sm:p-6 text-center relative flex flex-col justify-end pb-4 min-h-[100px] vz-highlight-mobile bg-linear-to-b from-primary-600 to-fuchsia-600 sm:bg-none rounded-tr-2xl sm:rounded-none">
                                <span className="text-sm sm:text-lg font-black text-white uppercase tracking-widest z-20">Scan My Social</span>
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-white text-[9px] sm:text-[10px] uppercase font-bold py-1 px-3 rounded-full tracking-widest shadow-md z-30 whitespace-nowrap">
                                    Your Choice
                                </div>
                            </div>
                        </div>

                        {/* Feature Rows */}
                        <div className="flex flex-col">
                            {FEATURES.map((feat, index) => {
                                const isLast = index === FEATURES.length - 1;
                                return (
                                    <div key={index} className={`comp-row grid grid-cols-3 sm:grid-cols-4 items-stretch group relative ${!isLast ? 'border-b border-slate-200' : ''}`}>

                                        {/* Hover state for normal rows (Desktop) */}
                                        <div className="absolute left-0 top-0 bottom-0 w-[75%] bg-slate-50/70 opacity-0 group-hover:opacity-80 group-hover:bg-slate-200 group-hover:rounded-none transition-opacity rounded-xl pointer-events-none hidden sm:block z-0" />

                                        {/* Name */}
                                        <div className="p-2 px-5 sm:p-5 col-span-3 sm:col-span-1 flex items-center bg-slate-50/50 sm:bg-transparent relative z-10 border-b border-slate-100 sm:border-0">
                                            <span className="text-slate-700 text-[13px] sm:text-sm font-semibold font-montserrat">{feat.name}</span>
                                        </div>

                                        {/* ManyChat */}
                                        <div className="p-4 sm:p-5 text-center flex justify-center items-center relative z-10">
                                            {feat.mcText ? (
                                                <span className="font-bold text-slate-500 text-xs sm:text-sm">{feat.mcText}</span>
                                            ) : (
                                                feat.mc ? <Check className="w-5 h-5 text-slate-400 stroke-[3]" /> : <X className="w-5 h-5 text-accent-400" />
                                            )}
                                        </div>

                                        {/* Sandcastle */}
                                        <div className="p-4 sm:p-5 text-center flex justify-center items-center relative z-10">
                                            {feat.scText ? (
                                                <span className="font-bold text-slate-500 text-xs sm:text-sm">{feat.scText}</span>
                                            ) : (
                                                feat.sc ? <Check className="w-5 h-5 text-slate-400 stroke-[3]" /> : <X className="w-5 h-5 text-accent-400" />
                                            )}
                                        </div>

                                        {/* Scan My Social */}
                                        <div className={`p-4 sm:p-5 text-center font-montserrat relative flex justify-center items-center z-20 bg-linear-to-b from-primary-600 to-primary-500 sm:bg-none ${isLast ? 'rounded-br-2xl sm:rounded-none' : ''}`}>
                                            {!isLast && <div className="absolute bottom-0 inset-x-6 h-px bg-white/10 hidden sm:block" />}
                                            {feat.vzText ? (
                                                <span className="vz-check  text-lime-500 bg-white text-sm sm:text-sm tracking-wide whitespace-nowrap px-3 py-1 rounded-full border border-white/20 shadow-sm">{feat.vzText}</span>
                                            ) : (
                                                feat.vz ? <Check className="vz-check w-5 h-5 sm:w-6 sm:h-6 text-lime-500 stroke-[4] drop-shadow-md" /> : <X className="vz-check w-4 h-4 text-accent-400" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="mt-12 max-w-4xl mx-auto comp-row relative z-20">
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 p-8 sm:p-12 shadow-2xl shadow-slate-200/50">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                            <div className="space-y-6">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">The "Old Way" Stack</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 transition-all hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-black text-[10px]">MC</div>
                                            <span className="text-slate-600 font-bold text-sm">ManyChat (Pro)</span>
                                        </div>
                                        <span className="text-slate-900 font-black">$17/mo</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 transition-all hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 font-black text-[10px]">SC</div>
                                            <span className="text-slate-600 font-bold text-sm">Sandcastle</span>
                                        </div>
                                        <span className="text-slate-900 font-black">$49/mo</span>
                                    </div>
                                    <div className="flex justify-between items-center p-5 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-900/20">
                                        <span className="font-bold text-sm">Total Monthly Overhead</span>
                                        <span className="font-black text-2xl text-rose-400">$66/mo</span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 bg-primary-500 rounded-[2rem] blur-2xl opacity-10 animate-pulse" />
                                <div className="relative p-8 bg-linear-to-br from-primary-600 to-fuchsia-600 rounded-[2rem] text-white text-center border border-white/10 shadow-xl overflow-hidden group">
                                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />

                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-primary-100">The Scan My Social Way</h4>
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <span className="text-5xl font-black tracking-tighter">$10/mo</span>
                                    </div>
                                    <p className="text-primary-100/80 text-sm font-medium leading-relaxed px-4">
                                        Everything built-in. One login, one subscription, zero friction.
                                    </p>

                                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest">
                                        <Check className="w-3 h-3 text-lime-400" /> Save $600+ Per Year
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center comp-row relative z-20">
                    <Link
                        href={reviewMode ? toAbsoluteRoute('waitlist') : toAbsoluteRoute('register')}
                        className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-primary-500 text-white rounded-2xl font-black text-lg hover:bg-primary-500 transition-all hover:shadow-xl hover:-translate-y-1 group"
                    >
                        Start Your Free Trial
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
