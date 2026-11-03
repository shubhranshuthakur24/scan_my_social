import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import Button from "@/Components/Button";
import ConfirmDialog from "@/Components/common/ConfirmDialog";
import KpiCard from "@/Components/common/KpiCard";
import LinkInBioPublicCard from "@/Pages/LinkPage/Partials/LinkInBioPublicCard";
import { Head, Link, router, useForm } from "@inertiajs/react";
import {
    BarChart3,
    CalendarClock,
    Check,
    Copy,
    ExternalLink,
    Link as LinkIcon,
    MousePointerClick,
    Plus,
    Power,
    Trash2,
    Users,
} from "lucide-react";
import { useState } from "react";

function ShortLinkStatus({ shortLink }) {
    if (!shortLink.is_active) {
        return (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Inactive
            </span>
        );
    }

    if (shortLink.starts_at || shortLink.ends_at) {
        return (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                Scheduled
            </span>
        );
    }

    return (
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
            Active
        </span>
    );
}

function LinkshortDashboard({ shortLinks = [], summary = {} }) {
    const [copiedId, setCopiedId] = useState(null);
    const [shortLinkToDelete, setShortLinkToDelete] = useState(null);
    const form = useForm({
        title: "",
        destination_url: "",
        code: "",
        description: "",
        is_active: true,
        starts_at: "",
        ends_at: "",
    });

    const copyShortUrl = async (shortLink) => {
        try {
            await navigator.clipboard.writeText(shortLink.short_url);
            setCopiedId(shortLink.id);
            setTimeout(() => setCopiedId(null), 1800);
        } catch (_error) {
            setCopiedId(null);
        }
    };

    const submitShortLink = (event) => {
        event.preventDefault();

        form.post(route("social-bio-links.short-links.store"), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const toggleShortLink = (shortLink) => {
        router.patch(
            route("social-bio-links.short-links.toggle", shortLink.id),
            {},
            {
                preserveScroll: true,
            },
        );
    };

    const confirmDeleteShortLink = () => {
        if (!shortLinkToDelete) {
            return;
        }

        router.delete(
            route("social-bio-links.short-links.destroy", shortLinkToDelete.id),
            {
                preserveScroll: true,
                onFinish: () => setShortLinkToDelete(null),
            },
        );
    };

    return (
        <>
            <main className="space-y-5 xl:space-y-4">
                <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        [
                            "Total Links",
                            summary.total_links ?? 0,
                            LinkIcon,
                            "default",
                        ],
                        [
                            "Active Links",
                            summary.active_links ?? 0,
                            Power,
                            "success",
                        ],
                        [
                            "Total Clicks",
                            summary.total_clicks ?? 0,
                            MousePointerClick,
                            "primary",
                        ],
                    ].map(([label, value, Icon, variant]) => (
                        <KpiCard
                            key={label}
                            label={label}
                            value={value}
                            icon={Icon}
                            variant={variant}
                        />
                    ))}
                </section>

                <form
                    onSubmit={submitShortLink}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                    <div className="mb-5">
                        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
                            <LinkIcon className="h-5 w-5 text-primary-600" />{" "}
                            Create Short Link
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Generate a trackable /s link with an optional custom
                            alias.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Title
                            </label>
                            <input
                                value={form.data.title}
                                onChange={(event) =>
                                    form.setData("title", event.target.value)
                                }
                                className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10"
                                placeholder="Newsletter launch"
                            />
                            {form.errors.title && (
                                <p className="mt-1 text-xs font-bold text-rose-600">
                                    {form.errors.title}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Destination URL
                            </label>
                            <input
                                value={form.data.destination_url}
                                onChange={(event) =>
                                    form.setData(
                                        "destination_url",
                                        event.target.value,
                                    )
                                }
                                className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10"
                                placeholder="https://example.com/offer"
                                type="url"
                            />
                            {form.errors.destination_url && (
                                <p className="mt-1 text-xs font-bold text-rose-600">
                                    {form.errors.destination_url}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
                        <div>
                            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Alias
                            </label>
                            <input
                                value={form.data.code}
                                onChange={(event) =>
                                    form.setData("code", event.target.value)
                                }
                                className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10"
                                placeholder="launch"
                            />
                            {form.errors.code && (
                                <p className="mt-1 text-xs font-bold text-rose-600">
                                    {form.errors.code}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Starts At
                            </label>
                            <input
                                value={form.data.starts_at || ""}
                                onChange={(event) =>
                                    form.setData(
                                        "starts_at",
                                        event.target.value,
                                    )
                                }
                                className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10"
                                type="datetime-local"
                            />
                            {form.errors.starts_at && (
                                <p className="mt-1 text-xs font-bold text-rose-600">
                                    {form.errors.starts_at}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Ends At
                            </label>
                            <input
                                value={form.data.ends_at || ""}
                                onChange={(event) =>
                                    form.setData("ends_at", event.target.value)
                                }
                                className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10"
                                type="datetime-local"
                            />
                            {form.errors.ends_at && (
                                <p className="mt-1 text-xs font-bold text-rose-600">
                                    {form.errors.ends_at}
                                </p>
                            )}
                        </div>
                        <label className="flex items-end gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                            <input
                                checked={Boolean(form.data.is_active)}
                                onChange={(event) =>
                                    form.setData(
                                        "is_active",
                                        event.target.checked,
                                    )
                                }
                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                type="checkbox"
                            />
                            Active
                        </label>
                    </div>

                    <div className="mt-4">
                        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Description
                        </label>
                        <textarea
                            value={form.data.description || ""}
                            onChange={(event) =>
                                form.setData("description", event.target.value)
                            }
                            className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10"
                            rows={2}
                            placeholder="Optional internal note"
                        />
                        {form.errors.description && (
                            <p className="mt-1 text-xs font-bold text-rose-600">
                                {form.errors.description}
                            </p>
                        )}
                    </div>

                    <div className="mt-5 flex justify-end">
                        <Button
                            type="submit"
                            variant="solid"
                            disabled={form.processing}
                            icon={Plus}
                        >
                            {form.processing
                                ? "Creating..."
                                : "Create Short Link"}
                        </Button>
                    </div>
                </form>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">
                            Short Links
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Copy, edit, pause, and inspect analytics for every
                            short URL.
                        </p>
                    </div>

                    <div className="mt-4 space-y-3">
                        {shortLinks.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                                <p className="text-sm font-black text-slate-700">
                                    No short links yet
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Create your first short link above.
                                </p>
                            </div>
                        ) : (
                            shortLinks.map((shortLink) => (
                                <article
                                    key={shortLink.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-4"
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-black text-slate-900">
                                                    {shortLink.title}
                                                </h3>
                                                <ShortLinkStatus
                                                    shortLink={shortLink}
                                                />
                                            </div>
                                            <p
                                                className="mt-1 max-w-[500px] truncate text-xs font-bold text-slate-500"
                                                title={
                                                    shortLink.destination_url
                                                }
                                            >
                                                {shortLink.destination_url}
                                            </p>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <code className="break-all rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                                                    {shortLink.short_url}
                                                </code>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        copyShortUrl(shortLink)
                                                    }
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                                                >
                                                    {copiedId ===
                                                    shortLink.id ? (
                                                        <Check className="h-3.5 w-3.5"/>
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                    {copiedId === shortLink.id
                                                        ? "Copied"
                                                        : "Copy"}
                                                </button>
                                            </div>
                                            {(shortLink.starts_at ||
                                                shortLink.ends_at) && (
                                                <p className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-600">
                                                    <CalendarClock className="h-3.5 w-3.5" />{" "}
                                                    Scheduled window enabled
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                                                {shortLink.clicks_count} clicks
                                            </span>
                                            <Link
                                                href={route(
                                                    "social-bio-links.short-links.show",
                                                    shortLink.id,
                                                )}
                                                className="rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-xs font-black text-primary-700"
                                            >
                                                Details
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleShortLink(shortLink)
                                                }
                                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                                            >
                                                <Power className="h-3.5 w-3.5" />
                                                Toggle
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShortLinkToDelete(
                                                        shortLink,
                                                    )
                                                }
                                                className="inline-flex items-center justify-center rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-600"
                                                aria-label={`Delete ${shortLink.title}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </section>
            </main>

            <ConfirmDialog
                show={Boolean(shortLinkToDelete)}
                title="Delete Short Link?"
                message={`This will permanently delete "${shortLinkToDelete?.title || "this short link"}" and its click history.`}
                confirmLabel="Delete Short Link"
                variant="danger"
                onConfirm={confirmDeleteShortLink}
                onCancel={() => setShortLinkToDelete(null)}
            />
        </>
    );
}

function WebPageStatus({ webPage }) {
    return webPage.is_published ? (
        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
            Published
        </span>
    ) : (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Draft
        </span>
    );
}

function WebPagesDashboard({ webPages = [], summary = {}, templates = {} }) {
    const [pageToDelete, setPageToDelete] = useState(null);

    const togglePublish = (webPage) => {
        router.patch(
            route("social-bio-links.web-pages.publish", webPage.id),
            {},
            {
                preserveScroll: true,
            },
        );
    };

    const confirmDelete = () => {
        if (!pageToDelete) {
            return;
        }

        router.delete(
            route("social-bio-links.web-pages.destroy", pageToDelete.id),
            {
                preserveScroll: true,
                onFinish: () => setPageToDelete(null),
            },
        );
    };

    return (
        <>
            <main className="space-y-5 xl:space-y-4">
                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        [
                            "Total Pages",
                            summary.total_pages ?? 0,
                            LinkIcon,
                            "default",
                        ],
                        [
                            "Published",
                            summary.published_pages ?? 0,
                            Check,
                            "success",
                        ],
                        ["Views", summary.total_views ?? 0, Users, "primary"],
                        [
                            "Submissions",
                            summary.total_submissions ?? 0,
                            BarChart3,
                            "info",
                        ],
                    ].map(([label, value, Icon, variant]) => (
                        <KpiCard
                            key={label}
                            label={label}
                            value={value}
                            icon={Icon}
                            variant={variant}
                        />
                    ))}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">
                            Web Pages
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Edit, publish, open, and track your mini-sites.
                        </p>
                    </div>
                    <div className="mt-4 space-y-3">
                        {webPages.length === 0 ? (
                            <div>
                                <div className="mb-5 max-w-2xl">
                                    <p className="text-sm font-black text-slate-900">
                                        Start with the page you need
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Choose from eight purpose-built starting points, then make the content and style your own.
                                    </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    {Object.values(templates).map((template) => (
                                        <Link
                                            key={template.key}
                                            href={route("social-bio-links.web-pages.create")}
                                            className="group overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg"
                                        >
                                            <img
                                                src={template.preview_image}
                                                alt=""
                                                className="aspect-[3/2] w-full object-cover"
                                            />
                                            <span className="block p-3">
                                                <span className="block text-sm font-black text-slate-900">
                                                    {template.label}
                                                </span>
                                                <span className="mt-1 block text-[10px] font-black uppercase tracking-wider text-primary-600">
                                                    {template.category}
                                                </span>
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            webPages.map((webPage) => (
                                <article
                                    key={webPage.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-4"
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-black text-slate-900">
                                                    {webPage.title}
                                                </h3>
                                                <WebPageStatus
                                                    webPage={webPage}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs font-bold text-slate-500">
                                                /@
                                                {webPage.public_url?.split(
                                                    "/@",
                                                )[1] || webPage.slug}
                                            </p>
                                            {webPage.description && (
                                                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                                                    {webPage.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                                                {webPage.sections_count}{" "}
                                                sections
                                            </span>
                                            <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                                                {webPage.events_count} events
                                            </span>
                                            <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                                                {webPage.submissions_count}{" "}
                                                leads
                                            </span>
                                            <Link
                                                href={route(
                                                    "social-bio-links.web-pages.edit",
                                                    webPage.id,
                                                )}
                                                className="rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-xs font-black text-primary-700"
                                            >
                                                Builder
                                            </Link>
                                            {webPage.is_published && (
                                                <a
                                                    href={webPage.public_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                                                >
                                                    Open
                                                </a>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    togglePublish(webPage)
                                                }
                                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                                            >
                                                <Power className="h-3.5 w-3.5" />
                                                {webPage.is_published
                                                    ? "Unpublish"
                                                    : "Publish"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPageToDelete(webPage)
                                                }
                                                className="inline-flex items-center justify-center rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-600"
                                                aria-label={`Delete ${webPage.title}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </section>
            </main>

            <ConfirmDialog
                show={Boolean(pageToDelete)}
                title="Delete Web Page?"
                message={`This will permanently delete "${pageToDelete?.title || "this web page"}" and its analytics.`}
                confirmLabel="Delete Web Page"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setPageToDelete(null)}
            />
        </>
    );
}

function LinkCardPreviewTile({
    card,
    cardsCount,
    onEdit,
    onSetPrimary,
    onDelete,
}) {
    const previewLinks = card.preview_links || [];

    return (
        <article
            className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${card.is_primary ? "border-primary-300 ring-2 ring-primary-100" : "border-slate-200"}`}
        >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-black text-slate-900">
                            {card.card_name}
                        </h3>
                        {card.is_primary && (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                Primary
                            </span>
                        )}
                    </div>
                    <p className="mt-1 truncate text-xs font-bold text-slate-500">
                        /
                        {card.is_primary
                            ? `@${card.username}`
                            : `@${card.username}/${card.slug}`}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                        {card.links_count} links
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                        {card.clicks_count} clicks
                    </span>
                </div>
            </div>

            <div className="flex flex-1 items-center justify-center bg-slate-50 px-3 py-4">
                <div className="aspect-[9/16] w-full max-w-[240px]">
                    <LinkInBioPublicCard
                        linkPage={card}
                        settings={card.theme_settings || {}}
                        links={previewLinks}
                        disableLinkNavigation
                        displayMode="mobile-preview"
                    />
                </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 p-4">
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => onEdit(card.id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                        Edit
                    </button>
                    <a
                        href={card.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                    </a>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {!card.is_primary && (
                        <button
                            type="button"
                            onClick={() => onSetPrimary(card.id)}
                            className="flex-1 rounded-xl border border-primary-100 bg-primary-50 px-3 py-2 text-xs font-black text-primary-700 hover:bg-primary-100"
                        >
                            Set Primary
                        </button>
                    )}
                    {cardsCount > 1 && (
                        <button
                            type="button"
                            onClick={() => onDelete(card)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-100"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

export default function Show({
    auth,
    link_page,
    link_pages = [],
    short_links = [],
    short_link_summary = {},
    web_pages = [],
    web_page_summary = {},
    web_page_templates = {},
    combined_analytics = {},
    selected_analytics = {},
    active_tab = "link_in_bio",
}) {
    const [cardToDelete, setCardToDelete] = useState(null);

    const openEditor = (cardId) => {
        router.visit(route("social-bio-links.cards.edit", cardId), {
            preserveScroll: true,
        });
    };

    const setPrimaryCard = (cardId) => {
        router.patch(
            route("social-bio-links.cards.primary", cardId),
            {},
            {
                preserveScroll: true,
            },
        );
    };

    const confirmDeleteCard = () => {
        if (!cardToDelete) {
            return;
        }

        router.delete(
            route("social-bio-links.cards.destroy", cardToDelete.id),
            {
                preserveScroll: true,
                onFinish: () => setCardToDelete(null),
            },
        );
    };

    const isLinkshortTab = active_tab === "linkshort";
    const isWebPagesTab = active_tab === "web_pages";
    const isLinkInBioTab = !isLinkshortTab && !isWebPagesTab;
    const topbarTitle = isLinkshortTab
        ? "Linkshort"
        : isWebPagesTab
          ? "Web Pages"
          : "Your Social Bio Links";
    const topbarDescription = isLinkshortTab
        ? "Create trackable short URLs for campaigns, bios, and DMs."
        : isWebPagesTab
          ? "Build lightweight public pages for focused offers and campaigns."
          : `Build and manage multiple cards under /@${link_page.username}.`;
    const moduleTabsAction = isLinkInBioTab ? (
        <Link
            href={route("social-bio-links.cards.create")}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-black text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
        >
            <Plus className="h-4 w-4" />
            Create New Bio Link
        </Link>
    ) : isWebPagesTab ? (
        <Link
            href={route("social-bio-links.web-pages.create")}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-black text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
        >
            <Plus className="h-4 w-4" />
            Create Page
        </Link>
    ) : null;

    return (
        <AuthenticatedLayout
            user={auth.user}
            topbarTitle={topbarTitle}
            topbarDescription={topbarDescription}
            moduleTabsAction={moduleTabsAction}
        >
            <Head title="Social Bio Links" />
            <div className="mx-auto max-w-[1480px] space-y-5 xl:space-y-4">
                {active_tab === "linkshort" ? (
                    <LinkshortDashboard
                        shortLinks={short_links}
                        summary={short_link_summary}
                    />
                ) : active_tab === "web_pages" ? (
                    <WebPagesDashboard
                        webPages={web_pages}
                        summary={web_page_summary}
                        templates={web_page_templates}
                    />
                ) : (
                    <main className="space-y-5 xl:space-y-4">
                        <section className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <KpiCard
                                    label="All Cards Clicks"
                                    value={combined_analytics.total_clicks || 0}
                                    icon={MousePointerClick}
                                    variant="primary"
                                />
                                <KpiCard
                                    label="All Cards Visitors"
                                    value={
                                        combined_analytics.unique_clicks || 0
                                    }
                                    icon={Users}
                                    variant="info"
                                />
                                <KpiCard
                                    label="Primary Card Clicks"
                                    value={selected_analytics.total_clicks || 0}
                                    icon={BarChart3}
                                    variant="default"
                                />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900">
                                        Link Cards
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Preview every card before editing theme,
                                        links, or status.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {(link_pages || []).map((card) => (
                                    <LinkCardPreviewTile
                                        key={card.id}
                                        card={card}
                                        cardsCount={(link_pages || []).length}
                                        onEdit={openEditor}
                                        onSetPrimary={setPrimaryCard}
                                        onDelete={setCardToDelete}
                                    />
                                ))}
                            </div>
                        </section>
                    </main>
                )}
            </div>

            <ConfirmDialog
                show={Boolean(cardToDelete)}
                title="Delete Card?"
                message={`This will permanently delete "${cardToDelete?.card_name || "this card"}" and all links inside it.`}
                confirmLabel="Delete Card"
                variant="danger"
                onConfirm={confirmDeleteCard}
                onCancel={() => setCardToDelete(null)}
            />
        </AuthenticatedLayout>
    );
}
