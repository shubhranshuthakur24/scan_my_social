import React, { useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import MagneticButton from '@/Components/MagneticButton';
import { Menu, Rocket, X } from 'lucide-react';

export default function Navbar({ auth }) {
    const { reviewMode } = usePage().props;
    const canViewPrompts = Boolean(auth?.is_super_admin);
    const isHome = typeof window !== 'undefined' && window.location.pathname === '/';
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Determine the active section globally based on URL Path or internal state
    const [activeSection, setActiveSection] = useState(() => {
        if (typeof window === 'undefined') return '';
        if (window.location.pathname.includes('pricing')) return 'pricing';
        if (window.location.pathname.includes('prompts')) return 'prompts';
        if (isHome) return 'hero';
        return '';
    });

    useEffect(() => {
        if (!isHome) return;

        const navItems = ['hero', 'why-choose-us', 'how-it-works', 'features'];
        let timeoutId;

        const handleScroll = () => {
            let current = 'hero';
            for (const id of navItems) {
                const el = document.getElementById(id);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    // If the section top is at least 30% down the viewport, it is considered active
                    if (rect.top <= window.innerHeight * 0.3) {
                        current = id;
                    }
                }
            }
            setActiveSection(current);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        timeoutId = setTimeout(handleScroll, 100);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timeoutId);
        };
    }, [isHome]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const scrollToSection = (id) => {
        if (!isHome) {
            window.location.href = `/#${id}`;
            return;
        }
        const section = document.getElementById(id);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
        }
    };
    const handleSectionLinkClick = (event, id) => {
        if (isHome) {
            event.preventDefault();
            scrollToSection(id);
        }
    };
    const handleMobileSectionLinkClick = (event, id) => {
        if (isHome) {
            event.preventDefault();
            scrollToSection(id);
        }
        setMobileMenuOpen(false);
    };
    const renderWaitlistButtonInner = () => (
        <>
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.34),transparent_42%),radial-gradient(circle_at_82%_50%,rgba(125,211,252,0.24),transparent_44%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
            <span aria-hidden="true" className="pointer-events-none absolute -left-8 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-cyan-300/35 blur-xl transition-all duration-500 group-hover:left-[16%]" />
            <span aria-hidden="true" className="pointer-events-none absolute -right-8 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-sky-300/35 blur-xl transition-all duration-500 group-hover:right-[16%]" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.35)_50%,transparent_80%)] translate-x-[-145%] transition-transform duration-700 group-hover:translate-x-[145%]" />
            <span className="relative z-10 inline-flex items-center justify-center gap-2">
                Join Waitlist
                <Rocket size={16} className="shrink-0" />
            </span>
        </>
    );

    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md border-b border-white/10 transition-all duration-300">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-3 group">
                    <img
                        src="/images/logo.webp"
                        alt="ScanMySocial Logo"
                        className="h-11 w-11 rounded-sm object-cover shadow-lg shadow-primary-500/25 transition-transform duration-300 group-hover:scale-110"
                        width="44"
                        height="44"
                    />
                    <img
                        src="/images/ScanMySocial.avif"
                        alt="ScanMySocial"
                        className="h-14 w-auto object-contain drop-shadow-sm"
                    />
                </Link>

                {/* Pill Nav */}
                <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-zinc-950 p-1 backdrop-blur-md md:flex">
                    <a
                        href="/#hero"
                        onClick={(event) => handleSectionLinkClick(event, 'hero')}
                        className={`relative rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeSection === 'hero' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        Home
                        {activeSection === 'hero' && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                    </a>
                    <a
                        href="/#why-choose-us"
                        onClick={(event) => handleSectionLinkClick(event, 'why-choose-us')}
                        className={`relative rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeSection === 'why-choose-us' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        Why Us
                        {activeSection === 'why-choose-us' && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                    </a>
                    <a
                        href="/#how-it-works"
                        onClick={(event) => handleSectionLinkClick(event, 'how-it-works')}
                        className={`relative rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeSection === 'how-it-works' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        How It Works
                        {activeSection === 'how-it-works' && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                    </a>
                    <a
                        href="/#features"
                        onClick={(event) => handleSectionLinkClick(event, 'features')}
                        className={`relative rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeSection === 'features' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        Features
                        {activeSection === 'features' && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                    </a>

                    <Link
                        href={route('pricing')}
                        className={`relative rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeSection === 'pricing'
                            ? 'bg-white/10 text-white'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        Pricing
                        {activeSection === 'pricing' && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                    </Link>
                    {!reviewMode && canViewPrompts && (

                        <Link
                            href={route('viral-image-prompts.index')}
                            className={`relative rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${activeSection === 'prompts'
                                ? 'bg-white/10 text-white'
                                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            Prompts
                            {activeSection === 'prompts' && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                        </Link>
                    )}

                </div>

                {/* Desktop Auth + Mobile Trigger */}
                <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-3">
                        {auth?.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-xl border border-white/10 bg-zinc-950 px-5 py-2.5 text-sm font-bold text-zinc-300 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:text-zinc-900"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                {!reviewMode && (
                                    <MagneticButton
                                        as="Link"
                                        href={route('login')}
                                        className="rounded-xl border border-white/10 bg-zinc-950 px-5 py-2.5 text-sm font-bold text-zinc-300 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:text-zinc-900"
                                    >
                                        Sign In
                                    </MagneticButton>
                                )}

                                {reviewMode ? (
                                    <MagneticButton
                                        as="Link"
                                        href={route('waitlist')}
                                        className="group relative isolate overflow-hidden rounded-xl border border-cyan-300/40 bg-[linear-gradient(120deg,#0f172a,#111827)] px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(34,211,238,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_14px_30px_rgba(56,189,248,0.35)]"
                                    >
                                        {renderWaitlistButtonInner()}
                                    </MagneticButton>
                                ) : (
                                    <MagneticButton
                                        as="Link"
                                        href={route('register')}
                                        className="rounded-xl bg-white px-5 py-2.5 text-sm font-black text-zinc-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-zinc-200"
                                    >
                                        Get Started
                                    </MagneticButton>
                                )}
                            </>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        className="md:hidden inline-flex items-center justify-center rounded-xl border border-white/10 bg-zinc-950/90 p-2.5 text-zinc-200"
                        aria-expanded={mobileMenuOpen}
                        aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    >
                        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="md:hidden border-t border-white/10 bg-black/90 backdrop-blur-xl">
                    <div className="mx-auto w-full max-w-7xl px-4 py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <a
                                href="/#hero"
                                onClick={(event) => handleMobileSectionLinkClick(event, 'hero')}
                                className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200"
                            >
                                Home
                            </a>
                            <a
                                href="/#why-choose-us"
                                onClick={(event) => handleMobileSectionLinkClick(event, 'why-choose-us')}
                                className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200"
                            >
                                Why Us
                            </a>
                            <a
                                href="/#how-it-works"
                                onClick={(event) => handleMobileSectionLinkClick(event, 'how-it-works')}
                                className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200"
                            >
                                How It Works
                            </a>
                            <a
                                href="/#features"
                                onClick={(event) => handleMobileSectionLinkClick(event, 'features')}
                                className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200"
                            >
                                Features
                            </a>
                            <Link
                                href={route('pricing')}
                                onClick={() => setMobileMenuOpen(false)}
                                className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-zinc-200"
                            >
                                Pricing
                            </Link>
                            {!reviewMode && canViewPrompts && (
                                <Link
                                    href={route('viral-image-prompts.index')}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="col-span-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-zinc-200"
                                >
                                    Prompts
                                </Link>
                            )}
                        </div>

                        <div className="h-px bg-white/10" />

                        <div className="grid grid-cols-1 gap-2">
                            {auth?.user ? (
                                <Link
                                    href={route('dashboard')}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-black text-zinc-900"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    {!reviewMode && (
                                        <Link
                                            href={route('login')}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-center text-sm font-bold text-zinc-200"
                                        >
                                            Sign In
                                        </Link>
                                    )}

                                    <Link
                                        href={reviewMode ? route('waitlist') : route('register')}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={reviewMode
                                            ? 'group relative isolate overflow-hidden rounded-lg border border-cyan-300/40 bg-[linear-gradient(120deg,#0f172a,#111827)] px-4 py-2.5 text-center text-sm font-black text-white shadow-[0_8px_20px_rgba(34,211,238,0.25)] transition-all duration-300 hover:border-cyan-200'
                                            : 'rounded-lg bg-white px-4 py-2.5 text-center text-sm font-black text-zinc-900'
                                        }
                                    >
                                        {reviewMode ? renderWaitlistButtonInner() : 'Get Started'}
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
