import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/**
 * GSAPLayout   Ultra-smooth public page layout.
 * Provides Lenis smooth scroll synced to ScrollTrigger,
 * a global GSAP context with auto-cleanup, and the page wrapper.
 */
export default function GSAPLayout({ children }) {
    const wrapperRef = useRef(null);

    useEffect(() => {
        const previousScrollBehavior = document.documentElement.style.scrollBehavior;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isLinuxDesktop = /Linux/i.test(window.navigator.userAgent) && !/Android/i.test(window.navigator.userAgent);
        const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
        const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const shouldUseNativeScroll = prefersReducedMotion || isLinuxDesktop || isMobileViewport || isCoarsePointer;

        const ctx = gsap.context(() => {
            // Disable native smooth scroll (Lenis handles it)
            document.documentElement.style.scrollBehavior = 'auto';
        }, wrapperRef);

        if (shouldUseNativeScroll) {
            return () => {
                document.documentElement.style.scrollBehavior = previousScrollBehavior;
                ctx.revert();
            };
        }

        /* ── Ultra-Smooth Lenis ── */
        const lenis = new Lenis({
            lerp: 0.16,
            smoothWheel: true,
            syncTouch: true,
            wheelMultiplier: 1.25,
            touchMultiplier: 1.3,
        });

        // Sync Lenis → ScrollTrigger
        lenis.on('scroll', ScrollTrigger.update);

        const raf = (time) => {
            lenis.raf(time * 1000);
        };

        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);

        return () => {
            document.documentElement.style.scrollBehavior = previousScrollBehavior;
            ctx.revert();
            gsap.ticker.remove(raf);
            lenis.destroy();
            ScrollTrigger.getAll().forEach((t) => t.kill());
        };
    }, []);

    return (
        <div
            ref={wrapperRef}
            className="min-h-screen bg-[#FAFAFA] text-slate-900 antialiased font-zain"
            style={{
                '--font-heading': "'Zain', sans-serif",
                '--font-body': "'Zain', sans-serif"
            }}
        >
            {children}
        </div>
    );
}
