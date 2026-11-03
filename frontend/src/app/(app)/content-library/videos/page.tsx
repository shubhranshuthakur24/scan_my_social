'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ContentLibraryNav from '@/components/ContentLibraryNav';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ContentLibraryCard from '@/components/content-library/ContentLibraryCard';
import ContentLibrarySkeleton from '@/components/content-library/ContentLibrarySkeleton';
import SaveFilterModal from '@/components/content-library/SaveFilterModal';
import AddToProjectModal from '@/components/content-library/AddToProjectModal';
import {
  VideoFilterBar,
  VideoFilterDrawer,
  ActiveFilterChips,
  SavedFilterPresets,
  VideoEmptyState,
  VideoPagination,
  QUICK_FILTER_PRESETS,
  type QuickFilterPreset,
  type ActiveVideoFilters,
} from '@/components/content-library/videos';
import {
  getPosts,
  getChannels,
  getWatchlists,
  getProjects,
  getSavedVideoFilters,
  deleteSavedVideoFilter,
} from '@/lib/api/contentLibraryService';
import type {
  ChannelItem,
  ContentPostItem,
  ContentLibraryFilters,
  WatchlistItem,
  ProjectItem,
  SavedFilterItem,
} from '@/types/contentLibrary';
import { AlertCircle, Loader2 } from 'lucide-react';

