import React, { useState, useEffect } from 'react';

const MIN_DURATION_SECONDS = 25 * 60;
const MAX_DURATION_SECONDS = (35 * 60) + 59;
const STORAGE_KEY = 'pricing_banner_offer_expiry_v1';

const generateRandomDurationSeconds = () => {
    const span = (MAX_DURATION_SECONDS - MIN_DURATION_SECONDS) + 1;
    return MIN_DURATION_SECONDS + Math.floor(Math.random() * span);
};

const resolveOrCreateExpiryTimestamp = () => {
    if (typeof window === 'undefined') {
        return Date.now() + (30 * 60 * 1000);
    }

    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    const parsedExpiry = Number(storedValue);
    const now = Date.now();

    if (Number.isFinite(parsedExpiry) && parsedExpiry > now) {
        return parsedExpiry;
    }

    const nextExpiry = now + (generateRandomDurationSeconds() * 1000);
    window.localStorage.setItem(STORAGE_KEY, String(nextExpiry));

    return nextExpiry;
};

const resolveRemainingSeconds = (expiryTimestampMs) => {
    const seconds = Math.ceil((expiryTimestampMs - Date.now()) / 1000);
    return Math.max(0, seconds);
};

export default function PricingBanner() {
    const [expiryTimestampMs] = useState(() => resolveOrCreateExpiryTimestamp());
    const [timeLeft, setTimeLeft] = useState(() => resolveRemainingSeconds(expiryTimestampMs));

    useEffect(() => {
        const timer = window.setInterval(() => {
            setTimeLeft(resolveRemainingSeconds(expiryTimestampMs));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [expiryTimestampMs]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="relative w-full max-w-7xl mx-auto px-4 mb-12 group">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-primary-900 shadow-2xl border border-white/10">
                {/* Theme Color Background Gradient/Overlay */}
                <div className="absolute inset-0 bg-linear-to-br from-primary-900/90 via-slate-900 to-primary-950/90" />

                {/* Decorative Pattern (similar to the wavy line in the screenshot) */}
                <div className="absolute top-0 right-[-10%] w-[60%] h-full pointer-events-none opacity-20 group-hover:opacity-30 transition-all duration-1000 group-hover:scale-105">
                    <svg className="w-full h-full text-primary-500" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M400 40C350 40 320 160 250 160C180 160 150 40 100 40C50 40 20 160 0 160" stroke="currentColor" strokeWidth="30" strokeLinecap="round" />
                        <path d="M400 90C350 90 320 190 250 190C180 190 150 90 100 90C50 90 20 190 0 190" stroke="currentColor" strokeWidth="30" strokeLinecap="round" />
                        <path d="M400 -10C350 -10 320 110 250 110C180 110 150 -10 100 -10C50 -10 20 110 0 110" stroke="currentColor" strokeWidth="30" strokeLinecap="round" />
                    </svg>
                </div>

                {/* Content */}
                <div className="relative z-10 px-8 py-10 sm:px-12 sm:py-14 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex-1">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 rounded-md bg-primary-600 text-white shadow-lg shadow-primary-600/20">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Special Offer</span>
                        </div>

                        {/* Headlines */}
                        <div className="space-y-1 mb-8">
                            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tightest leading-[0.9] uppercase">
                                SCAN MY SOCIAL PRO & CREATOR UNLIMITED.
                            </h2>
                            <h3 className="text-xl sm:text-3xl md:text-4xl font-black text-white/90 tracking-tightest leading-[0.9] uppercase">
                                UNLOCK FULL VIRAL INTEL WITH 30% OFF
                            </h3>
                        </div>

                        {/* Subtext */}
                        <p className="text-xs sm:text-sm text-white/50 font-bold max-w-xl leading-relaxed uppercase tracking-wider">
                            Get Scan My Social Pro & Creator Unlimited on Yearly plan for 7 days with Special 30% discount
                        </p>
                    </div>

                    {/* Timer UI */}
                    <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md min-w-[180px] shadow-2xl relative overflow-hidden group/timer">
                        <div className="absolute inset-0 bg-linear-to-br from-amber-500/10 to-transparent opacity-0 group-hover/timer:opacity-100 transition-opacity duration-500" />
                        <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/80 mb-2">Offer expires in</span>
                        <div className="relative z-10 text-4xl sm:text-5xl font-black text-amber-400 tracking-tighter font-mono tabular-nums drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                            {formatTime(timeLeft)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-amber-500/10 blur-2xl rounded-full" />
                    </div>
                </div>

                {/* Bottom Shine Line */}
                <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

                {/* Corner Accents */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-600/10 blur-3xl rounded-full" />
            </div>
        </div>
    );
}
