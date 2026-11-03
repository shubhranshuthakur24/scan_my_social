import Button from '@/Components/Button';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import KpiCard from '@/Components/common/KpiCard';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    WebPageSectionBuilder,
    WebPageSelect,
    WebPageTextArea,
    WebPageTextInput,
} from '@/Pages/LinkPage/Partials/WebPageBuilder';
import WebPageCanvas, { defaultWebPageTheme } from '@/Pages/LinkPage/Partials/WebPageCanvas';
import WebPageTemplatePicker from '@/Pages/LinkPage/Partials/WebPageTemplatePicker';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    BarChart3,
    Check,
    ExternalLink,
    FileText,
    MousePointerClick,
    Palette,
    Save,
    Settings,
    Trash2,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const tabs = [
    { key: 'design', label: 'Template & style', icon: Palette },
    { key: 'content', label: 'Content', icon: FileText },
    { key: 'settings', label: 'Settings', icon: Settings },
    { key: 'track', label: 'Insights', icon: BarChart3 },
];

function TabButton({ tab, active, onClick }) {
    const Icon = tab.icon;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-black transition ${active ? 'border-slate-950 text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
            <Icon className="h-4 w-4" />
            {tab.label}
        </button>
    );
}

function PreviewPanel({ page }) {
    return (
        <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Live preview</span>
                </div>
                <div className="h-[680px] overflow-y-auto bg-slate-100">
                    <WebPageCanvas webPage={page} displayMode="preview" disableInteractions showBranding={false} />
                </div>
            </div>
        </aside>
    );
}

