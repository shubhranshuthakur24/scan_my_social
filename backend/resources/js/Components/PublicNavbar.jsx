import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Menu, X, Zap, Home, Users, Layers, Sparkles, CreditCard, Image, ArrowRight } from 'lucide-react';
import { toAbsoluteRoute } from '@/Utils/routeHelper';

gsap.registerPlugin(ScrollTrigger);

const NAV_ITEMS = [
    { id: 'hero', label: 'Home', icon: Home, description: 'Back to top' },
    { id: 'how-it-works', label: 'How It Works', icon: Layers, description: '4 simple steps' },
    { id: 'auto-dm', label: 'Auto DM', icon: Sparkles, description: 'Auto DM flows' },
];

const TRACKED_SECTIONS = [
    ...NAV_ITEMS,
    { id: 'pricing' },
];

const getActiveSectionFromUrl = (currentUrl = '') => {
    if (currentUrl.startsWith('/pricing')) {
        return 'pricing';
    }

    if (currentUrl.startsWith('/viral-image-prompts')) {
        return 'prompts';
    }

    if (currentUrl === '/' || currentUrl.startsWith('/#')) {
        return 'hero';
    }

    return '';
};

function PublicNavbar({ auth }) {
    const { props, url } = usePage();
    const { reviewMode } = props;
    const navRef = useRef(null);
    const pillRef = useRef(null);
    const blobRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const navItemRefs = useRef({});
    const lastScrollYRef = useRef(0);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [navVisible, setNavVisible] = useState(true);
    const [activeSection, setActiveSection] = useState(() => getActiveSectionFromUrl(url));
    const isHome = url === '/';
    const routeActiveSection = getActiveSectionFromUrl(url);
    const effectiveActiveSection = isHome ? activeSection : routeActiveSection;
    const prefersReducedMotion = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Liquid blob: slide to active item ── */
    const moveBlob = useCallback((sectionId) => {
        const blob = blobRef.current;
        const pill = pillRef.current;
        const target = navItemRefs.current[sectionId];

        if (!blob || !pill || !target) return;

        const pillRect = pill.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        gsap.to(blob, {
            x: targetRect.left - pillRect.left,
            width: targetRect.width,
            height: targetRect.height,
            duration: prefersReducedMotion ? 0 : 0.55,
            ease: prefersReducedMotion ? 'none' : 'elastic.out(1, 0.5)',
        });
    }, [prefersReducedMotion]);

    /* ── GSAP: Transparent → Frosted Glass on scroll ── */
    useEffect(() => {
        if (!navRef.current) {
            return;
        }

        const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
        const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const shouldSkipScrollStyle = isMobileViewport || isCoarsePointer;

        if (shouldSkipScrollStyle) {
            ScrollTrigger.getAll()
                .filter((trigger) => trigger?.vars?.trigger === navRef.current)
                .forEach((trigger) => trigger.kill());
            navRef.current.removeAttribute('style');
            return () => {
                navRef.current?.removeAttribute('style');
            };
        }

        if (prefersReducedMotion) {
            gsap.set(navRef.current, {
                backgroundColor: 'rgba(255,255,255,0.92)',
                borderBottomColor: 'rgba(0,0,0,0.06)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 30px rgba(0,0,0,0.04)',
            });
            return;
        }

        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                start: 'top -80',
                onUpdate: (self) => {
                    const scrolled = self.scroll() > 80;
                    gsap.to(navRef.current, {
                        backgroundColor: scrolled ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0)',
                        borderBottomColor: scrolled ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0)',
                        backdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'blur(0px)',
                        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.04)' : 'none',
                        duration: 0.4,
                        ease: 'power2.out',
                    });
                },
            });
        }, navRef);

        return () => ctx.revert();
    }, [prefersReducedMotion]);

    /* ── GSAP: Stagger-in nav items + blob on mount ── */
    useEffect(() => {
        if (!pillRef.current) {
            return;
        }

        const initialSection = getActiveSectionFromUrl(url);

        if (prefersReducedMotion) {
            requestAnimationFrame(() => moveBlob(initialSection));
            return;
        }

        const ctx = gsap.context(() => {
            const items = Array.from(pillRef.current.children).filter(c => c !== blobRef.current);
            gsap.fromTo(items,
                { y: -10, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.06, duration: 0.5, delay: 0.3, ease: 'power3.out' }
            );

            if (blobRef.current) {
                gsap.fromTo(blobRef.current,
                    { opacity: 0, scale: 0.8 },
                    { opacity: 1, scale: 1, duration: 0.4, delay: 0.6, ease: 'back.out(2)' }
                );
            }
        }, pillRef);

        requestAnimationFrame(() => moveBlob(initialSection));
        return () => ctx.revert();
    }, [moveBlob, prefersReducedMotion, url]);

    /* ── GSAP: Animate mobile menu open/close ── */
    useEffect(() => {
        if (!mobileMenuRef.current) {
            return;
        }

        const menu = mobileMenuRef.current;
        const items = menu.querySelectorAll('.mobile-nav-item');
        const dividers = menu.querySelectorAll('.mobile-divider');
        const authBlock = menu.querySelector('.mobile-auth-block');

        if (prefersReducedMotion) {
            document.body.style.overflow = mobileOpen ? 'hidden' : '';

            if (mobileOpen) {
                gsap.set(menu, { clearProps: 'clipPath,webkitClipPath' });
                gsap.set(items, { x: 0, opacity: 1 });
                gsap.set(dividers, { scaleX: 1 });
                if (authBlock) {
                    gsap.set(authBlock, { y: 0, opacity: 1 });
                }
            }

            return () => {
                document.body.style.overflow = '';
            };
        }

        if (mobileOpen) {
            document.body.style.overflow = 'hidden';

            // Reset state before animation to ensure it starts from hidden
            gsap.set(menu, { clipPath: 'inset(0 0 100% 0)', webkitClipPath: 'inset(0 0 100% 0)' });
            gsap.set(items, { x: -30, opacity: 0 });
            gsap.set(dividers, { scaleX: 0 });

            gsap.to(menu, {
                clipPath: 'inset(0 0 0% 0)',
                webkitClipPath: 'inset(0 0 0% 0)',
                duration: 0.5,
                ease: 'power4.inOut'
            });

            gsap.to(items, {
                x: 0,
                opacity: 1,
                stagger: 0.08,
                duration: 0.5,
                delay: 0.2,
                ease: 'power3.out'
            });

            gsap.to(dividers, {
                scaleX: 1,
                stagger: 0.05,
                duration: 0.4,
                delay: 0.35,
                ease: 'power2.out'
            });

            if (authBlock) {
                gsap.fromTo(authBlock,
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.5, delay: 0.55, ease: 'power3.out' }
                );
            }
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileOpen, prefersReducedMotion]);

    /* ── Animate blob on section change ── */
    useEffect(() => {
        moveBlob(effectiveActiveSection);
    }, [effectiveActiveSection, moveBlob]);

    /* ── Scroll-based active section tracking ── */
    useEffect(() => {
        if (!isHome) return;

        let ticking = false;

        const handleScroll = () => {
            if (ticking) {
                return;
            }

            ticking = true;

            window.requestAnimationFrame(() => {
                let current = 'hero';
                for (const item of TRACKED_SECTIONS) {
                    const el = document.getElementById(item.id);
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        if (rect.top <= window.innerHeight * 0.3) {
                            current = item.id;
                        }
                    }
                }

                setActiveSection((previousSection) => {
                    if (previousSection === current) {
                        return previousSection;
                    }

                    return current;
                });

                ticking = false;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        setTimeout(handleScroll, 100);

        return () => {
            ticking = false;
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isHome]);

    useEffect(() => {
        let ticking = false;

        const handleDirectionScroll = () => {
            if (ticking) {
                return;
            }

            ticking = true;

            window.requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;
                const lastScrollY = lastScrollYRef.current;
                const scrollDelta = currentScrollY - lastScrollY;

                if (mobileOpen || currentScrollY <= 20) {
                    setNavVisible(true);
                } else if (scrollDelta > 6) {
                    setNavVisible(false);
                } else if (scrollDelta < -6) {
                    setNavVisible(true);
                }

                lastScrollYRef.current = currentScrollY;
                ticking = false;
            });
        };

        lastScrollYRef.current = window.scrollY;
        handleDirectionScroll();
        window.addEventListener('scroll', handleDirectionScroll, { passive: true });

        return () => {
            ticking = false;
            window.removeEventListener('scroll', handleDirectionScroll);
        };
    }, [mobileOpen]);

    /* ── Auto close mobile on resize ── */
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 768) setMobileOpen(false);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const scrollTo = (id) => {
        if (!isHome) {
            window.location.href = `/#${id}`;
            return;
        }
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleClick = (e, id) => {
        if (isHome) {
            e.preventDefault();
            scrollTo(id);
        }
    };

    const closeMobile = () => {
        if (prefersReducedMotion) {
            setMobileOpen(false);
            return;
        }

        const menu = mobileMenuRef.current;
        if (!menu) { setMobileOpen(false); return; }

        gsap.to(menu, {
            clipPath: 'inset(0 0 100% 0)',
            duration: 0.3,
            ease: 'power3.in',
            onComplete: () => setMobileOpen(false),
        });
    };

    const mobileItems = [
        ...NAV_ITEMS.map((item) => ({
            ...item,
            type: 'section',
        })),
        {
            id: 'pricing',
            label: 'Pricing',
            icon: CreditCard,
            description: 'Plans & billing',
            type: 'route',
            routeName: 'pricing',
        },
        !reviewMode ? {
            id: 'prompts',
            label: 'Prompts',
            icon: Image,
            description: 'AI image prompts',
            type: 'route',
            routeName: 'viral-image-prompts.index',
        } : null,
    ].filter(Boolean);

    return (
        <>
            <nav
                ref={navRef}
                className={`fixed top-0 left-0 right-0 z-[100] border-b border-transparent transition-[transform,background-color,border-color,box-shadow] duration-300 will-change-transform ${navVisible ? 'translate-y-0' : '-translate-y-full'}`}
            >
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    {/* Logo */}
                    <div className="flex items-center gap-6">
                        <Link href="/" className="flex items-center gap-3 group">
                            <img
                                src="/images/logo.webp"
                                alt="ScanMySocial Logo"
                                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
                                width="44"
                                height="44"
                            />
                            <img
                                src="/images/ScanMySocial.avif"
                                alt="ScanMySocial"
                                className="hidden h-10 w-auto object-contain brightness-0 sm:block"
                            />
                        </Link>
                    </div>

                    {/* Desktop Pill Nav with Liquid Blob */}
                    <div
                        ref={pillRef}
                        className="relative hidden items-center gap-0.5 rounded-full border border-slate-200/80 bg-white/70 backdrop-blur-lg p-1 shadow-sm md:flex"
                    >
                        {/* Liquid Blob */}
                        <div
                            ref={blobRef}
                            className="absolute top-1 left-0 rounded-full bg-primary-600 shadow-lg shadow-primary-500/30 pointer-events-none"
                            style={{ height: 'calc(100% - 8px)', willChange: 'transform, width' }}
                        />

                        {NAV_ITEMS.map((item) => (
                            <a
                                key={item.id}
                                ref={(el) => { navItemRefs.current[item.id] = el; }}
                                href={`/#${item.id}`}
                                onClick={(e) => handleClick(e, item.id)}
                                className={`relative z-10 rounded-full px-4 py-2 text-base font-bold uppercase tracking-wider transition-colors duration-300 ${effectiveActiveSection === item.id
                                    ? 'text-white'
                                    : 'text-slate-500 hover:text-slate-900'
                                    }`}
                            >
                                {item.label}
                            </a>
                        ))}
                        <Link
                            ref={(el) => { navItemRefs.current['pricing'] = el; }}
                            href={toAbsoluteRoute('pricing')}
                            className={`relative z-10 rounded-full px-4 py-2 text-base font-bold uppercase tracking-wider transition-colors duration-300 ${effectiveActiveSection === 'pricing'
                                ? 'text-white'
                                : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            Pricing
                        </Link>



                    </div>

                    {/* Desktop Auth + Mobile Toggle */}
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-3">
                            {auth?.user ? (
                                <Link
                                    href={toAbsoluteRoute('dashboard')}
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-base sm font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary-200"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    {!reviewMode && (
                                        <Link
                                            href={toAbsoluteRoute('login')}
                                            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-base font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary-200"
                                        >
                                            Sign In
                                        </Link>
                                    )}
                                    <Link
                                        href={reviewMode ? toAbsoluteRoute('waitlist') : toAbsoluteRoute('register')}
                                        className="group relative overflow-hidden rounded-xl bg-primary-600 px-5 py-2.5 text-base font-black text-white shadow-lg shadow-primary-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/35 hover:bg-primary-500"
                                    >
                                        <span className="relative z-10 inline-flex items-center gap-2">
                                            {reviewMode ? 'Join Waitlist' : 'Get Started'}
                                            <Zap size={14} className="shrink-0" />
                                        </span>
                                    </Link>
                                </>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => mobileOpen ? closeMobile() : setMobileOpen(true)}
                            className="md:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm p-2.5 text-slate-600 shadow-sm transition-all active:scale-95"
                            aria-expanded={mobileOpen}
                            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
                        >
                            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── Full-Screen Mobile Menu (Now sibling to nav to avoid transform-trap) ── */}
            {mobileOpen && (
                <div
                    ref={mobileMenuRef}
                    className="md:hidden fixed inset-0 bg-white z-[150]"
                    style={{ clipPath: 'inset(0 0 100% 0)' }}
                >
                    <div className="flex flex-col h-full">
                        {/* Menu Header (Logo + Close) */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/50">
                            <div className="flex items-center gap-3">
                                <img
                                    src="/images/logo.webp"
                                    alt="Logo"
                                    className="h-10 w-10 rounded-xl"
                                />
                                <img
                                    src="/images/ScanMySocial.avif"
                                    alt="ScanMySocial"
                                    className="h-12 w-auto object-contain brightness-0"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={closeMobile}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm"
                                aria-label="Close navigation"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Nav Items */}
                        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 mobile-nav-item">Navigate</p>

                            {mobileItems.map((item, index) => {
                                const Icon = item.icon;
                                const isActive = effectiveActiveSection === item.id;
                                return (
                                    <React.Fragment key={item.id}>
                                        {item.type === 'route' ? (
                                            <Link
                                                href={toAbsoluteRoute(item.routeName)}
                                                onClick={closeMobile}
                                                className={`mobile-nav-item group flex items-center gap-6 xs:py-4 py-6 px-4 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary-600 shadow-xl shadow-primary-500/20' : 'hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isActive
                                                    ? 'bg-white text-primary-600'
                                                    : 'bg-slate-100 text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600'
                                                    }`}>
                                                    <Icon size={24} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-3xl font-black leading-none ${isActive ? 'text-white' : 'text-slate-950'}`}>
                                                        {item.label}
                                                    </p>
                                                </div>
                                                <ArrowRight size={24} className={`transition-all ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-slate-600'
                                                    }`} />
                                            </Link>
                                        ) : (
                                            <a
                                                href={`/#${item.id}`}
                                                onClick={(e) => {
                                                    handleClick(e, item.id);
                                                    closeMobile();
                                                }}
                                                className={`mobile-nav-item group flex items-center gap-6 py-6 px-4 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary-600 shadow-xl shadow-primary-500/20' : 'hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isActive
                                                    ? 'bg-white text-primary-600'
                                                    : 'bg-slate-100 text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600'
                                                    }`}>
                                                    <Icon size={24} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-3xl font-black leading-none ${isActive ? 'text-white' : 'text-slate-950'}`}>
                                                        {item.label}
                                                    </p>
                                                </div>
                                                <ArrowRight size={24} className={`transition-all ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-slate-600'
                                                    }`} />
                                            </a>
                                        )}
                                        {index < mobileItems.length - 1 && (
                                            <div className="mobile-divider h-px bg-slate-100 mx-3 origin-left" />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {/* Auth Actions   Now part of scrollable content to guarantee visibility */}
                            <div className="mt-12 mb-8 mobile-nav-item">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Account</p>
                                {auth?.user ? (
                                    <Link
                                        href={toAbsoluteRoute('dashboard')}
                                        onClick={closeMobile}
                                        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-primary-600 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-primary-500/25 active:scale-[0.98] transition-all"
                                    >
                                        Dashboard
                                        <ArrowRight size={16} />
                                    </Link>
                                ) : (
                                    <div className="flex flex-col gap-3 px-2">
                                        <Link
                                            href={reviewMode ? toAbsoluteRoute('waitlist') : toAbsoluteRoute('register')}
                                            onClick={closeMobile}
                                            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-primary-600 px-5 py-5 text-lg font-black text-white shadow-lg shadow-primary-500/25 active:scale-[0.98] transition-all"
                                        >
                                            {reviewMode ? 'Join Waitlist' : 'Get Started Free'}
                                            <Zap size={20} />
                                        </Link>
                                        {!reviewMode && (
                                            <Link
                                                href={toAbsoluteRoute('login')}
                                                onClick={closeMobile}
                                                className="flex items-center justify-center w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-lg font-bold text-slate-700 active:scale-[0.98] transition-all"
                                            >
                                                Sign In
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default memo(PublicNavbar);
