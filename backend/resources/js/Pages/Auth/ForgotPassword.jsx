import InputError from '@/Components/InputError';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, Mail, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import AuthAside from '@/Components/AuthAside';

export default function ForgotPassword({ status }) {
    const { props } = usePage();
    const { data, setData, post, processing, errors, transform } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();

        transform((payload) => ({
            ...payload,
            _token: props.csrf_token,
        }));

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <div className="relative min-h-screen overflow-hidden bg-slate-100">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-300/40 blur-3xl" />
                    <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-accent-300/30 blur-3xl" />
                    <div className="absolute -bottom-28 left-1/3 h-96 w-96 rounded-full bg-primary-300/25 blur-3xl" />
                </div>

                <div className="relative min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                    <AuthAside
                        badge="Account Recovery"
                        title="Reset access quickly."
                        subtitle="Stay Secure."
                        description="Enter your email and we will send you a secure password reset link."
                    >
                        <div className="space-y-2 text-sm font-semibold text-slate-400">
                            <p className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                Security-first recovery flow
                            </p>
                            <p>Your account stays protected end-to-end.</p>
                        </div>
                    </AuthAside>

                    <main className="flex min-h-screen items-start justify-center px-4 py-8 sm:px-8 sm:py-10 lg:items-center lg:px-14 lg:py-12">
                        <div className="w-full max-w-lg">
                            <Link href="/" className="mb-5 inline-flex items-center gap-3 lg:hidden">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-600 to-accent-500 text-white shadow-md shadow-primary-500/25">
                                    <Rocket className="h-[18px] w-[18px]" />
                                </div>
                                <span className="text-xl font-black text-slate-900">ScanMySocial</span>
                            </Link>

                            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-2xl shadow-slate-300/40 backdrop-blur-sm sm:p-8">
                                <div className="mb-5 sm:mb-6">
                                    <p className="mb-2 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary-700">
                                        Reset Password
                                    </p>
                                    <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Forgot your password?</h2>
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
                                        No problem. We will email a password reset link to you.
                                    </p>
                                </div>

                                {status && (
                                    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                                        {status}
                                    </div>
                                )}

                                <form onSubmit={submit} className="space-y-4">
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
                                                isFocused={true}
                                                placeholder="john@example.com"
                                                onChange={(e) => setData('email', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <InputError message={errors.email} className="mt-2" />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="group mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-accent-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                    >
                                        {processing ? 'Sending link...' : 'Send reset link'}
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                </form>

                                <p className="mt-6 text-center text-sm font-semibold text-slate-500">
                                    Remembered your password?{' '}
                                    <Link href={route('login')} className="font-black text-primary-600 hover:text-primary-700">
                                        Back to sign in
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
