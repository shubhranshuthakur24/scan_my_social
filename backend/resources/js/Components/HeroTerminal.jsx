import React, { useState, useEffect } from 'react';

export default function HeroTerminal() {
    const lines = [
        { text: "[sys] Initializing viral scanner instance...", color: "text-gray-500" },
        { text: "> Fetching Reel metadata [Channel: ScaleLoop]", color: "text-gray-400" },
        { text: "> Analyzing frame 1-45... hook pacing: nominal.", color: "text-gray-400" },
        { text: "> Warning: Emotional spike detected at 00:03s.", color: "text-yellow-500" },
        { text: "✔ Outlier Confirmed: +240% Lift vs baseline", color: "text-green-500 font-bold" },
        { text: "> Executing script generation protocol...", color: "text-primary-400" }
    ];

    const [visibleCount, setVisibleCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisibleCount(prev => {
                if (prev >= lines.length) {
                    return 0;
                }
                return prev + 1;
            });
        }, 800);
        return () => clearInterval(interval);
    }, [lines.length]);

    const visibleLines = lines.slice(0, visibleCount);

    return (
        <div className="w-full h-[420px] bg-[#050505] border border-[#27272A] relative font-sans text-sm sm:text-base overflow-hidden rounded-none z-20 mx-auto lg:mx-0 shadow-[8px_8px_0px_0px_#27272A] hover:shadow-[8px_8px_0px_0px_#A855F7] transition-all duration-500">
            {/* CSS Scanlines Overlay (Neo-Retro CRT effect) */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:100%_4px] z-0" />

            <div className="relative z-10 p-5 sm:p-7">
                {/* Terminal Header */}
                <div className="flex items-center justify-between mb-6 border-b border-[#27272A] pb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#FF5F56] border border-[#E0443E] rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]" />
                        <div className="w-3 h-3 bg-[#FFBD2E] border border-[#DEA123] rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]" />
                        <div className="w-3 h-3 bg-[#27C93F] border border-[#1AAB29] rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]" />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                        </span>
                        <span className="text-[10px] font-mono font-bold text-primary-500 uppercase tracking-widest">Live Engine</span>
                    </div>
                </div>

                {/* Terminal Body */}
                <div className="space-y-4 font-mono text-[13px] sm:text-[14px]">
                    {visibleLines.map((line, idx) => (
                        <div
                            key={idx}
                            className={`opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards] flex items-start gap-4`}
                        >
                            <span className="text-[#3F3F46] shrink-0 font-bold">{(idx + 1).toString().padStart(2, '0')}</span>
                            <span className={line.color}>{line.text}</span>
                        </div>
                    ))}
                    {visibleLines.length < lines.length && (
                        <div className="flex items-start gap-4 text-gray-500 opacity-0 animate-[fadeSlideIn_0.1s_ease-out_forwards]">
                            <span className="text-[#3F3F46] shrink-0 font-bold">{(visibleLines.length + 1).toString().padStart(2, '0')}</span>
                            <span className="animate-pulse bg-gray-500 w-2.5 h-4 inline-block mt-0.5" />
                        </div>
                    )}
                    {visibleLines.length === lines.length && (
                        <div className="mt-8 pt-4 border-t border-[#27272A]/50 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
                            <div className="inline-flex items-center gap-3 bg-primary-500/10 border border-primary-500/30 px-4 py-2.5">
                                <span className="text-primary-500 font-bold tracking-widest uppercase text-xs">► SCRIPT READY</span>
                                <span className="animate-pulse w-2.5 h-4 bg-primary-500 inline-block"></span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Subtle glow orb behind text */}
            <div className="absolute -z-10 -bottom-10 right-0 w-32 h-32 bg-primary-500/10 blur-[50px] pointer-events-none" />
        </div>
    );
}
