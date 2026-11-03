import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CheckCircle2, Trophy, Zap } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { toAbsoluteRoute } from '@/Utils/routeHelper';

gsap.registerPlugin(ScrollTrigger);

export default function StoryPricing() {
    const { reviewMode } = usePage().props;
    const sectionRef = useRef(null);

    useGSAP(() => {
        const cards = sectionRef.current.querySelectorAll('.pricing-card');

        gsap.fromTo(cards,
            { y: 50, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.8,
                stagger: 0.2,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: sectionRef.current.querySelector('.pricing-grid'),
                    start: 'top 80%',
                }
            }
        );

    }, { scope: sectionRef });

    return (
        <section ref={sectionRef} className="py-24 sm:py-32 bg-slate-50 relative overflow-hidden" id="pricing">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-100/50 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16 max-w-5xl mx-auto">
                    <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
                        Simple Pricing. <span className="text-primary-600">Powerful Results.</span>
                    </h2>
                    <p className="text-lg sm:text-xl max-w-4xl mx-auto text-slate-500 font-medium font-montserrat">
                        No hidden fees. No complicated tiers. Just everything you need to grow, create, and sell   at one honest price.
                    </p>
                </div>

                <div className="pricing-grid grid lg:grid-cols-3 gap-8 items-stretch pt-8 relative">
                    {/* Background glow for Pro plan */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[80%] bg-primary-400/20 blur-3xl rounded-[10rem] pointer-events-none hidden lg:block" />

                    {/* Starter Plan */}
                    <div className="pricing-card group relative overflow-hidden bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                        {/* Light Sweep Glint */}
                        <div className="absolute inset-0 z-20 pointer-events-none -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform ease-in-out" />

                        <div className="flex-1 relative z-10">
                            <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                                🆓 Starter <span className="text-sm font-bold text-slate-400 tracking-widest uppercase ml-auto">Free Forever</span>
                            </h3>
                            <p className="text-slate-500 font-medium font-montserrat mb-8 h-12">Perfect to explore the tool</p>

                            <div className="mb-8 font-black text-[2.5rem] text-slate-900">
                                ₹0
                            </div>

                            <ul className="space-y-4 mb-8">
                                {["Competitor scanning   up to 2 accounts", "Basic outlier detection", "100 Auto DMs per month", "Viral Prompt Library access"].map((f, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                        <span className="text-slate-600 font-medium">{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Link href={toAbsoluteRoute('register')} className="relative z-10 block w-full py-4 text-center rounded-xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-200 transition-all hover:scale-[1.02] active:scale-95">
                            Get Started Free
                        </Link>
                    </div>

                    {/* Pro Plan */}
                    <div className="pricing-card group relative overflow-hidden -mt-4 mb-4 lg:-my-8 bg-slate-900 border-2 border-primary-500 rounded-3xl p-8 shadow-2xl flex flex-col transform hover:-translate-y-3 hover:shadow-[0_0_50px_rgba(99,102,241,0.3)] transition-all duration-500">
                        {/* Light Sweep Glint */}
                        <div className="absolute inset-0 z-20 pointer-events-none -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-primary-400/10 to-transparent transition-transform ease-in-out" />

                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-black uppercase tracking-widest py-1 px-4 rounded-full shadow-lg z-30 group-hover:scale-110 transition-transform">
                            Most Popular
                        </div>
                        <div className="flex-1 text-white relative z-10">
                            <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                                <Zap className="text-primary-400 fill-current group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500" /> Pro
                            </h3>
                            <p className="text-slate-400 font-medium font-montserrat mb-8 h-12">For serious creators and business owners</p>

                            <div className="mb-8 flex flex-col group-hover:scale-105 origin-left transition-transform">
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-400 text-2xl font-medium line-through decoration-slate-300 decoration-2">₹5,999</span>
                                    <span className="bg-primary-500/10 text-primary-400 text-xl font-black px-2 py-0.5 rounded-full uppercase tracking-wider">50% Off</span>
                                </div>
                                <div className="font-black text-[3rem] text-white flex items-baseline gap-1">
                                    ₹2,999 <span className="text-lg text-slate-400 font-medium">/ month</span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {[
                                    "Unlimited competitor scanning",
                                    "Full outlier tagging (up to 75x Breakout)",
                                    "Breakout pattern detection",
                                    "Full video transcription and breakdown",
                                    "Hook / Story / CTA script generator",
                                    "Unlimited Auto DMs",
                                    "Follow To Unlock feature",
                                    "All trigger types",
                                    "Priority support"
                                ].map((f, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
                                        <span className="text-slate-300 font-medium">{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Link href={toAbsoluteRoute('register')} className="relative z-10 block w-full py-4 text-center rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 hover:scale-[1.02] active:scale-95">
                            Start Pro   7 Days Free Trial
                        </Link>
                    </div>

                    {/* Setup Plan */}
                    <div className="pricing-card group relative overflow-hidden bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                        {/* Light Sweep Glint */}
                        <div className="absolute inset-0 z-20 pointer-events-none -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform ease-in-out" />

                        <div className="flex-1 relative z-10">
                            <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                                <Trophy className='text-amber-600' /> Done-For-You
                            </h3>
                            <p className="text-slate-500 font-medium font-montserrat mb-8 h-12">Our team builds everything for you</p>

                            <div className="mb-8 font-black text-2xl text-slate-900 flex items-center h-[2.5rem]">
                                Custom Pricing
                            </div>

                            <ul className="space-y-4 mb-8">
                                {["Everything in Pro", "1-on-1 consultation & strategy", "Full account setup by our team", "Custom Auto DM flows", "Competitor research done for you", "Ongoing support post-setup"].map((f, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                        <span className="text-slate-600 font-medium">{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Link href="https://cal.com/ravikant-rathor/scan-my-social" className="relative z-10 block w-full py-4 text-center rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50/50 transition-all hover:scale-[1.02] active:scale-95">
                            Book Consultation Call
                        </Link>
                    </div>

                </div>

                <div className="mt-16 text-center">
                    <p className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-white border border-slate-200 rounded-2xl sm:rounded-full text-slate-700 font-medium text-sm sm:text-base shadow-sm max-w-[92vw]">
                        <span className="flex h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
                        <span>
                            <span className="font-bold text-slate-900">2,000+ creators</span> already using <span className="font-bold text-primary-500">Scan My Social</span> to grow faster and sell automatically.
                        </span>
                    </p>
                </div>
            </div>
        </section>
    );
}
