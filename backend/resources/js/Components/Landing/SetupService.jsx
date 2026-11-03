import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Calendar, CheckCircle2, ArrowRight, Database, MessageCircle, BarChart, Target, Zap, Link as LinkIcon, Handshake, PhoneOutgoing, MessageCircleHeart } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { toAbsoluteRoute } from '@/Utils/routeHelper';

gsap.registerPlugin(ScrollTrigger);

const SETUP_ITEMS = [
    'Competitor tracking and scanning - fully configured for your niche',
    'Outlier detection tailored to your content goals',
    'Complete Auto DM flows - follow, comment, and DM triggers',
    'Lead magnet and free resource delivery sequences',
    'Discovery call and booking link automations',
    'Your first content strategy built around proven viral patterns'
];



export default function SetupService() {
    const sectionRef = useRef(null);

    useGSAP(() => {
        const setupContent = sectionRef.current?.querySelector('.setup-content');
        const setupItems = sectionRef.current?.querySelectorAll('.setup-item') ?? [];
        const setupPaths = sectionRef.current?.querySelectorAll('.setup-path') ?? [];
        const setupNodeCore = sectionRef.current?.querySelector('.setup-node-core');
        const setupNodes = sectionRef.current?.querySelectorAll('.setup-node') ?? [];

        if (!sectionRef.current || !setupContent) {
            return;
        }

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top 75%',
            }
        });

        tl.fromTo(setupContent, { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });

        if (setupItems.length > 0) {
            tl.fromTo(setupItems,
                { x: 30, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' },
                '-=0.4'
            );
        }



    }, { scope: sectionRef });

    return (
        <section ref={sectionRef} className="py-24 sm:py-32 bg-slate-50 text-slate-900 relative overflow-visible" id="setup-service">
            {/* The Arc Shape */}
            <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] translate-y-[-99%] pointer-events-none">
                <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="relative block w-[100%] h-[60px] md:h-[120px]">
                    <path
                        d="M0,120 C480,0 960,0 1440,120 L1440,120 L0,120 Z"
                        className="fill-slate-50"
                    />
                </svg>
            </div>

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[420px] h-[420px] rounded-full bg-primary-400/5 blur-[120px]" />
                <div className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full bg-primary-400/5 blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-16 items-center">

                    <div className="setup-content space-y-8">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-primary-500/30 bg-primary-500/10 text-[11px] uppercase tracking-[0.28em] text-primary-700">
                            <span className="h-2 w-2 rounded-full bg-primary-500 shadow-[0_0_12px_rgba(139,92,246,0.35)]" />
                            Setup Done-With-You
                        </div>

                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight text-slate-900">
                            Not Sure Where To Start?
                            <span className="block text-primary-700">Let Our Experts Help You.</span>
                        </h2>

                        <p className="text-lg sm:text-xl text-slate-600  leading-relaxed font-montserrat">
                            Skip the learning curve entirely. Book a free consultation call with our team. We will understand your goals,
                            map out your entire setup, and show you exactly how we can build it all for you
                            from competitor tracking to a fully automated Auto DM system personalised for your brand.
                        </p>
                        {/* 3 small cards with icon and title and description */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="flex flex-col items-center text-center rounded-2xl border border-primary-50 bg-fuchsia-50 p-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
                                <Handshake className="w-6 h-6 text-primary-600" />
                                <p className="mt-3 text-lg font-semibold text-slate-900">Done With You Service (D-W-Y)</p>
                            </div>
                            <div className="flex flex-col items-center text-center rounded-2xl border border-slate-200 bg-amber-50 p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
                                <PhoneOutgoing className="w-6 h-6 text-amber-600" />
                                <p className="mt-3 text-lg font-semibold text-slate-900">Strategy & Review (1-On-1 Call)</p>
                            </div>
                            <div className="flex flex-col items-center text-center rounded-2xl border border-slate-200 bg-emerald-50 p-6 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
                                <MessageCircle className="w-6 h-6 text-emerald-600" />
                                <p className="mt-3 text-lg font-semibold text-slate-900">Exclusive WhatsApp Group Support</p>

                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <Link
                                href="https://cal.com/ravikant-rathor/scan-my-social"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-500 text-white rounded-xl font-bold text-lg hover:bg-primary-600 transition-all hover:shadow-lg hover:-translate-y-1 group"
                            >
                                <Calendar className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                Book Your Free Consultation
                                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">
                                The consultation call is free
                                <span className="block text-accent-500 font-bold">* Limited spots available each week.</span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:block relative">
                        <div className="setup-expert-img relative h-[650px] w-full overflow-hidden">
                            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                                <div className="absolute inset-x-8 top-14 h-[520px] bg-[linear-gradient(to_right,rgba(124,58,237,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(124,58,237,0.12)_1px,transparent_1px)] bg-[size:44px_44px] opacity-35 [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_78%,transparent)]" />
                                <div className="absolute right-[3%] top-[8%] h-[540px] w-[410px] -rotate-3 rounded-[3rem] border border-primary-200/70 bg-linear-to-br from-primary-100/75 via-white/60 to-primary-50/20 shadow-[0_35px_90px_-60px_rgba(124,58,237,0.65)]" />
                                <div className="absolute right-[19%] top-[17%] h-[360px] w-[280px] rotate-6 rounded-[2.5rem] border border-primary-300/55 bg-white/15" />
                                <div className="absolute left-[5%] top-[32%] h-[190px] w-[190px] -rotate-12 rounded-[2rem] border border-primary-200/60 bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(255,255,255,0.18))]" />
                                <div className="absolute right-[1%] bottom-[14%] h-20 w-64 -rotate-6 rounded-full border border-primary-200/70 bg-white/60 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.5)]" />
                            </div>
                            {/* The Expert Image */}
                            <img
                                src="/images/expert.png"
                                alt="Our Experts"
                                className="relative z-10 w-full h-full object-cover object-center"
                            />
                        </div>
                    </div>

                </div>

                <div className="mt-16 sm:mt-20">
                    <div className="relative rounded-[32px] border border-slate-200 bg-white/90 p-6 sm:p-10 overflow-hidden shadow-[0_30px_70px_-50px_rgba(15,23,42,0.35)]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_60%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a10_1px,transparent_1px),linear-gradient(to_bottom,#0f172a10_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />

                        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <h3 className="text-lg sm:text-3xl font-bold text-slate-900">What we will <span className="text-primary-700">Set-Up For You</span></h3>
                        </div>

                        <ul className="relative mt-6 grid gap-4 sm:grid-cols-2">
                            {SETUP_ITEMS.map((item, idx) => (
                                <li key={idx} className="setup-item flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.25)]">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary-500/40 bg-primary-500/10 text-primary-600">
                                        {idx + 1}
                                    </span>
                                    <span className="text-slate-700 text-lg font-medium leading-relaxed font-montserrat">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="text-xs text-accent-500 uppercase tracking-wider">
                            * Free consultation.This is a done-for-you service.Handled by our team. Built for your brand. Ready to run.
                            <span className="block text-accent-500 font-bold">* Limited spots available each week.</span>
                        </div>
                        <Link
                            href="https://cal.com/ravikant-rathor/scan-my-social"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-500 text-white rounded-xl font-bold text-lg hover:bg-primary-600 transition-all hover:shadow-lg hover:-translate-y-1 group"
                        >
                            <Calendar className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            Book Your Free Consultation
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
