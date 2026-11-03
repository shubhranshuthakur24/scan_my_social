import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/Button';
import EmptyState from '@/Components/EmptyState';
import KpiCard from '@/Components/common/KpiCard';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import Icon from '@/Components/Icon';

export default function Dashboard({ affiliateCode, walletBalance, availablePaisa, stats, referredUsers = [], transactions, payouts, bankDetails }) {
    const [copied, setCopied] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

    const bankForm = useForm({
        bank_name: bankDetails?.bank_name || '',
        account_number: bankDetails?.account_number || '',
        ifsc_code: bankDetails?.ifsc_code || '',
        account_holder_name: bankDetails?.account_holder_name || '',
    });

    const payoutForm = useForm({
        amount: '',
    });

    const referralPath = `/?ref=${encodeURIComponent(affiliateCode || '')}`;
    const referralLink = typeof window === 'undefined'
        ? referralPath
        : `${window.location.origin}${referralPath}`;

    const handleCopy = () => {
        if (typeof navigator === 'undefined' || !navigator.clipboard) {
            return;
        }

        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const submitBankDetails = (e) => {
        e.preventDefault();
        bankForm.post(route('affiliate.wallet.bank-details'), {
            preserveScroll: true,
            onSuccess: () => {
                setIsBankModalOpen(false);
            }
        });
    };

    const submitPayout = (e) => {
        e.preventDefault();
        payoutForm.transform((data) => ({
            ...data,
            amount: data.amount * 100,
        }));
        payoutForm.post(route('affiliate.wallet.payout'), {
            preserveScroll: true,
            onSuccess: () => {
                payoutForm.reset();
                setIsPayoutModalOpen(false);
            },
        });
    };

    const formatRupees = (paisa) => `₹${(paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'Unknown';
    const statusClass = (status) => {
        if (status === 'rewarded') {
            return 'bg-emerald-100 text-emerald-700';
        }

        if (status === 'qualified') {
            return 'bg-amber-100 text-amber-700';
        }

        return 'bg-slate-100 text-slate-600';
    };

    return (
        <AuthenticatedLayout>
            <Head title="Affiliate Dashboard" />

            <div className="mx-auto max-w-6xl space-y-5">

                <PageBanner
                    title="Affiliate Dashboard"
                    description="Track referrals, recurring commissions, and payout requests in one place."
                    variant="soft"
                >
                    <PageBannerAction
                        onClick={handleCopy}
                        variant={copied ? 'success' : 'neutralPrimary'}
                    >
                        <Icon name={copied ? 'check' : 'copy'} size={16} />
                        {copied ? 'Copied' : 'Copy Affiliate Link'}
                    </PageBannerAction>
                    <PageBannerAction onClick={() => setIsBankModalOpen(true)} variant="neutralSecondary">
                        <Icon name="settings" size={16} />
                        Bank Settings
                    </PageBannerAction>
                    <PageBannerAction onClick={() => setIsPayoutModalOpen(true)} variant="primary">
                        <Icon name="arrow-up-right" size={16} />
                        Withdraw Funds
                    </PageBannerAction>
                </PageBanner>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">Your Affiliate Link</h2>
                            <p className="mt-1 text-sm font-medium text-slate-500">Share this URL to start earning recurring commissions.</p>
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={handleCopy} icon={<Icon name={copied ? 'check' : 'copy'} size={16} />}>
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                    </div>
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <p className="break-all font-mono text-xs font-semibold text-slate-700 sm:text-sm" title={referralLink}>{referralLink}</p>
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard
                        label="Lifetime Leads"
                        value={stats.captured}
                        helper="Users who joined via your link"
                        icon={<Icon name="users" className="h-5 w-5" />}
                    />
                    <KpiCard
                        label="Paid Conversions"
                        value={stats.rewarded}
                        helper="Customers generating revenue"
                        icon={<Icon name="badgeCheck" className="h-5 w-5" />}
                        variant="warning"
                    />
                    <KpiCard
                        label="Total Earnings"
                        value={formatRupees(walletBalance)}
                        helper={`${formatRupees(availablePaisa)} available`}
                        icon={<Icon name="landmark" className="h-5 w-5" />}
                        variant="dark"
                    />
                    <div className="flex h-full flex-col justify-between rounded-2xl border border-primary-200 bg-primary-50 p-5 shadow-sm">
                        <div className="space-y-1">
                            <h3 className="text-base font-black text-primary-900">Ready to cash out?</h3>
                            <p className="text-sm font-medium text-primary-700">Request a payout once you hit the ₹500 threshold.</p>
                        </div>
                        <Button type="button" className="mt-4 w-full" icon={<Icon name="arrow-up-right" size={16} />} onClick={() => setIsPayoutModalOpen(true)}>
                            Withdraw Funds
                        </Button>
                    </div>
                </div>

                <div className="space-y-5">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">Referred Users</h3>
                                    <p className="mt-0.5 text-xs font-medium text-slate-400">People who signed up with your affiliate link</p>
                                </div>
                                <Icon name="users" size={16} className="text-slate-400" />
                            </div>

                            {referredUsers.length === 0 ? (
                                <EmptyState
                                    variant="transparent"
                                    className="p-8"
                                    icon={() => <Icon name="users" className="h-7 w-7 text-primary-500" />}
                                    title="No referred users yet"
                                    description="New signups from your affiliate link will appear here."
                                />
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {referredUsers.map((referredUser) => (
                                        <div key={referredUser.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-sm font-black text-primary-600">
                                                    {referredUser.name?.charAt(0)?.toUpperCase() || 'U'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-black text-slate-900">{referredUser.name || 'Unknown User'}</p>
                                                    <p className="truncate text-xs font-medium text-slate-400">{referredUser.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                                                <div className="text-left sm:text-right">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Joined</p>
                                                    <p className="text-xs font-bold text-slate-700">{formatDate(referredUser.joined_at)}</p>
                                                </div>
                                                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusClass(referredUser.status)}`}>
                                                    {referredUser.is_paid_conversion ? 'Paid' : referredUser.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Commissions Table */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 className="font-black text-slate-900 text-sm">Commission History</h3>
                                    <Icon name="history" size={16} className="text-slate-400" />
                                </div>
                                <div className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-[230px]">
                                    {transactions.length === 0 ? (
                                        <EmptyState
                                            variant="transparent"
                                            className="p-8"
                                            icon={() => <Icon name="coins" className="h-7 w-7 text-primary-500" />}
                                            title="No earnings recorded yet"
                                            description="Commission credits will appear after successful paid conversions."
                                        />
                                    ) : (
                                        transactions.map(tx => (
                                            <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                        <Icon name="arrow-down-left" size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Recurring Payout</p>
                                                        <p className="text-[10px] text-slate-400 font-medium">{new Date(tx.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-black text-emerald-600">
                                                    +{formatRupees(tx.amount)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Withdrawal History */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 className="font-black text-slate-900 text-sm">Recent Payouts</h3>
                                    <Icon name="landmark" size={16} className="text-slate-400" />
                                </div>
                                <div className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-[230px]">
                                    {payouts.length === 0 ? (
                                        <EmptyState
                                            variant="transparent"
                                            className="p-8"
                                            icon={() => <Icon name="landmark" className="h-7 w-7 text-primary-500" />}
                                            title="No withdrawals requested yet"
                                            description="Payout requests will appear here once submitted."
                                        />
                                    ) : (
                                        payouts.map(pr => (
                                            <div key={pr.id} className="p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 tracking-tight">{formatRupees(pr.amount)}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(pr.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <div className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                                                    pr.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                                                    pr.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {pr.status}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                </div>

            </div>

            {/* Bank Details Modal */}
            {isBankModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in duration-200">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="flex items-center gap-3 text-lg font-black text-slate-900">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                                        <Icon name="landmark" size={20} />
                                    </div>
                                    Bank Settings
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsBankModalOpen(false)}
                                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                    aria-label="Close bank settings modal"
                                    title="Close"
                                >
                                    <Icon name="x" size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-5">
                            <form onSubmit={submitBankDetails} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bank Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={bankForm.data.bank_name}
                                        onChange={e => bankForm.setData('bank_name', e.target.value)}
                                        className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        placeholder="e.g. HDFC Bank"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">IFSC Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={bankForm.data.ifsc_code}
                                        onChange={e => bankForm.setData('ifsc_code', e.target.value.toUpperCase())}
                                        className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-primary-500/20 focus:border-primary-500 uppercase font-mono transition-all"
                                        placeholder="HDFC0001234"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Number</label>
                                    <input
                                        type="text"
                                        required
                                        value={bankForm.data.account_number}
                                        onChange={e => bankForm.setData('account_number', e.target.value)}
                                        className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-primary-500/20 focus:border-primary-500 font-mono transition-all"
                                        placeholder="000123456789"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Holder Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={bankForm.data.account_holder_name}
                                        onChange={e => bankForm.setData('account_holder_name', e.target.value)}
                                        className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="flex flex-wrap justify-end gap-2 pt-2">
                                    <Button type="button" variant="secondary" onClick={() => setIsBankModalOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={bankForm.processing} isLoading={bankForm.processing}>
                                        {bankForm.processing ? 'Saving...' : 'Save Bank Details'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Payout Modal */}
            {isPayoutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in duration-200">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="text-lg font-black text-slate-900">Withdraw Funds</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsPayoutModalOpen(false)}
                                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                    aria-label="Close payout modal"
                                    title="Close"
                                >
                                    <Icon name="x" size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6 px-6 py-5">
                            <div className="flex justify-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
                                    <Icon name="arrow-up-right" size={32} />
                                </div>
                            </div>
                            
                            <div className="space-y-1 text-center">
                                <p className="text-sm font-medium text-slate-500">
                                    Available for payout: <span className="text-emerald-600 font-bold">{formatRupees(availablePaisa)}</span>
                                </p>
                            </div>

                            <form onSubmit={submitPayout} className="space-y-6 text-left">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount to Withdraw (in ₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">₹</span>
                                        <input
                                            type="number"
                                            min="500"
                                            required
                                            value={payoutForm.data.amount}
                                            onChange={e => payoutForm.setData('amount', e.target.value)}
                                            className="w-full pl-10 pr-4 py-5 bg-slate-50 border-slate-200 rounded-2xl text-2xl font-black focus:bg-white focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                                            placeholder="500"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Min. ₹500</p>
                                        <button 
                                            type="button"
                                            onClick={() => payoutForm.setData('amount', Math.floor(availablePaisa / 100))}
                                            className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                        >
                                            Withdraw All
                                        </button>
                                    </div>
                                    {payoutForm.errors.amount && <p className="text-xs text-rose-500 font-bold mt-2 uppercase tracking-tight">{payoutForm.errors.amount}</p>}
                                </div>

                                {!bankDetails?.bank_name ? (
                                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold flex items-start gap-3">
                                        <Icon name="alert-triangle" size={16} className="shrink-0" />
                                        <p>You need to set up your bank details before you can request a payout.</p>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paying to Account</p>
                                        <p className="text-xs font-bold text-slate-700">{bankDetails.bank_name} • {bankDetails.account_number.slice(-4).padStart(bankDetails.account_number.length, '•')}</p>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3">
                                    <Button
                                        type="submit"
                                        disabled={payoutForm.processing || !bankDetails?.bank_name || availablePaisa < 50000}
                                        isLoading={payoutForm.processing}
                                        variant="success"
                                        className="w-full"
                                    >
                                        {payoutForm.processing ? 'Processing...' : 'Confirm Withdrawal'}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setIsPayoutModalOpen(false)}
                                        variant="secondary"
                                        className="w-full"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
