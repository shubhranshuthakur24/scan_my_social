import { useState } from 'react';
import InputError from '@/Components/InputError';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, Eye, EyeOff, Lock, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import AuthAside from '@/Components/AuthAside';

export default function ConfirmPassword() {
    const [showPassword, setShowPassword] = useState(false);
    const { props } = usePage();
    const { data, setData, post, processing, errors, reset, transform } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();

        transform((payload) => ({
            ...payload,
            _token: props.csrf_token,
        }));

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirm Password" />

            <div className="relative min-h-screen overflow-hidden bg-slate-100">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-300/40 blur-3xl" />
                    <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-accent-300/30 blur-3xl" />
                    <div className="absolute -bottom-28 left-1/3 h-96 w-96 rounded-full bg-primary-300/25 blur-3xl" />
                </div>

                <div className="relative min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                    <AuthAside
                        badge="Protected Action"
                        title="Confirm it is you."
                        subtitle="Continue securely."
                        description="For sensitive changes, we ask you to re-enter your password."
                    >
                        <div className="space-y-2 text-sm font-semibold text-slate-400">
                            <p className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                Identity confirmation checkpoint
                            </p>
                            <p>This keeps your account settings safe.</p>
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
                                        Security Check
                                    </p>
                                    <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Confirm password</h2>
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
                                        Please confirm your password before continuing.
                                    </p>
                                </div>

                                <form onSubmit={submit} className="space-y-4">
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
                                                isFocused={true}
                                                placeholder="Enter your password"
                                                onChange={(e) => setData('password', e.target.value)}
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

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="group mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-accent-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                    >
                                        {processing ? 'Confirming...' : 'Confirm password'}
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </GuestLayout>
    );
}
