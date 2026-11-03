import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';

const canHover = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function PromptCard({ prompt }) {
    const [copied, setCopied] = useState(false);
    const cardRef = useRef(null);
    const glareRef = useRef(null);
    const buttonRef = useRef(null);
    const rafRef = useRef(0);
    const buttonRafRef = useRef(0);
    const isHoveringRef = useRef(false);
    const tiltEnabledRef = useRef(false);
    const currentRef = useRef({ rx: 0, ry: 0, gx: 50, gy: 50 });
    const targetRef = useRef({ rx: 0, ry: 0, gx: 50, gy: 50 });
    const buttonCurrentRef = useRef({ x: 0, y: 0 });
    const buttonTargetRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        tiltEnabledRef.current = canHover() && !prefersReducedMotion();
    }, []);

    const animateTilt = useCallback(() => {
        const lerp = 0.12;
        const current = currentRef.current;
        const target = targetRef.current;

        current.rx += (target.rx - current.rx) * lerp;
        current.ry += (target.ry - current.ry) * lerp;
        current.gx += (target.gx - current.gx) * lerp;
        current.gy += (target.gy - current.gy) * lerp;

        const card = cardRef.current;
        if (card) {
            card.style.transform = `perspective(900px) rotateX(${current.rx.toFixed(2)}deg) rotateY(${current.ry.toFixed(2)}deg) translateY(${isHoveringRef.current ? '-4px' : '0px'})`;
        }

        const glare = glareRef.current;
        if (glare) {
            glare.style.background = `radial-gradient(circle at ${current.gx.toFixed(1)}% ${current.gy.toFixed(1)}%, rgba(255,255,255,${isHoveringRef.current ? 0.24 : 0}) 0%, transparent 58%)`;
        }

        if (isHoveringRef.current || Math.abs(current.rx) > 0.05 || Math.abs(current.ry) > 0.05) {
            rafRef.current = requestAnimationFrame(animateTilt);
        }
    }, []);

    const animateButton = useCallback(() => {
        const lerp = 0.16;
        const current = buttonCurrentRef.current;
        const target = buttonTargetRef.current;

        current.x += (target.x - current.x) * lerp;
        current.y += (target.y - current.y) * lerp;

        const button = buttonRef.current;
        if (button) {
            button.style.transform = `translate3d(calc(-50% + ${current.x.toFixed(1)}px), calc(-50% + ${current.y.toFixed(1)}px), 0)`;
        }

        if (Math.abs(current.x - target.x) > 0.1 || Math.abs(current.y - target.y) > 0.1) {
            buttonRafRef.current = requestAnimationFrame(animateButton);
        }
    }, []);

    const onMouseMove = useCallback((event) => {
        if (!tiltEnabledRef.current) {
            return;
        }

        const card = cardRef.current;
        if (!card) {
            return;
        }

        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;

        targetRef.current.rx = clamp((py - 0.5) * -18, -10, 10);
        targetRef.current.ry = clamp((px - 0.5) * 18, -10, 10);
        targetRef.current.gx = px * 100;
        targetRef.current.gy = py * 100;
    }, []);

    const onMouseEnter = useCallback(() => {
        if (!tiltEnabledRef.current) {
            return;
        }

        isHoveringRef.current = true;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(animateTilt);
    }, [animateTilt]);

    const onMouseLeave = useCallback(() => {
        if (!tiltEnabledRef.current) {
            return;
        }

        isHoveringRef.current = false;
        targetRef.current = { rx: 0, ry: 0, gx: 50, gy: 50 };
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(animateTilt);
    }, [animateTilt]);

    const onButtonMove = useCallback((event) => {
        if (!tiltEnabledRef.current) {
            return;
        }

        const button = buttonRef.current;
        if (!button) {
            return;
        }

        const rect = button.getBoundingClientRect();
        const cx = event.clientX - (rect.left + rect.width / 2);
        const cy = event.clientY - (rect.top + rect.height / 2);

        buttonTargetRef.current = { x: cx * 0.25, y: cy * 0.25 };
        cancelAnimationFrame(buttonRafRef.current);
        buttonRafRef.current = requestAnimationFrame(animateButton);
    }, [animateButton]);

    const onButtonLeave = useCallback(() => {
        buttonTargetRef.current = { x: 0, y: 0 };
        cancelAnimationFrame(buttonRafRef.current);
        buttonRafRef.current = requestAnimationFrame(animateButton);
    }, [animateButton]);

    const copyToClipboard = useCallback(async (event) => {
        event.stopPropagation();

        try {
            await navigator.clipboard.writeText(prompt.prompt);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    }, [prompt.prompt]);

    useEffect(() => () => {
        cancelAnimationFrame(rafRef.current);
        cancelAnimationFrame(buttonRafRef.current);
    }, []);

    return (
        <figure
            ref={cardRef}
            className="product-card group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-2xl shadow-primary-500/8 backdrop-blur-xl transition-transform duration-500 hover:-translate-y-1"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onMouseMove={onMouseMove}
            style={{ willChange: 'transform', transformStyle: 'preserve-3d' }}
        >
            <div className="relative m-3 aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-slate-100/70">
                {prompt.image_path ? (
                    <img
                        src={prompt.image_path}
                        alt={prompt.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,rgba(248,247,255,0.95),rgba(238,242,255,0.92))]">
                        <svg className="h-12 w-12 text-primary-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}

                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0.78)_0%,rgba(15,23,42,0.36)_40%,rgba(15,23,42,0.06)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.12),transparent_40%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div ref={glareRef} className="pointer-events-none absolute inset-0 mix-blend-screen transition-all duration-300" aria-hidden="true" />

                <div className="absolute inset-x-0 bottom-0 z-20 p-5">
                    <span className="inline-flex rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-primary-700 backdrop-blur-md">
                        {prompt.category}
                    </span>
                    <h3 className="mt-3 text-lg font-black leading-tight text-white drop-shadow-[0_2px_18px_rgba(15,23,42,0.65)]">
                        {prompt.title}
                    </h3>
                </div>

                <div className="absolute inset-0 z-30 flex items-end p-5 lg:opacity-0 lg:transition-opacity lg:duration-500 lg:group-hover:opacity-100">
                    <div className="w-full rounded-[1.35rem] border border-white/15 bg-white/10 p-4 text-white backdrop-blur-md">
                        <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/75">
                            {prompt.category}
                        </span>
                        <h3 className="mt-3 text-lg font-black leading-tight text-white">
                            {prompt.title}
                        </h3>
                        <p
                            className="mt-3 text-sm leading-relaxed text-white/75"
                            style={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 4,
                                overflow: 'hidden',
                            }}
                        >
                            "{prompt.prompt}"
                        </p>
                    </div>
                </div>

                <button
                    ref={buttonRef}
                    type="button"
                    className={`absolute left-1/2 top-1/2 z-40 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] shadow-lg shadow-primary-500/20 transition-all duration-300 ${
                        copied
                            ? 'bg-emerald-500 text-white'
                            : 'bg-primary-600 text-white lg:opacity-0 lg:group-hover:opacity-100'
                    }`}
                    onClick={copyToClipboard}
                    onMouseMove={onButtonMove}
                    onMouseLeave={onButtonLeave}
                >
                    {copied ? 'Copied' : 'Copy Prompt'}
                </button>

                <Link
                    href={route('viral-image-prompts.show', prompt.slug)}
                    className="absolute bottom-4 right-4 z-40 inline-flex items-center justify-center rounded-full border border-white/35 bg-white/90 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 shadow-md shadow-slate-900/10 transition-colors hover:bg-white"
                >
                    View Details
                </Link>
            </div>
        </figure>
    );
}
