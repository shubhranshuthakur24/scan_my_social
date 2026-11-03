import React, { useState, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { toAbsoluteRoute } from '@/Utils/routeHelper';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import GSAPLayout from '@/Layouts/GSAPLayout';
import PublicNavbar from '@/Components/PublicNavbar';
import PublicFooter from '@/Components/PublicFooter';
import PricingTiers from '@/Components/PricingTiers';
import PricingBanner from '@/Components/PricingBanner';
import { useToast } from '@/Contexts/ToastContext';
import { Check, ArrowRight, ChevronDown } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';

gsap.registerPlugin(ScrollTrigger);

const PAYMENT_FREQUENCIES = ['monthly', 'yearly'];

const FEATURE_CATEGORIES = [
    {
        label: 'TRACKING & ANALYTICS',
        features: [
            { name: 'Platform access', values: ['1 platform', 'All platform access', 'All platform access', 'Custom / enterprise setup'] },
            { name: 'Creators tracked', values: ['Up to 10', 'Up to 40', '100', 'Custom limits'] },
            { name: 'Basic engagement metrics', values: [true, true, true, true] },
            { name: 'Weekly growth insights', values: [true, true, true, true] },
            { name: 'Daily insight dashboard', values: [false, true, true, true] },
            { name: 'Advanced performance metrics + breakout alerts', values: [false, true, true, true] },
            { name: 'AI hook / script copilot', values: [false, false, true, 'Custom'] },
            { name: 'Outlier detection and opportunity scoring', values: [false, false, true, 'Custom'] },
            { name: 'Campaign attribution (DM click to lead/sale)', values: [false, false, true, 'Custom'] },
            { name: 'CSV exports', values: [false, true, true, 'Custom reporting / BI exports'] },
        ],
    },
    {
        label: 'AUTOMATION',
        features: [
            { name: 'AutoDM active workflows', values: ['Up to 10', 'Unlimited', 'Unlimited', 'High-volume infrastructure'] },
            { name: 'Comment-to-DM + keyword triggers', values: [true, true, true, true] },
            { name: 'Story reply + follow-up automation', values: [false, true, true, true] },
            { name: 'Ask to Follow (Follow-to-Unlock)', values: [false, true, true, true] },
            { name: 'Lead capture + email collection', values: [false, true, true, true] },
            { name: 'A/B testing for automation flows', values: [false, false, true, true] },
            { name: 'Rerun automation on old comments/messages', values: [false, false, true, true] },
        ],
    },
    {
        label: 'TEAM, ACCOUNTS & ADMIN',
        features: [
            { name: 'Team seats', values: [false, false, false, 'Upto 5'] },
            { name: 'Instagram account connections', values: ['1', 'Up to 2', 'Up to 5', 'Custom'] },
        ],
    },
    {
        label: 'SUPPORT & ONBOARDING',
        features: [
            { name: 'Email support', values: [true, true, true, true] },
            { name: 'Priority chat support', values: [false, true, true, true] },
            { name: 'Priority onboarding (DFY) + SLA', values: [false, false, true, true] },
            { name: 'Dedicated success manager', values: [false, false, false, true] },
            { name: 'Migration + white-glove onboarding', values: [false, false, false, true] },
            { name: 'Security + compliance controls', values: [false, false, false, true] },
            { name: 'Priority escalation support', values: [false, false, false, true] },
        ],
    },
];

const REVIEW_MATRIX_STREAMS = [
    { id: 1, left: '4%', delay: 0, density: 16, duration: 34 },
    { id: 2, left: '10%', delay: 1.3, density: 15, duration: 38 },
    { id: 3, left: '16%', delay: 0.6, density: 17, duration: 36 },
    { id: 4, left: '22%', delay: 2.1, density: 15, duration: 40 },
    { id: 5, left: '28%', delay: 1.1, density: 14, duration: 35 },
    { id: 6, left: '34%', delay: 2.4, density: 16, duration: 39 },
    { id: 7, left: '40%', delay: 0.4, density: 17, duration: 37 },
    { id: 8, left: '46%', delay: 1.8, density: 15, duration: 41 },
    { id: 9, left: '54%', delay: 0.9, density: 16, duration: 36 },
    { id: 10, left: '60%', delay: 2.7, density: 15, duration: 38 },
    { id: 11, left: '68%', delay: 1.5, density: 17, duration: 35 },
    { id: 12, left: '74%', delay: 0.2, density: 14, duration: 40 },
    { id: 13, left: '82%', delay: 1.9, density: 16, duration: 37 },
    { id: 14, left: '88%', delay: 0.8, density: 15, duration: 39 },
];

const REVIEW_MATRIX_SYMBOLS = ['0', '1', '|', '/', '\\', '+', '*', '.', ':', '#'];

export default function Pricing({ auth, hasClaimedFree, reviewMode }) {
    const [selectedFrequency, setSelectedFrequency] = useState(PAYMENT_FREQUENCIES[1]);
    const [showAllFeatures, setShowAllFeatures] = useState(false);
    const { addToast } = useToast();
    const containerRef = useRef(null);
    const headerRef = useRef(null);

    const normalizedActivePlan = String(auth?.plan || '').toLowerCase();
    const isAuthenticatedUser = Boolean(auth?.user?.id);

    const isTierActive = (tier) => {
        if (!isAuthenticatedUser) return false;
        const tierCode = String(tier.planCode || tier.name).toLowerCase();
        return normalizedActivePlan === tierCode || normalizedActivePlan === `${tierCode}_yearly`;
    };

    useGSAP(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const title = headerRef.current.querySelector('h1');
        const cards = containerRef.current.querySelectorAll('.pricing-card-wrapper');
        const table = containerRef.current.querySelector('.feature-table');

        if (prefersReducedMotion) {
            gsap.set(title, { opacity: 1, y: 0, filter: 'blur(0px)' });
            gsap.set(cards, { opacity: 1, y: 0 });

            if (table) {
                gsap.set(table, { opacity: 1, y: 0 });
            }

            return;
        }

        gsap.fromTo(title, { y: 30, opacity: 0, filter: 'blur(10px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8 });

        gsap.fromTo(cards,
            { y: 40, opacity: 0 },
            {
                y: 0, opacity: 1,
                duration: 1,
                stagger: 0.1,
                ease: 'power4.out',
                onComplete: () => {
                    ScrollTrigger.refresh();
                }
            }
        );

        if (table) {
            gsap.fromTo(table,
                { opacity: 0, y: 20 },
                {
                    opacity: 1, y: 0,
                    duration: 0.8,
                    scrollTrigger: {
                        trigger: table,
                        start: 'top 85%',
                    }
                }
            );
        }
    }, { scope: containerRef });

    const handleSubscribe = async (tier) => {
        if (!isAuthenticatedUser) {
            window.location.href = toAbsoluteRoute('register');
            return;
        }
        if (tier.contactOnly || tier.planCode === 'enterprise') return window.location.href = 'mailto:support@scanmysocial.com';

        addToast('Initializing secure checkout...', 'info');
        // Razorpay logic remains same
    };

    return (
        <>
            <Head title="Pricing - ScanMySocial" />

            <main ref={containerRef} className="bg-[#FAFAFA] min-h-screen pt-24  pb-24 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-linear-to-b from-primary-50/50 to-transparent pointer-events-none" />

                {reviewMode && (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.2),_transparent_38%),radial-gradient(circle_at_75%_18%,_rgba(59,130,246,0.12),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.07),_transparent_34%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(124,58,237,0.1)_50%,transparent_100%)] bg-[size:72px_100%] opacity-40" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(124,58,237,0.14)_1px,transparent_1px)] bg-[size:22px_22px] opacity-30" />
                        <div className="absolute inset-0 opacity-80">
                            {REVIEW_MATRIX_STREAMS.map((stream) => (
                                <div
                                    key={stream.id}
                                    className="review-matrix-stream absolute top-[14%] h-[72%] w-5 overflow-hidden text-[12px] font-black uppercase tracking-[0.3em] text-primary-600/65 drop-shadow-[0_0_12px_rgba(124,58,237,0.32)]"
                                    style={{
                                        left: stream.left,
                                    }}
                                >
                                    <div
                                        className="review-matrix-track flex flex-col items-center gap-0"
                                        style={{
                                            animationDuration: `${stream.duration}s`,
                                            animationDelay: `-${stream.delay}s`,
                                        }}
                                    >
                                        {[0, 1].map((loopIndex) => (
                                            <div key={loopIndex} className="flex flex-col items-center gap-2">
                                                {Array.from({ length: stream.density }).map((_, index) => (
                                                    <span
                                                        key={`${loopIndex}-${index}`}
                                                        className="review-matrix-symbol select-none leading-none"
                                                        style={{
                                                            opacity: 0.28 + ((index % 6) * 0.1),
                                                            animationDelay: `${(index * 0.12) + stream.delay + (loopIndex * 0.05)}s`,
                                                        }}
                                                    >
                                                        {REVIEW_MATRIX_SYMBOLS[(index + stream.id + loopIndex) % REVIEW_MATRIX_SYMBOLS.length]}
                                                    </span>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="absolute left-[10%] top-[28%] h-32 w-32 rounded-full bg-primary-500/15 blur-2xl" />
                        <div className="absolute right-[12%] top-[22%] h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />
                        <div className="absolute left-1/2 top-[36%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary-500/16 blur-3xl" />
                        <div className="absolute left-1/2 bottom-[-140px] h-[320px] w-[920px] -translate-x-1/2 rounded-full bg-slate-900/8 blur-3xl" />
                    </div>
                )}

                <PricingBanner />

                <div ref={headerRef} className="max-w-7xl mx-auto px-4 text-center mb-10 relative z-10">
                    <span className="inline-block px-4 py-1.5 mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-600 bg-primary-50 rounded-full border border-primary-100">
                        Plans & Pricing
                    </span>
                    <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tightest leading-[0.95] mb-8">
                        Scale Your <span className="text-primary-600">Virality.</span> <br />
                        Simple Pricing For <span className="text-primary-600">Everyone.</span>
                    </h1>

                    {/* Billing Toggle */}
                    {!reviewMode && (
                        <div className="flex justify-center items-center gap-4   bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit mx-auto">
                            {PAYMENT_FREQUENCIES.map((freq) => (
                                <button
                                    key={freq}
                                    onClick={() => setSelectedFrequency(freq)}
                                    className={`px-8 py-2.5 rounded-xl font-bold transition-all text-sm capitalize ${selectedFrequency === freq
                                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                                        : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {freq}
                                </button>
                            ))}

                        </div>
                    )}
                </div>

                {reviewMode ? (
                    <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                        <div className="relative overflow-hidden bg-white/92 backdrop-blur-xl p-12 sm:p-20 rounded-[3rem] border border-white/70 shadow-2xl shadow-primary-500/10">
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-300/70 to-transparent" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.08),_transparent_44%)] pointer-events-none" />
                            <h2 className="text-4xl font-black text-slate-900 mb-6">Coming Soon.</h2>
                            <p className="text-lg text-slate-500 mb-10">We're currently in a private review phase. Public pricing will be unveiled shortly.</p>
                            <Link href={route('waitlist')} className="px-10 py-5 bg-primary-600 text-white rounded-2xl font-black text-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 inline-flex items-center gap-2">
                                Join the Waitlist <ArrowRight size={20} />
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <PricingTiers
                            selectedFrequency={selectedFrequency}
                            hasClaimedFree={hasClaimedFree}
                            isTierActive={isTierActive}
                            onSubscribe={handleSubscribe}
                            theme="light"
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mb-24"
                            cardWrapperClassName="pricing-card-wrapper h-full"
                        />

                    </div>
                )}
            </main>
            <style>{`
                .tracking-tightest { letter-spacing: -0.04em; }

                @keyframes review-matrix-rain {
                    0% {
                        transform: translate3d(0, 0, 0);
                        opacity: 0.72;
                    }
                    100% {
                        transform: translate3d(0, -50%, 0);
                        opacity: 0.72;
                    }
                }

                @keyframes review-matrix-flicker {
                    0%, 100% {
                        opacity: 0.14;
                        text-shadow: 0 0 0 rgba(124, 58, 237, 0);
                    }
                    50% {
                        opacity: 0.95;
                        text-shadow: 0 0 18px rgba(124, 58, 237, 0.35);
                    }
                }

                .review-matrix-stream {
                    animation: none;
                    will-change: opacity;
                }

                .review-matrix-track {
                    animation-name: review-matrix-rain;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                    will-change: transform;
                }

                .review-matrix-symbol {
                    animation: review-matrix-flicker 2.6s ease-in-out infinite;
                    will-change: opacity, text-shadow;
                }

                @media (prefers-reduced-motion: reduce) {
                    .review-matrix-track,
                    .review-matrix-symbol {
                        animation: none !important;
                    }
                }
            `}</style>
        </>
    );
}

Pricing.layout = (page) => <PublicLayout>{page}</PublicLayout>;
