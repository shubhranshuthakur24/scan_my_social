import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Anchor, ShieldAlert, Sparkles, Search, Target, TrendingUp, Zap } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const COMPARISONS = [
    { thought: 'They are more talented on camera.', reality: 'They are using hooks and topics that already worked again and again.', icon: Sparkles },
    { thought: 'They post much more than you.', reality: 'You also post a lot, but you still guess the idea and angle.', icon: Target },
    { thought: 'Their viral videos are just lucky.', reality: 'Their "lucky" videos follow the same pattern many times.', icon: Zap },
    { thought: 'You need one big new idea.', reality: 'You need a simple system that shows you what already works.', icon: Search },
];

const FORMULA_PILLARS = [
    { icon: Anchor, label: 'The Hook', desc: 'Stops the scroll in', highlight: '2 seconds.' },
    { icon: TrendingUp, label: 'The Story', desc: 'Builds emotion that', highlight: 'forces a comment, like & share.' },
    { icon: Zap, label: 'The CTA', desc: 'Turns views into leads on', highlight: 'autopilot.' },
];

const PILLAR_ACCENTS = [
    { border: 'rgba(79, 70, 229, 0.2)', glow: 'rgba(79, 70, 229, 0.08)', icon: 'rgba(79, 70, 229, 0.2)', textCls: 'text-indigo-600' },
    { border: 'rgba(147, 51, 234, 0.2)', glow: 'rgba(147, 51, 234, 0.08)', icon: 'rgba(147, 51, 234, 0.16)', textCls: 'text-primary-600' },
    { border: 'rgba(16, 185, 129, 0.2)', glow: 'rgba(16, 185, 129, 0.08)', icon: 'rgba(16, 185, 129, 0.14)', textCls: 'text-emerald-600' },
];

