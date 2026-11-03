import { useState } from 'react';
import InputError from '@/Components/InputError';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import Button from '@/Components/Button';
import SocialProofBadge from '@/Components/SocialProofBadge';
import AuthAside from '@/Components/AuthAside';

export default function Login({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Sign In" />

            <div className="relative min-h-screen overflow-hidden bg-slate-100">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-300/30 blur-3xl lg:opacity-100 opacity-60" />
                    <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-accent-300/20 blur-3xl lg:opacity-100 opacity-60" />
                    <div className="absolute -bottom-28 left-1/3 h-96 w-96 rounded-full bg-primary-300/20 blur-3xl lg:opacity-100 opacity-60" />
                </div>

                <div className="relative min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                    <AuthAside
                        badge="Creator Intelligence"
                        title="Welcome to"
                        subtitle="Scan My Social"
                        description="Track what works, spot trends early, and make faster content decisions with real performance data."
                    >
                        <SocialProofBadge />
                    </AuthAside>

                    <main className="flex min-h-screen items-start justify-center px-4 py-6 sm:px-8 sm:py-10 lg:items-center lg:px-14 lg:py-12">
                        <div className="w-full max-w-lg">
                            <Link href="/" className="mb-4 inline-flex items-center gap-3 lg:hidden">
                                <img
                                    src="/images/logo.webp"
                                    alt="ScanMySocial Logo"
                                    className="h-9 w-9 rounded-xl object-cover shadow-md shadow-primary-500/25"
                                />
                                <img
                                    src="/images/ScanMySocial.avif"
                                    alt="ScanMydSocial"
                                    className="h-10 w-auto object-contain brightness-0 sm:block"
                                />
                            </Link>

                            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-2xl shadow-slate-300/40 backdrop-blur-sm sm:p-8">
                                <div className="mb-5 sm:mb-6">
                                    <div className="mb-3 flex flex-col gap-3 sm:mb-3 sm:flex-row sm:items-center sm:justify-between lg:block">
                                        <p className="inline-flex w-fit items-center rounded-full bg-primary-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-700">
                                            Sign In
                                        </p>
                                        <SocialProofBadge className="scale-75 origin-left lg:hidden py-1.5 px-3.5 bg-slate-900/5 border-slate-900/10 shadow-none !text-slate-900" />
                                    </div>
                                    <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Welcome back</h1>
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
                                        Log in to continue monitoring your channels and opportunities.
                                    </p>
                                </div>

                                {status && (
                                    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                                        {status}
                                    </div>
                                )}

                                <form onSubmit={submit} className="space-y-4 font-monserrat">
                                    <div>
                                        <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500" htmlFor="email">
                                            Email address
                                        </label>
                                        <div className="relative">
                                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                                            <TextInput
                                                id="email"
                                                type="email"
                                                name="email"
                                                value={data.email}
                                                className="block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/10"
                                                autoComplete="username"
                                                isFocused={true}
                                                placeholder="john@example.com"
                                                onChange={(e) => setData('email', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <InputError message={errors.email} className="mt-2" />
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500" htmlFor="password">
                                                Password
                                            </label>
                                            {canResetPassword && (
                                                <Link href={route('password.request')} className="text-xs font-bold text-primary-600 hover:text-primary-700">
                                                    Forgot password?
                                                </Link>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                                            <TextInput
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={data.password}
                                                className="block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/10"
                                                autoComplete="current-password"
                                                placeholder="Enter your password"
                                                onChange={(e) => setData('password', e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((prev) => !prev)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                                            </button>
                                        </div>
                                        <InputError message={errors.password} className="mt-2" />
                                    </div>

                                    <label className="inline-flex items-center gap-3 pt-1">
                                        <input
                                            type="checkbox"
                                            name="remember"
                                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500/30"
                                            checked={data.remember}
                                            onChange={(e) => setData('remember', e.target.checked)}
                                        />
                                        <span className="text-sm font-semibold text-slate-600">Keep me signed in</span>
                                    </label>
                                    <Button variant="primary" isLoading={processing}
                                        type="submit"
                                        disabled={processing}
                                        className="group mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-accent-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                    >
                                        {processing ? 'Signing in...' : 'Sign in to dashboard'}
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </Button>

                                    <div className="relative py-1.5" role="separator" aria-label="Alternative login options">
                                        <div className="h-px w-full bg-slate-200" />
                                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                                            Or
                                        </span>
                                    </div>

                                    <a
                                        href={route('auth.google')}
                                        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
                                    </a>
                                </form>

                                <p className="mt-6 text-center text-sm font-semibold text-slate-500">
                                    New here?{' '}
                                    <Link href={route('register')} className="font-black text-primary-600 hover:text-primary-700">
                                        Create your account
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </GuestLayout>
    );
}
