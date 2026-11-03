'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ContentLibraryNav from '@/components/ContentLibraryNav';
import Button from '@/components/ui/Button';
import {
  getWatchlists,
  createWatchlist,
  deleteWatchlist,
  toggleWatchlistFavorite,
} from '@/lib/api/contentLibraryService';
import type { WatchlistItem } from '@/types/contentLibrary';
import { Eye, Plus, Search, AlertCircle } from 'lucide-react';
import {
  WatchlistCard,
  WatchlistSkeleton,
  CreateWatchlistModal,
} from '@/components/content-library/watchlists';

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadWatchlists = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    getWatchlists({
      search: debouncedSearch.trim() || undefined,
    })
      .then((items) => {
        if (active) {
          setWatchlists(items);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to load watchlists.';
          setError(msg);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, refreshTrigger]);

  const handleCreate = async (name: string, description?: string) => {
    const created = await createWatchlist(name, description);
    setWatchlists((prev) => [created, ...prev]);
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this watchlist?')) return;

    setDeletingId(id);
    try {
      await deleteWatchlist(id);
      setWatchlists((prev) => prev.filter((w) => w.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete watchlist.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleFavorite = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await toggleWatchlistFavorite(id);
      setWatchlists((prev) =>
        prev.map((w) => (w.id === id ? { ...w, is_favorite: res.is_favorite } : w))
      );
    } catch {
      // Ignored
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <ContentLibraryNav
        rightElement={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
          >
            Create Watchlist
          </Button>
        }
      />

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search watchlists by name..."
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-hidden"
          />
        </div>

        <span className="text-xs font-bold text-slate-500 self-center">
          {watchlists.length} {watchlists.length === 1 ? 'Watchlist' : 'Watchlists'}
        </span>
      </div>

      {/* Watchlists Grid / Loading / Error / Empty */}
      {loading ? (
        <WatchlistSkeleton count={6} />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center space-y-3">
          <AlertCircle size={32} className="mx-auto text-rose-500" />
          <h3 className="text-sm font-bold text-rose-900">Failed to load watchlists</h3>
          <p className="text-xs text-rose-600">{error}</p>
          <Button variant="primary" size="sm" onClick={loadWatchlists}>
            Retry
          </Button>
        </div>
      ) : watchlists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
            <Eye size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No watchlists created yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create a watchlist to bundle channels in the same niche and instantly view their combined feed.
            </p>
          </div>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
            Create First Watchlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {watchlists.map((wl) => (
            <WatchlistCard
              key={wl.id}
              watchlist={wl}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
              isDeleting={deletingId === wl.id}
            />
          ))}
        </div>
      )}

      {/* Create Watchlist Modal */}
      <CreateWatchlistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