function ContentLibraryContent() {
  const searchParams = useSearchParams();

  // Posts & Pagination State
  const [posts, setPosts] = useState<ContentPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 24,
  });

  // Authoritative Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [minOutlier, setMinOutlier] = useState<number | undefined>(undefined);
  const [viewsMin, setViewsMin] = useState<number | undefined>(undefined);
  const [engagementMin, setEngagementMin] = useState<number | undefined>(undefined);
  const [dateValue, setDateValue] = useState<number | undefined>(undefined);
  const [dateUnit, setDateUnit] = useState<'Days' | 'Weeks' | 'Months' | 'Years'>('Days');
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'outlier_score' | 'views' | 'engagement_rate' | 'posted_date'>('posted_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Auxiliary Entities
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilterItem[]>([]);

  // Drawer & Modals State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSaveFilterModalOpen, setIsSaveFilterModalOpen] = useState(false);
  const [activePostForProject, setActivePostForProject] = useState<ContentPostItem | null>(null);

  // Guarded Single-Instance URL Search Params Initialization
  const initializedFromUrl = useRef(false);
  useEffect(() => {
    if (initializedFromUrl.current) return;

    // Normalize ?creator= and ?creator[]=
    const creatorParams = [
      ...searchParams.getAll('creator[]'),
      ...searchParams.getAll('creator'),
    ]
      .map((c) => c.replace(/^@/, '').trim())
      .filter(Boolean);

    // Normalize ?watchlist= and ?watchlist[]=
    const watchlistParam = searchParams.get('watchlist[]') || searchParams.get('watchlist');
    const parsedWlId = watchlistParam ? parseInt(watchlistParam, 10) : undefined;

    if (creatorParams.length > 0) {
      setSelectedCreators(Array.from(new Set(creatorParams)));
    }
    if (parsedWlId && !Number.isNaN(parsedWlId)) {
      setSelectedWatchlistId(parsedWlId);
    }

    initializedFromUrl.current = true;
  }, [searchParams]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load auxiliary data on mount
  useEffect(() => {
    getChannels().then((res) => setChannels(res.data || [])).catch(() => {});
    getWatchlists().then(setWatchlists).catch(() => {});
    getProjects().then(setProjects).catch(() => {});
    getSavedVideoFilters().then(setSavedFilters).catch(() => {});
  }, []);

  // Syncing channels detection
  const inFlightStatuses = ['QUEUED', 'CLAIMING', 'RUNNING'];
  const syncingChannelsCount = channels.filter(
    (c) =>
      inFlightStatuses.includes(c.apify_profile_run_status || '') ||
      inFlightStatuses.includes(c.apify_post_run_status || '')
  ).length;

  // Stale request protection via AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchPosts = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const queryFilters: ContentLibraryFilters = {
      search: debouncedSearch.trim() || undefined,
      page: currentPage,
      per_page: 24,
      sort_by: sortBy,
      sort_dir: sortDir,
      outlier_min: minOutlier,
      views_min: viewsMin,
      engagement_min: engagementMin,
      platform: selectedPlatform !== 'all' ? [selectedPlatform] : undefined,
      creator: selectedCreators.length > 0 ? selectedCreators : undefined,
      label: selectedLabels.length > 0 ? selectedLabels : undefined,
      watchlist: selectedWatchlistId ? [selectedWatchlistId] : undefined,
      project: selectedProjectId ? [selectedProjectId] : undefined,
      date_value: dateValue,
      date_unit: dateUnit,
    };

    getPosts(queryFilters, controller.signal)
      .then((response) => {
        if (active) {
          setPosts(response.data || []);
          setPagination({
            currentPage: response.current_page || 1,
            lastPage: response.last_page || 1,
            total: response.total || 0,
            perPage: response.per_page || 24,
          });
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Stale request was aborted
        }
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch posts from the library.';
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
      controller.abort();
    };
  }, [
    debouncedSearch,
    currentPage,
    sortBy,
    sortDir,
    minOutlier,
    viewsMin,
    engagementMin,
    selectedPlatform,
    selectedCreators,
    selectedLabels,
    selectedWatchlistId,
    selectedProjectId,
    dateValue,
    dateUnit,
    refreshTrigger,
  ]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedPlatform('all');
    setSelectedCreators([]);
    setSelectedLabels([]);
    setMinOutlier(undefined);
    setViewsMin(undefined);
    setEngagementMin(undefined);
    setDateValue(undefined);
    setDateUnit('Days');
    setSelectedWatchlistId(undefined);
    setSelectedProjectId(undefined);
    setSortBy('posted_date');
    setSortDir('desc');
    setCurrentPage(1);
  };

  // Controlled filter update handler
  const handleFilterChange = <K extends keyof ActiveVideoFilters>(
    key: K,
    value: ActiveVideoFilters[K]
  ) => {
    switch (key) {
      case 'search':
        setSearch(value as string);
        break;
      case 'selectedPlatform':
        setSelectedPlatform(value as string);
        break;
      case 'selectedCreators':
        setSelectedCreators(value as string[]);
        break;
      case 'selectedLabels':
        setSelectedLabels(value as string[]);
        break;
      case 'minOutlier':
        setMinOutlier(value as number | undefined);
        break;
      case 'viewsMin':
        setViewsMin(value as number | undefined);
        break;
      case 'engagementMin':
        setEngagementMin(value as number | undefined);
        break;
      case 'dateValue':
        setDateValue(value as number | undefined);
        break;
      case 'dateUnit':
        setDateUnit(value as 'Days' | 'Weeks' | 'Months' | 'Years');
        break;
      case 'selectedWatchlistId':
        setSelectedWatchlistId(value as number | undefined);
        break;
      case 'selectedProjectId':
        setSelectedProjectId(value as number | undefined);
        break;
      case 'sortBy':
        setSortBy(value as 'outlier_score' | 'views' | 'engagement_rate' | 'posted_date');
        break;
      case 'sortDir':
        setSortDir(value as 'asc' | 'desc');
        break;
    }
    setCurrentPage(1);
  };

  // Check which quick preset matches current filters
  const activePresetKey = useMemo(() => {
    const isAll =
      !search.trim() &&
      selectedPlatform === 'all' &&
      selectedCreators.length === 0 &&
      selectedLabels.length === 0 &&
      minOutlier === undefined &&
      viewsMin === undefined &&
      engagementMin === undefined &&
      dateValue === undefined &&
      selectedWatchlistId === undefined &&
      selectedProjectId === undefined &&
      sortBy === 'posted_date' &&
      sortDir === 'desc';
    if (isAll) return 'all';

    if (
      minOutlier === 5 &&
      sortBy === 'outlier_score' &&
      sortDir === 'desc' &&
      selectedCreators.length === 0 &&
      selectedLabels.length === 0 &&
      !viewsMin &&
      !engagementMin &&
      !dateValue
    ) {
      return 'explosive';
    }

    if (
      minOutlier === 3 &&
      sortBy === 'outlier_score' &&
      sortDir === 'desc' &&
      selectedCreators.length === 0 &&
      selectedLabels.length === 0 &&
      !viewsMin &&
      !engagementMin &&
      !dateValue
    ) {
      return 'breakouts';
    }

    if (
      dateValue === 2 &&
      dateUnit === 'Days' &&
      sortBy === 'posted_date' &&
      sortDir === 'desc' &&
      selectedCreators.length === 0 &&
      selectedLabels.length === 0 &&
      !minOutlier &&
      !viewsMin &&
      !engagementMin
    ) {
      return 'last_48h';
    }

    if (
      engagementMin === 5 &&
      sortBy === 'engagement_rate' &&
      sortDir === 'desc' &&
      selectedCreators.length === 0 &&
      selectedLabels.length === 0 &&
      !minOutlier &&
      !viewsMin &&
      !dateValue
    ) {
      return 'high_engagement';
    }

    return '';
  }, [
    search,
    selectedPlatform,
    selectedCreators,
    selectedLabels,
    minOutlier,
    viewsMin,
    engagementMin,
    dateValue,
    dateUnit,
    selectedWatchlistId,
    selectedProjectId,
    sortBy,
    sortDir,
  ]);

  const handleApplyQuickPreset = (preset: QuickFilterPreset) => {
    if (preset.filters === null) {
      handleResetFilters();
      return;
    }
    setSearch('');
    setDebouncedSearch('');
    setSelectedPlatform('all');
    setSelectedCreators([]);
    setSelectedLabels([]);
    setSelectedWatchlistId(undefined);
    setSelectedProjectId(undefined);
    setViewsMin(undefined);
    setEngagementMin(preset.filters.engagement_min);
    setMinOutlier(preset.filters.outlier_min);
    setDateValue(preset.filters.date_value);
    setDateUnit(preset.filters.date_unit || 'Days');
    setSortBy(preset.filters.sort_by || 'posted_date');
    setSortDir(preset.filters.sort_dir || 'desc');
    setCurrentPage(1);
  };

  const handleApplySavedFilter = (item: SavedFilterItem) => {
    const f = item.filters || {};
    setSearch(f.search || '');
    setDebouncedSearch(f.search || '');
    setSelectedPlatform(f.platform?.[0] || 'all');
    setSelectedCreators(f.creator || []);
    setSelectedLabels(f.label || []);
    setMinOutlier(f.outlier_min);
    setViewsMin(f.views_min);
    setEngagementMin(f.engagement_min);
    setDateValue(f.date_value);
    setDateUnit(f.date_unit || 'Days');
    setSelectedWatchlistId(f.watchlist?.[0]);
    setSelectedProjectId(f.project?.[0]);
    setSortBy(f.sort_by || 'posted_date');
    setSortDir(f.sort_dir || 'desc');
    setCurrentPage(1);
  };

  const handleDeleteSavedFilter = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSavedVideoFilter(id);
      setSavedFilters((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // Ignored
    }
  };

  const activeFiltersState: ActiveVideoFilters = useMemo(
    () => ({
      search,
      selectedPlatform,
      selectedCreators,
      selectedLabels,
      minOutlier,
      viewsMin,
      engagementMin,
      dateValue,
      dateUnit,
      selectedWatchlistId,
      selectedProjectId,
      sortBy,
      sortDir,
    }),
    [
      search,
      selectedPlatform,
      selectedCreators,
      selectedLabels,
      minOutlier,
      viewsMin,
      engagementMin,
      dateValue,
      dateUnit,
      selectedWatchlistId,
      selectedProjectId,
      sortBy,
      sortDir,
    ]
  );

  const hasActiveFilters = Boolean(
    search.trim() ||
      selectedPlatform !== 'all' ||
      selectedCreators.length > 0 ||
      selectedLabels.length > 0 ||
      minOutlier !== undefined ||
      viewsMin !== undefined ||
      engagementMin !== undefined ||
      dateValue !== undefined ||
      selectedWatchlistId !== undefined ||
      selectedProjectId !== undefined ||
      sortBy !== 'posted_date' ||
      sortDir !== 'desc'
  );

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (selectedPlatform !== 'all' ? 1 : 0) +
    selectedCreators.length +
    selectedLabels.length +
    (minOutlier !== undefined ? 1 : 0) +
    (viewsMin !== undefined ? 1 : 0) +
    (engagementMin !== undefined ? 1 : 0) +
    (dateValue !== undefined ? 1 : 0) +
    (selectedWatchlistId !== undefined ? 1 : 0) +
    (selectedProjectId !== undefined ? 1 : 0) +
    (sortBy !== 'posted_date' || sortDir !== 'desc' ? 1 : 0);

  const currentFiltersObject: ContentLibraryFilters = {
    search: search.trim() || undefined,
    outlier_min: minOutlier,
    views_min: viewsMin,
    engagement_min: engagementMin,
    platform: selectedPlatform !== 'all' ? [selectedPlatform] : undefined,
    creator: selectedCreators.length > 0 ? selectedCreators : undefined,
    label: selectedLabels.length > 0 ? selectedLabels : undefined,
    watchlist: selectedWatchlistId ? [selectedWatchlistId] : undefined,
    project: selectedProjectId ? [selectedProjectId] : undefined,
    date_value: dateValue,
    date_unit: dateUnit,
    sort_by: sortBy,
    sort_dir: sortDir,
  };

  return (
    <div className="space-y-6">
      <ContentLibraryNav
        rightElement={
          <Badge variant="subtle" color="slate" size="md">
            {pagination.total} Videos Indexed
          </Badge>
        }
      />

      {/* Simplified Onboarding Banner (Rendered only if 0 channels tracked) */}
      {!loading && channels.length === 0 && (
        <div className="rounded-2xl border border-primary-200 bg-linear-to-r from-primary-50 via-white to-primary-50/40 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900">
              Add a competitor channel to start building your Content Library.
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Track creator handles to automatically sync their public reels and calculate viral breakout metrics.
            </p>
          </div>
          <Link href="/content-library/channels">
            <Button variant="primary" size="sm">
              Discover & Track Creators
            </Button>
          </Link>
        </div>
      )}

      {/* Syncing In Progress Notice (Rendered if channels exist and syncing, but 0 posts available yet) */}
      {!loading && channels.length > 0 && syncingChannelsCount > 0 && pagination.total === 0 && (
        <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-primary-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">Syncing creator reels... Takes ~2-3 min.</p>
              <p className="text-[11px] text-slate-500 font-medium">
                {syncingChannelsCount} creator {syncingChannelsCount === 1 ? 'channel is' : 'channels are'} currently being indexed.
              </p>
            </div>
          </div>
          <Link href="/content-library/channels" className="text-xs font-bold text-primary-600 hover:underline">
            View Tracked Channels →
          </Link>
        </div>
      )}

      {/* 1. Main Search & Filter Bar */}
      <VideoFilterBar
        search={search}
        onSearchChange={(val) => setSearch(val)}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={(newSortBy, newSortDir) => {
          setSortBy(newSortBy);
          setSortDir(newSortDir);
          setCurrentPage(1);
        }}
        isFilterOpen={isFilterOpen}
        onToggleFilterOpen={() => setIsFilterOpen((prev) => !prev)}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        onOpenSaveModal={() => setIsSaveFilterModalOpen(true)}
        activePresetKey={activePresetKey}
        onApplyQuickPreset={handleApplyQuickPreset}
      />

      {/* 2. Granular Filter Drawer */}
      <VideoFilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={activeFiltersState}
        onFilterChange={handleFilterChange}
        channels={channels}
        watchlists={watchlists}
        projects={projects}
        onResetFilters={handleResetFilters}
      />

      {/* 3. Saved Filter Presets */}
      <SavedFilterPresets
        presets={savedFilters}
        onApplyPreset={handleApplySavedFilter}
        onDeletePreset={handleDeleteSavedFilter}
      />

      {/* 4. Active Filters Reset Bar & Chips */}
      <ActiveFilterChips
        filters={activeFiltersState}
        totalPosts={pagination.total}
        hasActiveFilters={hasActiveFilters}
        onRemoveSearch={() => setSearch('')}
        onRemoveCreator={(handle) =>
          setSelectedCreators((prev) => prev.filter((h) => h !== handle))
        }
        onRemoveLabel={(lbl) =>
          setSelectedLabels((prev) => prev.filter((item) => item !== lbl))
        }
        onRemoveOutlier={() => setMinOutlier(undefined)}
        onRemoveViews={() => setViewsMin(undefined)}
        onRemoveEngagement={() => setEngagementMin(undefined)}
        onRemoveDate={() => setDateValue(undefined)}
        onRemovePlatform={() => setSelectedPlatform('all')}
        onResetAll={handleResetFilters}
      />

      {/* 5. Content Grid / Loading / Error / Empty States */}
      {loading ? (
        <ContentLibrarySkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center space-y-3">
          <AlertCircle size={32} className="mx-auto text-rose-500" />
          <h3 className="text-sm font-bold text-rose-900">Failed to load content</h3>
          <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
          <Button variant="primary" size="sm" onClick={fetchPosts}>
            Retry Request
          </Button>
        </div>
      ) : posts.length === 0 ? (
        <VideoEmptyState
          channelsCount={channels.length}
          syncingChannelsCount={syncingChannelsCount}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={handleResetFilters}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {posts.map((post) => (
            <ContentLibraryCard
              key={post.id}
              post={post}
              onAddToProject={(p) => setActivePostForProject(p)}
            />
          ))}
        </div>
      )}

      {/* 6. Server-side Pagination Bar */}
      {!loading && (
        <VideoPagination
          currentPage={pagination.currentPage}
          lastPage={pagination.lastPage}
          total={pagination.total}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}

      {/* Modals */}
      <SaveFilterModal
        isOpen={isSaveFilterModalOpen}
        onClose={() => setIsSaveFilterModalOpen(false)}
        filters={currentFiltersObject}
        onSaved={(item) => setSavedFilters((prev) => [item, ...prev])}
      />

      <AddToProjectModal
        isOpen={Boolean(activePostForProject)}
        onClose={() => setActivePostForProject(null)}
        post={activePostForProject}
        onSuccess={() => {
          fetchPosts();
        }}
      />
    </div>
  );
}

export default function ContentLibraryPage() {
  return (
    <Suspense fallback={<ContentLibrarySkeleton />}>
      <ContentLibraryContent />
    </Suspense>
  );
}
