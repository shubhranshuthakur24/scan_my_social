import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/Button';
import EmptyState from '@/Components/EmptyState';
import KpiCard from '@/Components/common/KpiCard';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import Icon from '@/Components/Icon';

export default function Dashboard({ referralCode, walletBalance, availablePaisa, stats, transactions, payouts }) {
    const [activeTab, setActiveTab] = useState('credits');
    const [copied, setCopied] = useState(false);

    // Redeem Credits Form
    const creditsForm = useForm({
        amount: '',
    });

    // Payout Request Form
    const payoutForm = useForm({
        amount: '',
        bank_details: {
            account_name: '',
            account_number: '',
            ifsc: '',
        }
    });

    const referralPath = `/register?ref=${encodeURIComponent(referralCode || '')}`;
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

    const submitCredits = (e) => {
        e.preventDefault();

        creditsForm.transform((data) => ({
            ...data,
            amount: data.amount * 100,
        }));

        creditsForm.post(route('referrals.redeem_credits'), {
            preserveScroll: true,
            onSuccess: () => creditsForm.reset(),
        });
    };

    const submitPayout = (e) => {
        e.preventDefault();

        payoutForm.transform((data) => ({
            ...data,
            amount: data.amount * 100,
        }));

        payoutForm.post(route('referrals.request_payout'), {
            preserveScroll: true,
            onSuccess: () => payoutForm.reset(),
        });
    };

    const formatRupees = (paisa) => `₹${(paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    return (
        <AuthenticatedLayout>
            <Head title="Refer & Earn" />

            <div className="mx-auto max-w-6xl space-y-5">
                <PageBanner
                    title="Refer & Earn"
                    description="Invite creators to Scan My Social. You earn wallet cash when their paid subscription is confirmed."
                    variant="soft"
                >
                    <PageBannerAction
                        onClick={handleCopy}
                        variant={copied ? 'success' : 'neutralPrimary'}
                    >
                        <Icon name={copied ? 'check' : 'copy'} size={16} />
                        {copied ? 'Copied' : 'Copy Invite Link'}
                    </PageBannerAction>
                </PageBanner>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">Your Invite Link</h2>
                            <p className="mt-1 text-sm font-medium text-slate-500">Share this URL in your bio, messages, or content.</p>
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={handleCopy} icon={<Icon name={copied ? 'check' : 'copy'} size={16} />}>
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                    </div>
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <p className="break-all font-mono text-xs font-semibold text-slate-700 sm:text-sm" title={referralLink}>{referralLink}</p>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-slate-900">
                        <Icon name="info" size={16} className="text-primary-500" />
                        How Referrals Work
                    </h2>
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            ['Share Link', 'Copy your unique invite URL and share it with your audience.'],
                            ['Friends Join', 'They register with your link and get an exclusive signup discount.'],
                            ['Earn Bounty', 'When their payment is confirmed, your wallet is credited.'],
                            ['Redeem Cash', 'Convert to credits or request bank payout when eligible.'],
                        ].map(([title, description], index) => (
                            <article key={title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-primary-200 bg-white text-xs font-black text-primary-600">
                                    {index + 1}
                                </span>
                                <h3 className="mt-3 text-sm font-black text-slate-900">{title}</h3>
                                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <KpiCard
                        label="Clicks & Captures"
                        value={stats.captured}
                        helper="Friends joined but unpaid"
                        icon={<Icon name="users" className="h-5 w-5" />}
                        variant="default"
                    />
                    <KpiCard
                        label="Qualified Payouts"
                        value={stats.rewarded}
                        helper="Confirmed successful upgrades"
                        icon={<Icon name="badge-dollar-sign" className="h-5 w-5" />}
                        variant="primary"
                    />
                    <KpiCard
                        label="Total Wallet Cash"
                        value={formatRupees(walletBalance)}
                        helper={`${formatRupees(availablePaisa)} available now`}
                        icon={<Icon name="landmark" className="h-5 w-5" />}
                        variant="dark"
                    />
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50/80 p-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Button
                                type="button"
                                onClick={() => setActiveTab('credits')}
                                variant={activeTab === 'credits' ? 'primary' : 'secondary'}
                                className="w-full"
                                icon={<Icon name="coins" size={16} />}
                            >
                                Instant Usage Credits
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setActiveTab('bank')}
                                variant={activeTab === 'bank' ? 'primary' : 'secondary'}
                                className="w-full"
                                icon={<Icon name="landmark" size={16} />}
                            >
                                Request Bank Payout
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8">
                        {activeTab === 'credits' && (
                            <form onSubmit={submitCredits} className="mx-auto max-w-md space-y-6">
                                <div className="space-y-2 text-center">
                                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                                        <Icon name="refreshCw" size={20} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900">Exchange for Credits</h3>
                                    <p className="text-sm font-medium text-slate-500">Instantly convert wallet cash into ScanMySocial generation credits. Ratio: ₹1 = 1 Credit.</p>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">Amount to Convert (in ₹)</label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-slate-400">₹</span>
                                        <input
                                            type="number"
                                            min="500"
                                            required
                                            value={creditsForm.data.amount}
                                            onChange={(e) => creditsForm.setData('amount', e.target.value)}
                                            placeholder="e.g. 500"
                                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-8 pr-4 font-medium outline-none transition-shadow focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                                        />
                                    </div>
                                    {creditsForm.errors.amount && <p className="mt-2 text-sm font-medium text-rose-500">{creditsForm.errors.amount}</p>}
                                </div>

                                <Button type="submit" disabled={creditsForm.processing} isLoading={creditsForm.processing} className="w-full" icon={<Icon name="coins" size={16} />}>
                                    {creditsForm.processing ? 'Processing...' : 'Redeem Credits Instantly'}
                                </Button>
                            </form>
                        )}

                        {activeTab === 'bank' && (
                            <form onSubmit={submitPayout} className="mx-auto max-w-md space-y-5">
                                <div className="space-y-2 text-center">
                                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                                        <Icon name="landmark" size={20} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900">Withdraw to Bank</h3>
                                    <p className="text-sm font-medium text-slate-500">Initiate a secure NEFT/IMPS payout. Minimum withdrawal is ₹500.</p>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-bold text-slate-700">Amount to Withdraw (in ₹)</label>
                                    <div className="relative">
                                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-slate-400">₹</span>
                                        <input
                                            type="number"
                                            min="500"
                                            required
                                            value={payoutForm.data.amount}
                                            onChange={(e) => payoutForm.setData('amount', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-4 font-medium outline-none transition-shadow focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                                        />
                                    </div>
                                    {payoutForm.errors.amount && <p className="mt-1.5 text-sm font-medium text-rose-500">{payoutForm.errors.amount}</p>}
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">Account Holder Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={payoutForm.data.bank_details.account_name}
                                            onChange={(e) => payoutForm.setData('bank_details', { ...payoutForm.data.bank_details, account_name: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">Account Number</label>
                                        <input
                                            type="text"
                                            required
                                            value={payoutForm.data.bank_details.account_number}
                                            onChange={(e) => payoutForm.setData('bank_details', { ...payoutForm.data.bank_details, account_number: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-600">IFSC Code</label>
                                        <input
                                            type="text"
                                            required
                                            value={payoutForm.data.bank_details.ifsc}
                                            onChange={(e) => payoutForm.setData('bank_details', { ...payoutForm.data.bank_details, ifsc: e.target.value.toUpperCase() })}
                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm uppercase outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                                        />
                                    </div>
                                </div>

                                <Button type="submit" disabled={payoutForm.processing} isLoading={payoutForm.processing} variant="secondary" className="mt-4 w-full" icon={<Icon name="landmark" size={16} />}>
                                    {payoutForm.processing ? 'Submitting...' : 'Request ₹ Bank Payout'}
                                </Button>
                            </form>
                        )}
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">Ledger History</h3>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Verified Immutable</span>
                        </div>
                        <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto">
                            {transactions.length === 0 ? (
                                <EmptyState
                                    variant="transparent"
                                    className="p-8"
                                    icon={() => <Icon name="history" className="h-7 w-7 text-primary-500" />}
                                    title="No ledger entries yet"
                                    description="New earnings and redemptions will appear here."
                                />
                            ) : (
                                transactions.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tx.amount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                <Icon name={tx.amount > 0 ? 'arrow-down-left' : 'arrow-up-right'} size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold capitalize tracking-tight text-slate-900">{tx.type.replace('_', ' ')}</p>
                                                <p className="font-mono text-xs text-slate-400">Bal: {formatRupees(tx.balance_after)}</p>
                                            </div>
                                        </div>
                                        <div className={`text-right text-sm font-black ${tx.amount > 0 ? 'text-emerald-500' : 'text-slate-700'}`}>
                                            {tx.amount > 0 ? '+' : ''}{formatRupees(tx.amount)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-4">
                            <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">Payout Requests</h3>
                        </div>
                        <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto">
                            {payouts.length === 0 ? (
                                <EmptyState
                                    variant="transparent"
                                    className="p-8"
                                    icon={() => <Icon name="landmark" className="h-7 w-7 text-primary-500" />}
                                    title="No payout requests mapped"
                                    description="Requested payouts will appear here once submitted."
                                />
                            ) : (
                                payouts.map((pr) => (
                                    <div key={pr.id} className="flex items-center justify-between p-4">
                                        <div>
                                            <p className="text-sm font-black tracking-tight text-slate-900">{formatRupees(pr.amount)}</p>
                                            <p className="mt-0.5 text-xs font-medium text-slate-500">Mapped to Bank Account</p>
                                        </div>
                                        <div
                                            className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                                                pr.status === 'pending'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : pr.status === 'approved'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : pr.status === 'paid'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-rose-100 text-rose-700'
                                            }`}
                                        >
                                            {pr.status}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
