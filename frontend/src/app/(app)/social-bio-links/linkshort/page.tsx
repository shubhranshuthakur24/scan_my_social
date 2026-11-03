'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SocialBioLinksNav from '@/components/social-bio-links/SocialBioLinksNav';
import LinkShortSkeleton from '@/components/social-bio-links/linkshort/LinkShortSkeleton';
import LinkShortEmptyState from '@/components/social-bio-links/linkshort/LinkShortEmptyState';
import LinkShortFilters from '@/components/social-bio-links/linkshort/LinkShortFilters';
import LinkShortList from '@/components/social-bio-links/linkshort/LinkShortList';
import LinkShortDialog from '@/components/social-bio-links/linkshort/LinkShortDialog';
import LinkShortDeleteDialog from '@/components/social-bio-links/linkshort/LinkShortDeleteDialog';
import {
  ShortLink,
  CreateShortLinkPayload,
  UpdateShortLinkPayload,
} from '@/lib/api/linkShortService';
import { useLinkShortStore } from '@/lib/store/useLinkShortStore';
import {
  Link as LinkIcon,
  Power,
  MousePointerClick,
  Plus,
  AlertCircle,
  RefreshCw,
  BarChart2,
} from 'lucide-react';
import Button from '@/components/ui/Button';

export default function LinkShortPage() {
  const [hasMounted, setHasMounted] = useState(false);

  // Zustand Store Subscriptions
  const shortLinks = useLinkShortStore((s) => s.shortLinks);
  const summary = useLinkShortStore((s) => s.summary);
  const pagination = useLinkShortStore((s) => s.pagination);
  const storeLoading = useLinkShortStore((s) => s.isLoading);
  const storeMutating = useLinkShortStore((s) => s.isMutating);
  const storeError = useLinkShortStore((s) => s.error);
  const isHydrated = useLinkShortStore((s) => s.isHydrated);

  // Zustand Store Actions
  const fetchShortLinksAction = useLinkShortStore((s) => s.fetchShortLinks);
  const createShortLinkAction = useLinkShortStore((s) => s.createShortLink);
  const updateShortLinkAction = useLinkShortStore((s) => s.updateShortLink);
  const toggleShortLinkAction = useLinkShortStore((s) => s.toggleShortLink);
  const deleteShortLinkAction = useLinkShortStore((s) => s.deleteShortLink);

  // Query & filter states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'scheduled'>('all');
  const [sort, setSort] = useState<'newest' | 'clicks'>('newest');
  const [page, setPage] = useState(1);

  // Modal states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ShortLink | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShortLink | null>(null);

  const isMutating = storeMutating;
  const error = storeError;

  // Mount tracking for deterministic SSR hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // SWR Fetching: Triggers when filters change or on initial mount
  useEffect(() => {
    if (!hasMounted) return;

    fetchShortLinksAction({
      page,
      search: debouncedSearch.trim() || undefined,
      status,
      sort,
      per_page: 25,
    }).catch(() => {
      // Store captures error state
    });
  }, [hasMounted, page, debouncedSearch, status, sort, fetchShortLinksAction]);

  // Handle Search Change
  const handleSearchChange = (val: string) => {
    setSearch(val);
  };

  const handleStatusChange = (val: 'all' | 'active' | 'inactive' | 'scheduled') => {
    setStatus(val);
    setPage(1);
  };

  const handleSortChange = (val: 'newest' | 'clicks') => {
    setSort(val);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Actions
  const handleOpenCreate = () => {
    setEditingLink(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (link: ShortLink) => {
    setEditingLink(link);
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (link: ShortLink) => {
    setDeleteTarget(link);
  };

  // Mutations
  const handleSubmitDialog = async (payload: CreateShortLinkPayload | UpdateShortLinkPayload) => {
    try {
      if (editingLink) {
        await updateShortLinkAction(editingLink.id, payload);
      } else {
        await createShortLinkAction(payload as CreateShortLinkPayload, {
          page: 1,
          search: debouncedSearch.trim() || undefined,
          status,
          sort,
          per_page: 25,
        });
        setPage(1);
      }
      setIsDialogOpen(false);
    } catch {
      // Error handled in store
    }
  };

  const handleToggle = async (link: ShortLink) => {
    try {
      await toggleShortLinkAction(link.id);
    } catch {
      // Error handled in store
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const isOnlyItemOnPage = shortLinks.length === 1 && page > 1;
      const targetPage = isOnlyItemOnPage ? page - 1 : page;

      await deleteShortLinkAction(deleteTarget.id, {
        page: targetPage,
        search: debouncedSearch.trim() || undefined,
        status,
        sort,
        per_page: 25,
      });

      if (isOnlyItemOnPage) {
        setPage(targetPage);
      }
      setDeleteTarget(null);
    } catch {
      // Error handled in store
    }
  };

  // Zero-delay skeleton: only show skeleton if not mounted or zero cached links exist while loading
  const isInitialLoading = !hasMounted || (storeLoading && shortLinks.length === 0);

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <SocialBioLinksNav activeTab="linkshort" />
        <LinkShortSkeleton />
      </div>
    );
  }

  const hasActiveFilters = Boolean(search || status !== 'all');

  return (
    <div className="space-y-6">
      {/* 1. Shared Navigation with Primary Action */}
      <SocialBioLinksNav
        rightElement={
          <div className="flex items-center gap-2">
            <Link
              href="/social-bio-links/analytics?view=linkshort"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80 shadow-2xs shrink-0 transition focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
            >
              <BarChart2 size={14} />
              <span>View Analytics</span>
            </Link>
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              size="sm"
              className="gap-2 shadow-xs shrink-0 min-h-[44px] px-4 font-bold"
            >
              <Plus size={15} />
              <span>Create Short Link</span>
            </Button>
          </div>
        }
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() =>
              fetchShortLinksAction(
                { page, search: debouncedSearch.trim() || undefined, status, sort, per_page: 25 },
                true
              )
            }
            className="flex items-center gap-1 font-bold underline text-rose-800 cursor-pointer"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* 3. KPI Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Linkshort Summary Metrics">
        {/* Total Links */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider">Total Links</span>
            <div className="p-2 rounded-xl bg-slate-100/80 text-slate-700">
              <LinkIcon size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{summary.total_links.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">Created across your account</p>
        </div>

        {/* Active Links */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Active Links</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Power size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{summary.active_links.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">Currently available to redirect</p>
        </div>

        {/* Lifetime Clicks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-primary-600 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Clicks</span>
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <MousePointerClick size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{summary.total_clicks.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">Lifetime clicks across all links</p>
        </div>
      </section>

      {/* 4. Filters, Search & Sort */}
      <LinkShortFilters
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={handleStatusChange}
        sort={sort}
        onSortChange={handleSortChange}
        onCreateClick={handleOpenCreate}
      />

      {/* 5. Short Links List or Empty State */}
      {shortLinks.length === 0 ? (
        <LinkShortEmptyState
          hasFilters={hasActiveFilters}
          onClearFilters={() => {
            setSearch('');
            setStatus('all');
          }}
          onCreateLink={handleOpenCreate}
        />
      ) : (
        <LinkShortList
          shortLinks={shortLinks}
          pagination={pagination}
          onPageChange={handlePageChange}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
          onToggle={handleToggle}
          isMutating={isMutating}
        />
      )}

      {/* 6. Modals */}
      <LinkShortDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleSubmitDialog}
        editingLink={editingLink}
        isSubmitting={isMutating}
      />

      <LinkShortDeleteDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        shortLink={deleteTarget}
        isDeleting={isMutating}
      />
    </div>
  );
}
