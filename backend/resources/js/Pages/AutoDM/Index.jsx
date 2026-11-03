import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import SharedDropdownSelect from '@/Components/common/DropdownSelect';
import { Badge } from '@/Components/ui/badge';
import KpiCard from '@/Components/common/KpiCard';
import InstagramAccountSelector from '@/Components/Instagram/InstagramAccountSelector';
import useInstagramSelectedAccount from '@/Components/Instagram/useInstagramSelectedAccount';
import { useToast } from '@/Contexts/ToastContext';
import NoAccountConnectedState from './Partials/NoAccountConnectedState';
import InstagramDisconnectModal from '@/Components/Instagram/InstagramDisconnectModal';
import InstagramDisconnectedHero from '@/Components/Instagram/InstagramDisconnectedHero';
import InstagramNotConnectedEmptyState from '@/Components/Instagram/InstagramNotConnectedEmptyState';
import {
    AlertCircle,
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Copy,
    Instagram,
    Link2,
    Pause,
    Pencil,
    Play,
    RotateCcw,
    Search,
    X,
} from 'lucide-react';
import Icon from '@/Components/Icon';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

function DropdownSelect({ label, value, onChange, options, className = '' }) {
    const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">
                    {label}
                </label>
            )}
            <Menu as="div" className="relative w-full">
                {({ open }) => (
                    <>
                        <Menu.Button className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50/50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-left">
                            <span className="truncate">{selectedOption?.label}</span>
                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </Menu.Button>

                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl focus:outline-none">
                                {options.map((option) => {
                                    const isSelected = String(option.value) === String(value);
                                    return (
                                        <Menu.Item key={option.value}>
                                            {({ active }) => (
                                                <button
                                                    type="button"
                                                    onClick={() => onChange(option.value)}
                                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors ${
                                                        active ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                                                    } ${isSelected ? 'text-primary-700' : ''}`}
                                                >
                                                    <span className="truncate">{option.label}</span>
                                                    {isSelected && (
                                                        <span className="text-primary-600 font-bold" aria-hidden="true">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    );
                                })}
                            </Menu.Items>
                        </Transition>
                    </>
                )}
            </Menu>
        </div>
    );
}

function getSubscriptionMeta(account) {
    if (!account) {
        return {
            label: 'Not connected',
            variant: 'secondary',
            icon: Link2,
            tone: 'text-slate-500',
        };
    }

    if (account.webhook_subscriptions_status === 'enabled') {
        return {
            label: 'Webhook synced',
            variant: 'success',
            icon: CheckCircle2,
            tone: 'text-emerald-700',
        };
    }

    if (account.webhook_subscriptions_status === 'failed') {
        return {
            label: 'Webhook sync failed',
            variant: 'destructive',
            icon: AlertTriangle,
            tone: 'text-red-700',
        };
    }

    return {
        label: 'Webhook pending',
        variant: 'secondary',
        icon: Link2,
        tone: 'text-slate-500',
    };
}

function triggerLabel(type) {
    if (type === 'reel') return 'Reel';
    if (type === 'story') return 'Story';
    return 'Post';
}

function timeAgo(value) {
    if (!value) {
        return '-';
    }

    const now = Date.now();
    const then = new Date(value).getTime();
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hour${Math.floor(diffSec / 3600) === 1 ? '' : 's'} ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} day${Math.floor(diffSec / 86400) === 1 ? '' : 's'} ago`;

    return new Date(value).toLocaleDateString();
}

function readEnumQueryParam(key, allowedValues, fallback) {
    if (typeof window === 'undefined') {
        return fallback;
    }

    const params = new URLSearchParams(window.location.search);
    const value = (params.get(key) || '').trim();
    return allowedValues.includes(value) ? value : fallback;
}

function readTextQueryParam(key, fallback = '') {
    if (typeof window === 'undefined') {
        return fallback;
    }

    const params = new URLSearchParams(window.location.search);
    return (params.get(key) || fallback).trim();
}

export default function Index({
    auth,
    account = null,
    accounts = [],
    selectedAccountId = null,
    has_active_account = true,
    connectedCount = 0,
    activeConnectedCount = 0,
    accountLimit = 0,
    canConnectMore = false,
    hasPaidPlan = false,
    activePlanTier = null,
    disconnectToast = null,
    flows,
    performance,
}) {
    const { addToast } = useToast();
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState(() => readEnumQueryParam('status', ['active', 'archived', 'all'], 'active'));
    const [triggerFilter, setTriggerFilter] = useState(() => readEnumQueryParam('trigger', ['all', 'post', 'reel', 'story'], 'all'));
    const [search, setSearch] = useState(() => readTextQueryParam('q', ''));
    const [accountFilter, setAccountFilter] = useState(() => readTextQueryParam('account', 'all') || 'all');
    const [openingFilter, setOpeningFilter] = useState(() => readEnumQueryParam('opening', ['all', 'on', 'off'], 'all'));
    const [askToFollowFilter, setAskToFollowFilter] = useState(() => readEnumQueryParam('follow', ['all', 'on', 'off'], 'all'));
    const [reminderFilter, setReminderFilter] = useState(() => readEnumQueryParam('reminder', ['all', 'on', 'off'], 'all'));
    const [actionFlowId, setActionFlowId] = useState(null);
    const [selectedFlowId, setSelectedFlowId] = useState(null);
    const accountList = Array.isArray(accounts) && accounts.length > 0
        ? accounts
        : (account ? [account] : []);
    const hasActiveAccount =
        Boolean(has_active_account) &&
        accountList.some((acc) => acc.status === 'active');
    const {
        selectedAccountId: persistedSelectedAccountId,
        selectedAccount: persistedSelectedAccount,
        selectAccount,
    } = useInstagramSelectedAccount({
        accounts: accountList,
        initialSelectedAccountId: selectedAccountId,
        preferStored: true,
        requireActive: true,
    });
    const primaryAccount = persistedSelectedAccount || accountList.find((a) => a.status === 'active') || null;
    const hasConnectedAccount = accountList.length > 0;
    const effectiveConnectedCount = Number.isFinite(Number(connectedCount))
        ? Number(connectedCount)
        : accountList.length;
    const effectiveAccountLimit = Number.isFinite(Number(accountLimit))
        ? Number(accountLimit)
        : 0;
    const maxInstaCards = 5;
    const accountConnectHref = canConnectMore
        ? route('settings', { tab: 'integration' }, false)
        : route('settings.upgrade', [], false);

    const subscriptionMeta = getSubscriptionMeta(primaryAccount);
    const SubscriptionIcon = subscriptionMeta.icon;

    const activeCount = useMemo(
        () => flows.filter((flow) => flow.status === 'active').length,
        [flows]
    );
    const archivedCount = useMemo(
        () => flows.filter((flow) => flow.status !== 'active').length,
        [flows]
    );
    const metrics = performance || {
        total_runs: 0,
        sent_runs: 0,
        failed_runs: 0,
        success_rate: 0,
        runs_last_7_days: 0,
        total_clicks: 0,
        reminder_scheduled: 0,
        reminder_sent: 0,
        reminder_skipped_window: 0,
        reminder_clicked: 0,
        active_flows: 0,
        paused_flows: 0,
    };
    const triggerFilterOptions = [
        { value: 'all', label: 'All Triggers' },
        { value: 'post', label: 'Post' },
        { value: 'reel', label: 'Reel' },
        { value: 'story', label: 'Story' },
    ];
    const featureFilterOptions = [
        { value: 'all', label: 'All' },
        { value: 'on', label: 'On' },
        { value: 'off', label: 'Off' },
    ];
    const triggerFilterLabel = triggerFilterOptions.find((option) => option.value === triggerFilter)?.label || 'All Triggers';
    const accountFilterOptions = [
        { value: 'all', label: 'All Accounts' },
        ...accountList.map((item) => ({
            value: String(item.id),
            label: item.username ? `@${String(item.username).replace(/^@+/, '')}` : `IG ${item.ig_account_id}`,
        })),
    ];

    const hasActiveFilters = useMemo(() => {
        return (
            statusFilter !== 'active' ||
            triggerFilter !== 'all' ||
            accountFilter !== 'all' ||
            openingFilter !== 'all' ||
            askToFollowFilter !== 'all' ||
            reminderFilter !== 'all' ||
            search.trim() !== ''
        );
    }, [statusFilter, triggerFilter, accountFilter, openingFilter, askToFollowFilter, reminderFilter, search]);

    const handleResetFilters = () => {
        setStatusFilter('active');
        setTriggerFilter('all');
        setAccountFilter('all');
        setOpeningFilter('all');
        setAskToFollowFilter('all');
        setReminderFilter('all');
        setSearch('');
    };

    useEffect(() => {
        if (accountFilter === 'all') {
            return;
        }

        const exists = accountList.some((item) => String(item.id) === String(accountFilter));
        if (!exists) {
            setAccountFilter('all');
        }
    }, [accountFilter, accountList]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const params = new URLSearchParams(window.location.search);

        const writeEnum = (key, value, defaultValue) => {
            if (!value || value === defaultValue) {
                params.delete(key);
                return;
            }

            params.set(key, value);
        };

        const writeText = (key, value) => {
            const normalized = String(value || '').trim();
            if (normalized === '') {
                params.delete(key);
                return;
            }

            params.set(key, normalized);
        };

        writeEnum('status', statusFilter, 'active');
        writeEnum('trigger', triggerFilter, 'all');
        writeEnum('account', accountFilter, 'all');
        writeEnum('opening', openingFilter, 'all');
        writeEnum('follow', askToFollowFilter, 'all');
        writeEnum('reminder', reminderFilter, 'all');
        writeText('q', search);

        const queryString = params.toString();
        const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash || ''}`;
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash || ''}`;

        if (nextUrl !== currentUrl) {
            window.history.replaceState({}, '', nextUrl);
        }
    }, [statusFilter, triggerFilter, accountFilter, openingFilter, askToFollowFilter, reminderFilter, search]);

    useEffect(() => {
        if (!disconnectToast?.message || !disconnectToast?.account_id) {
            return;
        }

        const fingerprint = `${disconnectToast.account_id}:${disconnectToast.updated_at || 'unknown'}`;
        const storageKey = `autodm:disconnect-modal:${fingerprint}`;

        try {
            if (window.sessionStorage.getItem(storageKey)) {
                return;
            }

            window.sessionStorage.setItem(storageKey, '1');
        } catch (error) {
            // If storage is unavailable, still show the warning once for this render.
        }

        setShowDisconnectModal(true);
    }, [disconnectToast]);

    const toggleStatus = (flowId, currentStatus) => {
        setActionFlowId(flowId);
        router.patch(route('autodm.flows.toggle-status', flowId, false), {}, {
            preserveScroll: true,
            onSuccess: () => {
                addToast(
                    currentStatus === 'active'
                        ? 'Automation paused.'
                        : 'Automation resumed.',
                    'success'
                );
            },
            onError: () => {
                addToast('Could not update automation status. Try again.', 'error');
            },
            onFinish: () => setActionFlowId(null),
        });
    };

    const duplicateFlow = (flowId) => {
        setActionFlowId(flowId);
        router.post(route('autodm.flows.duplicate', flowId, false), {}, {
            preserveScroll: true,
            onSuccess: () => {
                addToast('Automation duplicated as paused. Review and resume when ready.', 'success');
            },
            onError: () => {
                addToast('Could not duplicate automation. Try again.', 'error');
            },
            onFinish: () => setActionFlowId(null),
        });
    };

    const [retriggerFlowId, setRetriggerFlowId] = useState(null);

    const retriggerFlow = async (flowId) => {
        if (!window.confirm(
            'This will scan existing comments on this post and send DMs to eligible commenters who have not yet received one.\n\nContinue?'
        )) {
            return;
        }

        setRetriggerFlowId(flowId);
        try {
            const response = await axios.post(
                route('autodm.flows.retrigger', flowId, false),
                {},
                { headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content } }
            );
            const queued = response.data?.queued ?? 0;
            addToast(response.data?.message ?? (queued > 0 ? `Queued ${queued} DM(s).` : 'No new comments to trigger.'), 'success');
        } catch (err) {
            const message = err.response?.data?.message ?? 'Re-trigger failed. Try again.';
            addToast(message, 'error');
        } finally {
            setRetriggerFlowId(null);
        }
    };

    const filteredFlows = useMemo(() => {
        const query = search.trim().toLowerCase();

        return flows.filter((flow) => {
            if (statusFilter === 'active' && flow.status !== 'active') {
                return false;
            }

            if (statusFilter === 'archived' && flow.status === 'active') {
                return false;
            }

            if (triggerFilter !== 'all' && flow.trigger_type !== triggerFilter) {
                return false;
            }

            if (accountFilter !== 'all' && String(flow.instagram_account_id) !== String(accountFilter)) {
                return false;
            }

            const isOpeningEnabled = Boolean(flow.opening_message_enabled);
            if (openingFilter === 'on' && !isOpeningEnabled) {
                return false;
            }
            if (openingFilter === 'off' && isOpeningEnabled) {
                return false;
            }

            const isAskToFollowEnabled = Boolean(flow.ask_to_follow_enabled);
            if (askToFollowFilter === 'on' && !isAskToFollowEnabled) {
                return false;
            }
            if (askToFollowFilter === 'off' && isAskToFollowEnabled) {
                return false;
            }

            const isReminderEnabled = Boolean(flow.reminder_enabled);
            if (reminderFilter === 'on' && !isReminderEnabled) {
                return false;
            }
            if (reminderFilter === 'off' && isReminderEnabled) {
                return false;
            }

            if (!query) {
                return true;
            }

            const keywordText = Array.isArray(flow.keywords) ? flow.keywords.join(' ') : '';
            const searchable = [
                flow.name,
                flow.trigger_value,
                keywordText,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchable.includes(query);
        });
    }, [flows, search, statusFilter, triggerFilter, accountFilter, openingFilter, askToFollowFilter, reminderFilter]);

    const selectedFlow = useMemo(
        () => flows.find((flow) => flow.id === selectedFlowId) || null,
        [flows, selectedFlowId]
    );

    return (
        <AuthenticatedLayout
            user={auth.user}
            topbarTitle="AutoDM"
            topbarDescription="Launch, monitor, and optimize every flow from one clean command center."
        >
            <Head title="AutoDM" />

            <div className="mx-auto max-w-[1280px] space-y-5 overflow-x-hidden xl:space-y-4">
                {!hasActiveAccount ? (
                    accountList.length === 0 && !disconnectToast?.account_id ? (
                        <InstagramNotConnectedEmptyState
                            description="Connect an Instagram account first, then build, deploy, and automate comment-to-DM flows."
                            connectHref={accountConnectHref}
                        />
                    ) : (
                        <InstagramDisconnectedHero
                            username={
                                disconnectToast?.username ||
                                persistedSelectedAccount?.username ||
                                accountList[0]?.username
                            }
                            reconnectAccountId={
                                disconnectToast?.account_id ||
                                persistedSelectedAccountId ||
                                accountList[0]?.id
                            }
                            actionText="build, deploy, and automate DM flows"
                        />
                    )
                ) : (
                    <>
                        {/* banner section */}
                        {!hasConnectedAccount && (
                    <section className="relative max-w-full overflow-hidden rounded-2xl border border-primary-100/80 bg-gradient-to-r from-primary-50 via-white to-accent-50 p-5 md:p-8">
                        <div className="relative flex min-w-0 flex-col gap-5 md:flex-row md:items-end md:justify-between">
                            <div className="max-w-2xl min-w-0 space-y-3">
                                <p className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary-700 shadow-sm shadow-primary-500/5">
                                    <Icon name="rocket" size={14} />
                                    Smart AutoDM Hub
                                </p>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                                    Turn comments into conversations on autopilot
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Launch, monitor, and optimize every flow from one clean command center.
                                </p>
                            </div>

                            <div className="flex max-w-full flex-wrap gap-3">
                                <a
                                    href={canConnectMore ? route('settings', { tab: 'integration' }, false) : route('settings.upgrade', [], false)}
                                    className={`inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${canConnectMore
                                        ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                        : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                        }`}
                                    aria-disabled={!canConnectMore}
                                    onClick={(event) => {
                                        if (!canConnectMore) {
                                            event.preventDefault();
                                        }
                                    }}
                                >
                                    {canConnectMore ? 'Connect Instagram' : 'Connect Locked'}
                                </a>


                            </div>
                        </div>
                        <p className="relative mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-600">
                            <span>Connected accounts: {effectiveConnectedCount} / {effectiveAccountLimit || 0}</span>
                            {!hasPaidPlan && (
                                <span className="text-rose-600">Active paid plan required to add new accounts.</span>
                            )}
                            {hasPaidPlan && !canConnectMore && (
                                <span className="text-amber-600">Plan limit reached. Upgrade to add more accounts.</span>
                            )}
                            {activePlanTier && (
                                <span className="uppercase tracking-wide text-slate-500">({activePlanTier})</span>
                            )}
                        </p>
                    </section>
                )}
                {/* connected accounts section */}
                <InstagramAccountSelector
                    accounts={accountList}
                    selectedAccountId={persistedSelectedAccountId}
                    connectedCount={effectiveConnectedCount}
                    maxCards={maxInstaCards}
                    canConnectMore={canConnectMore}
                    connectHref={accountConnectHref}
                    onSelect={selectAccount}
                    getAccountHref={(item) => route('autodm.create', { instagram_account_id: item.id }, false)}
                    getAccountCardProps={() => ({
                        actionLabel: 'Start Automation',
                        actionIcon: SubscriptionIcon,
                    })}
                />


                {/* metrics section */}
                <section className="max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {[
                                ['Total Automations', flows.length, BarChart3, 'default'],
                                ['Active Automations', metrics.active_flows, CheckCircle2, 'success'],
                                ['Paused Automations', metrics.paused_flows, Pause, 'warning'],
                                ['7D Runs', metrics.runs_last_7_days, RotateCcw, 'primary'],
                            ].map(([label, value, Icon, variant]) => (
                                <KpiCard
                                    key={label}
                                    label={label}
                                    value={value}
                                    icon={Icon}
                                    size="compact"
                                    variant={variant}
                                />
                            ))}
                        </div>
                      
                        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                            {/* Search */}
                            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">
                                    Search
                                </label>
                                <div className="relative w-full">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by name, trigger value..."
                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">
                                    Status
                                </label>
                                <div className="flex h-10 items-center gap-1 rounded-xl border border-slate-300 bg-slate-50/50 p-1">
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('active')}
                                        className={`h-8 flex-1 rounded-lg text-xs font-bold transition-all focus-visible:outline-none ${
                                            statusFilter === 'active'
                                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                                        }`}
                                    >
                                        Active ({activeCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('archived')}
                                        className={`h-8 flex-1 rounded-lg text-xs font-bold transition-all focus-visible:outline-none ${
                                            statusFilter === 'archived'
                                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                                        }`}
                                    >
                                        Archived ({archivedCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('all')}
                                        className={`h-8 flex-1 rounded-lg text-xs font-bold transition-all focus-visible:outline-none ${
                                            statusFilter === 'all'
                                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                                        }`}
                                    >
                                        All
                                    </button>
                                </div>
                            </div>

                             {/* Instagram Account */}
                            <SharedDropdownSelect
                                label="Instagram Account"
                                value={accountFilter}
                                onChange={setAccountFilter}
                                options={accountFilterOptions}
                            />

                            {/* Trigger Type */}
                            <SharedDropdownSelect
                                label="Trigger Type"
                                value={triggerFilter}
                                onChange={setTriggerFilter}
                                options={triggerFilterOptions}
                            />

                            {/* Opening Message */}
                            <SharedDropdownSelect
                                label="Opening Msg"
                                value={openingFilter}
                                onChange={setOpeningFilter}
                                options={featureFilterOptions}
                            />

                            {/* Ask to Follow */}
                            <SharedDropdownSelect
                                label="Ask to Follow"
                                value={askToFollowFilter}
                                onChange={setAskToFollowFilter}
                                options={featureFilterOptions}
                            />

                            {/* Reminder */}
                            <SharedDropdownSelect
                                label="Reminder"
                                value={reminderFilter}
                                onChange={setReminderFilter}
                                options={featureFilterOptions}
                            />

                            {/* Reset Filters */}
                            <div className="flex items-end sm:col-span-2 lg:col-span-2">
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    disabled={!hasActiveFilters}
                                    className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-primary-600 bg-primary-600 px-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:border-primary-200 disabled:bg-primary-200 disabled:text-white/70"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                        {/* Flow Table */}
                       
                    </section>
                 <div className="max-w-full overflow-hidden rounded-2xl border border-slate-200">
                            <div className="hidden grid-cols-12 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 md:grid text-center">
                                <div className="col-span-4 text-left">Automation</div>
                                <div className="col-span-1 text-center">Runs</div>
                                <div className="col-span-2 text-center">Status</div>
                                <div className="col-span-1">Last Updated</div>
                                <div className="col-span-2">Created On</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>

                            {filteredFlows.length === 0 ? (
                                <div className="p-10 text-center">
                                    <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
                                    <p className="mt-3 text-sm font-semibold text-slate-700">No automation flows found</p>
                                    <p className="mt-1 text-sm text-slate-500">Adjust filters or create a new automation.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-200">
                                    {filteredFlows.map((flow) => {
                                        const keywords = Array.isArray(flow.keywords) ? flow.keywords : [];
                                        const visibleKeywords = keywords.slice(0, 3);
                                        const remainingKeywords = Math.max(0, keywords.length - visibleKeywords.length);
                                        const automationTitle = flow.instagram_account?.username
                                            ? `@${flow.instagram_account.username}`
                                            : `Flow #${flow.id}`;

                                        return (
                                            <article
                                                key={flow.id}
                                                className="grid min-w-0 cursor-pointer grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-slate-50 md:grid-cols-12 md:items-center md:gap-4"
                                                onClick={() => setSelectedFlowId(flow.id)}
                                            >
                                                <div className="col-span-4 flex min-w-0 items-start gap-3">
                                                    {flow.trigger_media_url ? (
                                                        <img
                                                            src={flow.trigger_media_url}
                                                            alt="Trigger media"
                                                            className="h-32 w-20 rounded-xl border border-slate-200 object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
                                                            <Instagram className="h-5 w-5 text-slate-500" />
                                                        </div>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-slate-900">{automationTitle}</p>
                                                        <p className="text-xs text-slate-500">
                                                            When user comments
                                                            <span className="ml-1 font-semibold text-slate-600">{triggerLabel(flow.trigger_type)}</span>
                                                        </p>
                                                        <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
                                                            {visibleKeywords.map((keyword, index) => (
                                                                <span
                                                                    key={`${flow.id}-${index}`}
                                                                    className="inline-flex max-w-full break-all rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700"
                                                                >
                                                                    {keyword}
                                                                </span>
                                                            ))}
                                                            {remainingKeywords > 0 && (
                                                                <span className="inline-flex rounded-md bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                                                                    +{remainingKeywords}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 flex max-w-full flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-widest">
                                                            <span className="inline-flex max-w-full break-words rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                                                                Scheduled: {flow.reminder_metrics?.scheduled ?? 0}
                                                            </span>
                                                            <span className="inline-flex max-w-full break-words rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                                                                Sent: {flow.reminder_metrics?.sent ?? 0}
                                                            </span>
                                                            <span className="inline-flex max-w-full break-words rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
                                                                Skipped: {flow.reminder_metrics?.skipped_window ?? 0}
                                                            </span>
                                                            <span className="inline-flex max-w-full break-words rounded-md border border-primary-200 bg-primary-50 px-2 py-0.5 text-primary-700">
                                                                Clicked: {flow.reminder_metrics?.clicked ?? 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-span-1 text-left text-sm font-semibold text-slate-700 md:text-center">
                                                    <span className="md:hidden text-xs uppercase tracking-widest text-slate-500 mr-2">Runs</span>
                                                    {flow.runs_count ?? 0}
                                                </div>

                                                <div className="col-span-2 md:text-center">
                                                    <Badge
                                                        variant={flow.status === 'active' ? 'success' : 'secondary'}
                                                        className="uppercase"
                                                    >
                                                        {flow.status === 'active' ? 'Live' : 'Archived'}
                                                    </Badge>
                                                </div>

                                                <div className="col-span-1 text-sm text-slate-600">
                                                    <span className="md:hidden text-xs uppercase tracking-widest text-slate-500 mr-2">Last Updated</span>
                                                    {timeAgo(flow.updated_at)}
                                                </div>

                                                <div className="col-span-2 text-sm text-slate-600 text-center">
                                                    <span className="md:hidden text-xs uppercase tracking-widest text-slate-500  ">Created On</span>
                                                    {flow.created_at ? new Date(flow.created_at).toLocaleDateString() : '-'}
                                                </div>

                                                <div className="col-span-2 min-w-0">
                                                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                toggleStatus(flow.id, flow.status);
                                                            }}
                                                            disabled={actionFlowId === flow.id}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                                        >
                                                            {flow.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                                            {flow.status === 'active' ? 'Pause' : 'Resume'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                duplicateFlow(flow.id);
                                                            }}
                                                            disabled={actionFlowId === flow.id}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                                        >
                                                            <Copy className="h-3.5 w-3.5" />
                                                            Duplicate
                                                        </button>

                                                        <Link
                                                            href={route('autodm.flows.edit', flow.id, false)}
                                                            onClick={(event) => event.stopPropagation()}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                            Edit
                                                        </Link>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* flow details drawer */}
            {selectedFlow && (
                <div className="fixed inset-0 z-50">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/40"
                        onClick={() => setSelectedFlowId(null)}
                        aria-label="Close flow details"
                    />

                    <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-x-hidden overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex min-w-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Flow Details</p>
                                <h3 className="truncate text-lg font-bold text-slate-900">{selectedFlow.name || `Flow #${selectedFlow.id}`}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedFlowId(null)}
                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                aria-label="Close drawer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-5 p-5">
                            <section className="max-w-full rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Trigger</p>
                                <div className="mt-3 flex items-start gap-3">
                                    {selectedFlow.trigger_media_url ? (
                                        <img
                                            src={selectedFlow.trigger_media_url}
                                            alt="Trigger media"
                                            className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
                                            <Instagram className="h-5 w-5 text-slate-500" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-900">{triggerLabel(selectedFlow.trigger_type)}</p>
                                        <p className="mt-1 truncate text-xs text-slate-500">{selectedFlow.trigger_value}</p>
                                        <p className="mt-2 break-words text-xs text-slate-600">
                                            Account: @{selectedFlow.instagram_account?.username || selectedFlow.instagram_account?.ig_account_id || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Runs</p>
                                    <p className="mt-1 text-lg font-black text-slate-900">{selectedFlow.runs_count ?? 0}</p>
                                </div>
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Sent</p>
                                    <p className="mt-1 text-lg font-black text-emerald-800">{selectedFlow.sent_runs_count ?? 0}</p>
                                </div>
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700">Failed</p>
                                    <p className="mt-1 text-lg font-black text-rose-800">{selectedFlow.failed_runs_count ?? 0}</p>
                                </div>
                                <div className="rounded-xl border border-primary-200 bg-primary-50 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary-700">Clicks</p>
                                    <p className="mt-1 text-lg font-black text-accent-800">{selectedFlow.clicks_count ?? 0}</p>
                                </div>
                            </section>

                            {/* <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Reminder Analytics</p>
                                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Scheduled</p>
                                        <p className="mt-1 text-lg font-black text-amber-800">{selectedFlow.reminder_metrics?.scheduled ?? 0}</p>
                                    </div>
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Sent</p>
                                        <p className="mt-1 text-lg font-black text-emerald-800">{selectedFlow.reminder_metrics?.sent ?? 0}</p>
                                    </div>
                                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700">Skipped (Window)</p>
                                        <p className="mt-1 text-lg font-black text-rose-800">{selectedFlow.reminder_metrics?.skipped_window ?? 0}</p>
                                    </div>
                                    <div className="rounded-xl border border-primary-200 bg-primary-50 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary-700">Clicked</p>
                                        <p className="mt-1 text-lg font-black text-accent-800">{selectedFlow.reminder_metrics?.clicked ?? 0}</p>
                                    </div>
                                </div>
                            </section> */}

                            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Keywords</p>
                                <div className="mt-3 flex max-w-full flex-wrap gap-1.5">
                                    {Array.isArray(selectedFlow.keywords) && selectedFlow.keywords.length > 0 ? (
                                        selectedFlow.keywords.map((keyword, index) => (
                                            <span
                                                key={`${selectedFlow.id}-drawer-keyword-${index}`}
                                                className="inline-flex max-w-full break-all rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700"
                                            >
                                                {keyword}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-500">No keywords configured.</p>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Reply Message</p>
                                <div className="mt-3 space-y-2">
                                    {Array.isArray(selectedFlow.message_variants) && selectedFlow.message_variants.length > 0 ? (
                                        selectedFlow.message_variants.map((variant, index) => (
                                            <div key={variant.id || `${selectedFlow.id}-variant-${index}`} className="max-w-full rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Message</p>
                                                {(variant.preview_media_url || variant.media_url) && (
                                                    <img
                                                        src={variant.preview_media_url || variant.media_url}
                                                        alt={`Variant ${index + 1} attachment`}
                                                        className="mt-2 h-32 w-full rounded-md border border-slate-200 object-cover"
                                                    />
                                                )}
                                                {variant.message_text ? (
                                                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{variant.message_text}</p>
                                                ) : (
                                                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Image-only reply</p>
                                                )}
                                                <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-primary-700">
                                                    Clicks: {variant.clicks_count ?? 0}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-500">No active reply message found.</p>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Opening Message</p>
                                <div className="mt-2">
                                    <Badge variant={selectedFlow.opening_message_enabled ? 'success' : 'secondary'} className="uppercase">
                                        {selectedFlow.opening_message_enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                </div>
                                {selectedFlow.opening_message_enabled ? (
                                    <div className="mt-3 space-y-2">
                                        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700 whitespace-pre-wrap break-words">
                                            {selectedFlow.opening_message || 'No opening message set.'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            CTA Button: {selectedFlow.opening_button_text || 'Not set'}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-slate-500">Opening message is not enabled for this flow.</p>
                                )}
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Public Comment Replies</p>
                                <div className="mt-2">
                                    <Badge variant={selectedFlow.public_reply_enabled ? 'success' : 'secondary'} className="uppercase">
                                        {selectedFlow.public_reply_enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                </div>
                                {selectedFlow.public_reply_enabled ? (
                                    <div className="mt-3 space-y-2">
                                        {Array.isArray(selectedFlow.public_comment_reply) && selectedFlow.public_comment_reply.length > 0 ? (
                                            selectedFlow.public_comment_reply.map((reply, index) => (
                                                <p key={`${selectedFlow.id}-public-comment-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-700">
                                                    {reply}
                                                </p>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500">No public comment reply variants configured.</p>
                                        )}
                                        <p className="text-xs text-slate-500">
                                            Limit: {selectedFlow.public_reply_limit_enabled ? `${selectedFlow.public_reply_limit_count || 200}/day` : 'No limit'}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-slate-500">Public replies are disabled for this flow.</p>
                                )}
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Recent Logs</p>
                                <div className="mt-3 space-y-2">
                                    {Array.isArray(selectedFlow.recent_logs) && selectedFlow.recent_logs.length > 0 ? (
                                        selectedFlow.recent_logs.map((log) => (
                                            <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Badge
                                                        variant={log.status === 'sent' ? 'success' : log.status === 'failed' ? 'destructive' : 'secondary'}
                                                        className="uppercase"
                                                    >
                                                        {log.status}
                                                    </Badge>
                                                    <p className="text-xs text-slate-500">{timeAgo(log.created_at)}</p>
                                                </div>
                                                <p className="mt-2 text-xs text-slate-500">Recipient: {log.recipient_ig_id}</p>
                                                {log.error_message && (
                                                    <p className="mt-1 text-xs text-rose-700">{log.error_message}</p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-500">No logs yet for this flow.</p>
                                    )}
                                </div>
                            </section>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => toggleStatus(selectedFlow.id, selectedFlow.status)}
                                    disabled={actionFlowId === selectedFlow.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    {selectedFlow.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                    {selectedFlow.status === 'active' ? 'Pause' : 'Resume'}
                                </button>
                                <Link
                                    href={route('autodm.flows.edit', selectedFlow.id, false)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit Flow
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => duplicateFlow(selectedFlow.id)}
                                    disabled={actionFlowId === selectedFlow.id}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                    Duplicate
                                </button>
                                {selectedFlow.status === 'active' && ['post', 'reel'].includes(selectedFlow.trigger_type) && (
                                    <button
                                        type="button"
                                        id={`retrigger-flow-${selectedFlow.id}`}
                                        onClick={() => retriggerFlow(selectedFlow.id)}
                                        disabled={retriggerFlowId === selectedFlow.id}
                                        className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                                        title="Send DMs to existing commenters who match keywords and haven't been processed yet"
                                    >
                                        <RotateCcw className={`h-3.5 w-3.5 ${retriggerFlowId === selectedFlow.id ? 'animate-spin' : ''}`} />
                                        {retriggerFlowId === selectedFlow.id ? 'Triggering…' : 'Re-trigger'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {disconnectToast?.account_id && (
                <InstagramDisconnectModal
                    show={showDisconnectModal}
                    onClose={() => setShowDisconnectModal(false)}
                    username={disconnectToast.username || null}
                    accountId={disconnectToast.account_id}
                />
            )}
        </AuthenticatedLayout>
    );
}
