import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, PhoneCall, CreditCard, Unlock, ShieldCheck, Users, Headset } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { toAbsoluteRoute } from '@/Utils/routeHelper';

gsap.registerPlugin(ScrollTrigger);

const TRUST_SIGNALS = [
    { label: "Free plan always available", icon: Unlock },
    { label: "No credit card required to start", icon: CreditCard },
    { label: "Cancel anytime", icon: ShieldCheck },
    { label: "2,000+ creators already trust us", icon: Users },
    { label: "Setup support available", icon: Headset }
];

export default function FinalCTA() {
    const { reviewMode } = usePage().props;
    const sectionRef = useRef(null);

    useGSAP(() => {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top 80%',
            }
        });

        tl.fromTo('.final-cta-bg',
            { scale: 0.95, opacity: 0 },
            { scale: 1, opacity: 1, duration: 1, ease: 'power3.out' }
        );
        tl.fromTo('.final-cta-content > *',
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' },
            "-=0.6"
        );

        const lines = sectionRef.current.querySelectorAll('.final-bg-line');
        lines.forEach((line) => {
            const length = line.getTotalLength();
            gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
            gsap.to(line, {
                strokeDashoffset: 0,
                duration: 2.5,
                ease: 'power2.inOut',
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top 70%',
                }
            });
        });

    }, { scope: sectionRef });

    return (
        <section ref={sectionRef} className="py-24 sm:py-32 bg-white relative px-4 sm:px-6 lg:px-8" id="final-cta">
            <div className="max-w-5xl mx-auto relative">

                <div className="final-cta-bg absolute inset-0 bg-primary-600 rounded-[3rem] shadow-2xl shadow-primary-600/30 overflow-hidden">
                    {/* SVG abstract lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 1000 400" preserveAspectRatio="none">
                        <path className="final-bg-line" d="M -100 100 Q 250 50 500 200 T 1100 300" stroke="white" strokeWidth="2" fill="none" />
                        <path className="final-bg-line" d="M -100 300 Q 250 350 500 200 T 1100 100" stroke="white" strokeWidth="2" fill="none" />
                    </svg>
                    {/* Glow globes */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-400/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
                </div>

                <div className="final-cta-content relative z-10 py-16 sm:py-24 px-6 sm:px-12 text-center text-white">
                    <h2 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-8 leading-tight">
                        Everyday You Wait,  <br className="hidden lg:block" />
                        <span className="text-primary-300">Your Competitors Get Ahead.</span>
                    </h2>

                    <p className="text-lg sm:text-xl text-primary-100 font-medium max-w-3xl mx-auto mb-12 font-montserrat">
                        You now know exactly what this tool does and what it can do for your brand. The only question left is  how much longer are you going to keep guessing?
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                        <Link
                            href={reviewMode ? toAbsoluteRoute('waitlist') : toAbsoluteRoute('register')}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-600 rounded-2xl font-black text-lg transition-all hover:bg-slate-50 hover:shadow-xl hover:-translate-y-1 group"
                        >
                            Start For Free
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="https://cal.com/ravikant-rathor/scan-my-social"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-500 text-white rounded-2xl font-bold text-lg border border-primary-400/30 backdrop-blur-sm transition-all hover:bg-primary-600/40 hover:-translate-y-1"
                        >
                            <PhoneCall size={20} />
                            Book A Free Consultation Call
                        </Link>
                    </div>

                    <div className="mt-10 flex items-center justify-center gap-2 text-primary-100/80 font-medium">
                        <CreditCard size={18} className="text-amber-400" />
                        <span className="text-sm tracking-wide font-montserrat">No credit card required</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-12">
                {TRUST_SIGNALS.map((signal, idx) => {
                    const Icon = signal.icon;
                    return (
                        <div
                            key={idx}
                            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-50 hover:bg-white border-2 border-primary-200 hover:border-primary-200 rounded-full font-semibold text-sm sm:text-base text-slate-600 hover:text-primary-700 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-default group"
                        >
                            <Icon size={16} className="text-primary-500 group-hover:scale-110 transition-transform stroke-[2.5]" />
                            {signal.label}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}