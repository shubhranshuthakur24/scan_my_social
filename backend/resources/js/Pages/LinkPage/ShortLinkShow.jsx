import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/Button';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import KpiCard from '@/Components/common/KpiCard';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, Copy, ExternalLink, MousePointerClick, Save, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

function FieldLabel({ children }) {
    return <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">{children}</label>;
}

function TextError({ message }) {
    return message ? <p className="mt-1 text-xs font-bold text-rose-600">{message}</p> : null;
}

export default function ShortLinkShow({ auth, short_link, analytics = {} }) {
    const [copied, setCopied] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const form = useForm({
        title: short_link.title || '',
        destination_url: short_link.destination_url || '',
        code: short_link.code || '',
        description: short_link.description || '',
        is_active: Boolean(short_link.is_active),
        starts_at: short_link.starts_at || '',
        ends_at: short_link.ends_at || '',
    });

    const maxDailyClicks = useMemo(() => {
        return Math.max(1, ...(analytics.daily_clicks || []).map((day) => day.clicks || 0));
    }, [analytics.daily_clicks]);

    const submit = (event) => {
        event.preventDefault();

        form.put(route('social-bio-links.short-links.update', short_link.id), {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(form.data),
        });
    };

    const copyShortUrl = async () => {
        try {
            await navigator.clipboard.writeText(short_link.short_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (_error) {
            setCopied(false);
        }
    };

    const deleteShortLink = () => {
        router.delete(route('social-bio-links.short-links.destroy', short_link.id), {
            onFinish: () => setShowDelete(false),
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Linkshort - ${short_link.title}`} />
            <div className="mx-auto max-w-[1480px] space-y-5 xl:space-y-4">
                <PageBanner
                    title={short_link.title}
                    description={`Manage /s/${short_link.code}, destination settings, and click analytics.`}
                >
                    <PageBannerAction href={route('social-bio-links.linkshort')} variant="secondary">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </PageBannerAction>
                    <PageBannerAction onClick={copyShortUrl} variant={copied ? 'success' : 'primary'}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy URL'}
                    </PageBannerAction>
                    <PageBannerAction href={short_link.short_url} external variant="success">
                        <ExternalLink className="h-4 w-4" />
                        Open
                    </PageBannerAction>
                </PageBanner>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <KpiCard label="Total Clicks" value={analytics.total_clicks ?? 0} icon={MousePointerClick} variant="primary" />
                    <KpiCard label="Unique Visitors" value={analytics.unique_visitors ?? 0} icon={Users} variant="info" />
                    <KpiCard label="30-Day Clicks" value={(analytics.daily_clicks || []).reduce((total, day) => total + (day.clicks || 0), 0)} icon={MousePointerClick} variant="default" />
                </section>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 xl:gap-4">
                    <main className="space-y-5 xl:col-span-7 xl:space-y-4">
                        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900">Short Link Settings</h2>
                                    <p className="mt-1 text-sm text-slate-500">Update the destination, alias, status, and schedule.</p>
                                </div>
                                {form.isDirty && (
                                    <span className="rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700">Unsaved Changes</span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <div>
                                    <FieldLabel>Title</FieldLabel>
                                    <input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10" />
                                    <TextError message={form.errors.title} />
                                </div>
                                <div>
                                    <FieldLabel>Alias</FieldLabel>
                                    <input value={form.data.code} onChange={(event) => form.setData('code', event.target.value)} className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10" />
                                    <TextError message={form.errors.code} />
                                </div>
                            </div>

                            <div className="mt-4">
                                <FieldLabel>Destination URL</FieldLabel>
                                <input value={form.data.destination_url} onChange={(event) => form.setData('destination_url', event.target.value)} className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10" type="url" />
                                <TextError message={form.errors.destination_url} />
                            </div>

                            <div className="mt-4">
                                <FieldLabel>Description</FieldLabel>
                                <textarea value={form.data.description || ''} onChange={(event) => form.setData('description', event.target.value)} className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10" rows={2} />
                                <TextError message={form.errors.description} />
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                                <div>
                                    <FieldLabel>Starts At</FieldLabel>
                                    <input value={form.data.starts_at || ''} onChange={(event) => form.setData('starts_at', event.target.value)} className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10" type="datetime-local" />
                                    <TextError message={form.errors.starts_at} />
                                </div>
                                <div>
                                    <FieldLabel>Ends At</FieldLabel>
                                    <input value={form.data.ends_at || ''} onChange={(event) => form.setData('ends_at', event.target.value)} className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10" type="datetime-local" />
                                    <TextError message={form.errors.ends_at} />
                                </div>
                                <label className="flex items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                                    <input checked={Boolean(form.data.is_active)} onChange={(event) => form.setData('is_active', event.target.checked)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" type="checkbox" />
                                    Active
                                </label>
                            </div>

                            <div className="mt-6 flex flex-wrap justify-between gap-2">
                                <Button type="button" onClick={() => setShowDelete(true)} variant="danger" icon={Trash2}>
                                    Delete
                                </Button>
                                <Button type="submit" disabled={form.processing} variant="solid" icon={Save}>
                                    {form.processing ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </main>

                    <aside className="space-y-5 xl:col-span-5 xl:space-y-4">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <h2 className="text-lg font-black text-slate-900">Daily Clicks</h2>
                            <div className="mt-5 flex h-40 items-end gap-1">
                                {(analytics.daily_clicks || []).map((day) => (
                                    <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                                        <div className="w-full rounded-t-lg bg-primary-500" style={{ height: `${Math.max(4, ((day.clicks || 0) / maxDailyClicks) * 100)}%` }} title={`${day.date}: ${day.clicks} clicks`} />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <h2 className="text-lg font-black text-slate-900">Top Referrers</h2>
                            <div className="mt-4 space-y-2">
                                {(analytics.top_referrers || []).length === 0 ? (
                                    <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No referrers yet.</p>
                                ) : analytics.top_referrers.map((referrer) => (
                                    <div key={referrer.referrer} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                                        <p className="truncate text-sm font-bold text-slate-700">{referrer.referrer}</p>
                                        <span className="text-sm font-black text-slate-900">{referrer.clicks}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </aside>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-lg font-black text-slate-900">Recent Clicks</h2>
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                        {(analytics.recent_clicks || []).length === 0 ? (
                            <p className="bg-slate-50 p-4 text-sm font-bold text-slate-500">No clicks recorded yet.</p>
                        ) : analytics.recent_clicks.map((click) => (
                            <div key={`${click.clicked_at}-${click.user_agent}`} className="grid grid-cols-1 gap-2 border-b border-slate-100 p-4 last:border-b-0 md:grid-cols-3">
                                <p className="text-sm font-black text-slate-900">{click.clicked_at ? new Date(click.clicked_at).toLocaleString() : 'Unknown time'}</p>
                                <p className="truncate text-sm font-bold text-slate-600">{click.referrer}</p>
                                <p className="truncate text-sm text-slate-500">{click.user_agent || 'Unknown user agent'}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <ConfirmDialog
                show={showDelete}
                title="Delete Short Link?"
                message={`This will permanently delete "${short_link.title}" and its click history.`}
                confirmLabel="Delete Short Link"
                variant="danger"
                onConfirm={deleteShortLink}
                onCancel={() => setShowDelete(false)}
            />
        </AuthenticatedLayout>
    );
}
