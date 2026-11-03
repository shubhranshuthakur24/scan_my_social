import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

import Button from '@/Components/Button';
import Icon from '@/Components/Icon';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import KpiCard from '@/Components/common/KpiCard';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import { useToast } from '@/Contexts/ToastContext';

const classNames = (...classes) => classes.filter(Boolean).join(' ');

function BillingPanel({ children, className = '' }) {
    return (
        <section className={classNames('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
            {children}
        </section>
    );
}

function StatusBadge({ status }) {
    const normalizedStatus = String(status || '').toLowerCase();
    const badgeClasses = normalizedStatus === 'paid' || normalizedStatus === 'captured' || normalizedStatus === 'success'
        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
        : normalizedStatus === 'failed'
            ? 'border-rose-100 bg-rose-50 text-rose-700'
            : normalizedStatus === 'refunded' || normalizedStatus === 'cancelled'
                ? 'border-amber-100 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-slate-50 text-slate-600';

    return (
        <span className={classNames('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest', badgeClasses)}>
            <Icon name={normalizedStatus === 'failed' ? 'alertCircle' : 'check'} size={10} />
            {status}
        </span>
    );
}

function formatPlanName(planName) {
    if (!planName) {
        return 'No active plan';
    }

    return String(planName)
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatInvoiceDate(createdAt) {
    return new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getInvoiceIdentifier(invoice) {
    return invoice.razorpay_payment_id || `INV-${invoice.id.toString().padStart(6, '0')}`;
}

function InvoiceDownloadButton({ invoice, label = 'PDF' }) {
    const invoiceIdentifier = getInvoiceIdentifier(invoice);

    return (
        <Button
            variant="secondary"
            size="sm"
            className="text-primary-700 hover:border-primary-200 hover:bg-primary-50"
            onClick={() => window.open(route('settings.billing.invoices.download', invoice.id), '_blank')}
            aria-label={`Download invoice PDF for ${invoiceIdentifier}`}
            icon={<Icon name="download" size={16} />}
        >
            {label}
        </Button>
    );
}

export default function BillingHistory({ invoices, subscriptionStatus, subscriptionName }) {
    const [isCancelling, setIsCancelling] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const { addToast } = useToast();

    const subscriptionStatusLabel = subscriptionStatus === 'active'
        ? 'Active'
        : subscriptionStatus === 'cancelled'
            ? 'Cancelled'
            : 'No Active Plan';
    const isActivePaidSubscription = subscriptionStatus === 'active' && subscriptionName !== 'free';
    const planNameLabel = formatPlanName(subscriptionName);

    const handleCancel = () => {
        setIsCancelDialogOpen(true);
    };

    const confirmCancel = () => {
        setIsCancelling(true);
        router.post('/api/subscriptions/cancel', {}, {
            onFinish: () => {
                setIsCancelling(false);
                setIsCancelDialogOpen(false);
            },
            onSuccess: () => addToast('Your subscription has been cancelled.', 'success'),
            onError: () => addToast('Failed to cancel subscription. Please try again or contact support.', 'error'),
        });
    };

    return (
        <AuthenticatedLayout headerZClass="z-30">
            <Head title="Billing History" />

            <div className="mx-auto max-w-[1280px] space-y-5">
                <PageBanner
                    title="Billing history"
                    description="Review invoices, download receipts, and manage renewal status."
                    variant="neutral"
                    actions={(
                        <PageBannerAction
                            href={route('settings')}
                            variant="neutralSecondary"
                            aria-label="Back to Settings"
                        >
                            <Icon name="arrowLeft" size={16} />
                            Back to Settings
                        </PageBannerAction>
                    )}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <KpiCard
                        size="compact"
                        variant={subscriptionStatus === 'active' ? 'success' : subscriptionStatus === 'cancelled' ? 'warning' : 'default'}
                        label="Subscription"
                        value={subscriptionStatusLabel}
                        helper="Current renewal status"
                        icon={<Icon name="creditCard" />}
                        valueClassName="text-lg"
                    />
                    <KpiCard
                        size="compact"
                        label="Plan"
                        value={planNameLabel}
                        helper="Billing plan on record"
                        icon={<Icon name="shield" />}
                        valueClassName="text-lg"
                    />
                    <KpiCard
                        size="compact"
                        label="Invoices"
                        value={invoices.length}
                        helper="Receipts in this view"
                        icon={<Icon name="fileText" />}
                    />
                </div>

                <BillingPanel className="overflow-hidden">
                    <div className="flex flex-col justify-between gap-5 border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6 lg:flex-row lg:items-center">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-600 shadow-sm">
                                <Icon name="creditCard" size={24} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black tracking-tight text-slate-950">Invoice ledger</h2>
                                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                                    Download official PDF receipts for accounting and records.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                                <p className={classNames('text-sm font-black', subscriptionStatus === 'active' ? 'text-emerald-700' : 'text-slate-800')}>
                                    {subscriptionStatusLabel}
                                </p>
                            </div>

                            {isActivePaidSubscription && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                                    onClick={handleCancel}
                                    disabled={isCancelling}
                                    aria-label="Cancel subscription"
                                    icon={<Icon name="x" size={16} />}
                                >
                                    {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                                <Icon name="fileText" size={30} />
                            </div>
                            <h3 className="text-lg font-black tracking-tight text-slate-950">No invoices yet</h3>
                            <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                                Billing receipts will appear here after a paid subscription payment is recorded.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-white">
                                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Invoice ID</th>
                                            <th className="hidden px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 lg:table-cell">Plan / Service</th>
                                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {invoices.map((invoice) => {
                                            const invoiceIdentifier = getInvoiceIdentifier(invoice);

                                            return (
                                                <tr key={invoice.id} className="transition-colors hover:bg-slate-50/70">
                                                    <td className="px-6 py-5 align-top">
                                                        <div className="text-sm font-bold text-slate-800">
                                                            {formatInvoiceDate(invoice.created_at)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 align-top">
                                                        <div className="max-w-[220px] break-all font-mono text-xs font-bold leading-5 text-slate-500">
                                                            {invoiceIdentifier}
                                                        </div>
                                                    </td>
                                                    <td className="hidden px-6 py-5 align-top lg:table-cell">
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-primary-500/20">
                                                                <span className="h-1 w-1 rounded-full bg-primary-500"></span>
                                                            </span>
                                                            <span className="text-sm font-medium text-slate-600">ScanMySocial AI Subscription</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 align-top">
                                                        <div className="text-sm font-black text-slate-950">₹{(invoice.amount / 100).toFixed(2)}</div>
                                                        <div className="mt-1 text-xs font-semibold text-slate-400">via Razorpay</div>
                                                    </td>
                                                    <td className="px-6 py-5 align-top">
                                                        <StatusBadge status={invoice.status} />
                                                    </td>
                                                    <td className="px-6 py-5 text-right align-top">
                                                        <InvoiceDownloadButton invoice={invoice} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="divide-y divide-slate-100 md:hidden">
                                {invoices.map((invoice) => {
                                    const invoiceIdentifier = getInvoiceIdentifier(invoice);

                                    return (
                                        <article key={invoice.id} className="p-5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-950">
                                                        {formatInvoiceDate(invoice.created_at)}
                                                    </p>
                                                    <p className="mt-1 break-all font-mono text-xs font-bold leading-5 text-slate-500">
                                                        {invoiceIdentifier}
                                                    </p>
                                                </div>
                                                <StatusBadge status={invoice.status} />
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</p>
                                                    <p className="mt-1 text-sm font-black text-slate-950">₹{(invoice.amount / 100).toFixed(2)}</p>
                                                    <p className="text-xs font-semibold text-slate-400">via Razorpay</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service</p>
                                                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">ScanMySocial AI Subscription</p>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex justify-end">
                                                <InvoiceDownloadButton invoice={invoice} label="Download PDF" />
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
                        <p className="text-sm font-medium text-slate-500">
                            Showing billing history for the last 12 months.
                        </p>
                    </div>
                </BillingPanel>

                <div className="grid gap-4 md:grid-cols-2">
                    <BillingPanel className="p-5">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                                <Icon name="mail" size={20} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-black text-slate-950">Automated receipts</h3>
                                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                                    Invoices are emailed to your account when payments are recorded.
                                </p>
                            </div>
                        </div>
                    </BillingPanel>

                    <BillingPanel className="p-5">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                                <Icon name="shield" size={20} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-black text-slate-950">Tax information</h3>
                                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                                    Invoice details use the billing information currently associated with your account.
                                </p>
                            </div>
                        </div>
                    </BillingPanel>
                </div>
            </div>

            <ConfirmDialog
                show={isCancelDialogOpen}
                title="Cancel subscription?"
                message="You will keep access until the end of your current billing cycle, but the plan will not renew afterward."
                confirmLabel="Yes, cancel plan"
                cancelLabel="Keep plan"
                variant="danger"
                onConfirm={confirmCancel}
                onCancel={() => setIsCancelDialogOpen(false)}
                isLoading={isCancelling}
            />
        </AuthenticatedLayout>
    );
}
