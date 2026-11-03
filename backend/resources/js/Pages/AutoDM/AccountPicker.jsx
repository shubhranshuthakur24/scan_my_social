import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import Button from '@/Components/Button';
import EmptyState from '@/Components/EmptyState';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, CheckCircle2, Instagram } from 'lucide-react';

export default function AccountPicker({
    auth,
    candidates = [],
    connectedCount = 0,
    accountLimit = 0,
    hasPaidPlan = false,
    activePlanTier = null,
}) {
    const { data, setData, post, processing, errors } = useForm({
        ig_account_id: '',
    });

    const connectSelected = (igAccountId) => {
        setData('ig_account_id', igAccountId);
        post(route('social-integrations.instagram.select.store', [], false), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Choose Instagram Account" />

            <div className="mx-auto max-w-4xl space-y-5 py-8">
                <PageBanner
                    title="Choose Instagram account"
                    description="One OAuth cycle connects one account. Repeat this flow to add more accounts within your plan limit."
                    variant="soft"
                >
                    <PageBannerAction href={route('autodm.index', [], false)} variant="neutralSecondary">
                        <ArrowLeft className="h-4 w-4" />
                        Back to AutoDM
                    </PageBannerAction>
                </PageBanner>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                Instagram connect
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                Connected {connectedCount} / {accountLimit || 0}
                                {activePlanTier ? ` (${activePlanTier})` : ''}
                            </p>
                        </div>
                        {!hasPaidPlan && (
                            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                                Active paid plan required for new account connections.
                            </p>
                        )}
                    </div>
                </section>

                <section className="space-y-3">
                    {candidates.length > 0 ? (
                        candidates.map((candidate) => (
                            <article
                                key={candidate.ig_account_id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50/60"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                            {candidate.profile_picture_url ? (
                                                <img
                                                    src={candidate.profile_picture_url}
                                                    alt={candidate.username || candidate.ig_account_id}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <Instagram className="h-5 w-5 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="break-words font-semibold text-slate-900">
                                                @{candidate.username || candidate.ig_account_id}
                                            </p>
                                            <p className="mt-0.5 break-all text-xs font-medium text-slate-500">
                                                {candidate.ig_account_id}
                                            </p>
                                            {candidate.is_existing && (
                                                <p className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="min-w-0 break-words">Already connected (reconnect allowed)</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        disabled={processing || !candidate.can_select}
                                        isLoading={processing && data.ig_account_id === candidate.ig_account_id}
                                        onClick={() => connectSelected(candidate.ig_account_id)}
                                        className="w-full justify-center sm:w-auto sm:min-w-44"
                                        variant={candidate.can_select ? 'primary' : 'secondary'}
                                    >
                                        {candidate.can_select ? 'Connect account' : 'Plan limit reached'}
                                    </Button>
                                </div>
                            </article>
                        ))
                    ) : (
                        <EmptyState
                            title="No accounts found"
                            description="No selectable Instagram accounts were returned for this connection attempt."
                            icon={Instagram}
                            className="rounded-2xl shadow-sm"
                        />
                    )}
                </section>

                {(errors.ig_account_id || errors.error) && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                        <div className="flex items-start gap-2 text-rose-700">
                            <AlertCircle className="mt-0.5 h-4 w-4" />
                            <div>
                                <InputError message={errors.ig_account_id || errors.error} />
                            </div>
                        </div>
                    </div>
                )}

                <input type="hidden" value={data.ig_account_id} readOnly />
            </div>
        </AuthenticatedLayout>
    );
}
