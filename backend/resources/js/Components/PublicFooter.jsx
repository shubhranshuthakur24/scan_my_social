import React, { useEffect, useRef } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Facebook, Instagram, Linkedin } from 'lucide-react';
import { toAbsoluteRoute } from '@/Utils/routeHelper';

gsap.registerPlugin(ScrollTrigger);

export default function PublicFooter() {
    const { props } = usePage();
    const footerRef = useRef(null);

    useEffect(() => {
        if (!footerRef.current) {
            return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            gsap.set(footerRef.current, { opacity: 1, y: 0 });
            return;
        }

        const tween = gsap.fromTo(footerRef.current,
            { opacity: 0, y: 30 },
            {
                opacity: 1, y: 0,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: footerRef.current,
                    start: 'top 92%',
                    toggleActions: 'play none none none',
                },
            }
        );

        return () => {
            tween.scrollTrigger?.kill();
            tween.kill();
        };
    }, []);

    return (
        <footer ref={footerRef} className="bg-white text-slate-900 pt-14 sm:pt-18 pb-10 border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_2fr_1fr] items-start">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <img
                                src="/images/logo.webp"
                                alt="Scan My Social Logo"
                                className="h-8 w-8 rounded-xl object-cover shadow-sm"
                                width="32"
                                height="32"
                            />
                            <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                                Scan My Social
                            </span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-semibold text-slate-900 leading-tight">
                            Create. Automate. Grow.
                        </p>

                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600 font-semibold">
                        <a href="/#how-it-works" className="hover:text-primary-600 transition-colors">How It Works</a>
                        <a href="/#auto-dm" className="hover:text-primary-600 transition-colors">Auto DM</a>
                        <Link href={toAbsoluteRoute('pricing')} className="hover:text-primary-600 transition-colors">Pricing</Link>
                        <Link href={toAbsoluteRoute('viral-image-prompts.index')} className="hover:text-primary-600 transition-colors">Prompts</Link>
                        <Link href="https://cal.com/ravikant-rathor/scan-my-social" className="hover:text-primary-600 transition-colors">Book A Call</Link>
                        <Link href="/privacy-policy" className="hover:text-primary-600 transition-colors">Privacy Policy</Link>
                        <Link href={toAbsoluteRoute('autodm.terms')} className="hover:text-primary-600 transition-colors">Terms of Service</Link>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                        <a href="https://www.instagram.com/scan_my_social" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 transition-all hover:border-transparent hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-rose-500 hover:to-purple-600 hover:text-white">
                            <Instagram className="w-3.5 h-3.5" />
                            Instagram
                        </a>
                        <a href="https://www.facebook.com/scanmysocial" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 transition-all hover:border-transparent hover:bg-[#1877F2] hover:text-white">
                            <Facebook className="w-3.5 h-3.5" />
                            Facebook
                        </a>
                        <a href="https://www.linkedin.com/company/scan-my-social/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 transition-all hover:border-transparent hover:bg-[#0077B5] hover:text-white">
                            <Linkedin className="w-3.5 h-3.5" />
                            LinkedIn
                        </a>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-100 text-xs text-slate-500 uppercase tracking-widest">
                    © 2026 Scan My Social. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
