import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Button from '@/Components/Button';
import { Transition } from '@headlessui/react';
import { useForm, usePage } from '@inertiajs/react';
import Icon from '@/Components/Icon';
import { useToast } from '@/Contexts/ToastContext';

export default function UpdateBankDetailsForm({ className = '' }) {
    const { bankDetails } = usePage().props;
    const { addToast } = useToast();

    const { data, setData, post, errors, processing, recentlySuccessful, isDirty } = useForm({
        bank_name: bankDetails?.bank_name ?? '',
        account_number: bankDetails?.account_number ?? '',
        ifsc_code: bankDetails?.ifsc_code ?? '',
        account_holder_name: bankDetails?.account_holder_name ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('affiliate.wallet.bank-details'), {
            onSuccess: () => addToast('Bank details updated successfully!', 'success'),
            preserveScroll: true,
        });
    };

    return (
        <section className={className}>
            <form onSubmit={submit} className="space-y-8 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Bank Name */}
                    <div className="space-y-2">
                        <InputLabel htmlFor="bank_name" value="Bank Name" className="text-slate-700 font-bold ml-1" />
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                <Icon name="landmark" size={18} />
                            </div>
                            <input
                                id="bank_name"
                                type="text"
                                value={data.bank_name}
                                onChange={e => setData('bank_name', e.target.value)}
                                className="w-full pl-11 bg-white/50 border-slate-200 focus:border-primary-500/50 focus:ring-primary-500/20 rounded-2xl text-sm font-medium transition-all"
                                placeholder="e.g. HDFC Bank"
                                required
                            />
                        </div>
                        <InputError message={errors.bank_name} className="mt-2" />
                    </div>

                    {/* IFSC Code */}
                    <div className="space-y-2">
                        <InputLabel htmlFor="ifsc_code" value="IFSC Code" className="text-slate-700 font-bold ml-1" />
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                <Icon name="fileText" size={18} />
                            </div>
                            <input
                                id="ifsc_code"
                                type="text"
                                value={data.ifsc_code}
                                onChange={e => setData('ifsc_code', e.target.value.toUpperCase())}
                                className="w-full pl-11 bg-white/50 border-slate-200 focus:border-primary-500/50 focus:ring-primary-500/20 rounded-2xl text-sm font-medium uppercase font-mono transition-all"
                                placeholder="HDFC0001234"
                                required
                            />
                        </div>
                        <InputError message={errors.ifsc_code} className="mt-2" />
                    </div>

                    {/* Account Number */}
                    <div className="space-y-2">
                        <InputLabel htmlFor="account_number" value="Account Number" className="text-slate-700 font-bold ml-1" />
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                <Icon name="creditCard" size={18} />
                            </div>
                            <input
                                id="account_number"
                                type="text"
                                value={data.account_number}
                                onChange={e => setData('account_number', e.target.value)}
                                className="w-full pl-11 bg-white/50 border-slate-200 focus:border-primary-500/50 focus:ring-primary-500/20 rounded-2xl text-sm font-medium font-mono transition-all"
                                placeholder="000123456789"
                                required
                            />
                        </div>
                        <InputError message={errors.account_number} className="mt-2" />
                    </div>

                    {/* Account Holder Name */}
                    <div className="space-y-2">
                        <InputLabel htmlFor="account_holder_name" value="Account Holder Name" className="text-slate-700 font-bold ml-1" />
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                                <Icon name="user" size={18} />
                            </div>
                            <input
                                id="account_holder_name"
                                type="text"
                                value={data.account_holder_name}
                                onChange={e => setData('account_holder_name', e.target.value)}
                                className="w-full pl-11 bg-white/50 border-slate-200 focus:border-primary-500/50 focus:ring-primary-500/20 rounded-2xl text-sm font-medium transition-all"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <InputError message={errors.account_holder_name} className="mt-2" />
                    </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-6">
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

                    <Button
                        type="submit"
                        isLoading={processing}
                        disabled={!isDirty}
                        variant="primary"
                        className="px-8 shadow-lg shadow-primary-500/20"
                    >
                        Update Bank Details
                    </Button>
                </div>
            </form>
        </section>
    );
}
