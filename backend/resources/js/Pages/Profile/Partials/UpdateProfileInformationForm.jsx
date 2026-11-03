import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Button from '@/Components/Button';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import Icon from '@/Components/Icon';
import { Text } from '@/Components/Typography';
import { User as UserIcon } from 'lucide-react';
import { useRef } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const profileFieldOutlineClass = 'bg-white/50 border-slate-200 focus:border-primary-500/50 focus:ring-primary-500/20 rounded-2xl transition-all';
    const user = usePage().props.auth.user;
    const avatarInputRef = useRef(null);

    const { data, setData, patch, errors, processing, recentlySuccessful, isDirty } =
        useForm({
            name: user.name,
            bio: user.bio || '',
            username: user.username || '',
            email: user.email,
        });

    const submit = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    const uploadAvatar = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        router.post(route('profile.avatar.store'), { avatar: file }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                event.target.value = '';
            },
        });
    };

    const removeAvatar = () => {
        router.delete(route('profile.avatar.destroy'), { preserveScroll: true });
    };

    return (
        <section className={className}>
            <form onSubmit={submit} className="space-y-8">
                <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 overflow-hidden rounded-2xl bg-primary-50 shadow-sm ring-1 ring-slate-200">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-primary-500">
                                    <UserIcon size={32} />
                                </div>
                            )}
                        </div>
                        <div>
                            <Text weight="bold" className="text-slate-900">Profile Avatar</Text>
                            <Text variant="xs" className="mt-1 text-slate-500">JPG, PNG, or WebP up to 5MB.</Text>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <input ref={avatarInputRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
                        <Button type="button" variant="secondary" size="sm" onClick={() => avatarInputRef.current?.click()}>
                            Upload
                        </Button>
                        {user.avatar_url && (
                            <Button type="button" variant="outline" size="sm" onClick={removeAvatar} className="text-rose-600 hover:text-rose-700">
                                Remove
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <InputLabel htmlFor="name" value="Display Name" className="text-slate-700 font-bold ml-1" />

                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                <Icon name="user" size={18} />
                            </div>
                            <TextInput
                                id="name"
                                className={`w-full pl-11 ${profileFieldOutlineClass}`}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                isFocused
                                autoComplete="name"
                            />
                        </div>

                        <InputError className="mt-2" message={errors.name} />
                    </div>

                    <div className="space-y-2">
                        <InputLabel htmlFor="username" value="Username" className="text-slate-700 font-bold ml-1" />

                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                @
                            </div>
                            <TextInput
                                id="username"
                                className={`w-full pl-11 ${profileFieldOutlineClass}`}
                                value={data.username}
                                onChange={(e) => setData('username', e.target.value)}
                                required
                                autoComplete="username"
                            />
                        </div>

                        <InputError className="mt-2" message={errors.username} />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <InputLabel htmlFor="bio" value="Bio" className="text-slate-700 font-bold ml-1" />

                        <textarea
                            id="bio"
                            className={`w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${profileFieldOutlineClass}`}
                            value={data.bio}
                            onChange={(e) => setData('bio', e.target.value)}
                            rows={4}
                            maxLength={500}
                            placeholder="Tell people what you create and where to go next."
                        />

                        <InputError className="mt-2" message={errors.bio} />
                    </div>

                    <div className="space-y-2">
                        <InputLabel htmlFor="email" value="Email Address" className="text-slate-700 font-bold ml-1" />

                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Icon name="mail" size={18} />
                            </div>
                            <TextInput
                                id="email"
                                type="email"
                                className="w-full pl-11 bg-slate-50/50 border-slate-200 text-slate-500 cursor-not-allowed rounded-2xl"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                disabled
                                autoComplete="username"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="p-1 bg-emerald-50 text-emerald-600 rounded-full shadow-sm border border-emerald-100/50">
                                    <Icon name="check" size={12} />
                                </div>
                            </div>
                        </div>

                        <InputError className="mt-2" message={errors.email} />
                        <Text variant="xs" className="mt-2 text-slate-400 font-medium ml-1">Account email is verified and permanent.</Text>
                    </div>
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                        <div className="mt-0.5 text-amber-600">
                            <Icon name="alertCircle" size={18} />
                        </div>
                        <div>
                            <Text weight="bold" className="text-amber-900 text-sm">Action Required: Verify Email</Text>
                            <Text className="text-amber-700/80 text-xs mt-0.5">
                                Your email address is unverified and some features may be limited.
                                <Link
                                    href={route('verification.send')}
                                    method="post"
                                    as="button"
                                    className="ml-2 font-bold underline hover:text-amber-900 transition-colors"
                                >
                                    Re-send verification link
                                </Link>
                            </Text>
                            {status === 'verification-link-sent' && (
                                <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full inline-block">
                                    A new verification link has been sent!
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-6 pt-4">
                    <Button
                        type="submit"
                        isLoading={processing}
                        disabled={!isDirty}
                        variant="primary"
                        className="px-8"
                    >
                        Save Profile
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
                            <span className="text-sm font-bold tracking-tight">Changes Saved</span>
                        </div>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
