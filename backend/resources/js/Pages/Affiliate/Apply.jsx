import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PublicLayout from '@/Layouts/PublicLayout';
import Icon from '@/Components/Icon';
import Button from '@/Components/Button';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';

export default function Apply({ auth, status, rejection_reason, applied_at }) {
    const user = auth?.user;
    const [isFormOpen, setIsFormOpen] = React.useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.affiliate_contact || '',
        note: user?.affiliate_note || '',
        website: '',
    });
    const claimForm = useForm({
        email: user?.email || '',
    });

    const submit = (e) => {
        e.preventDefault();

        if (!isFormOpen) {
            setIsFormOpen(true);
            return;
        }

        post(route('affiliate.apply'), {
            onSuccess: () => setIsFormOpen(false),
        });
    };

    const requestClaimLink = () => {
        claimForm.post(route('affiliate.claim-link'));
    };

    const Layout = user ? AuthenticatedLayout : PublicLayout;

    const statusLabel = status
        ? status
            .replaceAll('_', ' ')
            .replace(/\b\w/g, (character) => character.toUpperCase())
        : null;

    return (
        <Layout>
            <Head title="Join Affiliate Program" />

            <div className={`mx-auto max-w-5xl space-y-6 ${!user ? 'px-6 py-16 sm:py-20' : ''}`}>
                <PageBanner
                    variant="soft"
                    title="Affiliate Program"
                    description="Invite creators to Scan My Social and earn recurring commissions from every successful referral."
                    actions={
                        !status && !isFormOpen ? (
                            <PageBannerAction type="button" variant="neutralPrimary" onClick={submit}>
                                <Icon name="briefcase" size={16} />
                                Apply for Affiliate Access
                            </PageBannerAction>
                        ) : null
                    }
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <Icon name="banknote" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">20% Recurring Commission</h3>
                                    <p className="text-sm text-slate-500 font-medium">Earn 20% on monthly plans and 15% on yearly plans for the lifetime of the customer.</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <Icon name="history" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">30-Day Cookie Window</h3>
                                    <p className="text-sm text-slate-500 font-medium">We track clicks for 30 days. If they sign up within a month of clicking your link, you get the credit.</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-primary-600">
                                    <Icon name="landmark" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Professional Payouts</h3>
                                    <p className="text-sm text-slate-500 font-medium">Withdraw your earnings directly to your bank account once you hit ₹500.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                        {statusLabel ? (
                            <div className="mb-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                                Status: {statusLabel}
                            </div>
                        ) : null}

                        {!status && !isFormOpen && (
                            <div className="flex flex-col items-center space-y-6 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white">
                                    <Icon name="briefcase" size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900">Ready to start?</h3>
                                    <p className="px-4 text-sm font-medium text-slate-500">
                                        Click the button below to apply. Our team will review your account and approve you within 24-48 hours.
                                    </p>
                                </div>
                                <Button
                                    onClick={submit}
                                    variant="solid"
                                    size="lg"
                                    className="w-full"
                                >
                                    Apply for Affiliate Access
                                </Button>
                            </div>
                        )}

                        {!status && isFormOpen && (
                            <form onSubmit={submit} className="space-y-4 text-left">
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-900">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        readOnly={!!user}
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        className={`w-full border-slate-200 rounded-xl text-sm font-medium focus:ring-primary-500/20 focus:border-primary-500 ${user ? 'bg-slate-50 text-slate-500' : ''}`}
                                    />
                                    {errors.name && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">{errors.name}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-900">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        readOnly={!!user}
                                        value={data.email}
                                        onChange={e => setData('email', e.target.value)}
                                        className={`w-full border-slate-200 rounded-xl text-sm font-medium focus:ring-primary-500/20 focus:border-primary-500 ${user ? 'bg-slate-50 text-slate-500' : ''}`}
                                    />
                                    {errors.email && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">{errors.email}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-900">WhatsApp / Contact Number</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="+91 98765 43210"
                                        value={data.contact}
                                        onChange={e => setData('contact', e.target.value)}
                                        className={`w-full border-slate-200 rounded-xl text-sm font-medium focus:ring-primary-500/20 focus:border-primary-500 ${errors.contact ? 'border-rose-500' : ''}`}
                                    />
                                    {errors.contact && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">{errors.contact}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-900">Any Note (Optional)</label>
                                    <textarea
                                        placeholder="How do you plan to promote us?"
                                        value={data.note}
                                        onChange={e => setData('note', e.target.value)}
                                        className="w-full h-24 border-slate-200 rounded-xl text-sm font-medium focus:ring-primary-500/20 focus:border-primary-500"
                                    />
                                </div>
                                <input
                                    type="text"
                                    tabIndex="-1"
                                    autoComplete="off"
                                    value={data.website}
                                    onChange={e => setData('website', e.target.value)}
                                    className="hidden"
                                />
                                <Button
                                    type="submit"
                                    isLoading={processing}
                                    disabled={processing}
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                >
                                    {processing ? 'Submitting...' : 'Submit Application'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                >
                                    Cancel
                                </Button>
                            </form>
                        )}

                        {status === 'pending' && (
                            <div className="flex flex-col items-center space-y-6 text-center">
                                <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-amber-50 text-amber-500">
                                    <Icon name="history" size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900">Application Under Review</h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        We received your application on {new Date(applied_at).toLocaleDateString()}. Our team is currently reviewing your profile.
                                    </p>
                                </div>
                                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                                    Status: Pending Approval
                                </div>
                            </div>
                        )}

                        {status === 'rejected' && (
                            <div className="flex flex-col items-center space-y-6 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                                    <Icon name="alert-circle" size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900">Application Rejected</h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Unfortunately, we couldn't approve your affiliate application at this time.
                                    </p>
                                    {rejection_reason && (
                                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-left text-sm font-medium text-rose-700">
                                            <p className="font-bold mb-1">Feedback from Admin:</p>
                                            <p className="break-words">{rejection_reason}</p>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    onClick={submit}
                                    disabled={processing}
                                    isLoading={processing}
                                    variant="outline"
                                    size="lg"
                                    className="w-full"
                                >
                                    {processing ? 'Submitting...' : 'Re-apply for Access'}
                                </Button>
                            </div>
                        )}

                        {status === 'approved_unclaimed' && (
                            <div className="flex flex-col items-center space-y-6 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                                    <Icon name="mail" size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900">Application Approved</h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Please verify ownership of this email to activate affiliate access.
                                    </p>
                                </div>
                                {user ? (
                                    <Button
                                        type="button"
                                        onClick={requestClaimLink}
                                        disabled={claimForm.processing}
                                        isLoading={claimForm.processing}
                                        variant="primary"
                                        size="lg"
                                        className="w-full"
                                    >
                                        {claimForm.processing ? 'Sending...' : 'Send Claim Link'}
                                    </Button>
                                ) : (
                                    <p className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                                        Sign in with the same email, then request a claim link.
                                    </p>
                                )}
                            </div>
                        )}

                        {status === 'approved_claimed' && (
                            <div className="flex flex-col items-center space-y-6 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                                    <Icon name="check-circle" size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900">Claim Verified</h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Your claim is complete. Our team syncs affiliate access immediately after approval.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
