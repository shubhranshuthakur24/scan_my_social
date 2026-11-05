/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import WebPagesSkeleton from '@/components/web-pages/WebPagesSkeleton';
import {
  WebPage,
  WebPageSummary,
  WebPageTemplate,
  fetchWebPages,
  fetchWebPageCatalog,
  togglePublishWebPage,
  deleteWebPage,
} from '@/lib/api/webPagesService';
import { buildPublicCardUrl } from '@/lib/utils/publicUrl';
import {
  Globe,
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  Copy,
  Check,
  Power,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileText,
  ExternalLink,
  Layers,
  Loader2,
  X,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import PageHeader from '@/components/ui/PageHeader';

export default function WebPagesDashboardPage() {
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mutatingState, setMutatingState] = useState<{ id: number; action: 'publish' | 'delete' } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  const [error, setError] = useState<string | null>(null);

  const [webPages, setWebPages] = useState<WebPage[]>([]);
  const [summary, setSummary] = useState<WebPageSummary>({
    total_pages: 0,
    published_pages: 0,
    total_views: 0,
    total_submissions: 0,
  });
  const [templates, setTemplates] = useState<WebPageTemplate[]>([]);

  // Search with 300ms debounce
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WebPage | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<WebPage | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    let active = true;
    fetchWebPageCatalog()
      .then((cat) => {
        if (active && Array.isArray(cat.templates) && cat.templates.length > 0) {
          setTemplates(cat.templates);
        }
      })
      .catch(() => {
        // Fallback handled via fetchWebPages if necessary
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetchWebPages({ search: debouncedSearch, status })
      .then((res) => {
        if (!active) return;
        setWebPages(res.web_pages);
        setSummary(res.summary);
        if (Array.isArray(res.templates) && res.templates.length > 0) {
          setTemplates(res.templates);
        }
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load web pages');
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
          setHasLoadedInitial(true);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, status, refreshTrigger]);

  const handleCopyLink = (page: WebPage) => {
    if (!page.public_url) return;
    const fullUrl = buildPublicCardUrl(page.public_url);
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(page.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const executeTogglePublish = async (page: WebPage) => {
    setMutatingState({ id: page.id, action: 'publish' });
    try {
      const res = await togglePublishWebPage(page.id);
      setWebPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, is_published: res.is_published, published_at: res.published_at } : p))
      );
      setSummary((prev) => ({
        ...prev,
        published_pages: res.is_published ? prev.published_pages + 1 : Math.max(0, prev.published_pages - 1),
      }));
      showToast(res.is_published ? 'Web page published successfully.' : 'Web page unpublished.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update publishing status', 'error');
    } finally {
      setMutatingState(null);
    }
  };

  const handleTogglePublishClick = (page: WebPage) => {
    if (page.is_published) {
      // Live site -> require confirmation before taking it offline
      setUnpublishTarget(page);
    } else {
      // Draft -> publish immediately
      executeTogglePublish(page);
    }
  };

  const handleConfirmUnpublish = async () => {
    if (!unpublishTarget) return;
    const target = unpublishTarget;
    setUnpublishTarget(null);
    await executeTogglePublish(target);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setMutatingState({ id: targetId, action: 'delete' });
    try {
      await deleteWebPage(targetId);
      setDeleteTarget(null);
      setRefreshTrigger((c) => c + 1);
      showToast('Web page deleted successfully.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete web page', 'error');
    } finally {
      setMutatingState(null);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('all');
  };

  if (isLoading && !hasLoadedInitial) {
    return (
      <div className="space-y-6">
        <WebPagesSkeleton />
      </div>
    );
  }

  const isFiltering = search.trim() !== '' || debouncedSearch.trim() !== '' || status !== 'all';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header via shared PageHeader */}
      <PageHeader
        title={<span className="text-xl font-black text-slate-900">Web Pages</span>}
        badge={
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-extrabold text-primary-700 border border-primary-200/50">
            <Sparkles size={11} className="text-primary-600" /> Landing Page Builder
          </span>
        }
        description={
          <>
            Build, publish, and host standalone mini-websites at{' '}
            <code className="font-mono text-primary-700 font-bold">/@username/pages/slug</code>.
          </>
        }
        actions={
          <Link href="/web-pages/create">
            <Button variant="primary" className="gap-2 shadow-xs shrink-0">
              <Plus size={16} />
              <span>Create Web Page</span>
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshTrigger((c) => c + 1)}
            className="font-bold underline text-rose-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Summary KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Web Pages Metrics">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider">Total Pages</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Globe size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{summary.total_pages.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">Created across your account</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Published</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Power size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{summary.published_pages.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">Live on public URLs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-primary-600 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Views</span>
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <Eye size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{summary.total_views.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">Lifetime visitor traffic</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-primary-600 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Leads Captured</span>
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <FileText size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{summary.total_submissions.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">Form submissions to CRM</p>
        </div>
      </section>

      {/* 4. Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            aria-label="Search web pages by title or slug"
            placeholder="Search by title, slug, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
              aria-label="Clear search input"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Filter web pages by publishing status"
          className="flex gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 shrink-0"
        >
          {(['all', 'published', 'draft'] as const).map((tab) => {
            const isSelected = status === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setStatus(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black capitalize transition ${
                  isSelected
                    ? 'bg-white text-primary-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Web Pages Grid */}
      {webPages.length === 0 ? (
        isFiltering ? (
          /* Search / Filter Zero-Results State */
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Search size={24} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-black text-slate-900">No web pages found</h3>
              <p className="text-xs text-slate-500">
                Try a different search term or clear your filters to view all pages.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetFilters}
              className="gap-2 shadow-xs"
            >
              <span>Clear Search & Filters</span>
            </Button>
          </div>
        ) : (
          /* True Empty Account State */
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Globe size={26} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-black text-slate-900">Create your first web page</h3>
              <p className="text-xs text-slate-500">
                Select from professionally designed templates or build a custom layout.
              </p>
            </div>
            <Link href="/web-pages/create">
              <Button variant="primary" className="gap-2 shadow-xs">
                <Plus size={16} />
                <span>Choose a Template</span>
              </Button>
            </Link>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {webPages.map((page) => {
            const isPublished = page.is_published;
            const tpl = templates.find((t) => t.key === page.template_key);
            const isCardMutating = mutatingState?.id === page.id;
            const isPublishMutating = isCardMutating && mutatingState.action === 'publish';
            const isDeleteMutating = isCardMutating && mutatingState.action === 'delete';
            const fullPublicUrl = page.public_url ? buildPublicCardUrl(page.public_url) : null;
            const normalizedKey = page.template_key ? page.template_key.replace(/_/g, '-') : 'creator';
            const previewImageUrl = tpl?.preview_image || `/images/web-page-templates/${normalizedKey}.jpg`;

            return (
              <div
                key={page.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition flex flex-col justify-between overflow-hidden"
              >
                {/* Top Card Preview Banner */}
                <div className="relative h-44 bg-slate-100 overflow-hidden border-b border-slate-100">
                  <img
                    src={previewImageUrl}
                    alt={page.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant={isPublished ? 'success' : 'subtle'} className="capitalize shadow-2xs font-extrabold">
                      {isPublished ? 'Live' : 'Draft'}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {/* Open Live Site Button (Published only) - 44px mobile touch target */}
                    {fullPublicUrl && isPublished && (
                      <a
                        href={fullPublicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] rounded-xl bg-white/95 backdrop-blur-xs text-slate-700 hover:bg-white hover:text-primary-600 shadow-2xs transition"
                        title="Open live site"
                        aria-label="Open live site"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {/* Copy Public Link Button - 44px mobile touch target */}
                    {fullPublicUrl && isPublished && (
                      <button
                        type="button"
                        onClick={() => handleCopyLink(page)}
                        className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] rounded-xl bg-white/95 backdrop-blur-xs text-slate-700 hover:bg-white hover:text-primary-600 shadow-2xs transition"
                        title="Copy public link"
                        aria-label="Copy public link"
                      >
                        {copiedId === page.id ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    )}
                    {/* Preview Page Button - 44px mobile touch target */}
                    <Link
                      href={`/web-pages/${page.id}/preview`}
                      className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] rounded-xl bg-white/95 backdrop-blur-xs text-slate-700 hover:bg-white hover:text-primary-600 shadow-2xs transition"
                      title="Preview page"
                      aria-label="Preview page"
                    >
                      <Eye size={14} />
                    </Link>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-black text-slate-900 text-sm truncate" title={page.title}>
                        {page.title}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">
                        /{page.slug}
                      </span>
                    </div>
                    {page.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {page.description}
                      </p>
                    )}
                  </div>

                  {/* Metrics Footer & Actions */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Eye size={13} className="text-slate-400" />
                        <span>{page.events_count ?? 0} views</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} className="text-slate-400" />
                        <span>{page.submissions_count ?? 0} submissions</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Layers size={13} className="text-slate-400" />
                        <span>{page.sections?.length || 0} sections</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {/* Publish / Unpublish Button with 44px Touch Target and Inline Spinner */}
                      <button
                        type="button"
                        disabled={isCardMutating}
                        onClick={() => handleTogglePublishClick(page)}
                        className={`text-xs font-extrabold min-h-[44px] sm:min-h-[34px] px-3.5 sm:px-3 py-2 sm:py-1.5 rounded-xl border transition flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${
                          isPublished
                            ? 'text-emerald-700 bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100'
                            : 'text-slate-600 bg-slate-100 border-slate-200 hover:bg-slate-200'
                        }`}
                        aria-label={isPublished ? 'Unpublish web page' : 'Publish web page'}
                      >
                        {isPublishMutating ? (
                          <Loader2 size={13} className="animate-spin text-slate-500" />
                        ) : (
                          <Power size={13} className={isPublished ? 'text-emerald-600' : 'text-slate-400'} />
                        )}
                        <span>{isPublished ? 'Published' : 'Publish'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <Link href={`/web-pages/${page.id}/edit`}>
                          <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-[34px] gap-1 px-3 sm:px-2.5">
                            <Edit size={13} />
                            <span>Edit</span>
                          </Button>
                        </Link>
                        {/* Delete Button with 44px Hit Area and Granular Inline Loader */}
                        <button
                          type="button"
                          disabled={isCardMutating}
                          onClick={() => setDeleteTarget(page)}
                          className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition disabled:opacity-50"
                          title="Delete web page"
                          aria-label="Delete web page"
                        >
                          {isDeleteMutating ? (
                            <Loader2 size={15} className="animate-spin text-rose-500" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Unpublish Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(unpublishTarget)}
        onClose={() => setUnpublishTarget(null)}
        onConfirm={handleConfirmUnpublish}
        title="Unpublish Web Page?"
        description="This will immediately make the public page unavailable to visitors. Any links, campaigns, or traffic pointing to this page will stop working until it is published again."
        confirmText="Unpublish"
        cancelText="Cancel"
        variant="warning"
        isLoading={Boolean(mutatingState?.id === unpublishTarget?.id && mutatingState?.action === 'publish')}
      />

      {/* 7. Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Web Page"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? All traffic events and associated form submissions will be permanently removed.`}
        confirmText="Delete Web Page"
        variant="danger"
        isLoading={Boolean(mutatingState?.id === deleteTarget?.id && mutatingState?.action === 'delete')}
      />

      {/* 8. Toast Feedback Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4"
        >
          {toast.type === 'error' ? (
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