export default function WebPageEdit({ auth, web_page, analytics = {}, theme_presets = {}, templates = {} }) {
    const [showDelete, setShowDelete] = useState(false);
    const [pendingTemplate, setPendingTemplate] = useState(null);
    const [activeTab, setActiveTab] = useState('design');
    const form = useForm({
        title: web_page.title || '',
        slug: web_page.slug || '',
        description: web_page.description || '',
        template_key: web_page.template_key || 'creator',
        sections: web_page.sections || [],
        theme_settings: {
            ...defaultWebPageTheme,
            ...(web_page.theme_settings || {}),
        },
        is_published: Boolean(web_page.is_published),
    });

    const maxViews = useMemo(() => Math.max(1, ...(analytics.daily_views || []).map((day) => day.views || 0)), [analytics.daily_views]);
    const previewPage = {
        ...web_page,
        title: form.data.title || 'Untitled page',
        slug: form.data.slug,
        username: auth.user.username,
        sections: form.data.sections,
        theme_settings: form.data.theme_settings,
    };

    const updateThemeSetting = (key, value) => {
        form.setData('theme_settings', { ...form.data.theme_settings, [key]: value });
    };

    const applyTheme = (theme) => {
        form.setData('theme_settings', {
            ...form.data.theme_settings,
            ...(theme.settings || {}),
            theme_key: theme.key,
        });
    };

    const requestTemplate = (template) => {
        if (template.key === form.data.template_key) {
            return;
        }

        setPendingTemplate(template);
    };

    const applyPendingTemplate = () => {
        if (!pendingTemplate) {
            return;
        }

        form.setData({
            ...form.data,
            template_key: pendingTemplate.key,
            sections: pendingTemplate.sections || [],
            theme_settings: {
                ...defaultWebPageTheme,
                ...(pendingTemplate.theme_settings || {}),
            },
        });
        setPendingTemplate(null);
    };

    const submit = (event, isPublished = form.data.is_published) => {
        event?.preventDefault();
        const nextDefaults = { ...form.data, is_published: isPublished };
        form.transform((data) => ({ ...data, is_published: isPublished }));
        form.put(route('social-bio-links.web-pages.update', web_page.id), {
            preserveScroll: true,
            onSuccess: () => {
                form.setData('is_published', isPublished);
                form.setDefaults(nextDefaults);
            },
            onFinish: () => form.transform((data) => data),
        });
    };

    const deletePage = () => {
        router.delete(route('social-bio-links.web-pages.destroy', web_page.id), {
            onFinish: () => setShowDelete(false),
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Web Page - ${web_page.title}`} />
            <div className="mx-auto max-w-[1480px] space-y-5">
                <PageBanner title={web_page.title} description={`Build and publish /@${auth.user.username}/pages/${form.data.slug}.`}>
                    <PageBannerAction href={route('social-bio-links.web-pages.index')} variant="secondary"><ArrowLeft className="h-4 w-4" />Back</PageBannerAction>
                    <PageBannerAction href={route('social-bio-links.web-pages.preview', web_page.id)} external variant="secondary"><ExternalLink className="h-4 w-4" />Preview</PageBannerAction>
                    {web_page.is_published && <PageBannerAction href={web_page.public_url} external variant="success"><ExternalLink className="h-4 w-4" />Open</PageBannerAction>}
                    <PageBannerAction type="submit" form="web-page-edit-form" disabled={form.processing} variant="primary"><Save className="h-4 w-4" />{form.processing ? 'Saving...' : 'Save page'}</PageBannerAction>
                </PageBanner>

                <div className="overflow-x-auto border-b border-slate-200">
                    <div className="flex min-w-max">
                        {tabs.map((tab) => <TabButton key={tab.key} tab={tab} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />)}
                    </div>
                </div>

                <form id="web-page-edit-form" onSubmit={(event) => submit(event)} className="space-y-5">
                    {activeTab === 'design' && (
                        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
                            <section className="space-y-7 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-600">Creative direction</p>
                                    <h2 className="mt-2 text-xl font-black text-slate-950">Change the look without rebuilding the page</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">Switching templates replaces your current blocks. Theme and style controls preserve them.</p>
                                </div>

                                <WebPageTemplatePicker templates={templates} selectedKey={form.data.template_key} onSelect={requestTemplate} title={form.data.title} dense />

                                <div className="border-t border-slate-200 pt-6">
                                    <h3 className="text-sm font-black text-slate-950">Theme presets</h3>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                        {Object.values(theme_presets).map((theme) => {
                                            const settings = theme.settings || {};
                                            const isActive = form.data.theme_settings.theme_key === theme.key;

                                            return (
                                                <button key={theme.key} type="button" onClick={() => applyTheme(theme)} className={`rounded-lg border p-3 text-left transition ${isActive ? 'border-primary-400 bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-black text-slate-900">{theme.label}</span>
                                                        <span className="flex overflow-hidden rounded-full border border-white shadow-sm">
                                                            {[settings.background_color, settings.surface_color, settings.accent_color].map((color) => <span key={color} className="h-5 w-5" style={{ backgroundColor: color }} />)}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 pt-6">
                                    <h3 className="text-sm font-black text-slate-950">Fine tune</h3>
                                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <WebPageSelect label="Layout" value={form.data.theme_settings.layout_style} onChange={(value) => updateThemeSetting('layout_style', value)} options={[
                                            { value: 'split', label: 'Split' },
                                            { value: 'immersive', label: 'Immersive' },
                                            { value: 'editorial', label: 'Editorial' },
                                            { value: 'centered', label: 'Centered' },
                                        ]} />
                                        <WebPageSelect label="Typography" value={form.data.theme_settings.font_style} onChange={(value) => updateThemeSetting('font_style', value)} options={[
                                            { value: 'sans', label: 'Modern sans' },
                                            { value: 'serif', label: 'Editorial serif' },
                                        ]} />
                                        <WebPageSelect label="Buttons" value={form.data.theme_settings.button_style} onChange={(value) => updateThemeSetting('button_style', value)} options={[
                                            { value: 'rounded', label: 'Rounded' },
                                            { value: 'pill', label: 'Pill' },
                                            { value: 'sharp', label: 'Sharp' },
                                        ]} />
                                        <WebPageSelect label="Corners" value={form.data.theme_settings.radius_style} onChange={(value) => updateThemeSetting('radius_style', value)} options={[
                                            { value: 'rounded', label: 'Rounded' },
                                            { value: 'soft', label: 'Soft' },
                                            { value: 'sharp', label: 'Sharp' },
                                        ]} />
                                        <WebPageTextInput label="Background" type="color" value={form.data.theme_settings.background_color} onChange={(value) => updateThemeSetting('background_color', value)} />
                                        <WebPageTextInput label="Surface" type="color" value={form.data.theme_settings.surface_color} onChange={(value) => updateThemeSetting('surface_color', value)} />
                                        <WebPageTextInput label="Text" type="color" value={form.data.theme_settings.text_color} onChange={(value) => updateThemeSetting('text_color', value)} />
                                        <WebPageTextInput label="Muted text" type="color" value={form.data.theme_settings.muted_text_color} onChange={(value) => updateThemeSetting('muted_text_color', value)} />
                                        <WebPageTextInput label="Accent" type="color" value={form.data.theme_settings.accent_color} onChange={(value) => updateThemeSetting('accent_color', value)} />
                                    </div>
                                </div>
                            </section>
                            <PreviewPanel page={previewPage} />
                        </div>
                    )}

                    {activeTab === 'content' && (
                        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
                            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-950">Page content</h2>
                                        <p className="mt-1 text-sm text-slate-500">Edit content in rows, add blocks, and drag the story into order.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button type="button" onClick={() => submit(null, false)} disabled={form.processing} variant="secondary" icon={Save}>{form.processing ? 'Saving...' : 'Save draft'}</Button>
                                        <Button type="button" onClick={() => submit(null, !Boolean(form.data.is_published))} disabled={form.processing} variant="solid" icon={Check}>{form.data.is_published ? 'Save & unpublish' : 'Save & publish'}</Button>
                                    </div>
                                </div>
                                <WebPageSectionBuilder sections={form.data.sections} onChange={(sections) => form.setData('sections', sections)} errors={form.errors} />
                            </section>
                            <PreviewPanel page={previewPage} />
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-black text-slate-950">Page settings</h2>
                                    <p className="mt-1 text-sm text-slate-500">Manage the public address, metadata, and publishing state.</p>
                                </div>
                                {form.isDirty && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">Unsaved</span>}
                            </div>
                            <div className="grid gap-4 lg:grid-cols-2">
                                <WebPageTextInput label="Title" value={form.data.title} onChange={(value) => form.setData('title', value)} error={form.errors.title} />
                                <WebPageTextInput label="Slug" value={form.data.slug} onChange={(value) => form.setData('slug', value)} error={form.errors.slug} />
                            </div>
                            <div className="mt-4">
                                <WebPageTextArea label="Description" value={form.data.description} onChange={(value) => form.setData('description', value)} rows={3} error={form.errors.description} />
                            </div>
                            <div className="mt-6 flex flex-wrap justify-end gap-3">
                                <Button type="button" onClick={() => submit(null, !Boolean(form.data.is_published))} disabled={form.processing} variant="secondary">{form.data.is_published ? 'Save & unpublish' : 'Save & publish'}</Button>
                                <Button type="button" onClick={() => setShowDelete(true)} variant="danger" icon={Trash2}>Delete page</Button>
                                <Button type="submit" disabled={form.processing} variant="solid" icon={Save}>{form.processing ? 'Saving...' : 'Save page'}</Button>
                            </div>
                        </section>
                    )}

                    {activeTab === 'track' && (
                        <main className="space-y-5">
                            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <KpiCard label="Views" value={analytics.total_views ?? 0} icon={Users} variant="primary" />
                                <KpiCard label="CTA clicks" value={analytics.total_cta_clicks ?? 0} icon={MousePointerClick} variant="info" />
                                <KpiCard label="Submissions" value={analytics.total_submissions ?? 0} icon={BarChart3} variant="default" />
                                <KpiCard label="Visitors" value={analytics.unique_visitors ?? 0} icon={Users} variant="default" />
                            </section>
                            <section className="grid gap-5 xl:grid-cols-2">
                                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><BarChart3 className="h-5 w-5 text-primary-600" />Daily views</h2>
                                    <div className="mt-5 flex h-32 items-end gap-1">
                                        {(analytics.daily_views || []).map((day) => <div key={day.date} className="min-w-0 flex-1 rounded-t bg-primary-500" style={{ height: `${Math.max(4, ((day.views || 0) / maxViews) * 100)}%` }} title={`${day.date}: ${day.views} views`} />)}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-lg font-black text-slate-950">Recent submissions</h2>
                                    <div className="mt-4 space-y-2">
                                        {(analytics.recent_submissions || []).length === 0 ? (
                                            <p className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">No submissions yet.</p>
                                        ) : analytics.recent_submissions.map((submission) => (
                                            <div key={submission.id} className="rounded-lg bg-slate-50 p-4">
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-400">{submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Unknown time'}</p>
                                                <p className="mt-1 truncate text-sm font-bold text-slate-700">{Object.values(submission.data || {}).filter(Boolean).join(' | ')}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </main>
                    )}
                </form>
            </div>

            <ConfirmDialog
                show={Boolean(pendingTemplate)}
                title="Replace current page layout?"
                message={`Applying ${pendingTemplate?.label || 'this template'} replaces the current blocks and visual settings. Your page title and URL stay the same.`}
                confirmLabel="Apply template"
                onConfirm={applyPendingTemplate}
                onCancel={() => setPendingTemplate(null)}
            />
            <ConfirmDialog
                show={showDelete}
                title="Delete web page?"
                message="This permanently deletes the page, its analytics, and its form submissions."
                confirmLabel="Delete page"
                variant="danger"
                onConfirm={deletePage}
                onCancel={() => setShowDelete(false)}
            />
        </AuthenticatedLayout>
    );
}
