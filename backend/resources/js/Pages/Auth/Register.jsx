import { useState, useEffect } from 'react';
import InputError from '@/Components/InputError';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, User, Tag } from 'lucide-react';
import Button from '@/Components/Button';
import AuthAside from '@/Components/AuthAside';

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { props } = usePage();
    const { data, setData, post, processing, errors, reset, setError, clearErrors, transform } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        referral_code_present: false,
        referral_code: '',
    });

    const [showReferralField, setShowReferralField] = useState(false);

    useEffect(() => {
        const getCookie = (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        };

        const searchParams = new URLSearchParams(window.location.search);
        const referralCode = searchParams.get('ref') || getCookie('sms_referral_code');

        if (referralCode) {
            setData('referral_code', referralCode.toUpperCase());
            setData('referral_code_present', true);
            setShowReferralField(true);
        }
    }, []);

    const revealReferralField = () => {
        setShowReferralField(true);
        setData('referral_code_present', true);
    };

    const requirements = [
        { regex: /.{8,}/, text: 'At least 8 characters' },
        { regex: /[A-Z]/, text: 'One uppercase letter' },
        { regex: /[a-z]/, text: 'One lowercase letter' },
        { regex: /[0-9]/, text: 'One number' },
        { regex: /[^A-Za-z0-9]/, text: 'One special character' },
        { isMatch: true, text: 'Passwords match' },
    ];

    const getStrength = (password) => {
        if (!password) return { label: '', color: 'bg-slate-200', width: '0%', textClass: 'text-slate-400' };
        const passedCount = requirements.filter((req) => req.regex && req.regex.test(password)).length;
        if (passedCount <= 2) return { label: 'Weak', color: 'bg-rose-500', width: '33%', textClass: 'text-rose-600' };
        if (passedCount <= 4) return { label: 'Fair', color: 'bg-amber-500', width: '66%', textClass: 'text-amber-600' };
        return { label: 'Strong', color: 'bg-emerald-500', width: '100%', textClass: 'text-emerald-600' };
    };

    const strength = getStrength(data.password);

    const submit = (e) => {
        e.preventDefault();

        const isPasswordValid = requirements.every((req) => {
            if (req.isMatch) return data.password && data.password === data.password_confirmation;
            return data.password && req.regex.test(data.password);
        });

        if (!isPasswordValid) {
            setError('password', 'Please ensure your password meets all requirements.');
            return;
        }

        transform((payload) => ({
            ...payload,
            referral_code_present: showReferralField,
            _token: props.csrf_token,
        }));

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Create Account" />

            <div className="relative h-[100dvh] overflow-hidden bg-slate-100">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-300/40 blur-3xl" />
                    <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-accent-300/30 blur-3xl" />
                    <div className="absolute -bottom-28 left-1/3 h-96 w-96 rounded-full bg-primary-300/25 blur-3xl" />
                </div>

                <div className="relative h-full lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                    <AuthAside
                        badge="14-Day Trial"
                        title="Build your content edge."
                        subtitle="Start In Under A Minute."
                        description="Create your account and turn channel data into repeatable growth decisions."
                    >
                        <div className="space-y-2 text-sm font-semibold text-slate-400">
                            <p className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                Secure onboarding with password checks
                            </p>
                            <p>Used by creators, strategists, and social teams.</p>
                        </div>
                    </AuthAside>

                    <main className="flex h-full overflow-hidden items-start justify-center px-4 py-4 sm:px-8 sm:py-6 lg:items-center lg:px-14 lg:py-4">
                        <div className="w-full max-w-lg lg:[@media(max-height:920px)]:scale-[0.94] lg:[@media(max-height:920px)]:origin-center">
                            <Link href="/" className="mb-5 inline-flex items-center gap-3 lg:hidden">
                                <img
                                    src="/images/logo.webp"
                                    alt="ScanMySocial Logo"
                                    className="h-10 w-10 rounded-xl object-cover shadow-md shadow-primary-500/25"
                                />
                                <span className="text-xl font-black text-slate-900">ScanMySocial</span>
                            </Link>

                            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-2xl shadow-slate-300/40 backdrop-blur-sm sm:p-6">
                                <div className="mb-4 sm:mb-5">
                                    <p className="mb-2 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary-700">
                                        Sign Up
                                    </p>
                                    <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Create your account</h2>
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
                                        Set up your profile and start finding high-performing content opportunities.
                                    </p>
                                </div>

                                <form onSubmit={submit} className="space-y-3.5">
                                    <div>
                                        <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500" htmlFor="name">
                                            Full name
                                        </label>
                                        <div className="relative">
                                            <User className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                                            <TextInput
                                                id="name"
                                                name="name"
                                                value={data.name}
                                                className="block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/10"
                                                autoComplete="name"
                                                isFocused={true}
                                                placeholder="John Doe"
                                                onChange={(e) => setData('name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <InputError message={errors.name} className="mt-2" />
                                    </div>

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
                                                placeholder="john@example.com"
                                                onChange={(e) => setData('email', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <InputError message={errors.email} className="mt-2" />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500" htmlFor="password">
                                                Password
                                            </label>
                                            <div className="relative">
                                                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                                                <TextInput
                                                    id="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    name="password"
                                                    value={data.password}
                                                    className="block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/10"
                                                    autoComplete="new-password"
                                                    placeholder="Create password"
                                                    onChange={(e) => {
                                                        setData('password', e.target.value);
                                                        clearErrors('password');
                                                    }}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword((prev) => !prev)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                >
                                                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                                                </button>
                                            </div>
                                            <InputError message={errors.password} className="mt-2" />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500" htmlFor="password_confirmation">
                                                Confirm password
                                            </label>
                                            <div className="relative">
                                                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                                                <TextInput
                                                    id="password_confirmation"
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    name="password_confirmation"
                                                    value={data.password_confirmation}
                                                    className="block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/10"
                                                    autoComplete="new-password"
                                                    placeholder="Repeat password"
                                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                                                >
                                                    {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                                                </button>
                                            </div>
                                            <InputError message={errors.password_confirmation} className="mt-2" />
                                        </div>
                                    </div>

                                    {data.password && (
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Password strength</span>
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${strength.textClass}`}>{strength.label}</span>
                                            </div>
                                            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                                <div className={`h-full rounded-full transition-all duration-500 ${strength.color}`} style={{ width: strength.width }} />
                                            </div>

                                            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {requirements.map((req, index) => {
                                                    const isMet = req.isMatch
                                                        ? data.password && data.password_confirmation && data.password === data.password_confirmation
                                                        : req.regex.test(data.password);
                                                    const hasError = req.isMatch && data.password_confirmation && data.password !== data.password_confirmation;

                                                    return (
                                                        <li
                                                            key={index}
                                                            className={`flex items-center gap-2 text-[11px] font-bold transition-colors ${isMet ? 'text-emerald-600' : hasError ? 'text-rose-600' : 'text-slate-400'}`}
                                                        >
                                                            <span
                                                                className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${isMet ? 'border-emerald-300 bg-emerald-100 text-emerald-700' : hasError ? 'border-rose-300 bg-rose-100 text-rose-700' : 'border-slate-300 bg-white text-slate-400'}`}
                                                            >
                                                                {isMet ? '✓' : hasError ? '!' : '•'}
                                                            </span>
                                                            {req.text}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="mt-2 text-center">
                                        {!showReferralField ? (
                                            <button
                                                type="button"
                                                onClick={revealReferralField}
                                                className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-primary-600 transition-colors"
                                            >
                                                Have a referral code?
                                            </button>
                                        ) : (
                                            <div className="text-left animate-in fade-in slide-in-from-top-2 duration-300">
                                                <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-500" htmlFor="referral_code">
                                                    Referral Code (Optional)
                                                </label>
                                                <div className="relative">
                                                    <Tag className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                                                    <TextInput
                                                        id="referral_code"
                                                        name="referral_code"
                                                        value={data.referral_code}
                                                        className="block w-full rounded-2xl border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/10"
                                                        placeholder="Enter code"
                                                        onChange={(e) => setData('referral_code', e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                                <InputError message={errors.referral_code} className="mt-2" />
                                            </div>
                                        )}
                                    </div>

                                    <Button variant="primary" isLoading={processing}
                                        type="submit"
                                        disabled={processing}
                                        className="group mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-accent-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                    >
                                        {processing ? 'Creating account...' : 'Create account'}
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </Button>

                                    <div className="relative py-1.5">
                                        <div className="h-px w-full bg-slate-200" />
                                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
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
                                    Already have an account?{' '}
                                    <Link href={route('login')} className="font-black text-primary-600 hover:text-primary-700">
                                        Sign in
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
