import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Button from '@/Components/Button';
import PasswordInput from '@/Components/PasswordInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';
import Icon from '@/Components/Icon';
import { Heading, Text } from '@/Components/Typography';

export default function UpdatePasswordForm({ className = '', requiresCurrentPassword = true }) {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
        isDirty,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current.focus();
                }

                if (requiresCurrentPassword && errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current.focus();
                }
            },
        });
    };

    const requirements = [
        { regex: /.{8,}/, text: "At least 8 characters" },
        { regex: /[A-Z]/, text: "One uppercase letter" },
        { regex: /[a-z]/, text: "One lowercase letter" },
        { regex: /[0-9]/, text: "One number" },
        { regex: /[^A-Za-z0-9]/, text: "One special character" },
    ];

    const getStrength = (password) => {
        if (!password) return { label: '', color: 'bg-slate-200', width: '0%', textClass: 'text-slate-400' };
        const passedCount = requirements.filter(req => req.regex.test(password)).length;
        if (passedCount <= 2) return { label: 'Weak', color: 'bg-rose-500', width: '33%', textClass: 'text-rose-600' };
        if (passedCount <= 4) return { label: 'Fair', color: 'bg-amber-500', width: '66%', textClass: 'text-amber-600' };
        return { label: 'Strong', color: 'bg-emerald-500', width: '100%', textClass: 'text-emerald-600' };
    };

    const strength = getStrength(data.password);

    return (
        <section className={className}>
            <form onSubmit={updatePassword} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-6">
                        {requiresCurrentPassword && (
                            <div className="space-y-2">
                                <InputLabel
                                    htmlFor="current_password"
                                    value="Current Password"
                                    className="text-slate-700 font-bold ml-1"
                                />

                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    value={data.current_password}
                                    onChange={(e) =>
                                        setData('current_password', e.target.value)
                                    }
                                    className="w-full bg-white/50 border-slate-200 focus:border-primary-500/50 focus:ring-primary-500/20 rounded-2xl transition-all"
                                    autoComplete="current-password"
                                />

                                <InputError
                                    message={errors.current_password}
                                    className="mt-2"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <InputLabel htmlFor="password" value={requiresCurrentPassword ? 'New Password' : 'Password'} className="text-slate-700 font-bold ml-1" />

                            <PasswordInput
                                id="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="w-full bg-white/50 border-slate-200 focus:border-primary-500/50 focus:ring-primary-500/20 rounded-2xl transition-all"
                                autoComplete="new-password"
                            />

                            <InputError message={errors.password} className="mt-2" />
                        </div>

                        <div className="space-y-2">
                            <InputLabel
                                htmlFor="password_confirmation"
                                value={requiresCurrentPassword ? 'Confirm New Password' : 'Confirm Password'}
                                className="text-slate-700 font-bold ml-1"
                            />

                            <PasswordInput
                                id="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) =>
                                    setData('password_confirmation', e.target.value)
                                }
                                className="w-full bg-white/50 border-slate-200 focus:border-primary-500/50 focus:ring-primary-500/20 rounded-2xl transition-all"
                                autoComplete="new-password"
                            />

                            <InputError
                                message={errors.password_confirmation}
                                className="mt-2"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-3xl">
                        <Text weight="bold" className="text-slate-800 text-sm mb-4 flex items-center gap-2">
                            <Icon name="shield" size={16} className="text-primary-500" />
                            Security Metrics
                        </Text>

                        <div className="space-y-6">
                            {/* Strength Meter */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                    <Text variant="xs" className="text-slate-500 font-bold uppercase tracking-wider">Password Strength</Text>
                                    <Text variant="xs" weight="black" className={`uppercase tracking-widest ${strength.textClass}`}>
                                        {strength.label || 'None'}
                                    </Text>
                                </div>
                                <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden flex gap-1">
                                    <div className={`h-full transition-all duration-500 rounded-full ${strength.color}`} style={{ width: strength.label ? '100%' : '0%', opacity: strength.label ? 1 : 0 }} />
                                </div>
                            </div>

                            {/* Requirements List */}
                            <div className="space-y-3">
                                <Text variant="xs" className="text-slate-400 font-bold uppercase tracking-wider mb-2">Requirements</Text>
                                <ul className="space-y-2.5">
                                    {requirements.map((req, index) => {
                                        const isMet = req.regex.test(data.password);
                                        return (
                                            <li key={index} className={`flex items-center gap-3 transition-colors duration-300 ${isMet ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${isMet ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100/50' : 'bg-slate-100 text-slate-300'}`}>
                                                    <Icon name={isMet ? 'check' : 'circle'} size={isMet ? 12 : 8} strokeWidth={isMet ? 3 : 2} />
                                                </div>
                                                <span className={`text-xs font-medium ${isMet ? 'font-bold' : ''}`}>{req.text}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 pt-4">
                    <Button
                        type="submit"
                        isLoading={processing}
                        disabled={!isDirty}
                        variant="primary"
                        className="px-8"
                    >
                        {requiresCurrentPassword ? 'Update Password' : 'Set Password'}
                    </Button>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out duration-300"
                        enterFrom="opacity-0 translate-x-4"
                        enterTo="opacity-100 translate-x-0"
                        leave="transition ease-in-out duration-300"
                        leaveTo="opacity-0 -translate-x-4"
                    >
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                            <Icon name="check" size={16} />
                            <span className="text-sm font-bold tracking-tight">Security Updated</span>
                        </div>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
