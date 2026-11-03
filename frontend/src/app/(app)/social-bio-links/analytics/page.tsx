'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  fetchSocialBioLinks,
  BioCardSummary,
  BioCard,
  BioAnalyticsData,
} from '@/lib/api/socialBioLinksService';
import { useSocialBioStore, selectPrimaryCard } from '@/lib/store/useSocialBioStore';
import {
  fetchLinkShortAggregateAnalytics,
  AggregateShortLinkAnalytics,
  createShortLink,
  CreateShortLinkPayload,
} from '@/lib/api/linkShortService';
import { useSocialBioAnalyticsStore, AnalyticsPreset } from '@/lib/store/useSocialBioAnalyticsStore';
import SocialBioLinksNav from '@/components/social-bio-links/SocialBioLinksNav';
import LinkShortDialog from '@/components/social-bio-links/linkshort/LinkShortDialog';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import Dropdown from '@/components/ui/Dropdown';
import {
  BarChart2,
  MousePointerClick,
  Users,
  Layers,
  Link as LinkIcon,
  RefreshCw,
  ExternalLink,
  Edit3,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Plus,
  Calendar,
  ChevronDown,
  Copy,
  Check,
  Globe,
  Clock,
  Power,
  Compass,
} from 'lucide-react';

const presets = [
  { id: '7d', label: 'Last 7 Days', days: 7 },
  { id: '14d', label: 'Last 14 Days', days: 14 },
  { id: '30d', label: 'Last 30 Days', days: 30 },
  { id: '90d', label: 'Last 90 Days', days: 90 },
] as const;

type DatePreset = (typeof presets)[number]['id'];
type AnalyticsView = 'bio' | 'linkshort';

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-72 bg-slate-100 rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}

function AnalyticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mount tracking for deterministic SSR hydration
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Active View State synced with URL query (?view=bio | ?view=linkshort)
  const initialView: AnalyticsView =
    searchParams.get('view') === 'linkshort' ? 'linkshort' : 'bio';
  const [activeView, setActiveView] = useState<AnalyticsView>(initialView);

  const initialPreset: DatePreset =
    (searchParams.get('preset') as DatePreset) || '30d';
  const [datePreset, setDatePreset] = useState<DatePreset>(
    presets.some((p) => p.id === initialPreset) ? initialPreset : '30d'
  );

  // Zustand Store Subscriptions
  const bioAnalyticsByPreset = useSocialBioAnalyticsStore((s) => s.bioAnalyticsByPreset);
  const linkShortAnalyticsByPreset = useSocialBioAnalyticsStore((s) => s.linkShortAnalyticsByPreset);
  const storeLoading = useSocialBioAnalyticsStore((s) => s.isLoading);
  const storeError = useSocialBioAnalyticsStore((s) => s.error);

  // Card data from the main CRUD store
  const cards = useSocialBioStore((s) => s.cardSummaries);
  const primaryCard = useSocialBioStore(selectPrimaryCard) || null;
  const fetchDashboard = useSocialBioStore((s) => s.fetchDashboard);

  // Zustand Store Actions
  const fetchBioAnalyticsAction = useSocialBioAnalyticsStore((s) => s.fetchBioAnalytics);
  const fetchLinkShortAnalyticsAction = useSocialBioAnalyticsStore((s) => s.fetchLinkShortAnalytics);

  // Resolved Active Data from Store
  const currentBioData = bioAnalyticsByPreset[datePreset];
  const currentLinkShortData = linkShortAnalyticsByPreset[datePreset];

  const combinedBioAnalytics = currentBioData?.combinedAnalytics || null;
  const linkShortAnalytics = currentLinkShortData?.analytics || null;

  const hasCachedData = activeView === 'bio' ? Boolean(currentBioData) : Boolean(currentLinkShortData);
  const isLoading = !hasMounted || (storeLoading && !hasCachedData);
  const error = storeError;

  // Linkshort Dialog Modal state for quick creation
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);

  // Copy feedback state for short links
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copyAnnouncement, setCopyAnnouncement] = useState<{ message: string; type: 'polite' | 'assertive' } | null>(null);

  // Synchronize React state when URL searchParams change (Browser Back / Forward)
  useEffect(() => {
    const viewParam: AnalyticsView =
      searchParams.get('view') === 'linkshort' ? 'linkshort' : 'bio';
    const presetParam = searchParams.get('preset') as DatePreset;
    const validPreset = presets.some((p) => p.id === presetParam) ? presetParam : '30d';

    if (activeView !== viewParam) {
      setActiveView(viewParam);
    }
    if (datePreset !== validPreset) {
      setDatePreset(validPreset);
    }
  }, [searchParams, activeView, datePreset]);

  const handleCopyShortUrl = async (shortUrl: string, code: string, title?: string) => {
    const linkName = title || code;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedCode(code);
      setCopyAnnouncement({
        message: `Copied short link for ${linkName}`,
        type: 'polite',
      });
      setTimeout(() => {
        setCopiedCode(null);
        setCopyAnnouncement(null);
      }, 2000);
    } catch {
      setCopiedCode(null);
      setCopyAnnouncement({
        message: `Failed to copy short link for ${linkName}`,
        type: 'assertive',
      });
    }
  };

  // Synchronize URL query params via router.push to support Browser Back / Forward history
  const updateUrlParams = useCallback(
    (view: AnalyticsView, preset: DatePreset) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get('view') === view && params.get('preset') === preset) {
        return;
      }
      params.set('view', view);
      params.set('preset', preset);
      router.push(`/social-bio-links/analytics?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleViewChange = (view: AnalyticsView) => {
    if (view === activeView) return;
    setActiveView(view);
    updateUrlParams(view, datePreset);
  };

  const handleSelectPreset = (preset: DatePreset) => {
    if (preset === datePreset) return;
    setDatePreset(preset);
    updateUrlParams(activeView, preset);
  };

  // SWR Fetching: Fetches in the background while displaying cached data instantly
  useEffect(() => {
    if (!hasMounted) return;

    // Ensure card CRUD data is loaded (from the main store, not the analytics store)
    fetchDashboard();

    if (activeView === 'bio') {
      fetchBioAnalyticsAction(datePreset as AnalyticsPreset).catch(() => {});
    } else {
      fetchLinkShortAnalyticsAction(datePreset as AnalyticsPreset).catch(() => {});
    }
  }, [hasMounted, activeView, datePreset, fetchBioAnalyticsAction, fetchLinkShortAnalyticsAction, fetchDashboard]);

  const handleRetry = () => {
    if (activeView === 'bio') {
      fetchBioAnalyticsAction(datePreset as AnalyticsPreset, true).catch(() => {});
    } else {
      fetchLinkShortAnalyticsAction(datePreset as AnalyticsPreset, true).catch(() => {});
    }
  };

  const handleCreateShortLink = async (payload: {
    title: string;
    destination_url: string;
    code?: string | null;
    description?: string | null;
    is_active?: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
  }) => {
    setIsSubmittingLink(true);
    try {
      await createShortLink(payload as CreateShortLinkPayload);
      setIsLinkDialogOpen(false);
      // Invalidate and refresh linkshort aggregate analytics
      fetchLinkShortAnalyticsAction(datePreset as AnalyticsPreset, true).catch(() => {});
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const selectedPreset = presets.find((p) => p.id === datePreset) || presets[2];

  // Bio-specific calculations (strictly filtering items with clicks > 0 for attribution & top lists)
  const bioCards = currentBioData?.cards && currentBioData.cards.length > 0 ? currentBioData.cards : cards;
  const totalBioLinks = bioCards.reduce((acc, c) => acc + (c.links_count || 0), 0);
  const totalBioClicks =
    combinedBioAnalytics?.total_clicks ?? bioCards.reduce((acc, c) => acc + (c.clicks_count || 0), 0);
  const uniqueBioClicks = combinedBioAnalytics?.unique_clicks ?? 0;
  const dailyBioClicks = combinedBioAnalytics?.daily_clicks || [];
  const maxBioClicksInDay = Math.max(...dailyBioClicks.map((d) => d.clicks), 1);
  const bioClicksInPeriod = combinedBioAnalytics?.period_clicks ?? dailyBioClicks.reduce((acc, d) => acc + d.clicks, 0);

  const sortedCards = [...bioCards]
    .filter((c) => (c.period_clicks ?? c.clicks_count ?? 0) > 0)
    .sort((a, b) => (b.period_clicks ?? b.clicks_count ?? 0) - (a.period_clicks ?? a.clicks_count ?? 0));

  const topBioLinks = (combinedBioAnalytics?.links || [])
    .filter((l) => (l.clicks || 0) > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  // Linkshort-specific calculations
  const totalShortLinks = linkShortAnalytics?.total_links ?? 0;
  const activeShortLinks = linkShortAnalytics?.active_links ?? 0;
  const totalShortlinkClicks = linkShortAnalytics?.total_clicks ?? 0;
  const uniqueShortlinkVisitors = linkShortAnalytics?.unique_visitors ?? 0;
  const dailyShortClicks = linkShortAnalytics?.daily_clicks || [];
  const maxShortClicksInDay = Math.max(...dailyShortClicks.map((d) => d.clicks), 1);
  const shortClicksInPeriod = linkShortAnalytics?.period_clicks ?? dailyShortClicks.reduce((acc, d) => acc + d.clicks, 0);
  const topShortLinks = (linkShortAnalytics?.top_links || []).filter((l) => (l.period_clicks ?? l.clicks_count ?? 0) > 0);
  const topReferrers = linkShortAnalytics?.top_referrers || [];
  const recentClicks = linkShortAnalytics?.recent_clicks || [];

  return (
    <div className="space-y-6 pb-16 overflow-x-clip">
      {/* 1. Primary Navigation Bar */}
      <SocialBioLinksNav activeTab="analytics" />

      {/* Page Title Landmark */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          Social Bio Links Analytics
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Performance overview and traffic distribution across bio cards and short links
        </p>
      </div>

      {/* 2. Dual-Scope Switcher & Actions Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
        {/* View Switcher Pills */}
        <div
          role="tablist"
          aria-label="Analytics scope"
          className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start shadow-2xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'bio'}
            onClick={() => handleViewChange('bio')}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${activeView === 'bio'
                ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <Layers
              size={15}
              className={activeView === 'bio' ? 'text-primary-600' : 'text-slate-400'}
            />
            <span>Link in Bio</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'linkshort'}
            onClick={() => handleViewChange('linkshort')}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${activeView === 'linkshort'
                ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            <LinkIcon
              size={15}
              className={activeView === 'linkshort' ? 'text-primary-600' : 'text-slate-400'}
            />
            <span>Linkshort</span>
          </button>
        </div>

        {/* Right Actions: Date Preset Selector & Primary Action */}
        <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
          {/* Date Preset Selector Dropdown */}
          <Dropdown>
            <Dropdown.Trigger asChild>
              <button
                type="button"
                aria-label={`Selected period: ${selectedPreset.label}. Click to change date range.`}
                className="inline-flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500/20 cursor-pointer shadow-2xs transition-all select-none"
              >
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span>{selectedPreset.label}</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content align="right" width="w-44">
              <div className="space-y-0.5">
                {presets.map((preset) => (
                  <Dropdown.Item
                    key={preset.id}
                    selected={datePreset === preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                  >
                    {preset.label}
                  </Dropdown.Item>
                ))}
              </div>
            </Dropdown.Content>
          </Dropdown>

          {activeView === 'bio' ? (
            <Link
              href="/social-bio-links/create"
              className="inline-flex items-center justify-center font-bold min-h-[44px] px-4 py-2.5 text-xs gap-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/20 border border-transparent hover:-translate-y-px transition-all duration-150 shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <Plus size={15} />
              <span>Create Bio Card</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/social-bio-links/linkshort"
                className="inline-flex items-center justify-center font-bold min-h-[44px] px-4 py-2.5 text-xs gap-2 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80 shadow-2xs transition-all duration-150 shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Compass size={14} />
                <span>Manage Links</span>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsLinkDialogOpen(true)}
                className="gap-2 shadow-xs shrink-0 min-h-[44px] px-4"
              >
                <Plus size={15} />
                <span>New Short Link</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Accessible Live Regions for Copy Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {copyAnnouncement?.type === 'polite' ? copyAnnouncement.message : ''}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {copyAnnouncement?.type === 'assertive' ? copyAnnouncement.message : ''}
      </div>

      {error && !hasCachedData && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1 font-bold underline cursor-pointer"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : activeView === 'linkshort' ? (
        /* ==================== LINKSHORT ANALYTICS VIEW ==================== */
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <section
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            aria-label="Linkshort KPIs"
          >
            {/* Total Short Links */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Total Short Links</span>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <LinkIcon size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{totalShortLinks.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Created under your account</p>
            </div>

            {/* Active Short Links */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Active Links</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Power size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{activeShortLinks.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Currently routing visitors</p>
            </div>

            {/* Total Clicks */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Total Clicks</span>
                <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
                  <MousePointerClick size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{totalShortlinkClicks.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Lifetime aggregate events</p>
            </div>

            {/* Unique Visitors */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Unique Visitors</span>
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{uniqueShortlinkVisitors.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Distinct pseudonymized IP hashes</p>
            </div>
          </section>

          {/* Click Velocity Histogram */}
          <section className="p-6 rounded-3xl border border-slate-200/80 bg-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary-600" />
                  <span>Linkshort Click Velocity ({selectedPreset.label})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregate daily visitor click events across all shortened URLs.
                </p>
              </div>
              <span className="text-xs font-bold text-primary-700 bg-primary-50 border border-primary-200/60 px-3 py-1 rounded-xl self-start sm:self-auto">
                {shortClicksInPeriod.toLocaleString()} clicks in {selectedPreset.days} days
              </span>
            </div>

            {dailyShortClicks.length === 0 || shortClicksInPeriod === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl">
                <BarChart2 size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">
                  No clicks recorded in the {selectedPreset.label.toLowerCase()} yet
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Share your /s/ short URLs on social media or in DMs to start tracking real-time click events.
                </p>
              </div>
            ) : (() => {
              const totalDays = dailyShortClicks.length;
              const tickStep =
                totalDays > 45 ? Math.ceil(totalDays / 8) : totalDays > 15 ? Math.ceil(totalDays / 10) : 1;
              const containerGapClass =
                totalDays > 60 ? 'gap-0.5' : totalDays > 30 ? 'gap-1' : 'gap-1.5 sm:gap-2';
              const maxBarWidthClass =
                totalDays > 60 ? 'max-w-[8px]' : totalDays > 30 ? 'max-w-[14px]' : 'max-w-[28px]';

              return (
                <div className="space-y-2 pt-4">
                  {/* Accessible Screen-Reader Tabular Representation */}
                  <div className="sr-only">
                    <table>
                      <caption>Linkshort daily click velocity for {selectedPreset.label}</caption>
                      <thead>
                        <tr><th>Date</th><th>Clicks</th></tr>
                      </thead>
                      <tbody>
                        {dailyShortClicks.map((d) => (
                          <tr key={d.date}><td>{d.date}</td><td>{d.clicks}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Horizontal scroll container on mobile for wide ranges (>30 days) to prevent cramped bars */}
                  <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
                    <div
                      role="region"
                      aria-label={`Linkshort daily clicks chart, ${selectedPreset.label}`}
                      className={`h-48 flex items-end justify-between ${containerGapClass} pt-6 px-1 border-b border-slate-100 ${
                        totalDays > 30 ? 'min-w-[600px] sm:min-w-full' : ''
                      }`}
                    >
                      {dailyShortClicks.map((d, i) => {
                        const isPeak = d.clicks > 0 && d.clicks === maxShortClicksInDay;
                        const heightPercent =
                          maxShortClicksInDay > 0 ? Math.max((d.clicks / maxShortClicksInDay) * 100, 0) : 0;
                        const isTickVisible = i === 0 || i === totalDays - 1 || i % tickStep === 0;
                        const isFirstTwo = i < 2;
                        const isLastTwo = i >= totalDays - 2;
                        const tooltipAlignClass = isFirstTwo
                          ? 'left-0 translate-x-0'
                          : isLastTwo
                          ? 'right-0 translate-x-0'
                          : 'left-1/2 -translate-x-1/2';

                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end relative"
                          >
                            {/* Tooltip on hover or keyboard focus-within */}
                            <div
                              role="tooltip"
                              className={`absolute -top-7 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-10 shadow-lg ${tooltipAlignClass}`}
                            >
                              {d.date}: {d.clicks.toLocaleString()} clicks{isPeak ? ' (Peak)' : ''}
                            </div>

                            {/* Bar with solid token styling and keyboard accessibility */}
                            <div className={`w-full ${maxBarWidthClass} flex flex-col justify-end h-full`}>
                              {d.clicks > 0 ? (
                                <button
                                  type="button"
                                  style={{ height: `${heightPercent}%` }}
                                  aria-label={`${d.date}: ${d.clicks.toLocaleString()} clicks${isPeak ? ' (peak day)' : ''}`}
                                  className={`w-full rounded-t-sm sm:rounded-t-md transition-all duration-200 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 ${
                                    isPeak
                                      ? 'bg-primary-700 shadow-xs ring-1 ring-primary-800/20'
                                      : 'bg-primary-500 hover:bg-primary-600 focus:bg-primary-600'
                                  }`}
                                />
                              ) : (
                                <button
                                  type="button"
                                  aria-label={`${d.date}: 0 clicks`}
                                  className="w-full h-1 bg-slate-100 rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 cursor-pointer"
                                />
                              )}
                            </div>

                            {/* Day Label */}
                            <div className="h-4 flex items-center justify-center">
                              {isTickVisible ? (
                                <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-700 group-focus-within:text-slate-700 whitespace-nowrap transition-colors">
                                  {d.date.slice(5)}
                                </span>
                              ) : (
                                <span className="text-[9px] text-transparent select-none">·</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Two-Column Breakdown: Top Performing Short Links & Referrer Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Short Links */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Top Performing Short Links</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Highest clicked short URLs in your account</p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {topShortLinks.length} links
                </span>
              </div>

              {topShortLinks.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No short links created yet.</p>
              ) : (
                <div className="space-y-3.5 pt-2">
                  {topShortLinks.map((link, idx) => {
                    const clicks = link.period_clicks ?? link.clicks_count ?? 0;
                    const sharePercent =
                      shortClicksInPeriod > 0 ? Math.round((clicks / shortClicksInPeriod) * 100) : 0;
                    const isCopied = copiedCode === link.code;

                    return (
                      <div
                        key={link.id}
                        className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-md bg-slate-200/80 text-[10px] font-black text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 truncate">
                                  {link.title}
                                </span>
                                <Badge
                                  variant="subtle"
                                  color={link.is_active ? 'emerald' : 'slate'}
                                  size="sm"
                                >
                                  {link.is_active ? 'Active' : 'Paused'}
                                </Badge>
                              </div>
                              <p className="text-[11px] font-mono text-primary-700 font-bold truncate mt-0.5">
                                /s/{link.code}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {link.destination_url}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopyShortUrl(link.short_url, link.code, link.title)}
                              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
                              title="Copy short URL"
                              aria-label={isCopied ? `Copied short link for ${link.title}` : `Copy short link for ${link.title}`}
                            >
                              {isCopied ? (
                                <Check size={14} className="text-emerald-600" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                            <a
                              href={link.short_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
                              title="Test redirect"
                              aria-label={`Test redirect for ${link.title} in new tab`}
                            >
                              <ExternalLink size={14} />
                            </a>
                            <Link
                              href={`/social-bio-links/linkshort/${link.id}/analytics`}
                              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 text-slate-600 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
                              title="Link Analytics"
                              aria-label={`View detailed analytics for ${link.title}`}
                            >
                              <BarChart2 size={14} />
                            </Link>
                            <div className="text-right pl-2">
                              <span className="text-xs font-black text-slate-900 block">
                                {clicks.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {sharePercent}% share
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary-600 transition-all duration-300"
                            style={{ width: clicks > 0 ? `${Math.max(sharePercent, 2)}%` : '0%' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Referrer Sources Breakdown */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Referrer Sources</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Where your link visitors are originating from</p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {topReferrers.length} channels
                </span>
              </div>

              {topReferrers.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No visitor referrer data recorded yet.
                </p>
              ) : (
                <div className="space-y-3 pt-2">
                  {topReferrers.map((ref) => {
                    const isDirect = ref.referrer.toLowerCase().includes('direct');

                    return (
                      <div
                        key={ref.referrer}
                        className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                              {isDirect ? <MousePointerClick size={12} /> : <Globe size={12} />}
                            </div>
                            <span className="font-bold text-slate-900 truncate">
                              {ref.referrer}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-slate-900">
                              {ref.clicks.toLocaleString()} clicks
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 ml-1.5">
                              ({ref.percentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all duration-300"
                            style={{ width: ref.clicks > 0 ? `${Math.max(ref.percentage, 2)}%` : '0%' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Recent Visitor Telemetry Feed */}
          <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Clock size={16} className="text-primary-600" />
                  <span>Recent Click Telemetry</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest 15 live click events recorded across all shortened URLs
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>

            {recentClicks.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No recent click telemetry recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {recentClicks.map((click, i) => (
                  <div
                    key={i}
                    className="py-3 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/60 px-2 rounded-xl transition"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                        /s/
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">
                            {click.link_title}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            ({click.link_code})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 truncate">
                          <span>Via: <strong className="text-slate-600">{click.referrer}</strong></span>
                          {click.user_agent && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[280px]" title={click.user_agent}>
                                {click.user_agent}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-medium text-slate-500">
                        {click.clicked_at ? new Date(click.clicked_at).toLocaleString() : 'Just now'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Create Short Link Modal */}
          <LinkShortDialog
            isOpen={isLinkDialogOpen}
            onClose={() => setIsLinkDialogOpen(false)}
            onSubmit={handleCreateShortLink}
            isSubmitting={isSubmittingLink}
          />
        </div>
      ) : (
        /* ==================== LINK IN BIO ANALYTICS VIEW ==================== */
        <div className="space-y-6">
          {/* 3. KPI Metric Summary Cards */}
          <section
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            aria-label="Combined KPIs"
          >
            {/* Total Combined Clicks */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Total Combined Clicks</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <MousePointerClick size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{totalBioClicks.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">All-time lifetime events</p>
            </div>

            {/* Total Unique Visitors */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Unique Visitors</span>
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <Users size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{uniqueBioClicks.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Pseudonymized unique IP clicks</p>
            </div>

            {/* Active Bio Cards */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Active Bio Cards</span>
                <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
                  <Layers size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{cards.length}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                {primaryCard ? `Primary: @${primaryCard.username}` : 'Landing cards'}
              </p>
            </div>

            {/* Total Links Monitored */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider">Total Links Monitored</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <LinkIcon size={16} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900">{totalBioLinks.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">Across all bio cards</p>
            </div>
          </section>

          {/* 4. Click Velocity & Activity Histogram */}
          <section className="p-6 rounded-3xl border border-slate-200/80 bg-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary-600" />
                  <span>Click Velocity ({selectedPreset.label})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregate daily visitor click events across all active bio cards.
                </p>
              </div>
              <span className="text-xs font-bold text-primary-700 bg-primary-50 border border-primary-200/60 px-3 py-1 rounded-xl self-start sm:self-auto">
                {bioClicksInPeriod.toLocaleString()} clicks in {selectedPreset.days} days
              </span>
            </div>

            {dailyBioClicks.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl">
                <BarChart2 size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">
                  No clicks recorded in the {selectedPreset.label.toLowerCase()} yet
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Share your public bio card link to start tracking real-time click events.
                </p>
              </div>
            ) : (() => {
              const totalDays = dailyBioClicks.length;
              const tickStep =
                totalDays > 45 ? Math.ceil(totalDays / 8) : totalDays > 15 ? Math.ceil(totalDays / 10) : 1;
              const containerGapClass =
                totalDays > 60 ? 'gap-0.5' : totalDays > 30 ? 'gap-1' : 'gap-1.5 sm:gap-2';
              const maxBarWidthClass =
                totalDays > 60 ? 'max-w-[8px]' : totalDays > 30 ? 'max-w-[14px]' : 'max-w-[28px]';

              return (
                <div className="space-y-2 pt-4">
                  {/* Accessible Screen-Reader Tabular Representation */}
                  <div className="sr-only">
                    <table>
                      <caption>Bio Links daily click velocity for {selectedPreset.label}</caption>
                      <thead>
                        <tr><th>Date</th><th>Clicks</th></tr>
                      </thead>
                      <tbody>
                        {dailyBioClicks.map((d) => (
                          <tr key={d.date}><td>{d.date}</td><td>{d.clicks}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Horizontal scroll container on mobile for wide ranges (>30 days) to prevent cramped bars */}
                  <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
                    <div
                      role="region"
                      aria-label={`Bio Links daily clicks chart, ${selectedPreset.label}`}
                      className={`h-48 flex items-end justify-between ${containerGapClass} pt-6 px-1 border-b border-slate-100 ${
                        totalDays > 30 ? 'min-w-[600px] sm:min-w-full' : ''
                      }`}
                    >
                      {dailyBioClicks.map((d, i) => {
                        const isPeak = d.clicks > 0 && d.clicks === maxBioClicksInDay;
                        const heightPercent =
                          maxBioClicksInDay > 0 ? Math.max((d.clicks / maxBioClicksInDay) * 100, 0) : 0;
                        const isTickVisible = i === 0 || i === totalDays - 1 || i % tickStep === 0;
                        const isFirstTwo = i < 2;
                        const isLastTwo = i >= totalDays - 2;
                        const tooltipAlignClass = isFirstTwo
                          ? 'left-0 translate-x-0'
                          : isLastTwo
                          ? 'right-0 translate-x-0'
                          : 'left-1/2 -translate-x-1/2';

                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end relative"
                          >
                            {/* Tooltip on hover or keyboard focus-within */}
                            <div
                              role="tooltip"
                              className={`absolute -top-7 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-10 shadow-lg ${tooltipAlignClass}`}
                            >
                              {d.date}: {d.clicks.toLocaleString()} clicks{isPeak ? ' (Peak)' : ''}
                            </div>

                            {/* Bar with solid token styling and keyboard accessibility */}
                            <div className={`w-full ${maxBarWidthClass} flex flex-col justify-end h-full`}>
                              {d.clicks > 0 ? (
                                <button
                                  type="button"
                                  style={{ height: `${heightPercent}%` }}
                                  aria-label={`${d.date}: ${d.clicks.toLocaleString()} clicks${isPeak ? ' (peak day)' : ''}`}
                                  className={`w-full rounded-t-sm sm:rounded-t-md transition-all duration-200 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 ${
                                    isPeak
                                      ? 'bg-primary-700 shadow-xs ring-1 ring-primary-800/20'
                                      : 'bg-primary-500 hover:bg-primary-600 focus:bg-primary-600'
                                  }`}
                                />
                              ) : (
                                <button
                                  type="button"
                                  aria-label={`${d.date}: 0 clicks`}
                                  className="w-full h-1 bg-slate-100 rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 cursor-pointer"
                                />
                              )}
                            </div>

                            {/* Day Label */}
                            <div className="h-4 flex items-center justify-center">
                              {isTickVisible ? (
                                <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-700 group-focus-within:text-slate-700 whitespace-nowrap transition-colors">
                                  {d.date.slice(5)}
                                </span>
                              ) : (
                                <span className="text-[9px] text-transparent select-none">·</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* 5. Breakdown Section: Card Performance & Top Links */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card-by-Card Performance Comparison */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Bio Card Attribution</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Click share per card in your account</p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {sortedCards.length} {sortedCards.length === 1 ? 'card' : 'cards'}
                </span>
              </div>

              {sortedCards.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No bio card click activity recorded yet.</p>
              ) : (
                <div className="space-y-3.5 pt-2">
                  {sortedCards.map((card) => {
                    const clicks = card.period_clicks ?? card.clicks_count ?? 0;
                    const sharePercent =
                      bioClicksInPeriod > 0 ? Math.round((clicks / bioClicksInPeriod) * 100) : 0;

                    return (
                      <div
                        key={card.id}
                        className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {card.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={card.avatar_url}
                                alt={card.display_name}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-black text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                {(card.display_name || 'A')[0].toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-900 truncate">
                                  {card.display_name}
                                </span>
                                {card.is_primary && (
                                  <Badge
                                    variant="solid"
                                    color="emerald"
                                    size="sm"
                                    icon={Sparkles}
                                  >
                                    Primary
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-400 block truncate">
                                @{card.username}
                                {card.slug ? `/${card.slug}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="text-right pr-1">
                              <span className="text-xs font-black text-slate-900 block">
                                {clicks.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {sharePercent}% share
                              </span>
                            </div>
                            <Link
                              href={`/social-bio-links/${card.id}/analytics`}
                              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 text-slate-600 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
                              title="Card Analytics"
                              aria-label={`View detailed analytics for ${card.display_name}`}
                            >
                              <BarChart2 size={14} />
                            </Link>
                            <Link
                              href={`/social-bio-links/${card.id}/edit`}
                              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
                              title="Edit card"
                              aria-label={`Edit bio card ${card.display_name}`}
                            >
                              <Edit3 size={14} />
                            </Link>
                          </div>
                        </div>

                        {/* Share Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary-600 transition-all duration-300"
                            style={{
                              width: clicks > 0 ? `${Math.max(sharePercent, 2)}%` : '0%',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Top Performing Links Across All Cards */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Top Performing Links</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Highest converting button destinations</p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {topBioLinks.length} links
                </span>
              </div>

              {topBioLinks.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No link performance data available yet.
                </p>
              ) : (
                <div className="space-y-3 pt-2">
                  {topBioLinks.map((link, idx) => {
                    const percentage =
                      bioClicksInPeriod > 0 ? Math.round((link.clicks / bioClicksInPeriod) * 100) : 0;

                    return (
                      <div
                        key={link.id}
                        className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-slate-200/80 text-[10px] font-black text-slate-700 flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 truncate">
                              {link.title}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-slate-900">
                              {link.clicks.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 ml-1">
                              ({percentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{
                              width: link.clicks > 0 ? `${Math.max(percentage, 2)}%` : '0%',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SocialBioLinksAnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsPageContent />
    </Suspense>
  );
}
