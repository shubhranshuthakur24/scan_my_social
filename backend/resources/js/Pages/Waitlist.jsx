import React, { useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import GSAPLayout from '@/Layouts/GSAPLayout';
import PublicNavbar from '@/Components/PublicNavbar';
import PublicFooter from '@/Components/PublicFooter';
import { useToast } from '@/Contexts/ToastContext';
import { CheckCircle2, Sparkles, ArrowRight, Home } from 'lucide-react';

export default function Waitlist({ auth }) {
    const { addToast } = useToast();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false);

    const cardRef = useRef(null);
    const formRef = useRef(null);
    const prefersReducedMotion = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    useGSAP(() => {
        if (!cardRef.current) {
            return;
        }

        if (prefersReducedMotion) {
            gsap.set(cardRef.current, { opacity: 1, y: 0, scale: 1 });
            return;
        }

        gsap.fromTo(cardRef.current,
            { scale: 0.9, opacity: 0, y: 20 },
            {
                scale: 1,
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power4.out',
                delay: 0.2
            }
        );
    }, { scope: cardRef, dependencies: [prefersReducedMotion] });

    const handleJoinWaitlist = async (e) => {
        e.preventDefault();
        if (!email) {
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.post('/api/waitlist', { email });
            addToast(data?.message || 'Welcome to the inner circle!', 'success');
            setJoined(true);

            if (!prefersReducedMotion && formRef.current) {
                gsap.to(formRef.current, { opacity: 0, y: -10, duration: 0.4 });
            }
        } catch (error) {
            const emailErrors = error?.response?.data?.errors?.email;
            addToast(emailErrors?.[0] || 'Something went wrong. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GSAPLayout>
            <Head title="Join the Waitlist - ScanMySocial" />
            <PublicNavbar auth={auth} />

            <main className="min-h-screen flex items-center justify-center pt-24 pb-16 bg-[#FAFAFA] relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-100/30 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-100/30 rounded-full blur-[100px] pointer-events-none" />

                <div 
                    ref={cardRef}
                    className="max-w-xl w-full mx-4 relative z-10"
                >
                    <div className="bg-white rounded-[3rem] p-10 sm:p-16 border border-slate-100 shadow-2xl shadow-primary-500/5 text-center">
                        <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-10 shadow-lg shadow-primary-500/10">
                            <Sparkles size={32} />
                        </div>

                        {!joined ? (
                            <>
                                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                                    Join The <br /><span className="text-primary-600">Inner Circle.</span>
                                </h1>
                                <p className="text-lg text-slate-500 mb-10 leading-relaxed font-medium">
                                    We're currently in a private review phase. Join the waitlist to be first in line for our public launch.
                                </p>

                                <form ref={formRef} onSubmit={handleJoinWaitlist} className="space-y-4">
                                    <label htmlFor="waitlist-email" className="sr-only">
                                        Email address
                                    </label>
                                    <div className="relative group">
                                        <input
                                            id="waitlist-email"
                                            name="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            className="w-full px-8 py-5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 transition-all font-bold"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="absolute right-2 top-2 bottom-2 px-6 bg-primary-600 text-white rounded-xl font-black flex items-center gap-2 hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {loading ? 'Joining...' : (
                                                <>
                                                    Join <ArrowRight size={18} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">
                                        NO SPAM. JUST EXCLUSIVE ACCESS.
                                    </p>
                                </form>
                            </>
                        ) : (
                            <div className="py-10">
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                                    <CheckCircle2 size={48} />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 mb-4">You're on the list!</h2>
                                <p className="text-slate-500 mb-10 text-lg">We'll reach out as soon as a spot opens up for you.</p>
                                <Link 
                                    href="/" 
                                    className="inline-flex items-center gap-2 text-primary-600 font-bold hover:gap-3 transition-all"
                                >
                                    <Home size={18} /> Back to Home
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="mt-12 flex justify-center items-center gap-8 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">⚡</span>
                            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Creator OS</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🔄</span>
                            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">ScaleLoop</span>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </GSAPLayout>
    );
}
