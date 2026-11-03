import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/Button';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import InputError from '@/Components/InputError';
import LinkInBioPublicCard from '@/Pages/LinkPage/Partials/LinkInBioPublicCard';
import LinkInBioTemplatePicker, { sampleLinks } from '@/Pages/LinkPage/Partials/LinkInBioTemplatePicker';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Head, router, useForm } from '@inertiajs/react';
import {
    CalendarClock,
    Check,
    Copy,
    ExternalLink,
    GripVertical,
    Image,
    Link as LinkIcon,
    Palette,
    Plus,
    Save,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const iconOptions = [
    'link',
    'instagram',
    'youtube',
    'tiktok',
    'linkedin',
    'facebook',
    'pinterest',
    'twitter',
    'github',
    'whatsapp',
    'threads',
    'snapchat',
    'behance',
    'dribbble',
    'reddit',
    'telegram',
    'tumblr',
    'viber',
    'discord',
    'sharechat',
    'mail',
    'phone',
    'calendar',
    'sparkles',
];

function FieldLabel({ children }) {
    return <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">{children}</label>;
}

const formControlClasses = 'w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10';

function TextField({ error, ...props }) {
    return (
        <>
            <input
                {...props}
                className={`${formControlClasses} ${props.className || ''}`}
            />
            <InputError message={error} className="mt-1" />
        </>
    );
}

function LinkForm({ form, onSubmit, submitLabel, processing }) {
    return (
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <FieldLabel>Title</FieldLabel>
                    <TextField value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} placeholder="Watch my latest video" />
                </div>
                <div>
                    <FieldLabel>URL</FieldLabel>
                    <TextField type="url" value={form.data.url} onChange={(e) => form.setData('url', e.target.value)} error={form.errors.url} placeholder="https://example.com" />
                </div>
            </div>
            <div>
                <FieldLabel>Description</FieldLabel>
                <textarea
                    value={form.data.description || ''}
                    onChange={(e) => form.setData('description', e.target.value)}
                    rows={2}
                    className={formControlClasses}
                    placeholder="Optional short context"
                />
                <InputError message={form.errors.description} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                    <FieldLabel>Icon</FieldLabel>
                    <select
                        value={form.data.icon || 'link'}
                        onChange={(e) => form.setData('icon', e.target.value)}
                        className={formControlClasses}
                    >
                        {iconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                    </select>
                </div>
                <div>
                    <FieldLabel>Starts At</FieldLabel>
                    <TextField type="datetime-local" value={form.data.starts_at || ''} onChange={(e) => form.setData('starts_at', e.target.value)} error={form.errors.starts_at} />
                </div>
                <div>
                    <FieldLabel>Ends At</FieldLabel>
                    <TextField type="datetime-local" value={form.data.ends_at || ''} onChange={(e) => form.setData('ends_at', e.target.value)} error={form.errors.ends_at} />
                </div>
                <label className="flex items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                    <input
                        type="checkbox"
                        checked={Boolean(form.data.is_active)}
                        onChange={(e) => form.setData('is_active', e.target.checked)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    Active
                </label>
            </div>
            <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={processing} icon={Plus} className="rounded-xl px-5 py-2.5">
                    {processing ? 'Saving...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}

function PhonePreview({ linkPage, links, settings }) {
    return (
        <aside className="h-fit space-y-4 xl:sticky xl:top-24">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-700">Preview</h4>
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Link in Bio
                </span>
            </div>

            <div className="mx-auto aspect-[9/16] w-full max-w-[300px]">
                <LinkInBioPublicCard
                    linkPage={linkPage}
                    settings={settings}
                    links={links}
                    disableLinkNavigation
                    displayMode="mobile-preview"
                />
            </div>
        </aside>
    );
}

export default function Edit({ auth, link_page, theme_presets = {}, mode = 'edit' }) {
    const isCreateMode = mode === 'create';
    const [copied, setCopied] = useState(false);
    const [editingLinkId, setEditingLinkId] = useState(null);
    const [linkToDelete, setLinkToDelete] = useState(null);
    const bannerInputRef = useRef(null);

    const selectedLinkPageId = link_page?.id;

    const createCardForm = useForm({
        display_name: link_page.display_name || '',
        slug: link_page.slug || '',
        theme: link_page.theme || 'sunrise',
    });

    const pageForm = useForm({
        link_page_id: selectedLinkPageId,
        theme: link_page.theme || 'sunrise',
        theme_settings: link_page.theme_settings || {},
        is_published: Boolean(link_page.is_published),
    });

    const createForm = useForm({
        link_page_id: selectedLinkPageId,
        title: '',
        url: '',
        description: '',
        icon: 'link',
        is_active: true,
        starts_at: '',
        ends_at: '',
    });

    const editForm = useForm({
        link_page_id: selectedLinkPageId,
        title: '',
        url: '',
        description: '',
        icon: 'link',
        is_active: true,
        starts_at: '',
        ends_at: '',
    });

    useEffect(() => {
        pageForm.setData({
            link_page_id: selectedLinkPageId,
            theme: link_page.theme || 'sunrise',
            theme_settings: link_page.theme_settings || {},
            is_published: Boolean(link_page.is_published),
        });

        createForm.setData((previousValue) => ({
            ...previousValue,
            link_page_id: selectedLinkPageId,
        }));

        editForm.setData((previousValue) => ({
            ...previousValue,
            link_page_id: selectedLinkPageId,
        }));

        setEditingLinkId(null);
    }, [selectedLinkPageId]);

    const visiblePreviewLinks = useMemo(() => {
        const now = new Date();

        return (link_page.links || []).filter((link) => {
            if (!Boolean(link.is_active)) {
                return false;
            }

            const startsAt = link.starts_at ? new Date(link.starts_at) : null;
            const endsAt = link.ends_at ? new Date(link.ends_at) : null;

            if (startsAt && startsAt > now) {
                return false;
            }

            if (endsAt && endsAt < now) {
                return false;
            }

            return true;
        });
    }, [link_page.links]);

    const updateThemeSetting = (key, value) => {
        pageForm.setData('theme_settings', {
            ...pageForm.data.theme_settings,
            [key]: value,
        });
    };

    const applyPreset = (themeKey) => {
        pageForm.setData({
            ...pageForm.data,
            theme: themeKey,
            theme_settings: theme_presets[themeKey]?.settings || pageForm.data.theme_settings,
        });
    };

    const savePage = (e) => {
        e.preventDefault();
        pageForm.put(route('social-bio-links.update'), {
            preserveScroll: true,
            onSuccess: () => pageForm.setDefaults(pageForm.data),
        });
    };

    const uploadBanner = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        router.post(route('social-bio-links.banner.store'), {
            link_page_id: selectedLinkPageId,
            banner: file,
        }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                event.target.value = '';
            },
        });
    };

    const removeBanner = () => {
        router.delete(route('social-bio-links.banner.destroy'), {
            data: { link_page_id: selectedLinkPageId },
            preserveScroll: true,
        });
    };

    const submitCreateLink = (e) => {
        e.preventDefault();

        createForm.post(route('social-bio-links.links.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.setData({
                link_page_id: selectedLinkPageId,
                title: '',
                url: '',
                description: '',
                icon: 'link',
                is_active: true,
                starts_at: '',
                ends_at: '',
            }),
        });
    };

    const startEditing = (link) => {
        setEditingLinkId(link.id);
        editForm.setData({
            link_page_id: selectedLinkPageId,
            title: link.title || '',
            url: link.url || '',
            description: link.description || '',
            icon: link.icon || 'link',
            is_active: Boolean(link.is_active),
            starts_at: link.starts_at || '',
            ends_at: link.ends_at || '',
        });
    };

    const submitEditLink = (e) => {
        e.preventDefault();

        editForm.put(route('social-bio-links.links.update', editingLinkId), {
            preserveScroll: true,
            onSuccess: () => setEditingLinkId(null),
        });
    };

    const confirmDeleteLink = () => {
        if (!linkToDelete) {
            return;
        }

        router.delete(route('social-bio-links.links.destroy', linkToDelete.id), {
            preserveScroll: true,
            onFinish: () => setLinkToDelete(null),
        });
    };

    const toggleLink = (link) => {
        router.put(route('social-bio-links.links.update', link.id), {
            link_page_id: selectedLinkPageId,
            title: link.title,
            url: link.url,
            description: link.description || '',
            icon: link.icon || 'link',
            is_active: !link.is_active,
            starts_at: link.starts_at || '',
            ends_at: link.ends_at || '',
        }, { preserveScroll: true });
    };

    const onDragEnd = (result) => {
        if (!result.destination) {
            return;
        }

        const links = Array.from(link_page.links || []);
        const [moved] = links.splice(result.source.index, 1);
        links.splice(result.destination.index, 0, moved);

        router.patch(route('social-bio-links.links.reorder'), {
            link_page_id: selectedLinkPageId,
            links: links.map((link) => link.id),
        }, { preserveScroll: true });
    };

    const copyPublicUrl = async () => {
        try {
            await navigator.clipboard.writeText(link_page.public_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (_error) {
            setCopied(false);
        }
    };

    const settings = pageForm.data.theme_settings || {};
    const createSettings = theme_presets[createCardForm.data.theme]?.settings || settings;

    const submitCreateCard = (event) => {
        event.preventDefault();

        createCardForm.post(route('social-bio-links.cards.store'));
    };

    if (isCreateMode) {
        return (
            <AuthenticatedLayout user={auth.user}>
                <Head title="Create Bio Link" />
                <div className="mx-auto max-w-[1480px] space-y-5 xl:space-y-4">
                    <PageBanner
                        title="Create New Bio Link"
                        description={`Build a new page under /@${link_page.username}.`}
                    >
                        <PageBannerAction href={route('social-bio-links.index')} variant="secondary">
                            Back to Overview
                        </PageBannerAction>
                    </PageBanner>

                    <div className="grid grid-cols-1 gap-5 xl:gap-4 xl:grid-cols-12">
                        <main className="space-y-5 xl:space-y-4 xl:col-span-9">
                            <form onSubmit={submitCreateCard} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="mb-6">
                                    <h2 className="text-lg font-black text-slate-900">Choose a template</h2>
                                    <p className="mt-1 text-sm text-slate-500">Start with a complete visual direction.</p>
                                </div>

                                <LinkInBioTemplatePicker
                                    presets={theme_presets}
                                    selectedTheme={createCardForm.data.theme}
                                    onSelect={(theme) => createCardForm.setData('theme', theme)}
                                    linkPage={{
                                        ...link_page,
                                        display_name: createCardForm.data.display_name,
                                    }}
                                />

                                <div className="my-7 border-t border-slate-200" />

                                <div className="mb-4">
                                    <h2 className="text-base font-black text-slate-900">Page details</h2>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <FieldLabel>Display Name</FieldLabel>
                                        <TextField
                                            value={createCardForm.data.display_name}
                                            onChange={(event) => createCardForm.setData('display_name', event.target.value)}
                                            error={createCardForm.errors.display_name}
                                            placeholder="Offers Card"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <FieldLabel>Slug</FieldLabel>
                                        <TextField
                                            value={createCardForm.data.slug}
                                            onChange={(event) => createCardForm.setData('slug', event.target.value)}
                                            error={createCardForm.errors.slug}
                                            placeholder="offers"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-wrap justify-end gap-2">
                                    <Button
                                        href={route('social-bio-links.index')}
                                        variant="secondary"
                                        className="rounded-xl px-5 py-2.5"
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" variant="primary" disabled={createCardForm.processing} icon={Plus} className="rounded-xl px-5 py-2.5">
                                        {createCardForm.processing ? 'Creating...' : 'Create Bio Link'}
                                    </Button>
                                </div>
                            </form>
                        </main>

                        <aside className="xl:col-span-3">
                            <PhonePreview
                                linkPage={{
                                    ...link_page,
                                    display_name: createCardForm.data.display_name || 'New Bio Link',
                                    card_name: createCardForm.data.display_name || 'New Bio Link',
                                    slug: createCardForm.data.slug || 'new-bio-link',
                                }}
                                links={sampleLinks}
                                settings={createSettings}
                            />
                        </aside>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Edit ${link_page.card_name || 'Link Card'}`} />
            <div className="mx-auto max-w-[1480px] space-y-5 xl:space-y-4">
                <PageBanner
                    title={`Edit ${link_page.card_name || 'Link Card'}`}
                    description={`Manage theme, publish status, and links for /@${link_page.username}${link_page.is_primary ? '' : `/${link_page.slug}`}.`}
                >
                    <PageBannerAction href={route('social-bio-links.index')} variant="secondary">
                        Back to Overview
                    </PageBannerAction>
                    <PageBannerAction onClick={copyPublicUrl} variant={copied ? 'success' : 'primary'}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy URL'}
                    </PageBannerAction>
                    <PageBannerAction href={link_page.public_url} external variant="success">
                        <ExternalLink className="h-4 w-4" />
                        Open Card
                    </PageBannerAction>
                </PageBanner>

                <div className="grid grid-cols-1 gap-5 xl:gap-4 xl:grid-cols-12">
                    <main className="space-y-5 xl:space-y-4 xl:col-span-8">
                        <form onSubmit={savePage} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-6 flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><Palette className="h-5 w-5 text-primary-600" /> Page Theme</h2>
                                    <p className="mt-1 text-sm text-slate-500">Template, cover, colors, and publish state.</p>
                                </div>
                                {pageForm.isDirty && (
                                    <p className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-amber-700">
                                        Unsaved Changes
                                    </p>
                                )}
                                <label className="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700">
                                    <input type="checkbox" checked={Boolean(pageForm.data.is_published)} onChange={(e) => pageForm.setData('is_published', e.target.checked)} className="rounded border-primary-300 text-primary-600 focus:ring-primary-500" />
                                    Published
                                </label>
                            </div>

                            <div className="mb-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                                    <div className="relative h-44 flex-1 overflow-hidden rounded-2xl bg-slate-900">
                                        {link_page.banner_url || settings.cover_image ? (
                                            <img src={link_page.banner_url || settings.cover_image} alt="Cover" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm font-black uppercase tracking-widest text-white/80">
                                                Template cover
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 to-transparent" />
                                    </div>
                                    <div className="w-full space-y-3 lg:w-56">
                                        <div>
                                            <FieldLabel>Cover Image</FieldLabel>
                                            <p className="text-xs leading-relaxed text-slate-500">Overrides the template artwork. JPG, PNG, or WebP up to 5MB.</p>
                                        </div>
                                        <input ref={bannerInputRef} type="file" accept="image/*" onChange={uploadBanner} className="hidden" />
                                        <Button type="button" onClick={() => bannerInputRef.current?.click()} variant="secondary" icon={Image} className="w-full rounded-xl px-3 py-2.5 text-xs">
                                            Upload Cover
                                        </Button>
                                        {link_page.banner_url && (
                                            <Button type="button" onClick={removeBanner} variant="danger" className="w-full rounded-xl px-3 py-2 text-xs">
                                                Use Template Cover
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                                            {link_page.avatar_url ? (
                                                <img src={link_page.avatar_url} alt={link_page.display_name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-2xl font-black text-slate-400">{link_page.display_name?.charAt(0) || '@'}</div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-black text-slate-900">{link_page.display_name}</p>
                                            <p className="truncate text-sm font-bold text-slate-500">@{link_page.username}</p>
                                            {link_page.bio && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{link_page.bio}</p>}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <FieldLabel>Templates</FieldLabel>
                                    <LinkInBioTemplatePicker
                                        presets={theme_presets}
                                        selectedTheme={pageForm.data.theme}
                                        onSelect={applyPreset}
                                        linkPage={link_page}
                                        dense
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                                    {[
                                        ['background_color', 'Background'],
                                        ['text_color', 'Text'],
                                        ['button_background_color', 'Button'],
                                        ['button_text_color', 'Button Text'],
                                    ].map(([key, label]) => (
                                        <div key={key}>
                                            <FieldLabel>{label}</FieldLabel>
                                            <input type="color" value={settings[key] || '#111827'} onChange={(e) => updateThemeSetting(key, e.target.value)} className="color-input-pill h-11 w-full rounded-xl border border-slate-200 bg-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2" />
                                            <InputError message={pageForm.errors[`theme_settings.${key}`]} className="mt-1" />
                                        </div>
                                    ))}
                                    <div>
                                        <FieldLabel>Button Shape</FieldLabel>
                                        <select value={settings.button_style || 'rounded'} onChange={(e) => updateThemeSetting('button_style', e.target.value)} className={`h-11 ${formControlClasses}`}>
                                            <option value="rounded">Rounded</option>
                                            <option value="pill">Pill</option>
                                            <option value="sharp">Sharp</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <Button type="submit" variant="primary" disabled={pageForm.processing} icon={Save} className="rounded-xl px-6 py-3">
                                    {pageForm.processing ? 'Saving...' : 'Save Card'}
                                </Button>
                            </div>
                        </form>

                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><LinkIcon className="h-5 w-5 text-primary-600" /> Links</h2>
                                    <p className="mt-1 text-sm text-slate-500">Create, schedule, reorder, and toggle links for this card.</p>
                                </div>
                            </div>
                            <LinkForm form={createForm} onSubmit={submitCreateLink} submitLabel="Add Link" processing={createForm.processing} />

                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="social-bio-links-links">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                            {(link_page.links || []).map((link, index) => (
                                                <Draggable key={link.id} draggableId={String(link.id)} index={index}>
                                                    {(draggableProvided) => (
                                                        <article ref={draggableProvided.innerRef} {...draggableProvided.draggableProps} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                            {editingLinkId === link.id ? (
                                                                <LinkForm form={editForm} onSubmit={submitEditLink} submitLabel="Update Link" processing={editForm.processing} />
                                                            ) : (
                                                                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                                                    <button
                                                                        type="button"
                                                                        {...draggableProvided.dragHandleProps}
                                                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2"
                                                                        aria-label={`Drag to reorder ${link.title}`}
                                                                        title={`Drag to reorder ${link.title}`}
                                                                    >
                                                                        <GripVertical className="h-5 w-5" />
                                                                    </button>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <h3 className="truncate text-base font-black text-slate-900">{link.title}</h3>
                                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${link.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{link.is_active ? 'Active' : 'Off'}</span>
                                                                        </div>
                                                                        <p className="mt-1 break-all text-sm text-slate-500">{link.url}</p>
                                                                        {(link.starts_at || link.ends_at) && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-600"><CalendarClock className="h-3.5 w-3.5" /> Scheduled window enabled</p>}
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">{link.clicks_count} clicks</span>
                                                                        <Button type="button" variant="secondary" size="xs" onClick={() => toggleLink(link)}>
                                                                            Toggle
                                                                        </Button>
                                                                        <Button type="button" variant="outline" size="xs" onClick={() => startEditing(link)}>
                                                                            Edit
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="danger"
                                                                            size="xs"
                                                                            onClick={() => setLinkToDelete(link)}
                                                                            aria-label={`Delete ${link.title}`}
                                                                            title={`Delete ${link.title}`}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </article>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </section>
                    </main>

                    <aside className="xl:col-span-4">
                        <PhonePreview linkPage={{ ...link_page, ...pageForm.data }} links={visiblePreviewLinks} settings={settings} />
                    </aside>
                </div>
            </div>

            <ConfirmDialog
                show={Boolean(linkToDelete)}
                title="Delete Link?"
                message={`This will permanently delete "${linkToDelete?.title || 'this link'}" from this card.`}
                confirmLabel="Delete Link"
                variant="danger"
                onConfirm={confirmDeleteLink}
                onCancel={() => setLinkToDelete(null)}
            />
        </AuthenticatedLayout>
    );
}
