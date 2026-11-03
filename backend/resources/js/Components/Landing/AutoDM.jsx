import React, { useRef, useEffect, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from '@inertiajs/react';
import { MessageCircle, Lock, Users, Coins, Signal, Wifi, BatteryFull, ChevronLeft, MoreHorizontal, Send, CheckCheck, Heart, MessageSquare, Bookmark } from 'lucide-react';
import { toAbsoluteRoute } from '@/Utils/routeHelper';

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const AUTO_DM_STEPS = [
    {
        scene: 'post',
        icon: MessageCircle,
        title: 'They Comment "SEND IT"',
        desc: 'Someone sees your reel and wants the link, the prompt, or the free resource. They comment one word.',
        handle: 'YourBrand',
        caption: "Want my 7-figure viral content vault? Comment \"SEND IT\" below and I'll DM it to you for free! 🚀",
        mediaUrl: '/images/viral_content_vault.png',
        chatText: 'SEND IT 🔥',
        time: '10:42 AM',
    },
    {
        scene: 'dm',
        icon: Lock,
        title: 'Follow To Unlock',
        desc: "Before they receive anything, your Auto DM sends them a gentle nudge: 'Follow us to receive your free gift 🎁'.",
        chatText: 'Hey! I appreciate the love! Just follow me first and I will drop the link right here',
        chatTextSecondary: 'Hey! I appreciate the love! Just follow me first and I will drop the link right here.',
        hasAction: true,
        actionLabel: 'Follow to Unlock',
        time: '10:42 AM',
    },
    {
        scene: 'dm',
        icon: Users,
        title: 'The "Send me" Bridge',
        desc: 'Once they follow, the system sends an opening message with a CTA button to officially request the resource.',
        userResponse: 'Yes, I follow',
        chatText: 'Follow verified! 🚀 Ready to dive into the 7-figure vault? Click below to get it sent instantly.',
        hasAction: true,
        actionLabel: 'Send me the Vault 🚀',
        time: '10:43 AM',
    },
    {
        scene: 'dm',
        icon: Coins,
        title: 'Asset Delivery',
        desc: 'The resource drops in their DM instantly. A viewer just became a follower   automatically.',
        userResponse: 'Send me the Vault 🚀',
        chatText: 'Here is your viral vault access! Hope you absolutely crush it with this. 🚀',
        mediaUrl: '/images/sales-mastery.avif',
        time: '10:43 AM',
    },
    {
        scene: 'dm',
        icon: Coins,
        title: 'Converted to Lead',
        desc: 'Auto DM continues the conversation   By the time they speak to you, they already trust you.',
        isCelebration: true,
        time: '02:15 PM',
    },
];

/* ─────────────────────────────────────────────
   PHONE UI HELPERS
───────────────────────────────────────────── */
function StatusBar() {
    return (
        <div className="flex items-center justify-between px-5 pt-4 pb-2 text-[10px] font-semibold text-slate-300 shrink-0">
            <span className="font-bold">9:41</span>
            <span className="inline-flex items-center gap-1">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <BatteryFull className="h-3 w-3" />
            </span>
        </div>
    );
}

function Avatar({ src, size = 6, ring = false }) {
    return (
        <div
            className={`h-${size} w-${size} rounded-full overflow-hidden shrink-0 ${ring ? 'ring-1 ring-white/20' : ''}`}
            style={{ minWidth: size * 4, minHeight: size * 4 }}
        >
            <img src={src} alt="" className="w-full h-full object-cover" />
        </div>
    );
}

/* ─────────────────────────────────────────────
   POST SCENE
───────────────────────────────────────────── */
function PostScene() {
    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-3 pb-3 text-slate-200">
                <ChevronLeft className="h-4 w-4" />
                <p className="text-[10px] font-bold tracking-widest uppercase">POSTS</p>
                <MoreHorizontal className="h-4 w-4" />
            </div>

            {/* Profile row */}
            <div className="flex items-center gap-2 px-3 pb-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600 p-[1.5px]">
                    <div className="h-full w-full rounded-full bg-black overflow-hidden flex items-center justify-center">
                        <img src="https://i.pravatar.cc/100?u=brand" alt="Brand" className="w-full h-full object-cover" />
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-1">
                        <p className="text-[11px] font-bold text-slate-100">YourBrand</p>
                        <div className="h-3 w-3 bg-blue-500 rounded-full flex items-center justify-center">
                            <CheckCheck className="h-2 w-2 text-white stroke-[3]" />
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium">Sponsored</p>
                </div>
            </div>

            {/* Media */}
            <div className="relative mx-3 overflow-hidden rounded-xl border border-white/5 bg-slate-800 shadow-xl" style={{ aspectRatio: '1/1' }}>
                <img src={AUTO_DM_STEPS[0].mediaUrl} alt="" className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-md bg-black/70 backdrop-blur-sm px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">REEL</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-3 pt-3 pb-1 text-slate-300">
                <div className="flex items-center gap-3">
                    <Heart className="h-4 w-4" />
                    <MessageSquare className="h-4 w-4" />
                    <Send className="h-4 w-4" />
                </div>
                <Bookmark className="h-4 w-4" />
            </div>

            {/* Caption */}
            <div className="px-3 pt-1">
                <p className="text-[10px] leading-relaxed text-slate-300 line-clamp-2">
                    <span className="font-bold text-white">@YourBrand </span>
                    {AUTO_DM_STEPS[0].caption}
                </p>
            </div>

            {/* Comment sheet */}
            <div className="mx-3 mt-2 flex-1 flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#141414]">
                <div className="flex justify-center py-1.5">
                    <div className="h-0.5 w-8 rounded-full bg-slate-700" />
                </div>
                <div className="flex items-center justify-between px-3 pb-2 border-b border-white/5">
                    <p className="text-[11px] font-bold text-slate-100">Comments</p>
                    <Send className="h-3 w-3 text-slate-500" />
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex items-start gap-2">
                        <Avatar src="https://i.pravatar.cc/100?u=user123" size={6} />
                        <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-[10px] font-bold text-slate-200">viral_fan_01</p>
                                <span className="text-[8px] text-slate-500">2h</span>
                            </div>
                            <p className="text-[11px] font-bold text-primary-400">{AUTO_DM_STEPS[0].chatText}</p>
                        </div>
                    </div>
                    <div className="ml-8 border-l border-white/5 pl-3 flex items-start gap-2">
                        <Avatar src="https://i.pravatar.cc/100?u=brand" size={5} />
                        <div>
                            <div className="flex items-center gap-1 mb-0.5">
                                <p className="text-[9px] font-bold text-slate-300">YourBrand</p>
                                <CheckCheck className="h-2 w-2 text-blue-400 stroke-[3]" />
                            </div>
                            <p className="text-[10px] text-slate-400">Working on it! Check your DMs 🚀</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 pb-3 pt-1">
                    <Avatar src="https://i.pravatar.cc/100?u=brand" size={6} ring />
                    <div className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-slate-500">Add a comment...</div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   DM SCENE
───────────────────────────────────────────── */
function ChatBubble({ children, align = 'left', animate = false, delay = 0 }) {
    return (
        <div
            className={`max-w-[88%] transition-all ${align === 'right' ? 'ml-auto' : ''}`}
            style={animate ? {
                animation: `bubblePop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both`,
            } : {}}
        >
            {children}
        </div>
    );
}

function DMScene({ activeStep }) {
    const scrollRef = useRef(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const t = setTimeout(() => {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }, 120);
        return () => clearTimeout(t);
    }, [activeStep]);

    const isCelebration = AUTO_DM_STEPS[activeStep]?.isCelebration;

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-3 pb-3 border-b border-white/5 mb-3 text-slate-200">
                <div className="flex items-center gap-3">
                    <ChevronLeft className="h-5 w-5 -ml-1" />
                    <div className="flex items-center gap-2.5">
                        <Avatar src="https://i.pravatar.cc/100?u=brand" size={8} />
                        <div className="flex flex-col">
                            <p className="text-[11px] font-bold text-slate-100">@YourBrand</p>
                            <p className="text-[9px] text-slate-500">Active now</p>
                        </div>
                    </div>
                </div>
                <MoreHorizontal className="h-5 w-5" />
            </div>

            {/* Chat area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto min-h-0 px-3 space-y-3 pb-2"
                style={{ scrollbarWidth: 'none' }}
            >
                {AUTO_DM_STEPS.slice(1, activeStep + 1).map((step, idx) => {
                    const stepIndex = idx + 1;
                    const isActive = stepIndex === activeStep;
                    if (step.isCelebration) return null;

                    return (
                        <div key={stepIndex} className="space-y-2">
                            {/* User echo */}
                            {step.userResponse && (
                                <ChatBubble align="right" animate={isActive}>
                                    <div className="ml-auto rounded-2xl rounded-tr-sm bg-primary-600 px-3 py-2 text-[11px] text-white shadow-lg shadow-primary-900/30">
                                        {step.userResponse}
                                    </div>
                                </ChatBubble>
                            )}

                            {/* Bot message */}
                            {stepIndex !== 3 && (
                                <div className="flex items-end gap-2">
                                    <Avatar src="https://i.pravatar.cc/100?u=brand" size={6} />
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <ChatBubble animate={isActive && !step.userResponse}>
                                            <div className="rounded-2xl rounded-tl-sm border border-white/8 bg-[#1e1e1e] px-3 py-2 text-[11px] text-slate-200 shadow-md">
                                                <p className="leading-relaxed">{step.chatText}</p>
                                                {stepIndex === 2 && step.hasAction && (
                                                    <button className="mt-2 w-full rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white uppercase tracking-wider">
                                                        {step.actionLabel}
                                                    </button>
                                                )}
                                            </div>
                                        </ChatBubble>

                                        {stepIndex === 1 && (
                                            <ChatBubble animate={isActive && !step.userResponse} delay={0.8}>
                                                <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] px-3 py-2 text-[11px] text-slate-200 shadow-md">
                                                    <p className="leading-relaxed">{step.chatTextSecondary}</p>
                                                    <div className="mt-2 space-y-1.5">
                                                        <button className="w-full rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white">Visit Profile</button>
                                                        <button className="w-full rounded-full bg-primary-600 px-3 py-1.5 text-[10px] font-semibold text-white shadow-md shadow-primary-900/30">Yes, I follow</button>
                                                    </div>
                                                </div>
                                            </ChatBubble>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 3   media card */}
                            {stepIndex === 3 && step.mediaUrl && (
                                <div className="flex items-end gap-2">
                                    <Avatar src="https://i.pravatar.cc/100?u=brand" size={6} />
                                    <div className="flex-1 min-w-0">
                                        <ChatBubble animate={isActive}>
                                            <div className="overflow-hidden rounded-2xl rounded-tl-sm border border-white/8 bg-[#1e1e1e] shadow-md">
                                                <img src={step.mediaUrl} alt="" className="h-28 w-full object-cover" />
                                                <div className="px-3 py-2 space-y-1.5">
                                                    <p className="text-[11px] text-slate-200 leading-relaxed">{step.chatText}</p>
                                                    <button className="w-full rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white">Open this link</button>
                                                </div>
                                            </div>
                                        </ChatBubble>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Input row */}
            {!isCelebration && (
                <div className="px-3 pb-2 pt-1 flex items-center gap-2 border-t border-white/5">
                    <Avatar src="https://i.pravatar.cc/100?u=brand" size={6} ring />
                    <div className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-slate-500">Message...</div>
                </div>
            )}

            {/* Celebration overlay */}
            {isCelebration && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center rounded-[inherit] overflow-hidden"
                    style={{ animation: 'fadeIn 0.5s ease both' }}
                >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                    <div className="relative z-10 flex flex-col items-center gap-5" style={{ animation: 'scaleIn 0.6s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping" style={{ animationDuration: '2s' }} />
                            <div className="relative h-20 w-20 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-white tracking-tight">Converted to Lead</p>
                            <p className="text-[11px] text-emerald-300 font-semibold uppercase tracking-widest mt-1">🎉 Fully Automated</p>
                        </div>
                    </div>
                    {/* Confetti */}
                    {[...Array(44)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-sm"
                            style={{
                                width: `${4 + Math.random() * 7}px`,
                                height: `${4 + Math.random() * 7}px`,
                                backgroundColor: ['#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#ef4444'][i % 6],
                                left: '50%', top: '50%',
                                animation: `confettiPop 1.8s ${i * 0.07}s ease-out forwards`,
                                opacity: 0,
                                '--tx': `${(Math.cos((i / 22) * Math.PI * 2) * (60 + Math.random() * 55)).toFixed(0)}px`,
                                '--ty': `${(Math.sin((i / 22) * Math.PI * 2) * (60 + Math.random() * 55)).toFixed(0)}px`,
                                '--rot': `${Math.random() * 720}deg`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   PHONE SHELL
───────────────────────────────────────────── */
function PhoneShell({ activeStep }) {
    const showPost = activeStep === 0;

    return (
        <div className="relative mx-auto" style={{ width: 260 }}>
            {/* Ambient glow */}
            <div
                className="absolute -inset-12 rounded-full opacity-40 blur-[80px] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, var(--color-primary-600) 0%, var(--color-accent-600) 50%, transparent 70%)', animation: 'glowPulse 6s ease-in-out infinite alternate' }}
            />

            {/* Side buttons */}
            <div className="absolute -left-[3.5px] top-16 h-7 w-[3px] rounded-full bg-slate-600/80" />
            <div className="absolute -left-[3.5px] top-28 h-11 w-[3px] rounded-full bg-slate-600/80" />
            <div className="absolute -left-[3.5px] top-44 h-14 w-[3px] rounded-full bg-slate-600/80" />
            <div className="absolute -right-[3.5px] top-36 h-16 w-[3px] rounded-full bg-slate-600/80" />

            {/* Frame */}
            <div className="relative rounded-[3rem] bg-[#0a0a0a] p-[7px] shadow-[0_60px_120px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] z-10">
                {/* Screen */}
                <div className="relative h-[576px] overflow-hidden rounded-[2.5rem] bg-[#0d0d0d] flex flex-col border border-white/5">

                    {/* Dynamic Island */}
                    <div className="absolute left-1/2 top-2 z-30 -translate-x-1/2">
                        <div className="rounded-full bg-black px-5 py-1.5">
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#111]" />
                                <div className="h-1.5 w-16 rounded-full bg-[#060606]" />
                            </div>
                        </div>
                    </div>

                    <StatusBar />

                    {/* Content area with transition */}
                    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div
                            className="absolute inset-0 flex flex-col px-0 pt-1 pb-2 transition-all duration-500"
                            style={{
                                opacity: showPost ? 1 : 0,
                                transform: showPost ? 'translateX(0)' : 'translateX(-20px)',
                                pointerEvents: showPost ? 'auto' : 'none',
                            }}
                        >
                            <PostScene />
                        </div>
                        <div
                            className="absolute inset-0 flex flex-col pt-1 pb-2 transition-all duration-500"
                            style={{
                                opacity: !showPost ? 1 : 0,
                                transform: !showPost ? 'translateX(0)' : 'translateX(20px)',
                                pointerEvents: !showPost ? 'auto' : 'none',
                            }}
                        >
                            {!showPost && <DMScene activeStep={activeStep} />}
                        </div>
                    </div>

                    {/* Home indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-1/3 rounded-full bg-white/20" />
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   STEP CARD   minimal left-border style
───────────────────────────────────────────── */
function StepCard({ step, isActive }) {
    return (
        <div
            className={`relative pl-6 py-3 border-l-[3px] transition-all duration-500 ease-in-out cursor-default ${isActive
                ? 'border-primary-500'
                : 'border-slate-200'
                }`}
        >
            <h3
                className={`text-base sm:text-xl font-black tracking-tight leading-snug transition-colors  duration-500 ease-in-out ${isActive ? 'text-slate-900' : 'text-slate-400'}`}
            >
                {step.title}
            </h3>
            <div
                className="grid transition-all duration-500 ease-in-out"
                style={{ gridTemplateRows: isActive ? '1fr' : '0fr' }}
            >
                <div className="overflow-hidden">
                    <p className={`mt-1.5 text-sm leading-relaxed transition-opacity duration-500 font-montserrat ease-in-out ${isActive ? 'text-slate-500 opacity-100' : 'opacity-0'
                        }`}>
                        {step.desc}
                    </p>
                </div>
            </div>
        </div>
    );
}
/* ─────────────────────────────────────────────
   MOBILE TOAST
───────────────────────────────────────────── */
function MobileToast({ step, visible }) {
    if (!step) return null;
    return (
        <div
            className="lg:hidden fixed top-5 inset-x-4 z-[99] pointer-events-none transition-all duration-500"
            style={{ transform: visible ? 'translateY(0)' : 'translateY(-100%)', opacity: visible ? 1 : 0 }}
        >
            <div className="max-w-sm mx-auto bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-3 shadow-2xl flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                    <img src={step.scene === 'post' ? 'https://i.pravatar.cc/100?u=user1' : 'https://i.pravatar.cc/100?u=brand'} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary-400 mb-0.5">
                        {step.scene === 'post' ? 'New Comment' : 'Direct Message'}
                    </p>
                    <p className="text-[12px] font-bold text-white truncate">
                        {step.isCelebration ? '🎉 Success! Lead Converted' : (step.chatText || step.userResponse)}
                    </p>
                </div>
                <div className="h-2 w-2 rounded-full bg-primary-500 animate-pulse mr-1 shrink-0" />
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function AutoDM() {
    const sectionRef = useRef(null);
    const contentRef = useRef(null);
    const [activeStep, setActiveStep] = useState(0);
    const [toastVisible, setToastVisible] = useState(false);

    useGSAP(() => {
        const mm = gsap.matchMedia();

        mm.add('(min-width: 1024px)', () => {
            if (!contentRef.current) return undefined;

            const trigger = ScrollTrigger.create({
                trigger: contentRef.current,
                start: 'top top+=100',
                end: `+=${window.innerHeight * 2.5}`,
                pin: true,
                scrub: true,
                onUpdate: (self) => {
                    const stepIndex = Math.min(
                        AUTO_DM_STEPS.length - 1,
                        Math.floor(self.progress * AUTO_DM_STEPS.length)
                    );
                    setActiveStep(stepIndex);
                    setToastVisible(true);
                },
                onLeave: () => setToastVisible(false),
                onEnterBack: () => setToastVisible(true),
                onLeaveBack: () => setToastVisible(false),
            });

            return () => trigger.kill();
        });

        // Mobile: simple intersection-based
        mm.add('(max-width: 1023px)', () => {
            const content = contentRef.current;
            if (!content) return undefined;

            const handleScroll = () => {
                const rect = content.getBoundingClientRect();
                const progress = Math.max(0, Math.min(1, -rect.top / (rect.height - window.innerHeight)));
                const stepIndex = Math.min(AUTO_DM_STEPS.length - 1, Math.floor(progress * AUTO_DM_STEPS.length));
                setActiveStep(stepIndex);
                setToastVisible(rect.top < window.innerHeight && rect.bottom > 0);
            };

            window.addEventListener('scroll', handleScroll, { passive: true });
            handleScroll();
            return () => window.removeEventListener('scroll', handleScroll);
        });

        return () => mm.revert();
    }, { scope: sectionRef });

    return (
        <section ref={sectionRef} id="auto-dm" className="relative overflow-hidden bg-primary-50/50 pb-32 pt-20 lg:pt-32">
            {/* Global keyframes */}
            <style>{`
        @keyframes confettiPop {
          0% { opacity: 1; transform: scale(0) translate(0,0) rotate(0deg); }
          60% { opacity: 1; }
          100% { opacity: 0; transform: scale(1) translate(var(--tx), var(--ty)) rotate(var(--rot)); }
        }
        @keyframes bubblePop {
          0% { opacity: 0; transform: scale(0.5) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes glowPulse {
          from { transform: scale(0.9) rotate(0deg); }
          to { transform: scale(1.1) rotate(180deg); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

            {/* Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 -left-20 w-[400px] h-[400px] rounded-full opacity-10 blur-[100px]"
                    style={{ background: 'radial-gradient(ellipse, var(--color-primary-300) 0%, transparent 70%)' }} />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)',
                        backgroundSize: '36px 36px',
                    }}
                />
            </div>

            <MobileToast step={AUTO_DM_STEPS[activeStep]} visible={toastVisible} />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Full-width heading */}
                <div className="text-center mb-14 lg:mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-600 font-bold text-[11px] uppercase tracking-widest mb-6">
                        <MessageCircle size={13} /> The Automation Engine
                    </div>
                    <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-5 leading-[1.08] text-slate-900">
                        From Comment To Customer{' '}
                        <br className="hidden sm:block" />
                        <span className="text-primary-500">With Auto-DM.</span>
                    </h2>
                    <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto font-medium font-montserrat">
                        Set it up once. Every comment, follow and DM becomes a new customer   automatically, forever.
                    </p>
                </div>

                {/* Two-column: Steps LEFT, Phone RIGHT */}
                <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-[1fr_420px] items-center gap-12 lg:gap-20">
                    {/* Steps column */}
                    <div>
                        <div className="space-y-1 mb-10">
                            {AUTO_DM_STEPS.map((step, index) => (
                                <StepCard key={index} step={step} isActive={activeStep === index} />
                            ))}
                        </div>
                        <Link
                            href={toAbsoluteRoute('register')}

                            className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-primary-500 text-white rounded-2xl font-black text-lg hover:bg-primary-500 transition-all hover:shadow-xl hover:-translate-y-1 group"

                        >
                            Start Automating Now
                        </Link>
                    </div>

                    {/* Phone column */}
                    <div className="hidden lg:flex items-center justify-center">
                        <PhoneShell activeStep={activeStep} />
                    </div>
                </div>
            </div>
        </section>
    );
}

