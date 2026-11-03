import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import EmptyState from '@/Components/EmptyState';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import {
    ArrowLeft,
    Calendar,
    Download,
    ExternalLink,
    FileText,
    Users,
} from 'lucide-react';

function formatSubmissionValue(value) {
    return value === true ? 'Yes' : value === false ? 'No' : String(value);
}

function formatSubmittedAt(value) {
    return value ? new Date(value).toLocaleString() : '-';
}

export default function Submissions({ auth, form, submissions }) {
    const submissionCount = submissions?.total ?? submissions?.data?.length ?? 0;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Leads - ${form.title}`} />

            <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
                <PageBanner
                    variant="neutral"
                    title={`Leads: ${form.title}`}
                    description="Review captured form submissions in a focused lead ledger."
                >
                    <PageBannerAction
                        href={route('lead-forms.index')}
                        variant="neutralSecondary"
                        aria-label="Back to lead forms"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </PageBannerAction>
                    <PageBannerAction
                        href={route('lead-forms.show', form.id)}
                        variant="neutralSecondary"
                        aria-label={`Open editor for ${form.title}`}
                    >
                        <ExternalLink className="h-4 w-4" />
                        Open Editor
                    </PageBannerAction>
                    <PageBannerAction
                        href={route('lead-forms.submissions.export', form.id, false)}
                        external
                        target="_self"
                        variant="neutralPrimary"
                        aria-label={`Export CSV for ${form.title}`}
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </PageBannerAction>
                </PageBanner>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm">
                                    <FileText className="h-4 w-4" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-base font-black text-slate-950">Submission Ledger</h2>
                                    <p className="text-sm font-medium text-slate-500">
                                        {submissionCount} {submissionCount === 1 ? 'lead' : 'leads'} captured for this form.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-500 shadow-sm">
                            <Users className="h-3.5 w-3.5" />
                            Lead records
                        </span>
                    </div>

                    {!submissions?.data?.length ? (
                        <EmptyState
                            variant="transparent"
                            className="py-16 sm:py-20"
                            title="No leads captured yet"
                            description="Share the public form link with your audience to start collecting lead data."
                            icon={Users}
                            iconContainerClassName="border-slate-200 bg-slate-50"
                            iconClassName="text-slate-400"
                            titleClassName="text-xl font-bold text-slate-900"
                            descriptionClassName="text-sm leading-relaxed text-slate-500"
                            action={(
                                <PageBannerAction
                                    href={route('lead-forms.show', form.id)}
                                    variant="neutralSecondary"
                                    aria-label={`Open editor for ${form.title}`}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Open Editor
                                </PageBannerAction>
                            )}
                        />
                    ) : (
                        <div className="space-y-4 p-4 sm:p-5">
                            <div className="space-y-3">
                                {submissions.data.map((submission) => (
                                    <article
                                        key={submission.id}
                                        className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50/60 sm:p-5"
                                    >
                                        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                    <span className="break-words">
                                                        {formatSubmittedAt(submission.submitted_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-500">
                                                ID: {submission.id}
                                            </div>
                                        </div>

                                        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                            {Object.entries(submission.data || {}).map(([key, value]) => (
                                                <div key={key} className="min-w-0 border-l border-slate-200 pl-3">
                                                    <dt className="break-words text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        {key}
                                                    </dt>
                                                    <dd className="mt-1 break-words text-sm font-bold leading-6 text-slate-900">
                                                        {formatSubmissionValue(value)}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </article>
                                ))}
                            </div>

                            {submissions.links && submissions.links.length > 3 && (
                                <div className="border-t border-slate-100 pt-5">
                                    <nav
                                        className="flex flex-wrap items-center justify-center gap-2"
                                        aria-label="Lead submissions pagination"
                                    >
                                        {submissions.links.map((link, i) => (
                                            <Link
                                                key={i}
                                                href={link.url || '#'}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                aria-current={link.active ? 'page' : undefined}
                                                aria-disabled={!link.url}
                                                tabIndex={!link.url ? -1 : undefined}
                                                className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border px-3 py-2 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 ${
                                                    link.active
                                                        ? 'border-primary-600 bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                                } ${!link.url ? 'pointer-events-none cursor-not-allowed opacity-45' : ''}`}
                                            />
                                        ))}
                                    </nav>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
