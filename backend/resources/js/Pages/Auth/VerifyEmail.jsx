import { useEffect, useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, MailCheck, ShieldCheck, Sparkles } from 'lucide-react';
import AuthAside from '@/Components/AuthAside';
import Button from '@/Components/Button';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});
    const { props } = usePage();
    const flashError = props?.flash?.error;
    const initialWaitSeconds = Math.max(
        0,
        Number(props?.flash?.verification_resend_wait_seconds ?? 0) || 0
    );
    const [waitSeconds, setWaitSeconds] = useState(initialWaitSeconds);

    useEffect(() => {
        setWaitSeconds(initialWaitSeconds);
    }, [initialWaitSeconds]);

    useEffect(() => {
        if (waitSeconds <= 0) {
            return undefined;
        }

        const timerId = window.setInterval(() => {
            setWaitSeconds((seconds) => (seconds > 0 ? seconds - 1 : 0));
        }, 1000);

        return () => window.clearInterval(timerId);
    }, [waitSeconds]);

    const submit = (e) => {
        e.preventDefault();

        if (waitSeconds > 0) {
            return;
        }

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Verify Email" />

            <div className="relative min-h-screen overflow-hidden bg-slate-100">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-300/40 blur-3xl" />
                    <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-accent-300/30 blur-3xl" />
                    <div className="absolute -bottom-28 left-1/3 h-96 w-96 rounded-full bg-primary-300/25 blur-3xl" />
                </div>

                <div className="relative min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                    <AuthAside
                        badge="Verification Required"
                        title="Check your inbox."
                        subtitle="Activate your account."
                        description="We sent a verification link to your email address. Click it to continue."
                    >
                        <div className="space-y-2 text-sm font-semibold text-slate-400">
                            <p className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                Email ownership verification
                            </p>
                            <p>Only verified accounts can access protected areas.</p>
                        </div>
                    </AuthAside>

                    <main className="flex min-h-screen items-start justify-center px-4 py-8 sm:px-8 sm:py-10 lg:items-center lg:px-14 lg:py-12">
                        <div className="w-full max-w-lg">
                            <Link href="/" className="mb-5 inline-flex items-center gap-3 lg:hidden">
                                <img
                                    src="/images/logo.webp"
                                    alt="ScanMySocial Logo"
                                    className="h-10 w-10 rounded-xl object-cover shadow-md shadow-primary-500/25"
                                />
                                <span className="text-xl font-black text-slate-900">ScanMySocial</span>
                            </Link>

                            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-2xl shadow-slate-300/40 backdrop-blur-sm sm:p-8">
                                <div className="mb-5 sm:mb-6">
                                    <p className="mb-2 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary-700">
                                        Verify Email
                                    </p>
                                    <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">One last step</h2>
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
                                        Click the link in your inbox. If you did not receive it, request another one.
                                    </p>
                                </div>

                                <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="flex items-start gap-2 text-sm font-semibold text-slate-600">
                                        <MailCheck className="mt-0.5 h-[18px] w-[18px] text-primary-600" />
                                        Check spam/promotions folder if the email is not visible in your main inbox.
                                    </p>
                                </div>

                                {status === 'verification-link-sent' && (
                                    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                                        A new verification link has been sent.
                                    </div>
                                )}

                                {flashError && (
                                    <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                                        {flashError}
                                    </div>
                                )}

                                <form onSubmit={submit} className="space-y-4">
                                    <Button variant="primary" isLoading={processing || waitSeconds > 0}
                                        type="submit"
                                        disabled={processing || waitSeconds > 0}
                                        className="group mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-accent-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                    >
                                        {processing
                                            ? 'Sending...'
                                            : waitSeconds > 0
                                                ? `Resend in ${waitSeconds}s`
                                                : 'Resend verification email'}
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </Button>
                                </form>

                                <p className="mt-6 text-center text-sm font-semibold text-slate-500">
                                    Need to switch accounts?{' '}
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="font-black text-rose-600 hover:text-rose-700"
                                    >
                                        Log out
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
