import { Link } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';

export default function AuthAside({
    badge = 'Creator Intelligence',
    title,
    subtitle,
    description,
    children
}) {
    return (
        <aside className="relative hidden h-full overflow-hidden lg:flex flex-col justify-between border-r border-slate-800/70 bg-[radial-gradient(1200px_circle_at_8%_8%,rgba(139,92,246,0.26),transparent_44%),radial-gradient(1000px_circle_at_90%_15%,rgba(244,63,94,0.15),transparent_36%),linear-gradient(160deg,#020617,#0b1222_58%,#111827)] px-12 py-10 text-white">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-linear-to-b from-slate-950/5 via-slate-950/25 to-slate-950/45" />

                <div className="absolute left-[14%] top-[16%] h-1.5 w-1.5 rounded-full bg-white/70 cosmos-star" />
                <div className="absolute left-[29%] top-[24%] h-1 w-1 rounded-full bg-primary-100/80 cosmos-star" style={{ animationDelay: '0.8s' }} />
                <div className="absolute left-[72%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/80 cosmos-star" style={{ animationDelay: '1.4s' }} />
                <div className="absolute left-[80%] top-[34%] h-1 w-1 rounded-full bg-accent-200/80 cosmos-star" style={{ animationDelay: '2.1s' }} />
                <div className="absolute left-[22%] top-[64%] h-1 w-1 rounded-full bg-white/70 cosmos-star" style={{ animationDelay: '1.9s' }} />
                <div className="absolute left-[67%] top-[74%] h-1.5 w-1.5 rounded-full bg-primary-200/85 cosmos-star" style={{ animationDelay: '0.35s' }} />

                <div className="absolute -left-28 bottom-20 h-px w-56 bg-gradient-to-r from-white/0 via-white/75 to-white/0 blur-[1px] cosmos-comet-trail" />

                <div className="absolute left-1/2 top-1/2 z-20 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.22),rgba(196,181,253,0.16)_35%,rgba(15,23,42,0.34)_74%)] shadow-[0_0_80px_rgba(167,139,250,0.22)]" />

                <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2">
                    <div className="relative h-full w-full rounded-full cosmos-orbit-ring">
                        <div
                            className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-200 shadow-[0_0_14px_rgba(196,181,253,0.9)] cosmos-moon-glow"
                            style={{ animationDelay: '0.35s' }}
                        />
                    </div>
                </div>

                <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2">
                    <div className="relative h-full w-full rounded-full cosmos-orbit-ring-depth">
                        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                            <div className="h-2.5 w-2.5 cosmos-moon-depth">
                                <div
                                    className="h-full w-full rounded-full bg-accent-300 shadow-[0_0_12px_rgba(251,113,133,0.85)] cosmos-moon-glow"
                                    style={{ animationDelay: '1.05s' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2">
                    <div className="relative h-full w-full rounded-full cosmos-orbit-ring-outer" style={{ animationDelay: '-13s' }}>
                        <div
                            className="absolute left-[72%] top-[8%] h-4 w-4 rounded-full bg-white/90 shadow-[0_0_16px_rgba(255,255,255,0.95)] cosmos-moon-glow"
                            style={{ animationDelay: '1.9s' }}
                        />
                    </div>
                </div>
            </div>

            <Link href="/" className="relative z-10 flex w-fit items-center gap-3">
                <img
                    src="/images/logo.webp"
                    alt="ScanMySocial Logo"
                    className="h-11 w-11 rounded-2xl object-cover shadow-lg shadow-primary-500/30"
                />
                <img
                    src="/images/ScanMySocial.avif"
                    alt="ScanMySocial"
                    className="hidden h-10 w-auto object-contain invert brightness-0 sm:block"
                />
            </Link>

            <div className="relative z-10 max-w-lg space-y-6">
                <p className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-200">
                    <Sparkles className="h-3.5 w-3.5 text-primary-400" />
                    {badge}
                </p>
                <h1 className="text-5xl font-black leading-tight">
                    {title}
                    {subtitle && (
                        <span className="block bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                            {subtitle}
                        </span>
                    )}
                </h1>
                {description && (
                    <p className="text-xl font-medium leading-relaxed text-slate-300 font-monserrat">
                        {description}
                    </p>
                )}
            </div>

            {children && (
                <div className="relative z-10 pt-4">
                    {children}
                </div>
            )}
        </aside>
    );
}
