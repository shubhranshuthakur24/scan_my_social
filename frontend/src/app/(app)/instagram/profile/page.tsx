'use client';

import React, { useState, useEffect, useRef } from 'react';
import InstagramNav from '@/components/InstagramNav';
import InstagramAccountSwitcher from '@/components/InstagramAccountSwitcher';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ReelCard from '@/components/ui/ReelCard';
import InstagramButton from '@/components/ui/InstagramButton';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import InstagramDisconnectModal from '@/components/InstagramDisconnectModal';
import InstagramProfileSkeleton from './components/InstagramProfileSkeleton';
import { formatNumber } from '@/lib/format';
import {
  getInstagramProfile,
  syncInstagramProfileData,
  saveReelAutoDm,
  toggleReelAutoDmPause,
  disconnectInstagramAccount,
  getInstagramConnectUrl,
  toggleInstagramWelcomeDm,
  ProfileOverview,
  ReelOutlier,
  ConnectedAccountItem,
} from '@/lib/api/instagramService';
import { useInstagramStore } from '@/lib/store/useInstagramStore';
import {
  Camera,
  ExternalLink,
  RefreshCw,
  Film,
  Zap,
  Unlink,
  Flame,
  ChevronDown,
  Users,
  UserCheck,
  Play,
  Send,
  BarChart3,
  Calendar,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';

interface OwnReel extends ReelOutlier {
  caption: string;
  instagramUrl: string;
  hasAutodm: boolean;
  isAutodmPaused: boolean;
  triggerKeyword?: string;
  dmMessage?: string;
}

interface FilterDropdownProps<T extends string> {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string }[];
  width?: string;
  className?: string;
  icon?: React.ElementType;
}

function FilterDropdown<T extends string>({
  value,
  onChange,
  options,
  width = 'w-44',
  className = '',
  icon: Icon,
}: FilterDropdownProps<T>) {
  const currentOption = options.find((o) => o.value === value) || options[0];

  return (
    <Dropdown className={className}>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer shadow-2xs transition-all select-none"
        >
          {Icon && <Icon size={13} className="text-slate-400 shrink-0" />}
          <span>{currentOption?.label || value}</span>
          <ChevronDown size={13} className="text-slate-400 shrink-0" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Content align="left" width={width}>
        <div className="space-y-0.5">
          {options.map((opt) => (
            <Dropdown.Item
              key={opt.value}
              selected={opt.value === value}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </Dropdown.Item>
          ))}
        </div>
      </Dropdown.Content>
    </Dropdown>
  );
}

