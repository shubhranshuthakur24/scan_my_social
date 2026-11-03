'use client';

import React, { useState, useEffect, useRef } from 'react';
import InstagramNav from '@/components/InstagramNav';
import InstagramAccountSwitcher from '@/components/InstagramAccountSwitcher';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Dropdown from '@/components/ui/Dropdown';
import ReelCard from '@/components/ui/ReelCard';
import { formatNumber } from '@/lib/format';
import {
  getInstagramAnalytics,
  syncInstagramAnalytics,
  AnalyticsSummary,
  ConnectedAccountItem,
} from '@/lib/api/instagramService';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Calendar,
  Sparkles,
  Download,
  Film,
  Flame,
  ArrowUpRight,
  RefreshCw,
  Info,
  ChevronDown,
  Camera,
  Image as ImageIcon,
  Send,
  Zap,
  Layers,
  Clock,
} from 'lucide-react';

import { useInstagramStore } from '@/lib/store/useInstagramStore';

import AnalyticsSkeleton from './components/AnalyticsSkeleton';

export default function InstagramAnalyticsPage() {
  const isHydrated = useInstagramStore((state) => state.isHydrated);
  const selectedAccountId = useInstagramStore((state) => state.selectedAccountId);
  const setSelectedAccountId = useInstagramStore((state) => state.setSelectedAccountId);
  const latestRequestIdRef = useRef<string>('');

  const [datePreset, setDatePreset] = useState<'7d' | '14d' | '30d' | '90d'>('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [chartMetric, setChartMetric] = useState<'reach' | 'impressions' | 'engagement' | 'followers' | 'profile_views'>('reach');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadAnalytics = async (accId?: string, preset: string = datePreset) => {
    const targetId = accId || selectedAccountId;
    if (!targetId) return;
    latestRequestIdRef.current = targetId;

    setIsLoading(true);
    try {
      const data = await getInstagramAnalytics(targetId, preset);
      if (latestRequestIdRef.current !== targetId) return;
      setAnalyticsData(data);
    } catch (err: any) {
      if (latestRequestIdRef.current === targetId) {
        showToast(err.message || 'Failed to load analytics');
      }
    } finally {
      if (latestRequestIdRef.current === targetId) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isHydrated && selectedAccountId) {
      loadAnalytics(selectedAccountId, datePreset);
    }
  }, [isHydrated, selectedAccountId, datePreset]);

  const handleSelectAccount = (accId: string) => {
    setSelectedAccountId(accId);
    setIsAccountDropdownOpen(false);
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const res = await syncInstagramAnalytics(selectedAccountId);
      showToast(res.message || 'Analytics sync dispatched!');
      await loadAnalytics(selectedAccountId, datePreset);
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger analytics sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const presets = [
    { id: '7d', label: 'Last 7 Days' },
    { id: '14d', label: 'Last 14 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: 'Last 90 Days' },
  ];

  const accounts = analyticsData?.accounts || [];
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || analyticsData?.selected_account;
  const overview = analyticsData?.overview;
  const dailyMetrics = analyticsData?.daily_metrics || [];
  const formatBreakdown = analyticsData?.format_breakdown || [];
  const topReels = analyticsData?.top_performing_reels || [];
  const autodm = analyticsData?.autodm_analytics;

  // Max value for chart column scaling
  const maxChartVal = Math.max(...dailyMetrics.map((d) => d[chartMetric] || 0), 1);

  const renderComparisonBadge = (comp?: { current: number; previous: number; delta: number; delta_percent: number | null; trend: string }) => {
    if (!comp || comp.trend === 'none') {
      return (
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          No comparison
        </span>
      );
    }

    const isUp = comp.trend === 'up';
    const isDown = comp.trend === 'down';
    const pct = comp.delta_percent !== null ? `${isUp ? '+' : ''}${comp.delta_percent}%` : `${isUp ? '+' : ''}${formatNumber(comp.delta)}`;

    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isUp ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : isDown ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-slate-600 bg-slate-100'
        }`}>
        {isUp && <TrendingUp size={10} />}
        {isDown && <TrendingDown size={10} />}
        <span>{pct}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <InstagramNav onSelectAccount={handleSelectAccount} />

      {/* Floating Notification Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-slate-800 animate-bounce">
          {toastMsg}
        </div>
      )}
      {/* Date Presets & Sync Actions Row */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {/* Date Preset Selector Dropdown */}
        <Dropdown>
          <Dropdown.Trigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer shadow-2xs transition-all select-none"
            >
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <span>{presets.find((p) => p.id === datePreset)?.label || 'Select Period'}</span>
              <ChevronDown size={13} className="text-slate-400 shrink-0" />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content align="right" width="w-44">
            <div className="space-y-0.5">
              {presets.map((preset) => (
                <Dropdown.Item
                  key={preset.id}
                  selected={datePreset === preset.id}
                  onClick={() => setDatePreset(preset.id as any)}
                >
                  {preset.label}
                </Dropdown.Item>
              ))}
            </div>
          </Dropdown.Content>
        </Dropdown>

        {/* Sync Action Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />}
          disabled={isSyncing}
          onClick={handleSyncData}
        >
          {isSyncing ? 'Syncing...' : 'Sync Data'}
        </Button>
      </div>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : !analyticsData?.has_active_account ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <Camera className="mx-auto text-primary-600" size={32} />
          <div>
            <h3 className="text-base font-black text-slate-900">No Active Instagram Account Connected</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Connect your Instagram Creator or Business account to view live reach velocity, impressions, engagement benchmarks, and viral outliers.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Views */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Views</span>
                {renderComparisonBadge(overview?.comparison?.impressions)}
              </div>
              <p className="mt-2 text-3xl font-black text-slate-900">{formatNumber(overview?.impressions || 0)}</p>
              <p className="mt-1 text-[11px] text-slate-400">Total video & media views recorded</p>
            </div>

            {/* Accounts Reached */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Accounts Reached</span>
                {renderComparisonBadge(overview?.comparison?.reach)}
              </div>
              <p className="mt-2 text-3xl font-black text-slate-900">{formatNumber(overview?.reach || 0)}</p>
              <p className="mt-1 text-[11px] text-slate-400">Unique accounts reached this period</p>
            </div>

            {/* Posts Published */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Posts Published</span>
                {renderComparisonBadge(overview?.comparison?.posts)}
              </div>
              <p className="mt-2 text-3xl font-black text-slate-900">{formatNumber(overview?.posts || 0)}</p>
              <p className="mt-1 text-[11px] text-slate-400">Total published media this period</p>
            </div>

            {/* Engagement */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Engagement</span>
                {renderComparisonBadge(overview?.comparison?.engagement)}
              </div>
              <p className="mt-2 text-3xl font-black text-slate-900">{formatNumber(overview?.engagement || 0)}</p>
              <p className="mt-1 text-[11px] text-slate-400">Likes, comments & interactions</p>
            </div>
          </div>

          {/* Main Charts & Format Mix Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Metrics Timeline Chart (2 cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Daily Metric Timeline (Velocity)</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Live account metric snapshots recorded across this date range.</p>
                </div>

                {/* Chart Mode Toggle */}
                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shrink-0 flex-wrap">
                  {(['reach', 'impressions', 'engagement', 'followers', 'profile_views'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setChartMetric(m)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${chartMetric === m ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      {m === 'profile_views' ? 'Profile Views' : m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bar Chart Visualization or Empty State */}
              {dailyMetrics.length > 0 ? (() => {
                const totalDays = dailyMetrics.length;
                const tickStep = totalDays > 45 ? Math.ceil(totalDays / 8) : totalDays > 15 ? Math.ceil(totalDays / 10) : 1;
                const containerGapClass = totalDays > 60 ? 'gap-0.5' : totalDays > 30 ? 'gap-1' : 'gap-1.5 sm:gap-2';
                const maxBarWidthClass = totalDays > 60 ? 'max-w-[8px]' : totalDays > 30 ? 'max-w-[14px]' : 'max-w-[24px]';
                const maxMetricVal = Math.max(...dailyMetrics.map((d) => d[chartMetric] || 0), 1);

                return (
                  <div className={`h-56 flex items-end justify-between ${containerGapClass} pt-6 px-2`}>
                    {dailyMetrics.map((item, idx) => {
                      const val = item[chartMetric] || 0;
                      const isPeak = val > 0 && val === maxMetricVal;
                      const heightPercent = maxMetricVal > 0 ? Math.max((val / maxMetricVal) * 100, 0) : 0;
                      const isTickVisible = idx === 0 || idx === totalDays - 1 || idx % tickStep === 0;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end relative">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-10 shadow-lg">
                            {item.date}: {formatNumber(val)} {chartMetric === 'profile_views' ? 'profile views' : chartMetric}
                          </div>

                          {/* Bar */}
                          <div className={`w-full ${maxBarWidthClass} flex flex-col justify-end h-full`}>
                            {val > 0 ? (
                              <div
                                style={{ height: `${heightPercent}%` }}
                                className={`w-full rounded-t-sm sm:rounded-t-md transition-all duration-300 cursor-pointer ${isPeak
                                    ? 'bg-gradient-to-t from-primary-600 to-primary-500'
                                    : 'bg-gradient-to-t from-primary-300 to-primary-400 hover:from-primary-400 hover:to-primary-500'
                                  }`}
                              />
                            ) : (
                              <div className="w-full h-0.5 bg-slate-200/80 rounded-full" />
                            )}
                          </div>

                          {/* Day Label */}
                          <div className="h-4 flex items-center justify-center">
                            {isTickVisible ? (
                              <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-700 whitespace-nowrap transition-colors">
                                {item.date.slice(-5)}
                              </span>
                            ) : (
                              <span className="w-0.5 h-0.5 rounded-full bg-slate-200 group-hover:bg-slate-400 transition-colors" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })() : (
                <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 space-y-2">
                  <Info size={24} className="text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No snapshot metrics recorded for this date range</p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Click "Sync Data" above to fetch latest insights from your connected Meta Business profile.
                  </p>
                </div>
              )}
            </div>

            {/* Format Performance Mix (1 col) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5 flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900">Format Performance Mix</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Content format distribution across published media.</p>
              </div>

              <div className="space-y-4">
                {formatBreakdown.map((item) => {
                  const formatBarColor =
                    item.format === 'reel'
                      ? 'bg-primary-500'
                      : item.format === 'carousel'
                        ? 'bg-amber-500'
                        : item.format === 'story'
                          ? 'bg-sky-500'
                          : item.format === 'image' || item.format === 'post'
                            ? 'bg-emerald-500'
                            : 'bg-rose-500';

                  const formatIconColor =
                    item.format === 'reel'
                      ? 'text-primary-600'
                      : item.format === 'carousel'
                        ? 'text-amber-500'
                        : item.format === 'story'
                          ? 'text-sky-500'
                          : item.format === 'image' || item.format === 'post'
                            ? 'text-emerald-600'
                            : 'text-rose-500';

                  return (
                    <div key={item.format} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-800 capitalize">
                          {item.format === 'reel' ? (
                            <Film size={14} className={formatIconColor} />
                          ) : item.format === 'carousel' ? (
                            <Layers size={14} className={formatIconColor} />
                          ) : item.format === 'story' ? (
                            <Clock size={14} className={formatIconColor} />
                          ) : (
                            <ImageIcon size={14} className={formatIconColor} />
                          )}
                          {item.label === 'Story' ? 'Stories' : `${item.label}s`} ({formatNumber(item.count)})
                        </span>
                        <span className="text-slate-700 font-black">{item.share_percent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${formatBarColor}`}
                          style={{ width: `${item.share_percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-slate-700 text-xs">
                <p className="font-bold flex items-center gap-1.5 mb-0.5 text-slate-800">
                  <Sparkles size={13} className="text-amber-500" /> Format Breakdown
                </p>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Short-form Reels yield higher non-follower discovery, while Educational Carousels drive saves.
                </p>
              </div>
            </div>
          </div>

          {/* AutoDM Automation & Top Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AutoDM Performance Card (1 col) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-900">AutoDM Automation Performance</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Live conversion metrics for connected campaigns.</p>
                  </div>
                  <Badge variant="solid" color="purple" size="sm">
                    {autodm?.active_automations ? `${autodm.active_automations} Active` : 'Idle'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-primary-50/60 border border-primary-100">
                    <p className="text-[10px] font-bold uppercase text-primary-600">Automations Sent</p>
                    <p className="text-xl font-black text-primary-950 mt-1">{formatNumber(autodm?.automations_sent || 0)}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <p className="text-[10px] font-bold uppercase text-emerald-600">Conversion Rate</p>
                    <p className="text-xl font-black text-emerald-950 mt-1">{autodm?.conversion_rate || 0}%</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-semibold text-slate-600 pt-1">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span>Total Campaigns Configured</span>
                    <span className="font-extrabold text-slate-900">{autodm?.total_automations || 0}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span>Active Automations</span>
                    <span className="font-extrabold text-emerald-600">{autodm?.active_automations || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>7-Day Log Runs</span>
                    <span className="font-extrabold text-slate-900">{autodm?.runs_last_7_days || 0}</span>
                  </div>
                </div>
              </div>

              <a href="/instagram/autodm" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  Manage AutoDM Workflows
                </Button>
              </a>
            </div>

            {/* Top Performing Content Section (2 cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Flame className="text-rose-500" size={18} /> Top Performing Content
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Posts published for @{selectedAccount?.username || 'connected account'}.</p>
                </div>
                <Button variant="outline" size="sm" icon={<ArrowUpRight size={13} />}>
                  View All Posts
                </Button>
              </div>

              {topReels.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {topReels.slice(0, 6).map((post) => (
                    <ReelCard
                      key={post.id}
                      thumbnail={post.thumbnail || ''}
                      caption={post.title || 'Instagram Post'}
                      views={post.views}
                      likes={post.likes}
                      comments={post.comments}
                      shares={post.shares}
                      saves={post.saves}
                      outlierMultiplier={post.outlierMultiplier || 1.0}
                      publishedAt={post.publishedDaysAgo}
                      instagramUrl={post.permalink || 'https://instagram.com'}
                      mediaType="reel"
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 space-y-2">
                  <Film size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No published posts found for this account</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Click "Sync Data" to retrieve your recent Instagram posts and calculate outlier performance.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
