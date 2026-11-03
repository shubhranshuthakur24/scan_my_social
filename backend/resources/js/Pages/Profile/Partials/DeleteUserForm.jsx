import Button from '@/Components/Button';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PasswordInput from '@/Components/PasswordInput';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import Icon from '@/Components/Icon';
import { Heading, Text } from '@/Components/Typography';

export default function DeleteUserForm({ className = '', requirePassword = true }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();
    const confirmInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
        confirm_text: '',
    });

    const canSubmitDeletion = requirePassword || data.confirm_text === 'CONFIRM';

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => {
                if (requirePassword) {
                    passwordInput.current?.focus();
                } else {
                    confirmInput.current?.focus();
                }
            },
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <div className="bg-rose-50/30 border border-rose-100 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <p className="text-rose-900 text-lg">Permanent Deletion</p>
                    <p className="text-rose-700/60 font-medium text-sm max-w-md">
                        Once your account is deleted, all of its resources and data will be permanently wiped.
                    </p>
                </div>
                <Button variant="danger" onClick={confirmUserDeletion} className="px-8 shadow-sm">
                    Delete Account
                </Button>
            </div>

            <Modal show={confirmingUserDeletion} onClose={closeModal} maxWidth="2xl">
                <form onSubmit={deleteUser} className="p-10 space-y-8 bg-mist grain-overlay">
                    <div className="flex items-center gap-4 text-rose-600">
                        <div className="p-3 bg-rose-100 rounded-2xl">
                            <Icon name="alertTriangle" size={28} />
                        </div>
                        <Heading level={2} className="text-2xl font-black text-rose-900 tracking-tight">
                            Confirm Account Deletion
                        </Heading>
                    </div>

                    <div className="p-6 bg-red-200 border border-rose-100 rounded-3xl shadow-sm space-y-4">
                        <Text weight="black" className="text-rose-800 flex items-center gap-2">
                            Critical Warning
                        </Text>
                        <Text className="text-rose-700/80  leading-relaxed font-medium">
                            This action is final and irreversible. All your image prompts, video analysis, and subscription data will be destroyed immediately.
                        </Text>
                    </div>

                    <div className="space-y-4">
                        {requirePassword ? (
                            <>
                                <InputLabel htmlFor="password" className="text-slate-600 font-bold ml-1">
                                    Please type your password to authorize this action:
                                </InputLabel>

                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors">
                                        <Icon name="lock" size={18} />
                                    </div>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        ref={passwordInput}
                                        value={data.password}
                                        onChange={(e) =>
                                            setData('password', e.target.value)
                                        }
                                        className="w-full pl-11 bg-white border-slate-200 focus:border-rose-500/50 focus:ring-rose-500/20 rounded-2xl transition-all"
                                        isFocused
                                        placeholder="Enter your password"
                                    />
                                </div>

                                <InputError
                                    message={errors.password}
                                    className="mt-2"
                                />
                            </>
                        ) : (
                            <>
                                <Text className="text-slate-600 font-bold ml-1">
                                    You signed in with Google. Type <span className="text-rose-700">CONFIRM</span> in all caps to continue.
                                </Text>

                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors">
                                        <Icon name="alertTriangle" size={18} />
                                    </div>
                                    <TextInput
                                        id="confirm_text"
                                        name="confirm_text"
                                        ref={confirmInput}
                                        value={data.confirm_text}
                                        onChange={(e) => setData('confirm_text', e.target.value)}
                                        className="w-full text-center bg-white border-slate-200 focus:border-rose-500/50 focus:ring-rose-500/20 rounded-2xl transition-all"
                                        placeholder="Type CONFIRM"
                                        autoComplete="off"
                                    />
                                </div>

                                <InputError
                                    message={errors.confirm_text}
                                    className="mt-2"
                                />
                            </>
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={closeModal} className="px-8 font-black">
                            No, keep my account
                        </Button>

                        <Button
                            variant="danger"
                            type="submit"
                            isLoading={processing}
                            disabled={processing || !canSubmitDeletion}
                            className="px-8 font-black"
                        >
                            Yes, delete everything
                        </Button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