export default function ConnectedInstagramProfilePage() {
  const isHydrated = useInstagramStore((state) => state.isHydrated);
  const selectedAccountId = useInstagramStore((state) => state.selectedAccountId);
  const setSelectedAccountId = useInstagramStore((state) => state.setSelectedAccountId);

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileOverview | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccountItem[]>([]);
  const [reels, setReels] = useState<OwnReel[]>([]);
  const [outlierFilter, setOutlierFilter] = useState<'all' | 'outliers'>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'post' | 'reel' | 'story' | 'carousel'>('all');
  const [autodmFilter, setAutodmFilter] = useState<'all' | 'active' | 'paused' | 'none'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all_time' | 'last_7_days' | 'last_30_days' | 'this_month'>('all_time');
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showConfirmDisconnectModal, setShowConfirmDisconnectModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const latestRequestIdRef = useRef<string>('');

  // Active Reel Modal for AutoDM
  const [activeModalReel, setActiveModalReel] = useState<OwnReel | null>(null);
  const [modalMode, setModalMode] = useState<'setup' | 'view' | null>(null);

  // AutoDM form state
  const [newKeyword, setNewKeyword] = useState('');
  const [newDmMessage, setNewDmMessage] = useState('');
  const [isSavingAutodm, setIsSavingAutodm] = useState(false);

  const [dropdownRef] = useState(() => React.createRef<HTMLDivElement>());
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);

  const selectedAccount = connectedAccounts.find((a) => a.id === selectedAccountId) || connectedAccounts[0];

  const hasActiveFilters = formatFilter !== 'all' || autodmFilter !== 'all' || dateRangeFilter !== 'all_time';

  const handleResetFilters = () => {
    setFormatFilter('all');
    setAutodmFilter('all');
    setDateRangeFilter('all_time');
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadProfileData = async (
    accountId?: string,
    filtersOverride?: {
      format?: 'all' | 'post' | 'reel' | 'story' | 'carousel';
      autodm?: 'all' | 'active' | 'paused' | 'none';
      datePreset?: 'all_time' | 'last_7_days' | 'last_30_days' | 'this_month';
      outlier?: 'all' | 'outliers';
    }
  ) => {
    const targetId = accountId || selectedAccountId;
    if (!targetId) return;
    latestRequestIdRef.current = targetId;

    setIsLoading(true);
    try {
      const activeFilters = {
        format: filtersOverride?.format ?? formatFilter,
        autodm: filtersOverride?.autodm ?? autodmFilter,
        datePreset: filtersOverride?.datePreset ?? dateRangeFilter,
        outlier: filtersOverride?.outlier ?? outlierFilter,
      };
      const data = await getInstagramProfile(targetId, activeFilters);
      if (latestRequestIdRef.current !== targetId) return;

      setProfile(data.profile);
      setConnectedAccounts(data.accounts || []);

      if (data.profile?.tokenStatus && data.profile.tokenStatus !== 'active') {
        setShowDisconnectModal(true);
      }

      if (data.posts && data.posts.length > 0) {
        setReels(
          data.posts.map((p) => ({
            ...p,
            caption: p.title || '',
            instagramUrl: p.instagramUrl || `https://instagram.com/reel/${p.id}`,
            hasAutodm: Boolean(p.hasAutodm),
            isAutodmPaused: Boolean(p.isAutodmPaused),
          }))
        );
      } else {
        setReels([]);
      }
    } catch (err: any) {
      if (latestRequestIdRef.current === targetId) {
        showToast(err.message || 'Failed to load profile data');
      }
    } finally {
      if (latestRequestIdRef.current === targetId) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isHydrated && selectedAccountId) {
      loadProfileData(selectedAccountId);
    }
  }, [isHydrated, selectedAccountId, formatFilter, autodmFilter, dateRangeFilter, outlierFilter]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const statusParam = urlParams.get('status');
      const errorParam = urlParams.get('error');

      if (statusParam === 'connected') {
        showToast('Successfully connected Instagram account!');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (errorParam) {
        showToast(`Connection failed: ${decodeURIComponent(errorParam)}`);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleSelectAccount = (accId: string) => {
    setSelectedAccountId(accId);
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const res = await syncInstagramProfileData(selectedAccountId);
      await loadProfileData(selectedAccountId);
      showToast(res.message || 'Successfully synced profile metrics with Meta Graph API!');
    } catch (err: any) {
      showToast(err.message || 'Profile sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleWelcomeDm = async () => {
    if (!selectedAccountId) return;
    try {
      const res = await toggleInstagramWelcomeDm(selectedAccountId);
      showToast(res.welcomeDmEnabled ? 'AutoDM Enabled' : 'AutoDM Paused');
      await loadProfileData(selectedAccountId);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle AutoDM status');
    }
  };

  const handleToggleAutodmPause = async (reelId: string) => {
    try {
      const res = await toggleReelAutoDmPause(reelId);
      setReels((prev) =>
        prev.map((r) => (r.id === reelId ? { ...r, isAutodmPaused: res.isPaused } : r))
      );
      showToast(`AutoDM ${res.isPaused ? 'paused' : 'resumed'}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle AutoDM status');
    }
  };

  const handleSaveAutodm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalReel || !newKeyword.trim()) return;

    setIsSavingAutodm(true);
    try {
      await saveReelAutoDm({
        instagram_account_id: profile?.id || selectedAccountId,
        instagram_media_id: activeModalReel.id,
        keyword: newKeyword.trim().toUpperCase(),
        dmMessage: newDmMessage.trim() || 'Thanks for commenting! Here is your link.',
      });

      setReels((prev) =>
        prev.map((r) =>
          r.id === activeModalReel.id
            ? {
              ...r,
              hasAutodm: true,
              isAutodmPaused: false,
              triggerKeyword: newKeyword.trim().toUpperCase(),
              dmMessage: newDmMessage.trim() || 'Thanks for commenting! Here is your link.',
            }
            : r
        )
      );

      showToast('AutoDM activated for this post!');
      setModalMode(null);
      setActiveModalReel(null);
      setNewKeyword('');
      setNewDmMessage('');
    } catch (err: any) {
      showToast(err.message || 'Failed to activate AutoDM');
    } finally {
      setIsSavingAutodm(false);
    }
  };

  const handleConfirmDisconnect = async () => {
    if (!profile?.id) return;
    setIsDisconnecting(true);
    try {
      await disconnectInstagramAccount(profile.id);
      showToast(`Disconnected ${profile.username} from Scan My Social.`);
      setShowConfirmDisconnectModal(false);
      await loadProfileData();
    } catch (err: any) {
      showToast(err.message || 'Failed to disconnect account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const filteredReels = reels.filter((reel) => {
    if (outlierFilter === 'outliers') return reel.outlierMultiplier >= 2.0;
    return true;
  });

  const isConnected = Boolean(profile);
  const isActive = profile?.tokenStatus === 'active';

  return (
    <div className="space-y-6">
      <InstagramNav onSelectAccount={handleSelectAccount} />

      {/* Floating Notification Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-slate-800 animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* Header Actions Container */}
      <div className="flex items-center justify-end gap-2 flex-wrap min-h-[36px]">
        {isLoading ? null : isConnected && profile ? (
          isActive ? (
            <>
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

              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={<Unlink size={13} />}
                onClick={() => setShowConfirmDisconnectModal(true)}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="gradient"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={async () => {
                try {
                  const data = await getInstagramConnectUrl(profile.id);
                  if (data.url) {
                    window.location.href = data.url;
                  }
                } catch (err: any) {
                  showToast(err.message || 'Failed to initiate reconnection');
                }
              }}
            >
              Reconnect Account
            </Button>
          )
        ) : (
          <Button
            type="button"
            variant="gradient"
            size="sm"
            icon={<Camera size={14} />}
            onClick={async () => {
              try {
                const data = await getInstagramConnectUrl();
                if (data.url) {
                  window.location.href = data.url;
                }
              } catch (err: any) {
                showToast(err.message || 'Failed to initiate Meta OAuth');
              }
            }}
          >
            Connect with Meta
          </Button>
        )}
      </div>

      {isLoading ? (
        <InstagramProfileSkeleton />
      ) : isConnected && profile ? (
        <div className="space-y-6">
          {/* Single Outer White Card Container */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-6">
            {/* Top Grid: Left Overview, Middle 2x2 Stats, Right AutoDM Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Profile Overview & Metadata (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4 lg:pr-6 lg:border-r lg:border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="w-22 h-22 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-md">
                      <div className="w-full h-full bg-white rounded-full overflow-hidden p-0.5">
                        {profile.avatar ? (
                          <img
                            src={profile.avatar}
                            alt={profile.username}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <Camera className="w-full h-full p-4 text-pink-600" />
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 border-2 border-white flex items-center justify-center text-white shadow-xs">
                      <Camera size={11} />
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-black text-slate-900 truncate">
                        {profile.name || profile.username}
                      </h2>
                      {profile.name && profile.name !== profile.username && (
                        <span className="text-xs text-slate-500 font-bold truncate">
                          ({profile.username.startsWith('@') ? profile.username : `@${profile.username}`})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-bold">{profile.accountType || 'Instagram Business Account'}</p>
                    {profile.bio && (
                      <p className="text-xs text-slate-600 font-medium line-clamp-2 max-w-sm pt-0.5" title={profile.bio}>
                        {profile.bio}
                      </p>
                    )}
                    <div className="pt-1">
                      <InstagramButton
                        href={profile.profileUrl || `https://instagram.com/${profile.username.replace('@', '')}`}
                        label="Visit Profile"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Metadata Info Strip */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-xs">
                  <div className="flex items-start gap-2">
                    <Calendar size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Connected On</p>
                      <p className="font-extrabold text-slate-900 truncate text-[11px]">{profile.connectedOn || 'Sep 01, 2026'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <ShieldCheck size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Token Status</p>
                      <p className={`font-extrabold truncate text-[11px] ${profile.tokenStatus === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {profile.tokenStatus === 'active' ? 'Healthy' : 'Expired'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <UserCheck size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Account Status</p>
                      <p className={`font-extrabold truncate text-[11px] flex items-center gap-1.5 ${profile.tokenStatus === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${profile.tokenStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {profile.tokenStatus === 'active' ? 'Connected' : 'Disconnected'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle 6-Card Stats Grid (lg:col-span-7) */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* 1. All Posts */}
                <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
                    <Film size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-600 leading-none">All Posts</p>
                    <p className="text-lg font-black text-slate-900 mt-1.5 leading-none">{formatNumber(profile.stats.totalPosts ?? 0)}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 leading-none">Total media</p>
                  </div>
                </div>

                {/* 2. Followers */}
                <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100/70 text-primary-600 flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-600 leading-none">Followers</p>
                    <p className="text-lg font-black text-slate-900 mt-1.5 leading-none">{formatNumber(profile.stats.followers)}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 leading-none">Total followers</p>
                  </div>
                </div>

                {/* 3. Following */}
                <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
                    <UserCheck size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-600 leading-none">Following</p>
                    <p className="text-lg font-black text-slate-900 mt-1.5 leading-none">{formatNumber(profile.stats.following ?? 0)}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 leading-none">Total following</p>
                  </div>
                </div>

                {/* 4. Scheduled Posts */}
                <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100/70 text-rose-500 flex items-center justify-center shrink-0">
                    <Play size={18} className="fill-rose-500 ml-0.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-600 leading-none">Scheduled Posts</p>
                    <p className="text-lg font-black text-slate-900 mt-1.5 leading-none">{profile.stats.scheduledPosts}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 leading-none">Upcoming posts</p>
                  </div>
                </div>

                {/* 5. AutoDM Sent */}
                <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                    <Send size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-600 leading-none">AutoDM Sent</p>
                    <p className="text-lg font-black text-slate-900 mt-1.5 leading-none">{formatNumber(profile.stats.autoDmSent)}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 leading-none">Last 30 days</p>
                  </div>
                </div>

                {/* 6. Avg Engagement */}
                <div className="rounded-2xl border border-slate-100/90 bg-slate-50/50 p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                    <BarChart3 size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-600 leading-none">Avg Engagement</p>
                    <p className="text-lg font-black text-slate-900 mt-1.5 leading-none">{profile.stats.avgEngagement}%</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 leading-none">Last 30 days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom AutoDM Growth Banner inside single container */}
            <div className="rounded-2xl border border-primary-200 bg-primary-200/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-primary-200/80 text-primary-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Lightbulb size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Grow faster with AutoDM</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Turn on AutoDM to automatically reply to comments and send personalized messages to new viewers.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  showToast('AutoDM system is active and monitoring incoming comments.');
                }}
                className="px-4 py-2 rounded-xl bg-white border border-primary-200 text-primary-700 hover:bg-primary-50 text-xs font-extrabold transition-all shrink-0 self-start sm:self-auto cursor-pointer shadow-2xs"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Standalone Filter Toolbar (Matching /instagram/autodm) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Outlier Filter Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setOutlierFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${outlierFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  All Posts ({reels.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOutlierFilter('outliers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${outlierFilter === 'outliers'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-rose-600'
                    }`}
                >
                  <Flame size={13} /> Viral Outliers (&gt;2x)
                </button>
              </div>

              {/* 1. Post Format */}
              <FilterDropdown
                value={formatFilter}
                onChange={(val) => setFormatFilter(val)}
                options={[
                  { value: 'all', label: 'All Formats' },
                  { value: 'post', label: 'Post' },
                  { value: 'reel', label: 'Reel' },
                  { value: 'story', label: 'Story' },
                  { value: 'carousel', label: 'Carousel' },
                ]}
              />

              {/* 2. AutoDM State */}
              <FilterDropdown
                value={autodmFilter}
                onChange={(val) => setAutodmFilter(val)}
                options={[
                  { value: 'all', label: 'AutoDM: All' },
                  { value: 'active', label: 'AutoDM Active' },
                  { value: 'paused', label: 'AutoDM Paused' },
                  { value: 'none', label: 'No AutoDM' },
                ]}
              />

              {/* 3. Date Range */}
              <FilterDropdown
                value={dateRangeFilter}
                onChange={(val) => setDateRangeFilter(val)}
                icon={Calendar}
                options={[
                  { value: 'all_time', label: 'Date: All time' },
                  { value: 'last_7_days', label: 'Last 7 days' },
                  { value: 'last_30_days', label: 'Last 30 days' },
                  { value: 'this_month', label: 'This month' },
                ]}
              />
            </div>

            {/* Right Side: Result Count & Reset Action */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">
                {filteredReels.length} {filteredReels.length === 1 ? 'post' : 'posts'}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer shadow-2xs"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Published Reels & Outlier Analysis Section */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Film className="text-primary-600" size={18} /> Published Content &amp; Viral Outliers
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect view velocity, shares, and outlier multipliers relative to your account median baseline.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="subtle" color="purple" size="sm">
                  {filteredReels.length} {filteredReels.length === 1 ? 'Post' : 'Posts'}
                </Badge>
              </div>
            </div>

            {/* Reels Grid (4 Cards in a Row) */}
            {filteredReels.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Film className="mx-auto text-slate-300" size={32} />
                <p className="text-xs font-bold text-slate-700">No media analytics found for this profile</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Click &ldquo;Sync Data&rdquo; above to fetch live media posts and outlier scores via Meta Graph API.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredReels.map((reel) => (
                  <ReelCard
                    key={reel.id}
                    thumbnail={reel.thumbnail}
                    caption={reel.caption}
                    views={reel.views}
                    likes={reel.likes}
                    comments={reel.comments}
                    shares={reel.shares}
                    outlierMultiplier={reel.outlierMultiplier}
                    publishedAt={reel.publishedDaysAgo}
                    instagramUrl={reel.instagramUrl}
                    hasAutodm={reel.hasAutodm}
                    isAutodmPaused={reel.isAutodmPaused}
                    onSetupAutodm={() => {
                      setActiveModalReel(reel);
                      setNewKeyword(reel.triggerKeyword || '');
                      setNewDmMessage(reel.dmMessage || '');
                      setModalMode('setup');
                    }}
                    onViewAutodm={() => {
                      setActiveModalReel(reel);
                      setModalMode('view');
                    }}
                    onToggleAutodmPause={() => handleToggleAutodmPause(reel.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 mx-auto flex items-center justify-center">
            <Camera size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900">No Instagram Account Connected</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Connect your Instagram Creator or Business profile via Meta OAuth to unlock direct publishing, scheduling, and automated direct message bots.
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={<Camera size={16} />}
            onClick={async () => {
              try {
                const data = await getInstagramConnectUrl();
                if (data.url) {
                  window.location.href = data.url;
                }
              } catch (err: any) {
                showToast(err.message || 'Failed to initiate Meta OAuth connection.');
              }
            }}
          >
            Connect Instagram Account
          </Button>
        </div>
      )}

      {/* Setup AutoDM Modal */}
      {modalMode === 'setup' && activeModalReel && (
        <Modal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setActiveModalReel(null);
          }}
          title="Setup AutoDM for this Reel"
          description="Automatically send a direct message whenever someone comments on this specific post."
          footer={
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setModalMode(null);
                  setActiveModalReel(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="gradient"
                size="sm"
                disabled={isSavingAutodm}
                icon={isSavingAutodm ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                onClick={handleSaveAutodm}
              >
                {isSavingAutodm ? 'Saving...' : 'Activate AutoDM'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSaveAutodm} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              {activeModalReel.thumbnail ? (
                <img
                  src={activeModalReel.thumbnail}
                  alt=""
                  className="w-10 h-14 object-cover rounded-lg shrink-0"
                />
              ) : (
                <div className="w-10 h-14 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">
                  <Camera size={16} className="text-slate-400" />
                </div>
              )}
              <p className="text-xs font-bold text-slate-700 line-clamp-2">
                {activeModalReel.caption || 'Instagram Post'}
              </p>
            </div>

            <Input
              label="Trigger Keyword"
              requiredIndicator
              placeholder="e.g. PLAYBOOK, VIP, TEMPLATE"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              helperText="When users comment this exact keyword on this post, the AutoDM triggers."
            />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Direct Message Response</label>
              <textarea
                rows={3}
                placeholder="Hey! Thanks for commenting. Here is your VIP download link: https://..."
                value={newDmMessage}
                onChange={(e) => setNewDmMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-hidden resize-none font-medium"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* View AutoDM Modal */}
      {modalMode === 'view' && activeModalReel && (
        <Modal
          isOpen={true}
          onClose={() => {
            setModalMode(null);
            setActiveModalReel(null);
          }}
          title="Active AutoDM Configuration"
          description="View active keyword and automated DM response message for this reel."
          footer={
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setModalMode(null);
                  setActiveModalReel(null);
                }}
              >
                Close
              </Button>
              <Button
                type="button"
                variant={activeModalReel.isAutodmPaused ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  handleToggleAutodmPause(activeModalReel.id);
                  setModalMode(null);
                  setActiveModalReel(null);
                }}
              >
                {activeModalReel.isAutodmPaused ? 'Resume AutoDM' : 'Pause AutoDM'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              {activeModalReel.thumbnail ? (
                <img
                  src={activeModalReel.thumbnail}
                  alt=""
                  className="w-10 h-14 object-cover rounded-lg shrink-0"
                />
              ) : (
                <div className="w-10 h-14 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">
                  <Camera size={16} className="text-slate-400" />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700 line-clamp-2">
                  {activeModalReel.caption || 'Instagram Post'}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${!activeModalReel.isAutodmPaused
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                  >
                    {!activeModalReel.isAutodmPaused ? '● Active' : '⏸ Paused'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                Trigger Keyword
              </span>
              <p className="text-sm font-black text-primary-700 bg-primary-50 p-2.5 rounded-xl border border-primary-200/80">
                {activeModalReel.triggerKeyword || 'PLAYBOOK'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                Automated DM Response
              </span>
              <p className="text-xs font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                &ldquo;{activeModalReel.dmMessage || 'Thanks for commenting! Here is the link.'}&rdquo;
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Instagram Disconnected Token Re-authorization Modal */}
      <InstagramDisconnectModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        username={profile?.username || selectedAccount?.username}
        accountId={profile?.id || selectedAccount?.id}
      />

      {/* Disconnect Confirmation Modal */}
      {showConfirmDisconnectModal && profile && (
        <Modal
          isOpen={showConfirmDisconnectModal}
          onClose={() => !isDisconnecting && setShowConfirmDisconnectModal(false)}
          closeable={!isDisconnecting}
        >
          <div className="p-6 sm:p-7 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Unlink size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Disconnect {profile.username}?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Disconnecting will pause all active AutoDM reply funnels and unschedule upcoming posts for this Instagram account. You can reconnect it at any time.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDisconnecting}
                onClick={() => setShowConfirmDisconnectModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={isDisconnecting}
                onClick={handleConfirmDisconnect}
              >
                {isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
