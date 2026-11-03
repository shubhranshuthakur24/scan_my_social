import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PlaySquare, MessageCircle, Rocket, Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const STATS = [
    {
        icon: PlaySquare,
        number: "10,000+",
        value: 10000,
        suffix: "+",
        label: "Videos Analysed",
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        borderColor: "border-blue-500/20"
    },
    {
        icon: MessageCircle,
        number: "500,000+",
        value: 500000,
        suffix: "+",
        label: "Auto DMs Sent",
        color: "text-indigo-500",
        bg: "bg-indigo-500/10",
        borderColor: "border-indigo-500/20"
    },
    {
        icon: Rocket,
        number: "2,000+",
        value: 2000,
        suffix: "+",
        label: "Creators Growing",
        color: "text-fuchsia-500",
        bg: "bg-fuchsia-500/10",
        borderColor: "border-fuchsia-500/20"
    },
    {
        icon: Star,
        number: "4.9/5",
        value: 4.9,
        isFloat: true,
        suffix: "/5",
        label: "Average Rating",
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        borderColor: "border-amber-400/20"
    }
];

export default function SocialProof() {
    const sectionRef = useRef(null);

    useGSAP(() => {
        const stats = sectionRef.current.querySelectorAll('.stat-card');
        const counters = sectionRef.current.querySelectorAll('.stat-number');

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top 85%',
            }
        });

        tl.fromTo(stats,
            { y: 40, opacity: 0, scale: 0.95 },
            {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 0.8,
                stagger: 0.1,
                ease: 'back.out(1.2)'
            }
        );

        tl.addLabel("countStart");

        // Animate counter values sequentially after fade
        counters.forEach((counter, i) => {
            const finalValue = STATS[i].value;
            const isFloat = STATS[i].isFloat;
            const suffix = STATS[i].suffix;

            const countObj = { val: 0 };

            tl.to(countObj, {
                val: finalValue,
                duration: 2,
                ease: "power2.out",
                onUpdate: () => {
                    const formatted = isFloat
                        ? countObj.val.toFixed(1)
                        : Math.floor(countObj.val).toLocaleString('en-US');
                    counter.innerText = formatted + suffix;
                }
            }, "countStart");
        });

    }, { scope: sectionRef });

    return (
        <section ref={sectionRef} className="pt-20 pb-20 sm:pb-32 bg-primary-100   border-primary-100/50 overflow-hidden relative" id="social-proof">
            {/* The Bottom Arc Shape */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] translate-y-[1px] pointer-events-none">
                <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="relative block w-full h-[60px] md:h-[120px]">
                    <path
                        d="M0,0 C480,120 960,120 1440,0 L1440,120 L0,120 Z"
                        className="fill-[#FAFAFA]"
                    />
                </svg>
            </div>
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-primary-200/40 rounded-[100%] blur-[80px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                <p className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] mb-12 flex items-center justify-center gap-4">
                    <span className="w-12 h-[1px] bg-primary-200"></span>
                    Trusted by creators and business owners worldwide
                    <span className="w-12 h-[1px] bg-primary-200"></span>
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
                    {STATS.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div key={index} className="stat-card relative group p-6 sm:p-8 bg-white rounded-3xl border border-white shadow-[0_20px_50px_-20px_rgba(120,53,15,0.1)] hover:shadow-[0_30px_60px_-15px_rgba(120,53,15,0.2)] transition-all duration-500 overflow-hidden">
                                {/* Subtle internal depth */}
                                <div className="absolute inset-0 bg-linear-to-br from-white via-white to-primary-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${stat.bg} ${stat.color} ${stat.borderColor} mb-5 group-hover:scale-110 transition-transform duration-500 ease-out shadow-inner`}>
                                        <Icon strokeWidth={2.5} size={24} />
                                    </div>
                                    <span className="stat-number text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">
                                        0{stat.suffix}
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">
                                        {stat.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
