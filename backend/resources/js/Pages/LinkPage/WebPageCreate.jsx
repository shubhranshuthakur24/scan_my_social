import Button from '@/Components/Button';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    createWebPageSection,
    WebPageSectionBuilder,
    WebPageSelect,
    WebPageTextArea,
    WebPageTextInput,
} from '@/Pages/LinkPage/Partials/WebPageBuilder';
import WebPageCanvas, { defaultWebPageTheme } from '@/Pages/LinkPage/Partials/WebPageCanvas';
import WebPageTemplatePicker from '@/Pages/LinkPage/Partials/WebPageTemplatePicker';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, FileText, LayoutTemplate, Palette, Save, Sparkles } from 'lucide-react';
import { useState } from 'react';

const tabs = [
    { key: 'template', label: 'Template', icon: LayoutTemplate },
    { key: 'details', label: 'Details & style', icon: Palette },
    { key: 'content', label: 'Content', icon: FileText },
];

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

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

function PreviewPanel({ page, label = 'Live preview' }) {
    return (
        <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
                </div>
                <div className="h-[680px] overflow-y-auto bg-slate-100">
                    <WebPageCanvas webPage={page} displayMode="preview" disableInteractions showBranding={false} />
                </div>
            </div>
        </aside>
    );
}

export default function WebPageCreate({ auth, templates = {}, default_theme_settings = {} }) {
    const templateList = Object.values(templates);
    const firstTemplate = templateList[0] || { key: 'creator', description: '', sections: [], theme_settings: {} };
    const [activeTab, setActiveTab] = useState('template');
    const [slugTouched, setSlugTouched] = useState(false);
    const form = useForm({
        template_key: firstTemplate.key,
        title: '',
        slug: '',
        description: firstTemplate.description || '',
        sections: firstTemplate.sections || [],
        theme_settings: {
            ...defaultWebPageTheme,
            ...default_theme_settings,
            ...(firstTemplate.theme_settings || {}),
        },
        is_published: false,
    });

    const previewSlug = form.data.slug || 'new-page';
    const previewPage = {
        title: form.data.title || firstTemplate.label || 'Your new page',
        slug: previewSlug,
        username: auth.user.username,
        sections: form.data.sections,
        theme_settings: form.data.theme_settings,
    };

    const applyTemplate = (template) => {
        form.setData({
            ...form.data,
            template_key: template.key,
            description: template.description || '',
            sections: template.sections || [],
            theme_settings: {
                ...defaultWebPageTheme,
                ...(template.theme_settings || {}),
            },
        });
    };

    const startBlank = () => {
        form.setData({
            ...form.data,
            template_key: 'creator',
            description: '',
            sections: [createWebPageSection('hero')],
        });
        setActiveTab('details');
    };

    const updateTitle = (value) => {
        form.setData({
            ...form.data,
            title: value,
            slug: slugTouched ? form.data.slug : slugify(value),
        });
    };

    const updateThemeSetting = (key, value) => {
        form.setData('theme_settings', { ...form.data.theme_settings, [key]: value });
    };

    const submit = (event, isPublished = false) => {
        event?.preventDefault();
        form.transform((data) => ({ ...data, is_published: isPublished }));
        form.post(route('social-bio-links.web-pages.store'), {
            onError: (errors) => {
                if (errors.title || errors.slug || errors.description || Object.keys(errors).some((key) => key.startsWith('theme_settings'))) {
                    setActiveTab('details');
                } else if (Object.keys(errors).some((key) => key.startsWith('sections'))) {
                    setActiveTab('content');
                }
            },
            onFinish: () => form.transform((data) => data),
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            topbarTitle="Create Web Page"
            topbarDescription={`Build and publish /@${auth.user.username}/pages/${previewSlug}.`}
            moduleTabsAction={(
                <Link href={route('social-bio-links.web-pages.index')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Link>
            )}
        >
            <Head title="Create Web Page" />
            <div className="mx-auto max-w-[1480px] space-y-5">
                <form id="web-page-create-form" onSubmit={(event) => submit(event, false)}>
                    <div className="mb-5 overflow-x-auto border-b border-slate-200">
                        <div className="flex min-w-max">
                            {tabs.map((tab) => <TabButton key={tab.key} tab={tab} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />)}
                        </div>
                    </div>

                    {activeTab === 'template' && (
                        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-600">Choose a starting point</p>
                                        <h1 className="mt-2 text-2xl font-black text-slate-950">What are you publishing?</h1>
                                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Each template includes a responsive layout, matching visual direction, and the right blocks for its job.</p>
                                    </div>
                                    <button type="button" onClick={startBlank} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700">
                                        <Sparkles className="h-4 w-4" />
                                        Start blank
                                    </button>
                                </div>
                                <WebPageTemplatePicker templates={templates} selectedKey={form.data.template_key} onSelect={applyTemplate} title={form.data.title} />
                                <div className="mt-6 flex justify-end">
                                    <Button type="button" onClick={() => setActiveTab('details')} variant="solid">Continue</Button>
                                </div>
                            </section>
                            <PreviewPanel page={previewPage} />
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                            <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div>
                                    <h2 className="text-lg font-black text-slate-950">Page identity</h2>
                                    <p className="mt-1 text-sm text-slate-500">Set the public title, address, and search description.</p>
                                </div>
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <WebPageTextInput label="Title" value={form.data.title} onChange={updateTitle} placeholder="Spring launch" error={form.errors.title} />
                                    <WebPageTextInput label="Slug" value={form.data.slug} onChange={(value) => { setSlugTouched(true); form.setData('slug', slugify(value)); }} placeholder="spring-launch" error={form.errors.slug} />
                                </div>
                                <WebPageTextArea label="Description" value={form.data.description} onChange={(value) => form.setData('description', value)} rows={3} error={form.errors.description} />

                                <div className="border-t border-slate-200 pt-6">
                                    <h2 className="text-lg font-black text-slate-950">Visual direction</h2>
                                    <p className="mt-1 text-sm text-slate-500">Fine-tune the template without losing its underlying composition.</p>
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
                                        <WebPageTextInput label="Background" type="color" value={form.data.theme_settings.background_color} onChange={(value) => updateThemeSetting('background_color', value)} />
                                        <WebPageTextInput label="Text" type="color" value={form.data.theme_settings.text_color} onChange={(value) => updateThemeSetting('text_color', value)} />
                                        <WebPageTextInput label="Accent" type="color" value={form.data.theme_settings.accent_color} onChange={(value) => updateThemeSetting('accent_color', value)} />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button type="button" onClick={() => setActiveTab('content')} variant="solid">Continue to content</Button>
                                </div>
                            </section>
                            <PreviewPanel page={previewPage} />
                        </div>
                    )}

                    {activeTab === 'content' && (
                        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-950">Page content</h2>
                                        <p className="mt-1 text-sm text-slate-500">Add, edit, and drag blocks into the order visitors should experience them.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button type="submit" disabled={form.processing} variant="secondary" icon={Save}>{form.processing ? 'Saving...' : 'Save draft'}</Button>
                                        <Button type="button" onClick={() => submit(null, true)} disabled={form.processing} variant="solid" icon={Check}>{form.processing ? 'Publishing...' : 'Publish'}</Button>
                                    </div>
                                </div>
                                <WebPageSectionBuilder sections={form.data.sections} onChange={(sections) => form.setData('sections', sections)} errors={form.errors} droppableId="web-page-create-sections" />
                            </section>
                            <PreviewPanel page={previewPage} label="Page preview" />
                        </div>
                    )}
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
