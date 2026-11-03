'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import InstagramNav from '@/components/InstagramNav';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatNumber } from '@/lib/format';
import {
  getAutoDmDashboard,
  toggleAutoDmStatus,
  duplicateAutoDmCampaign,
  deleteAutoDmCampaign,
  AutoDmCampaignItem,
  AutoDmPerformanceMetrics,
} from '@/lib/api/instagramService';
import { useInstagramStore } from '@/lib/store/useInstagramStore';
import AutoDmSkeleton from './components/AutoDmSkeleton';
import AutoDmDataTable from './components/AutoDmDataTable';
import {
  Plus,
  Search,
  Sparkles,
  ChevronDown,
  Send,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';

interface FilterDropdownProps<T extends string> {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string }[];
  width?: string;
  className?: string;
}

function FilterDropdown<T extends string>({
  value,
  onChange,
  options,
  width = 'w-44',
  className = '',
}: FilterDropdownProps<T>) {
  const currentOption = options.find((o) => o.value === value) || options[0];

  return (
    <Dropdown className={className}>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer shadow-2xs transition-all select-none"
        >
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

export default function AutoDMPage() {
  const isHydrated = useInstagramStore((state) => state.isHydrated);
  const selectedAccountId = useInstagramStore((state) => state.selectedAccountId);
  const setSelectedAccountId = useInstagramStore((state) => state.setSelectedAccountId);
  const latestRequestIdRef = useRef<string>('');

  const [campaigns, setCampaigns] = useState<AutoDmCampaignItem[]>([]);
  const [performance, setPerformance] = useState<AutoDmPerformanceMetrics | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; username: string; avatar: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [triggerFilter, setTriggerFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [followGateFilter, setFollowGateFilter] = useState<string>('all');
  const [reminderFilter, setReminderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const loadDashboard = async (accId?: string) => {
    const targetAccountId = accId || selectedAccountId;
    if (!targetAccountId) return;
    latestRequestIdRef.current = targetAccountId;

    setIsLoading(true);
    try {
      const data = await getAutoDmDashboard(targetAccountId);
      if (latestRequestIdRef.current !== targetAccountId) return;

      setCampaigns(data.campaigns || []);
      setPerformance(data.performance || null);
      setAccounts(data.accounts || []);
    } catch (err) {
      if (latestRequestIdRef.current === targetAccountId) {
        console.error('Failed to load AutoDM dashboard:', err);
        setCampaigns([]);
      }
    } finally {
      if (latestRequestIdRef.current === targetAccountId) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isHydrated && selectedAccountId) {
      loadDashboard(selectedAccountId);
    }
  }, [isHydrated, selectedAccountId]);

  const handleSelectAccount = (accId: string) => {
    setSelectedAccountId(accId);
  };

  const [pendingToggleCampaign, setPendingToggleCampaign] = useState<AutoDmCampaignItem | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const [pendingDeleteCampaign, setPendingDeleteCampaign] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [pendingDuplicateCampaign, setPendingDuplicateCampaign] = useState<{ id: string; name: string } | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleStatus = async (id: string) => {
    const target = campaigns.find((c) => c.id === id);
    if (!target) return;
    const nextStatus = target.status.toLowerCase() === 'active' ? 'paused' : 'active';

    // Optimistic state update
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );

    try {
      await toggleAutoDmStatus(id, nextStatus);
      triggerToast(`Campaign "${target.keyword || target.name}" is now ${nextStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Failed to toggle status:', err);
      triggerToast('Failed to update status on server');
      loadDashboard();
    }
  };

  const handleConfirmToggle = async () => {
    if (!pendingToggleCampaign) return;
    const campaignToToggle = pendingToggleCampaign;
    setIsToggling(true);
    try {
      await toggleStatus(campaignToToggle.id);
      setPendingToggleCampaign(null);
    } finally {
      setIsToggling(false);
    }
  };

  const handleConfirmDuplicate = async () => {
    if (!pendingDuplicateCampaign) return;
    const { id, name } = pendingDuplicateCampaign;
    setIsDuplicating(true);
    try {
      await duplicateAutoDmCampaign(id);
      triggerToast(`Duplicated "${name}"`);
      await loadDashboard();
      setPendingDuplicateCampaign(null);
    } catch (err) {
      console.error('Failed to duplicate campaign:', err);
      triggerToast('Failed to duplicate campaign');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteCampaign) return;
    const { id, name } = pendingDeleteCampaign;
    setIsDeleting(true);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteAutoDmCampaign(id);
      triggerToast(`Deleted campaign "${name}"`);
      setPendingDeleteCampaign(null);
    } catch (err) {
      console.error('Failed to delete campaign:', err);
      triggerToast('Failed to delete campaign');
      loadDashboard();
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const nameMatch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const keyMatch = (c.keyword || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = nameMatch || keyMatch;

      const matchesStatus = statusFilter === 'all' || c.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesTrigger = triggerFilter === 'all' || (c.triggerType || '').toLowerCase() === triggerFilter.toLowerCase();
      const matchesAccount = accountFilter === 'all' || c.accountId === accountFilter;
      const matchesFollowGate =
        followGateFilter === 'all' ||
        (followGateFilter === 'yes' && c.followGateRequired) ||
        (followGateFilter === 'no' && !c.followGateRequired);
      const matchesReminder =
        reminderFilter === 'all' ||
        (reminderFilter === 'yes' && c.hasReminders) ||
        (reminderFilter === 'no' && !c.hasReminders);

      return matchesSearch && matchesStatus && matchesTrigger && matchesAccount && matchesFollowGate && matchesReminder;
    });
  }, [campaigns, searchQuery, statusFilter, triggerFilter, accountFilter, followGateFilter, reminderFilter]);

  const totalPages = Math.ceil(filteredCampaigns.length / pageSize) || 1;
  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCampaigns.slice(start, start + pageSize);
  }, [filteredCampaigns, currentPage, pageSize]);

  // Derived KPI numbers
  const totalSent = performance?.totalSent ?? campaigns.reduce((acc, c) => acc + (c.dmsSent || 0), 0);
  const totalClicks = performance?.totalClicks ?? campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
  const avgCtr = performance?.avgCtr ?? (totalSent > 0 ? `${((totalClicks / totalSent) * 100).toFixed(1)}%` : '0.0%');
  const activeCount = performance?.activeCount ?? campaigns.filter((c) => c.status.toLowerCase() === 'active').length;
  const totalCount = performance?.totalCount ?? campaigns.length;



  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles size={16} className="text-primary-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Module Navigation Tab Strip */}
      <InstagramNav onSelectAccount={handleSelectAccount} />

      {/* 2. Top Action Controls Bar */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Link href="/instagram/autodm/create">
          <Button variant="primary" size="sm" icon={Plus}>
            New AutoDM Campaign
          </Button>
        </Link>
      </div>

      {/* 3. Main Content: Skeleton vs Populated State */}
      {isLoading ? (
        <AutoDmSkeleton />
      ) : (
        <>
          {/* Performance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-primary-100 bg-white p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total DMs Dispatched</span>
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                  <Send size={15} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{formatNumber(totalSent)}</p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                <ArrowUpRight size={14} />
                <span>
                  {performance?.sentLast7Days ? `+${performance.sentLast7Days} sent last 7 days` : 'Sent via Meta Graph API'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-primary-100 bg-white p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Link Click Conversion</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <TrendingUp size={15} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{formatNumber(totalClicks)}</p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <span className="text-emerald-600 font-black">{avgCtr}</span>
                <span>Average link CTR</span>
              </div>
            </div>

            <div className="rounded-2xl border border-primary-100 bg-white p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Active Keyword Triggers</span>
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                  <Zap size={15} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{activeCount} / {totalCount}</p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Webhook listeners active</span>
              </div>
            </div>

            <div className="rounded-2xl border border-primary-100 bg-white p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Avg Delivery Speed</span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Clock size={15} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">&lt; 2.4s</p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 size={13} />
                <span>Real-time Meta webhook</span>
              </div>
            </div>
          </div>

          {/* 4. REFERENCE TOP FILTER TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <FilterDropdown
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'paused', label: 'Paused' },
                ]}
              />

              {/* Trigger Filter */}
              <FilterDropdown
                value={triggerFilter}
                onChange={(val) => {
                  setTriggerFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Triggers' },
                  { value: 'post', label: 'Post' },
                  { value: 'reel', label: 'Reel' },
                  { value: 'story', label: 'Story' },
                ]}
              />

              {/* Account Filter */}
              <FilterDropdown
                value={accountFilter}
                onChange={(val) => {
                  setAccountFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Accounts' },
                  ...accounts.map((acc) => ({
                    value: acc.id,
                    label: `@${acc.username}`,
                  })),
                ]}
              />

              {/* Follow Gate Filter */}
              <FilterDropdown
                value={followGateFilter}
                onChange={(val) => {
                  setFollowGateFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'Follow Gate: All' },
                  { value: 'yes', label: 'Follow Gate Required' },
                  { value: 'no', label: 'Direct Access' },
                ]}
              />

              {/* Reminder Filter */}
              <FilterDropdown
                value={reminderFilter}
                onChange={(val) => {
                  setReminderFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'Reminders: All' },
                  { value: 'yes', label: 'Reminders Enabled' },
                  { value: 'no', label: 'No Reminders' },
                ]}
              />
            </div>

            {/* Right Search Input */}
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search campaigns..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          {/* 5. STRUCTURED DATA TABLE */}
          <AutoDmDataTable
            campaigns={campaigns}
            paginatedCampaigns={paginatedCampaigns}
            accounts={accounts}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredCampaigns.length}
            pageSize={pageSize}
            searchQuery={searchQuery}
            onPageChange={(p) => setCurrentPage(p)}
            onPerPageChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            perPageOptions={[10, 15, 25, 50]}
            onToggleStatus={(camp) => setPendingToggleCampaign(camp)}
            onDuplicate={(camp) => setPendingDuplicateCampaign(camp)}
            onDelete={(camp) => setPendingDeleteCampaign(camp)}
          />
        </>
      )}

      {/* Status Toggle Confirmation Dialog */}
      {pendingToggleCampaign && (
        <Modal
          isOpen={Boolean(pendingToggleCampaign)}
          onClose={() => {
            if (!isToggling) setPendingToggleCampaign(null);
          }}
          maxWidth="sm"
          title={
            pendingToggleCampaign.status.toLowerCase() === 'active'
              ? 'Pause Automation Funnel?'
              : 'Activate Automation Funnel?'
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  pendingToggleCampaign.status.toLowerCase() === 'active'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {pendingToggleCampaign.status.toLowerCase() === 'active' ? (
                  <AlertTriangle size={18} />
                ) : (
                  <Zap size={18} />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {pendingToggleCampaign.status.toLowerCase() === 'active' ? (
                    <>
                      Are you sure you want to pause{' '}
                      <strong className="text-slate-900 font-bold">
                        {pendingToggleCampaign.name || pendingToggleCampaign.keyword}
                      </strong>
                      ? Automated DM replies will immediately stop triggering for incoming comments and keywords.
                    </>
                  ) : (
                    <>
                      Are you sure you want to activate{' '}
                      <strong className="text-slate-900 font-bold">
                        {pendingToggleCampaign.name || pendingToggleCampaign.keyword}
                      </strong>
                      ? Meta webhook listeners will immediately start sending automated DMs for triggered keywords.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPendingToggleCampaign(null)}
                disabled={isToggling}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isToggling}
                onClick={handleConfirmToggle}
              >
                {isToggling
                  ? 'Updating...'
                  : pendingToggleCampaign.status.toLowerCase() === 'active'
                  ? 'Pause Funnel'
                  : 'Activate Funnel'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Campaign Confirm Modal */}
      {pendingDeleteCampaign && (
        <ConfirmModal
          isOpen={Boolean(pendingDeleteCampaign)}
          onClose={() => !isDeleting && setPendingDeleteCampaign(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete Campaign "${pendingDeleteCampaign.name}"?`}
          description="Are you sure you want to delete this automation campaign? Automated DM triggers and logs associated with it will be removed. This action cannot be undone."
          confirmText="Delete Campaign"
          cancelText="Cancel"
          variant="danger"
          isLoading={isDeleting}
        />
      )}

      {/* Duplicate Campaign Confirm Modal */}
      {pendingDuplicateCampaign && (
        <ConfirmModal
          isOpen={Boolean(pendingDuplicateCampaign)}
          onClose={() => !isDuplicating && setPendingDuplicateCampaign(null)}
          onConfirm={handleConfirmDuplicate}
          title={`Duplicate Campaign "${pendingDuplicateCampaign.name}"?`}
          description="This will create a new copy of this AutoDM automation flow with all keyword triggers and message settings."
          confirmText="Duplicate Campaign"
          cancelText="Cancel"
          variant="primary"
          isLoading={isDuplicating}
        />
      )}
    </div>
  );
}
