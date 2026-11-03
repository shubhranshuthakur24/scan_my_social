import React, { useEffect, useRef, useState } from 'react';
import { Check, Sparkles, ArrowRight, Rocket, Users, Zap, ShieldCheck, Target } from 'lucide-react';

export default function WaitlistHero({ onSeeHowItWorks, onJoinWaitlist }) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle');
    const [responseMessage, setResponseMessage] = useState('');
    const resetStatusTimerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (resetStatusTimerRef.current) {
                clearTimeout(resetStatusTimerRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || status === 'loading') return;

        setStatus('loading');

        try {
            if (typeof onJoinWaitlist === 'function') {
                const message = await onJoinWaitlist(email);
                setResponseMessage(message || "You're on the list!");
            } else {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                setResponseMessage("You're on the list!");
            }
            setEmail('');
            setStatus('success');
            // Reset status after a few seconds
            if (resetStatusTimerRef.current) {
                clearTimeout(resetStatusTimerRef.current);
            }
            resetStatusTimerRef.current = setTimeout(() => setStatus('idle'), 5000);
        } catch (error) {
            console.error('Waitlist join failed:', error);
            setStatus('idle');
        }
    };

    return (
        <section className="relative min-h-[calc(100vh-84px)] flex items-start justify-center overflow-hidden bg-[#030305] px-0 pt-20 pb-10 sm:pt-24 sm:pb-12 lg:items-center lg:py-20 selection:bg-primary-500/30">
            {/* Premium Background Elements */}
            <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
                {/* Subtle Grid Pattern */}
                <div
                    className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]"
                />

                {/* Glowing Orbs for a premium glassmorphism effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-20 blur-[120px] rounded-full bg-linear-to-br from-primary-500/35 via-accent-500/20 to-primary-700/20 mix-blend-screen" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-15 blur-[100px] rounded-full bg-gradient-to-tr from-accent-500/15 to-primary-800/30 mix-blend-screen" />
            </div>

            <div className="relative z-10 flex w-full max-w-7xl flex-col items-center justify-center px-4 sm:px-6 lg:px-8">

                <div className="animate-fade-in-up">
                    <div className="mt-1 mb-6 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-200 shadow-[0_0_20px_rgba(124,58,237,0.22)] transition-all hover:border-primary-400/40 hover:bg-primary-500/20 sm:mt-0 sm:mb-8 sm:px-4">
                        <Sparkles size={14} className="text-primary-300" />
                        Private Beta: ScanMySocial 2.0
                    </div>
                </div>

                <h1 className="mb-5 max-w-[54rem] text-center text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:mb-6 lg:text-[4.5rem] lg:leading-[1.1] text-transparent bg-clip-text bg-linear-to-b from-white via-white/90 to-zinc-400 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    Catch <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 via-accent-300 to-primary-200">breakout creator patterns</span> before they explode.
                </h1>

                <p className="mb-8 max-w-2xl px-1 text-center text-base leading-relaxed text-zinc-400 animate-fade-in-up sm:mb-12 sm:text-lg md:text-xl" style={{ animationDelay: '200ms' }}>
                    Join the waitlist for early access to outlier detection, hook analysis, and AI script generation built for growth-focused creator teams.
                </p>

                {/* Value Propositions - Updated from generic pills to value-rich stacked items */}
                <div className="mb-10 flex w-full max-w-5xl flex-col gap-3 px-0 animate-fade-in-up sm:mb-14 sm:flex-row sm:flex-wrap sm:gap-4 sm:px-4 lg:flex-nowrap" style={{ animationDelay: '300ms' }}>
                    <div className="flex flex-1 items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:-translate-y-1 hover:border-primary-500/20 hover:bg-white/[0.04] hover:shadow-[0_8px_30px_rgba(124,58,237,0.08)] sm:min-w-[260px] sm:p-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500/10 border border-primary-500/20">
                            <Rocket size={18} className="text-primary-300" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-white font-semibold mb-1">Early access in March</span>
                            <span className="text-zinc-400 text-sm leading-snug">Get 2 months ahead of public launch</span>
                        </div>
                    </div>

                    <div className="flex flex-1 items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:-translate-y-1 hover:border-accent-400/25 hover:bg-white/[0.04] hover:shadow-[0_8px_30px_rgba(244,63,94,0.08)] sm:min-w-[260px] sm:p-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-500/10 border border-accent-400/25">
                            <Users size={18} className="text-accent-300" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-white font-semibold mb-1">Weekly private invites</span>
                            <span className="text-zinc-400 text-sm leading-snug">First 50 creators get VIP onboarding</span>
                        </div>
                    </div>

                    <div className="flex flex-1 items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:-translate-y-1 hover:border-primary-300/25 hover:bg-white/[0.04] hover:shadow-[0_8px_30px_rgba(124,58,237,0.08)] sm:min-w-[260px] sm:p-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500/10 border border-primary-300/25">
                            <Zap size={18} className="text-primary-200" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-white font-semibold mb-1">Shape the product</span>
                            <span className="text-zinc-400 text-sm leading-snug">Your feedback drives feature priorities</span>
                        </div>
                    </div>
                </div>

                {/* Form Section */}
                <div className="relative z-20 w-full max-w-[560px] animate-fade-in-up" style={{ animationDelay: '400ms' }}>

                    <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between sm:px-2">
                        <label htmlFor="waitlist-email" className="text-sm font-medium text-zinc-300">
                            Secure your priority spot
                        </label>
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent-400/20 bg-accent-500/10 px-2.5 py-1 text-xs font-semibold leading-tight text-accent-300 animate-pulse-slow">
                            <Target size={12} />
                            Limited spots available for Phase 1
                        </span>
                    </div>

                    {/* Subtle glowing shadow behind the form */}
                    <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-primary-500/35 via-primary-400/20 to-accent-500/35 opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-40" />

                    <div className="relative">
                        <form
                            onSubmit={handleSubmit}
                            className={`relative flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0a0a0c]/80 p-2 shadow-2xl backdrop-blur-xl transition-all duration-500 focus-within:border-primary-500/50 focus-within:bg-[#0a0a0c] focus-within:ring-4 focus-within:ring-primary-500/20 hover:border-white/20 hover:bg-[#0a0a0c] sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:p-1.5 ${status === 'success' ? 'pointer-events-none scale-95 opacity-0' : 'scale-100 opacity-100'}`}
                        >
                            <input
                                id="waitlist-email"
                                type="email"
                                required
                                value={email}
                                disabled={status === 'loading'}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@creator.co"
                                className="w-full min-w-0 flex-1 rounded-xl border-0 bg-[#11131a] px-4 py-3 text-base text-white placeholder:text-zinc-500 ring-0 shadow-none focus:border-0 focus:outline-none focus:ring-0 disabled:opacity-50 sm:rounded-none sm:bg-transparent sm:px-6 sm:py-4"
                            />
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="group relative flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 px-5 font-semibold text-white shadow-[0_12px_30px_rgba(124,58,237,0.24)] transition-all hover:from-primary-500 hover:to-accent-400 hover:shadow-[0_16px_34px_rgba(244,63,94,0.2)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:h-[52px] sm:w-auto sm:rounded-full sm:px-8"
                            >
                                {status === 'loading' ? (
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                                ) : (
                                    <>
                                        <span className="text-sm sm:text-[15px]">Save your spot</span>
                                        <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Success State Overlay */}
                        <div className={`absolute inset-0 flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-[#0a0a0c] p-3 backdrop-blur-xl transition-all duration-500 sm:rounded-full sm:p-0 ${status === 'success' ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'}`}>
                            <div className="flex items-center justify-center gap-3 text-center font-semibold text-emerald-400 shadow-emerald-500/20 drop-shadow-md sm:text-left">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                    <Check size={20} className="text-emerald-400" />
                                </span>
                                <span className="text-sm leading-snug sm:text-lg">{responseMessage}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-center gap-2 px-1 text-center text-xs font-medium text-white sm:px-0">
                        <ShieldCheck size={14} className="text-white" />
                        <span>Launching soon, waitlist is filling up fast</span>
                    </div>
                </div>

                <div className="mt-12 flex w-full max-w-2xl justify-center border-t border-white/5 pt-6 animate-fade-in-up sm:mt-16 sm:pt-8" style={{ animationDelay: '500ms' }}>
                    <button
                        type="button"
                        onClick={onSeeHowItWorks}
                        className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 min-h-[44px] text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:bg-white/10 hover:text-primary-200 sm:px-5 sm:text-[13px]"
                    >
                        Explore Product Flow
                        <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(30px); filter: blur(8px); }
                    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s ease-in-out infinite;
                }
                #waitlist-email:-webkit-autofill,
                #waitlist-email:-webkit-autofill:hover,
                #waitlist-email:-webkit-autofill:focus {
                    -webkit-text-fill-color: #ffffff;
                    box-shadow: 0 0 0px 1000px #11131a inset;
                    transition: background-color 9999s ease-out 0s;
                }
            `}</style>
        </section>
    );
}