export default function PainPoint() {
    const sectionRef = useRef(null);
    const scannerRef = useRef(null);
    const tableContainerRef = useRef(null);
    const outroSectionRef = useRef(null);

    /* ─── INTRO + TABLE ─── */
    useGSAP(() => {
        const mm = gsap.matchMedia();
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        mm.add('(min-width: 1024px)', () => {
            if (reduced) return;

            gsap.to('.v3-header-content', {
                y: -120, ease: 'none',
                scrollTrigger: { trigger: '.v3-section-intro', start: 'top top', end: 'bottom top', scrub: 2 },
            });

            gsap.to('.v3-node-parallax', {
                y: -260, stagger: 0.06, ease: 'none',
                scrollTrigger: { trigger: '.v3-section-intro', start: 'top top', end: 'bottom top', scrub: 2 },
            });

            gsap.fromTo('.v3-table-frame',
                { y: 60, opacity: 0, scale: 0.95 },
                {
                    y: 0, opacity: 1, scale: 1, duration: 1.4, ease: 'expo.out',
                    scrollTrigger: { trigger: '.v3-section-table', start: 'top 88%', once: true }
                }
            );

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: '.v3-section-table', start: 'top top', end: '+=180%',
                    pin: true, scrub: 2, anticipatePin: 1, fastScrollEnd: true,
                    snap: { snapTo: [0, 1], duration: { min: 0.4, max: 0.7 }, ease: 'power2.inOut' },
                },
            });
            tl.to(scannerRef.current, { top: '100%', duration: 5, ease: 'none' })
                .to('.v3-reality-layer', { clipPath: 'inset(0 0 0% 0)', duration: 5, ease: 'none' }, '<');

            gsap.fromTo('.v3-reality-icon',
                { scale: 0, rotate: -20, opacity: 0 },
                {
                    scale: 1, rotate: 0, opacity: 1, stagger: 0.1,
                    scrollTrigger: { trigger: '.v3-section-table', start: 'top top', end: '+=180%', scrub: 2 }
                }
            );
        });

        mm.add('(max-width: 1023px)', () => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: '.v3-section-table', start: 'top top', end: '+=900',
                    pin: true, scrub: 1, anticipatePin: 1, fastScrollEnd: true,
                    snap: { snapTo: [0, 1], duration: 0.5, ease: 'power2.inOut' },
                },
            });
            tl.to(scannerRef.current, { top: '100%', ease: 'none', duration: 10 })
                .to('.v3-reality-layer', { clipPath: 'inset(0 0 0% 0)', ease: 'none', duration: 10 }, '<');
            gsap.utils.toArray('.v3-row-reality-mobile').forEach((row, i) => {
                tl.fromTo(row,
                    { opacity: 0, y: 10, filter: 'blur(6px)' },
                    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.5, ease: 'power3.out' },
                    (i * 2) + 1
                );
            });
        });

        return () => mm.revert();
    }, { scope: sectionRef });

    /* ─── OUTRO ─── */
    useGSAP(() => {
        const outroEl = outroSectionRef.current;
        if (!outroEl) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reduced) {
            outroEl.querySelectorAll('[data-section="truth"]')
                .forEach(b => { b.classList.remove('hidden'); b.classList.add('flex'); });
            return;
        }

        const mm = gsap.matchMedia();

        mm.add('(min-width: 1024px)', () => {
            gsap.to('.outro-intro-ambient', {
                y: 22, x: 14, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut',
                stagger: { amount: 2.5, from: 'random' },
            });
            gsap.to('.outro-grid-parallax', {
                yPercent: -15, ease: 'none',
                scrollTrigger: { trigger: outroEl, start: 'top bottom', end: 'bottom top', scrub: true },
            });

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: outroEl, start: 'top top', end: '+=240%',
                    pin: true, scrub: 1.5, anticipatePin: 1, fastScrollEnd: true,
                    snap: { snapTo: [0, 1], duration: 0.8, delay: 0.05, ease: 'power3.inOut' },
                },
            });

            tl.to('[data-section="intro"] [data-animate]', {
                y: -60, opacity: 0, scale: 0.96, filter: 'blur(8px)', stagger: 0.08, duration: 2,
            })
                .fromTo('[data-section="truth"]',
                    { opacity: 0, y: 80, display: 'none', filter: 'blur(10px)' },
                    { opacity: 1, y: 0, display: 'flex', filter: 'blur(0px)', duration: 1.8, ease: 'expo.out' }, '-=0.6')
                .fromTo('.outro-truth-glint',
                    { left: '-120%' }, { left: '160%', duration: 2.2, ease: 'power2.inOut' }, '-=1.4')
                .fromTo('.outro-pillar',
                    { y: 50, opacity: 0, scale: 0.9 },
                    { y: 0, opacity: 1, scale: 1, stagger: 0.18, duration: 1.2, ease: 'back.out(1.4)' }, '-=1.4');
        });

        mm.add('(max-width: 1023px)', () => {
            outroEl.querySelectorAll('[data-animate]').forEach(el => {
                gsap.fromTo(el,
                    { y: 24, opacity: 0, filter: 'blur(6px)' },
                    {
                        y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power4.out',
                        scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none reverse' }
                    }
                );
            });
            outroEl.querySelectorAll('.outro-pillar').forEach(p => {
                gsap.fromTo(p,
                    { y: 36, opacity: 0, filter: 'blur(8px)', scale: 0.95 },
                    {
                        y: 0, opacity: 1, filter: 'blur(0px)', scale: 1, duration: 1, ease: 'power4.out',
                        scrollTrigger: { trigger: p, start: 'top 93%', toggleActions: 'play none none reverse' }
                    }
                );
            });
        });

        return () => mm.revert();
    }, { scope: outroSectionRef });

    /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
    return (
        <div ref={sectionRef} className="bg-slate-50 overflow-hidden">
            <style>{`
                @keyframes scanPulse {
                    0%,100%{ box-shadow:0 0 18px 1px rgba(124,58,237,.38),0 0 50px 2px rgba(124,58,237,.1); }
                    50%    { box-shadow:0 0 34px 4px rgba(124,58,237,.68),0 0 80px 8px rgba(124,58,237,.18); }
                }
                @keyframes orbDrift {
                    0%,100%{ transform:translate(0,0) scale(1); }
                    33%    { transform:translate(14px,-20px) scale(1.04); }
                    66%    { transform:translate(-10px,10px) scale(.97); }
                }
                @keyframes shimmerSlide {
                    0%,100%{ background-position:-200% center; }
                    50%    { background-position:200% center; }
                }
                @keyframes rulePulse {
                    0%,100%{ opacity:.25; transform:scaleX(.5); }
                    50%    { opacity:1;   transform:scaleX(1);  }
                }
                .scan-line   { animation:scanPulse 1.8s ease-in-out infinite; }
                .orb-a { animation:orbDrift 7s  ease-in-out infinite; }
                .orb-b { animation:orbDrift 9s  ease-in-out infinite 1.3s; }
                .orb-c { animation:orbDrift 11s ease-in-out infinite 2.7s; }
                .text-shimmer{
                    background:linear-gradient(90deg,#5b21b6 0%,#7c3aed 38%,#2563eb 62%,#5b21b6 100%);
                    background-size:300% auto;
                    -webkit-background-clip:text;
                    -webkit-text-fill-color:transparent;
                    background-clip:text;
                    animation:shimmerSlide 5s linear infinite;
                }
                .rule-pulse{
                    animation:rulePulse 3s ease-in-out infinite;
                }
                .grain-tex{
                    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
                    background-size:160px 160px;
                }
                .pillar-card{ transition:transform .45s cubic-bezier(.34,1.56,.64,1),box-shadow .4s ease; }
                .pillar-card:hover{ transform:translateY(-9px) scale(1.018); }
            `}</style>

            {/* ═══════════════════════
                § 1  INTRO
            ═══════════════════════ */}
            <section className="v3-section-reality relative bg-[#fbfbff] border-y border-slate-100 min-h-[78vh] md:min-h-[92vh] flex items-center justify-center py-20 md:py-36 overflow-hidden">
                <div className="absolute inset-0 opacity-[0.025] grain-tex pointer-events-none" />
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 inset-x-0 h-40 bg-linear-to-b from-white to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-white to-transparent" />
                    <div className="absolute inset-0 opacity-[0.05]"
                        style={{ backgroundImage: 'linear-gradient(to right, rgba(124,58,237,.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(124,58,237,.1) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
                    <div className="absolute inset-0"
                        style={{ background: 'radial-gradient(ellipse 72% 55% at 50% 38%, rgba(99,102,241,.04) 0%, transparent 68%)' }} />
                    {[
                        { w: 230, h: 230, l: '4%', t: '8%', cls: 'orb-a', bg: 'rgba(99,102,241,.03)' },
                        { w: 140, h: 140, l: '82%', t: '6%', cls: 'orb-b', bg: 'rgba(168,85,247,.02)' },
                        { w: 290, h: 290, l: '58%', t: '54%', cls: 'orb-c', bg: 'rgba(79,70,229,.03)' },
                    ].map((o, i) => (
                        <div key={i} className={`v3-node-parallax ${o.cls} absolute rounded-full blur-[72px]`} style={{ width: o.w, height: o.h, left: o.l, top: o.t, background: o.bg }} />
                    ))}
                </div>

                <div className="v3-header-content relative z-10 text-center max-w-6xl mx-auto px-5 md:px-12">
                    <div className="inline-flex items-center gap-2.5 px-5 py-2 mb-11 rounded-full border border-indigo-100 bg-white shadow-sm">
                        <ShieldAlert size={13} className="text-indigo-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-700">The Hard Truth</span>
                    </div>

                    <h2 className="text-[2.5rem] sm:text-5xl md:text-[4.5rem] lg:text-[6rem] font-black text-slate-950 tracking-tight leading-[0.9] mb-10">
                        Why Are Your
                        <br />
                        <span className="text-shimmer">Competitors Growing Faster</span>
                        <br />
                        Than You?
                    </h2>

                    <p className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto font-medium leading-relaxed font-montserrat">
                        It is not because they are better. It is because{' '}
                        <span className="text-indigo-600 font-bold">they see what you cannot see.</span>
                    </p>

                    <div className="mt-14 mx-auto w-32 h-[1.5px] rounded-full rule-pulse"
                        style={{ background: 'linear-gradient(to right,transparent,#6366f1 50%,transparent)' }} />
                </div>
            </section>

            {/* ═══════════════════════
                § 2  SCAN TABLE
            ═══════════════════════ */}
            <section className="v3-section-table relative min-h-screen md:h-screen flex flex-col items-center justify-center bg-[#f7f7ff] py-10 md:py-0 px-4 md:px-12 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,.08), transparent 42%), linear-gradient(225deg, rgba(37,99,235,.06), transparent 36%)' }} />

                <div className="v3-table-frame relative w-full max-w-7xl">
                    <div className="flex items-center gap-4 mb-6 px-1">
                        <div className="h-px flex-1" style={{ background: 'linear-gradient(to right,transparent,rgba(124,58,237,.22))' }} />
                        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-primary-200 bg-white/80 shadow-sm">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.26em] text-primary-700">Surgical Deep Scan</span>
                        </div>
                        <div className="h-px flex-1" style={{ background: 'linear-gradient(to left,transparent,rgba(124,58,237,.22))' }} />
                    </div>

                    <div ref={tableContainerRef}
                        className="relative w-full h-[460px] sm:h-[520px] md:h-[620px] rounded-2xl md:rounded-[2rem] overflow-hidden will-change-transform"
                        style={{
                            background: 'linear-gradient(160deg,#ffffff 0%,#f7f5ff 100%)',
                            boxShadow: '0 0 0 1px rgba(124,58,237,0.1),0 50px 120px -50px rgba(79,70,229,.45),inset 0 1px 0 rgba(255,255,255,.9)',
                        }}>
                        <div className="grain-tex absolute inset-0 opacity-[0.018] pointer-events-none mix-blend-overlay" />
                        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(to right,transparent,rgba(124,58,237,.18) 40%,rgba(124,58,237,.18) 60%,transparent)' }} />

                        <div className="absolute inset-0 p-6 md:p-14 flex flex-col">
                            <div className="flex flex-col md:flex-row md:items-end border-b border-slate-200 pb-5 mb-8 gap-2 md:gap-0">
                                <div className="flex-1">
                                    <p className="text-[9px] font-black uppercase tracking-[0.32em] text-slate-400 mb-1">Current Illusion</p>
                                    <h4 className="text-xl md:text-2xl font-black text-slate-500">What You Think</h4>
                                </div>
                                <div className="hidden md:flex items-center gap-3 mx-10 opacity-60">
                                    <div className="h-px w-10 bg-slate-300" />
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">vs</span>
                                    <div className="h-px w-10 bg-slate-300" />
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col justify-around gap-2">
                                {COMPARISONS.map((c, i) => (
                                    <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_88px_1fr] items-center opacity-85">
                                        <p className="text-base md:text-lg font-bold text-slate-700 italic leading-snug font-montserrat">{c.thought}</p>
                                        <div className="hidden md:flex justify-center"><div className="h-9 w-9 rounded-xl border border-slate-200 bg-white shadow-sm" /></div>
                                        <div className="mt-2 md:mt-0"><div className="h-6 rounded-lg border border-slate-100 bg-slate-100/80 animate-pulse max-w-[200px]" /></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="v3-reality-layer absolute inset-0 will-change-[clip-path]"
                            style={{ clipPath: 'inset(0 0 100% 0)', background: 'linear-gradient(160deg,#ffffff 0%,#f1edff 100%)' }}>
                            <div className="grain-tex absolute inset-0 opacity-[0.018] pointer-events-none mix-blend-overlay" />
                            <div className="absolute top-0 inset-x-0 h-[1.5px]" style={{ background: 'linear-gradient(to right,transparent,rgba(124,58,237,.5) 40%,rgba(37,99,235,.38) 60%,transparent)' }} />
                            <div className="h-full w-full p-6 md:p-14 flex flex-col">
                                <div className="flex flex-col md:flex-row md:items-end border-b border-primary-200/70 pb-5 mb-8 gap-2 md:gap-0">
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.32em] text-red-400/70 mb-1">Illusion Shattered</p>
                                        <h4 className="text-xl md:text-2xl font-black text-slate-500 line-through decoration-red-500/70 decoration-2 decoration-double">What You Think</h4>
                                    </div>
                                    <div className="hidden md:flex items-center gap-3 mx-10">
                                        <div className="h-px w-8" style={{ background: 'rgba(124,58,237,.28)' }} />
                                        <div className="h-6 w-6 rounded-full border border-primary-300 flex items-center justify-center bg-primary-50"><div className="h-2 w-2 rounded-full bg-primary-500" /></div>
                                        <div className="h-px w-8" style={{ background: 'rgba(124,58,237,.28)' }} />
                                    </div>
                                    <div className="flex-1 md:text-right">
                                        <p className="text-[9px] font-black uppercase tracking-[0.32em] text-primary-600 mb-1">The New Reality</p>
                                        <h4 className="text-xl md:text-2xl font-black text-primary-700">What Is Actually Happening</h4>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col justify-around gap-2">
                                    {COMPARISONS.map((c, i) => {
                                        const Icon = c.icon;
                                        return (
                                            <div key={i} className="v3-row-reality-mobile grid grid-cols-1 md:grid-cols-[1fr_88px_1fr] items-center">
                                                <p className="text-base md:text-lg text-slate-400 italic line-through decoration-red-500/40 decoration-2 decoration-double leading-snug font-montserrat">{c.thought}</p>
                                                <div className="hidden md:flex justify-center">
                                                    <div className="v3-reality-icon flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-200 text-primary-600 shadow-sm" style={{ background: 'radial-gradient(circle at 40% 30%,rgba(124,58,237,.12),rgba(124,58,237,.03))' }}><Icon size={20} strokeWidth={1.5} /></div>
                                                </div>
                                                <p className="v3-reality-text-mobile mt-2 md:mt-0 text-base md:text-lg font-bold text-slate-900 leading-snug font-montserrat">{c.reality}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div ref={scannerRef}
                            className="scan-line absolute top-0 left-0 right-0 h-[2px] z-30 pointer-events-none"
                            style={{ background: 'linear-gradient(to right,transparent 0%,rgba(124,58,237,.24) 15%,rgba(124,58,237,.88) 50%,rgba(37,99,235,.3) 85%,transparent 100%)' }}>
                            <div className="absolute top-0 left-0 right-0 h-[110px] pointer-events-none" style={{ background: 'linear-gradient(to bottom,rgba(124,58,237,.08),transparent)' }} />
                            <div className="absolute top-[-1px] left-[44%] w-[12%] h-[4px] pointer-events-none" style={{ background: 'rgba(255,255,255,.65)', filter: 'blur(2px)', borderRadius: '2px' }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════
                § 3  OUTRO
            ═══════════════════════ */}
            <section ref={outroSectionRef} className="v3-section-outro relative bg-white overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="outro-grid-parallax absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle,#6366f1 1px,transparent 1px)', backgroundSize: '66px 66px' }} />
                </div>

                <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-12 min-h-0 lg:h-screen lg:flex lg:items-center lg:justify-center">
                    <section data-section="intro" className="relative min-h-screen lg:min-h-0 lg:absolute lg:inset-0 flex flex-col items-center justify-center text-center py-20 lg:py-0">
                        <div className="outro-intro-ambient absolute left-[5%] top-[10%] h-72 w-72 rounded-full blur-[95px]" style={{ background: 'radial-gradient(circle,rgba(99,102,241,.06),transparent)' }} />
                        <div className="outro-intro-ambient absolute right-[7%] bottom-[13%] h-80 w-80 rounded-full blur-[115px]" style={{ background: 'radial-gradient(circle,rgba(168,85,247,.05),transparent)' }} />
                        <div className="outro-intro-ambient absolute left-[38%] bottom-[22%] h-56 w-56 rounded-full blur-[85px]" style={{ background: 'radial-gradient(circle,rgba(52,211,153,.04),transparent)' }} />

                        <div className="max-w-4xl px-3">
                            <h3 data-animate className="text-[2.2rem] sm:text-5xl md:text-6xl lg:text-[6.5rem] font-black text-slate-900 tracking-tighter leading-[0.88] mb-12">
                                You Are Working
                                <br />
                                <span className="text-primary-600 underline decoration-indigo-500/20 underline-offset-8">Too Hard</span>
                            </h3>
                            <p data-animate className="text-lg sm:text-xl md:text-2xl font-medium text-slate-500 max-w-2xl mx-auto leading-relaxed font-montserrat">
                                Spending 6 hours a day manually replying to DMs and checking comments? <br className="hidden md:block" />
                                That is not a business. <span className="text-slate-900 font-bold">That is a trap.</span>
                            </p>
                        </div>
                    </section>

                    <section data-section="truth"
                        className="relative min-h-screen lg:min-h-0 lg:absolute lg:inset-0 flex flex-col items-center justify-center py-20 lg:py-0 text-center px-4">
                        <div className="relative z-20 flex flex-col items-center text-center mb-12 ">
                            <h2 data-animate className="text-[2.4rem] sm:text-5xl md:text-6xl lg:text-[4.5rem] font-black leading-[0.92] tracking-tight text-slate-900 mb-10">
                                Here is the <span className=" text-primary-600">Truth</span>
                            </h2>
                            <h4 data-animate className="text-xl md:text-3xl lg:text-[2.75rem] font-black text-slate-900 tracking-tight leading-[1.1] mb-6 max-w-4xl font-montserrat">
                                "Viral content is not luck. It is a <span className="text-primary-600">simple pattern</span> you can copy."
                            </h4>
                            <p data-animate className="text-lg md:text-xl font-semibold leading-relaxed text-slate-500 max-w-2xl mx-auto font-montserrat">
                                Every breakout video has a formula. Your competitors have already cracked it   and they are using it against you every single day.
                            </p>
                        </div>

                        <div className="relative z-20 grid grid-cols-1 gap-6 sm:grid-cols-3 w-full max-w-5xl mx-auto">
                            {FORMULA_PILLARS.map((pillar, i) => {
                                const Icon = pillar.icon;
                                const accent = PILLAR_ACCENTS[i];
                                const pillarColors = [
                                    { bg: 'rgba(238,242,255,0.7)', border: 'rgba(79, 70, 229, 0.12)' }, // Indigo 50
                                    { bg: 'rgba(250,245,255,0.7)', border: 'rgba(147, 51, 234, 0.12)' }, // Purple 50
                                    { bg: 'rgba(236,253,245,0.7)', border: 'rgba(16, 185, 129, 0.12)' }, // Emerald 50
                                ];
                                const colors = pillarColors[i];

                                return (
                                    <div key={pillar.label}
                                        className="outro-pillar pillar-card group relative flex flex-col items-center overflow-hidden rounded-[1.8rem] md:rounded-[2.2rem] p-8 md:p-10 text-center"
                                        style={{
                                            background: colors.bg,
                                            boxShadow: `0 0 0 1px ${colors.border}, 0 25px 60px -20px rgba(0,0,0,0.06)`,
                                        }}>
                                        {/* top edge highlight */}
                                        <div className="absolute top-0 inset-x-8 h-px rounded-full"
                                            style={{ background: `linear-gradient(to right,transparent,${accent.border.replace('.22', '.45')},transparent)` }} />
                                        {/* hover bloom */}
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none rounded-[inherit]"
                                            style={{ background: `radial-gradient(ellipse 80% 55% at 50% 0%,${accent.icon}22,transparent)` }} />
                                        {/* grain */}
                                        <div className="grain-tex absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay" />

                                        {/* icon */}
                                        <div className="relative z-10 mb-7 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl border transition-all duration-500 group-hover:scale-110"
                                            style={{ background: `radial-gradient(circle,${accent.icon}15,transparent)`, borderColor: accent.border.replace('.22', '.15') }}>
                                            <Icon size={26} strokeWidth={1.5} className={accent.textCls} />
                                        </div>

                                        <div className="relative z-10">
                                            <p className={`mb-3 text-2xl md:text-3xl font-black italic tracking-tight ${accent.textCls}`}>
                                                {pillar.label}
                                            </p>
                                            <p className="text-[15px] font-medium leading-relaxed text-slate-600 px-2 font-montserrat">
                                                {pillar.desc}{' '}
                                                <span className={`${accent.textCls} font-bold`}>{pillar.highlight}</span>
                                            </p>
                                        </div>

                                        <div className="relative z-10 mt-8 h-px w-10 rounded-full transition-all duration-500 group-hover:w-20"
                                            style={{ background: accent.border.replace('.22', '.35') }} />
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </section>
        </div>
    );
}
