import React, { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Transition } from '@headlessui/react';

import PageBanner from '@/Components/common/PageBanner';
import KpiCard from '@/Components/common/KpiCard';
import UpdateProfileInformationForm from '@/Pages/Profile/Partials/UpdateProfileInformationForm';
import UpdatePasswordForm from '@/Pages/Profile/Partials/UpdatePasswordForm';
import DeleteUserForm from '@/Pages/Profile/Partials/DeleteUserForm';
import UpdateBankDetailsForm from '@/Pages/Settings/Partials/UpdateBankDetailsForm';
import Modal from '@/Components/Modal';
import Button from '@/Components/Button';
import Icon from '@/Components/Icon';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import { Text } from '@/Components/Typography';
import { useToast } from '@/Contexts/ToastContext';
import { Instagram } from 'lucide-react';

const SETTINGS_TABS = new Set(['profile', 'subscription', 'usage', 'updates', 'account', 'integration', 'bank']);

const classNames = (...classes) => classes.filter(Boolean).join(' ');

const iconToneClasses = {
    primary: 'border-primary-100 bg-primary-50 text-primary-600',
    amber: 'border-amber-100 bg-amber-50 text-amber-600',
    danger: 'border-rose-100 bg-rose-100 text-rose-600',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
};

function SettingsPanel({ children, className = '' }) {
    return (
        <section className={classNames('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
            {children}
        </section>
    );
}

function SettingsSectionHeader({
    children,
    description,
    icon,
    tone = 'primary',
    title,
}) {
    return (
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
                <div className={classNames('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm', iconToneClasses[tone] || iconToneClasses.primary)}>
                    <Icon name={icon} size={24} />
                </div>
                <div className="min-w-0">
                    <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
                    {description ? (
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>
                    ) : null}
                </div>
            </div>
            {children ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{children}</div> : null}
        </div>
    );
}

const resolveInitialSettingsTab = () => {
    if (typeof window === 'undefined') {
        return 'profile';
    }

    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab && SETTINGS_TABS.has(tab) ? tab : 'profile';
};

export default function Index({
    auth,
    mustVerifyEmail,
    status,
    subscriptionData,
    usageData,
    instagramAccounts = [],
    instagramLimitMeta = null,
    isApprovedAffiliate = false,
    bankDetails = null,
    bookingAvailability = null,
}) {
    const [activeTab, setActiveTab] = useState(resolveInitialSettingsTab);
    const { addToast } = useToast();
    const [isWelcomeDmModalOpen, setIsWelcomeDmModalOpen] = useState(false);
    const [selectedWelcomeAccount, setSelectedWelcomeAccount] = useState(null);
    const [selectedDisconnectAccount, setSelectedDisconnectAccount] = useState(null);

    const { data: prefData, setData: setPrefData, patch: patchPref, processing: processingPref, recentlySuccessful: recentlySuccessfulPref, isDirty: isDirtyPref } = useForm({
        notif_product: auth.user.preferences?.notif_product ?? true,
        notif_digest: auth.user.preferences?.notif_digest ?? true,
        notif_inapp: auth.user.preferences?.notif_inapp ?? true,
    });
    const {
        data: welcomeDmData,
        setData: setWelcomeDmData,
        patch: patchWelcomeDm,
        processing: processingWelcomeDm,
        errors: welcomeDmErrors,
        clearErrors: clearWelcomeDmErrors,
        reset: resetWelcomeDm,
    } = useForm({
        enabled: true,
        variants: ['', '', ''],
    });
    const {
        patch: patchDisconnectAccount,
        processing: processingDisconnectAccount,
    } = useForm({});

    const subscription = subscriptionData || {
        id: 'None',
        status: 'None',
        tier: 'No Plan',
        interval: '-',
        periodStart: '-',
        periodEnd: '-'
    };

    const usage = usageData || {
        monthlyCredits: { used: 0, total: 0 },
        supplementalCredits: { used: 0, total: 0 },
        daysUntilReset: 0,
        breakdown: []
    };
    const computedConnectedCount = instagramAccounts.length;
    const instagramLimits = instagramLimitMeta || {
        connectedCount: computedConnectedCount,
        accountLimit: 0,
        canConnectMore: false,
        hasPaidPlan: false,
        activePlanTier: null,
    };
    const connectedInstagramCount = Number(instagramLimits.connectedCount ?? computedConnectedCount);
    const instagramAccountLimit = Number(instagramLimits.accountLimit ?? 0);
    const canConnectInstagramMore = Boolean(instagramLimits.canConnectMore);
    const hasPaidPlan = Boolean(instagramLimits.hasPaidPlan);
    const monthlyCreditsTotal = Number(usage.monthlyCredits.total || 0);
    const monthlyCreditsUsed = Number(usage.monthlyCredits.used || 0);
    const monthlyCreditsRemaining = Math.max(monthlyCreditsTotal - monthlyCreditsUsed, 0);
    const monthlyCreditsRemainingPercent = monthlyCreditsTotal > 0
        ? Math.max(0, Math.round((monthlyCreditsRemaining / monthlyCreditsTotal) * 100))
        : 0;
    const channelLimitLabel = usage.channels?.total === '∞' ? 'Unlimited' : `/ ${usage.channels?.total || 0}`;
    const isFreePlan = subscription.tier === 'Free' || subscription.tier === 'No Plan';
    const isCreatorPlan = subscription.tier === 'Creator';
    const isSubscriptionActive = subscription.status === 'Active';

    const normalizeWelcomeVariants = (variants = []) => {
        const safeVariants = Array.isArray(variants) ? variants : [];
        return [0, 1, 2].map((index) => String(safeVariants[index] || '').trim());
    };

    const openWelcomeDmModal = (account) => {
        setSelectedWelcomeAccount(account);
        setWelcomeDmData('enabled', true);
        setWelcomeDmData('variants', normalizeWelcomeVariants(account.welcome_dm_variants));
        clearWelcomeDmErrors();
        setIsWelcomeDmModalOpen(true);
    };

    const closeWelcomeDmModal = () => {
        setIsWelcomeDmModalOpen(false);
        setSelectedWelcomeAccount(null);
        resetWelcomeDm();
        clearWelcomeDmErrors();
    };

    const submitWelcomeDmConfiguration = (event) => {
        event.preventDefault();

        if (!selectedWelcomeAccount) {
            return;
        }

        patchWelcomeDm(route('settings.integrations.welcome-dm.update', selectedWelcomeAccount.id), {
            preserveScroll: true,
            onSuccess: () => {
                addToast('Welcome DM configuration saved.', 'success');
                closeWelcomeDmModal();
            },
            onError: () => {
                addToast('Please fix the welcome message fields and try again.', 'error');
            },
        });
    };

    const toggleWelcomeDm = (account) => {
        const currentlyEnabled = Boolean(account.welcome_dm_enabled);

        if (!currentlyEnabled) {
            openWelcomeDmModal(account);
            return;
        }

        setWelcomeDmData('enabled', false);
        setWelcomeDmData('variants', normalizeWelcomeVariants(account.welcome_dm_variants));

        patchWelcomeDm(route('settings.integrations.welcome-dm.update', account.id), {
            preserveScroll: true,
            onSuccess: () => {
                addToast('Welcome DM disabled for this account.', 'success');
            },
            onError: () => {
                addToast('Unable to disable Welcome DM right now.', 'error');
            },
        });
    };

    const openDisconnectDialog = (account) => {
        setSelectedDisconnectAccount(account);
    };

    const closeDisconnectDialog = () => {
        if (processingDisconnectAccount) {
            return;
        }

        setSelectedDisconnectAccount(null);
    };

    const confirmDisconnectAccount = () => {
        if (!selectedDisconnectAccount) {
            return;
        }

        patchDisconnectAccount(route('social-integrations.instagram.disconnect', selectedDisconnectAccount.id), {
            preserveScroll: true,
            onSuccess: () => {
                addToast('Instagram account disconnected.', 'success');
                setSelectedDisconnectAccount(null);
            },
            onError: () => {
                addToast('Unable to disconnect this Instagram account right now.', 'error');
            },
        });
    };

    const [features, setFeatures] = useState({
        trendHunter: true,
        smartHooks: false,
        deepVision: false
    });

    useEffect(() => {
        if (!isApprovedAffiliate && activeTab === 'bank') {
            setActiveTab('profile');
        }
    }, [activeTab, isApprovedAffiliate]);

    const progress = 100; // Simplified for MVP

    const tabs = [
        {
            id: 'profile',
            label: 'Profile',
            icon: 'user',
            description: 'Name, email, and identity'
        },
        {
            id: 'subscription',
            label: 'Subscription',
            icon: 'creditCard',
            description: 'Plan and billing'
        },
        {
            id: 'usage',
            label: 'Usage',
            icon: 'barChart',
            description: 'Credits and limits'
        },
        {
            id: 'updates',
            label: 'Notifications',
            icon: 'bell',
            description: 'Email and app alerts'
        },
        {
            id: 'account',
            label: 'Security',
            icon: 'shield',
            description: 'Password and deletion'
        },
        {
            id: 'integration',
            label: 'Integrations',
            icon: 'housePlug',
            description: 'Connected social accounts'
        },
        ...(isApprovedAffiliate ? [{
            id: 'bank',
            label: 'Bank',
            icon: 'landmark',
            description: 'Payout destination'
        }] : []),
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Settings" />

            <div className="relative mx-auto max-w-[1280px] space-y-5">
                <PageBanner
                    title="Settings"
                    description="Manage your account, plan, integrations, bookings, and payout settings."
                    variant="neutral"
                />

            <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
                {/* Setting Navigation */}
                <aside className="w-full lg:sticky lg:top-24 lg:self-start">
                    <nav
                        className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
                        aria-label="Settings sections"
                    >
                        {tabs.map(tab => {
                            if (tab.href) {
                                return (
                                    <Link
                                        key={tab.id}
                                        href={tab.href}
                                        className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition-colors group-hover:bg-white group-hover:text-primary-600">
                                            <Icon name={tab.icon} size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-black">{tab.label}</div>
                                            <div className="truncate text-xs font-semibold text-slate-400">{tab.description}</div>
                                        </div>
                                    </Link>
                                );
                            }

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 ${activeTab === tab.id
                                        ? 'bg-primary-50 text-primary-800 ring-1 ring-primary-100'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                    aria-current={activeTab === tab.id ? 'page' : undefined}
                                >
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${activeTab === tab.id ? 'bg-white text-primary-600 shadow-sm' : 'bg-slate-50 text-slate-500 group-hover:bg-white group-hover:text-primary-600'}`}>
                                        <Icon name={tab.icon} size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-black">{tab.label}</div>
                                        <div className={`truncate text-xs font-semibold ${activeTab === tab.id ? 'text-primary-700/70' : 'text-slate-400'}`}>{tab.description}</div>
                                    </div>
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-primary-600" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Content Area */}
                <div className="min-w-0 animate-fade-in">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-8">
                            <SettingsPanel className="p-6 sm:p-8">
                                <div className="mb-8 flex items-center gap-5 border-b border-slate-100 pb-8">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary-100 bg-primary-50 text-2xl font-black text-primary-600 shadow-sm">
                                        {auth.user.avatar_url ? (
                                            <img src={auth.user.avatar_url} alt={auth.user.name} className="h-full w-full object-cover" />
                                        ) : (
                                            auth.user.name.charAt(0)
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-xl font-black tracking-tight text-slate-950">Profile</h2>
                                        <p className="mt-1 text-sm font-medium text-slate-500">Manage your name, email, and profile details.</p>
                                    </div>
                                </div>

                                <UpdateProfileInformationForm
                                    mustVerifyEmail={mustVerifyEmail}
                                    status={status}
                                    className="max-w-3xl"
                                />
                            </SettingsPanel>
                        </div>
                    )}

                    {/* Subscription Tab */}
                    {activeTab === 'subscription' && (
                        <div className="space-y-8 animate-fade-in">
                            <SettingsPanel className="p-6 sm:p-8">
                                <SettingsSectionHeader
                                    icon="creditCard"
                                    title="Subscription"
                                    description="Review your current plan and billing period."
                                >
                                    <Button
                                        href={route('settings.billing')}
                                        variant="secondary"
                                        size="sm"
                                        icon={<Icon name="history" size={16} />}
                                    >
                                        Billing History
                                    </Button>
                                    <Button
                                        href={route('settings.upgrade')}
                                        variant="primary"
                                        size="sm"
                                    >
                                        {isFreePlan ? 'Upgrade Plan' : 'Change Plan'}
                                    </Button>
                                </SettingsSectionHeader>

                                <div className="mt-6 flex flex-wrap items-center gap-3">
                                    <div className="flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-sm">
                                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500"></div>
                                        <span className="truncate text-xs font-black uppercase tracking-widest text-slate-700">
                                            {subscription.tier}
                                        </span>
                                    </div>
                                    <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-sm ${isSubscriptionActive ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
                                        <Icon name={isSubscriptionActive ? 'check' : 'alertCircle'} size={12} />
                                        <span className="text-xs font-black uppercase tracking-widest">
                                            {subscription.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {[
                                        { label: 'Subscription ID', value: subscription.id, icon: 'shield', helper: 'Account billing reference' },
                                        { label: 'Billing Interval', value: subscription.interval, icon: 'refresh', helper: 'Current cadence' },
                                        { label: 'Period Start', value: subscription.periodStart, icon: 'calendar', helper: 'Current period started' },
                                        { label: subscription.periodEndLabel || 'Next Renewal', value: subscription.periodEnd, icon: 'clock', helper: 'Current period ends' },
                                    ].map((item, i) => (
                                        <KpiCard
                                            key={i}
                                            size="compact"
                                            label={item.label}
                                            value={item.value}
                                            helper={item.helper}
                                            icon={<Icon name={item.icon} />}
                                            valueClassName="text-sm leading-snug"
                                        />
                                    ))}
                                </div>
                            </SettingsPanel>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <SettingsPanel className="p-6 sm:p-8 lg:col-span-2">
                                    <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-600">
                                        <Icon name={isCreatorPlan ? 'success' : 'rocket'} size={34} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-xl font-black tracking-tight text-slate-950">Plan options</h2>
                                        <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">
                                            {isFreePlan
                                                ? 'Upgrade when you need higher limits for channels, automation, and content analysis.'
                                                : subscription.tier === 'Pro'
                                                    ? 'Creator gives you higher limits for larger creator workflows.'
                                                    : 'You are on the highest available plan.'}
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {isCreatorPlan
                                                ? ['Unlimited Channels', 'Max Priority', '24/7 Support'].map(tag => (
                                                    <span key={tag} className="text-[10px] font-bold uppercase tracking-tighter bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">{tag}</span>
                                                ))
                                                : ['Higher Limits', 'Priority Access', 'Advanced Tools'].map(tag => (
                                                    <span key={tag} className="text-[10px] font-bold uppercase tracking-tighter bg-slate-100 text-slate-500 p-2 rounded-md">{tag}</span>
                                                ))
                                            }
                                        </div>
                                        <div className="mt-5 flex flex-wrap">
                                            <Button href={route('settings.upgrade')} variant="primary" size="sm">
                                                {isFreePlan ? 'Upgrade To Pro' : 'Change Plan'}
                                            </Button>
                                        </div>

                                    </div>
                                    </div>
                                </SettingsPanel>

                                <SettingsPanel className="p-6 sm:p-8">
                                    <div className="flex h-full flex-col">
                                        <Text weight="black" className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
                                            <Icon name="gift" size={14} /> Referrals
                                        </Text>
                                        <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">Referral dashboard</h2>
                                        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                                            View referral links, payouts, and invite performance.
                                        </p>
                                        <Button href={route('referrals')} variant="secondary" size="sm" className="mt-6 w-full">
                                            Open Dashboard
                                        </Button>
                                    </div>
                                </SettingsPanel>
                            </div>
                        </div>
                    )}

                    {/* Usage Tab */}
                    {activeTab === 'usage' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 gap-8">
                                {/* Credit Pulse - Main Stats */}
                                <SettingsPanel className="p-6 sm:p-8">
                                    <div className="flex flex-col gap-8 md:flex-row md:items-center">
                                        {/* Radial Progress */}
                                        <div className="relative flex-shrink-0">
                                            <svg className="w-48 h-48 transform -rotate-90">
                                                <circle
                                                    cx="96"
                                                    cy="96"
                                                    r="88"
                                                    stroke="gray"
                                                    strokeWidth="12"
                                                    fill="transparent"
                                                    className="text-slate-100"
                                                />
                                                <circle
                                                    cx="96"
                                                    cy="96"
                                                    r="88"
                                                    stroke="currentColor"
                                                    strokeWidth="12"
                                                    fill="transparent"
                                                    strokeDasharray={2 * Math.PI * 88}
                                                    strokeDashoffset={2 * Math.PI * 88 * (1 - (monthlyCreditsTotal > 0 ? monthlyCreditsUsed / monthlyCreditsTotal : 0))}
                                                    strokeLinecap="round"
                                                    className="text-primary-500 transition-all duration-1000 ease-out"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                                <span className="text-4xl font-bold text-slate-900 leading-none">
                                                    {monthlyCreditsRemainingPercent}%
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Remaining</span>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="min-w-0 flex-1 space-y-6 py-2">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <h2 className="text-xl font-black tracking-tight text-slate-950">Credits and limits</h2>
                                                    <p className="mt-1 text-sm font-medium text-slate-500">Monthly allocation, supplemental credits, and account limits.</p>
                                                </div>
                                                <div className="flex w-fit items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-700 shadow-sm">
                                                    <Icon name="clock" size={12} />
                                                    Resets in {usage.daysUntilReset} day{usage.daysUntilReset === 1 ? '' : 's'}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                <KpiCard
                                                    size="compact"
                                                    variant="primary"
                                                    label="Monthly Remaining"
                                                    value={monthlyCreditsRemaining}
                                                    helper={`of ${monthlyCreditsTotal} credits`}
                                                    icon={<Icon name="activity" />}
                                                />
                                                <KpiCard
                                                    size="compact"
                                                    label="Monthly Used"
                                                    value={monthlyCreditsUsed}
                                                    helper="credits this period"
                                                    icon={<Icon name="barChart" />}
                                                />
                                                <KpiCard
                                                    size="compact"
                                                    label="Tracked Channels"
                                                    value={usage.channels?.used || 0}
                                                    helper={channelLimitLabel}
                                                    icon={<Icon name="users" />}
                                                />
                                                <KpiCard
                                                    size="compact"
                                                    label="Supplemental"
                                                    value={usage.supplementalCredits.total}
                                                    helper="available credits"
                                                    icon={<Icon name="plus" />}
                                                />
                                            </div>

                                            <div className="flex gap-3">
                                                <Button variant="primary" size="sm" className="font-bold px-6">Buy Credits</Button>
                                                {/* <Button variant="outline" size="sm" className="font-bold px-6 border-slate-200 text-slate-600">History</Button> */}
                                            </div>
                                        </div>
                                    </div>
                                </SettingsPanel>
                            </div>

                            {/* Consumption Ledger */}
                            <SettingsPanel className="overflow-hidden">
                                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 p-6 sm:p-8">
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight text-slate-950">Usage breakdown</h3>
                                        <p className="mt-0.5 text-sm font-medium text-slate-500">Credit usage by activity type.</p>
                                    </div>
                                    {/* <Button variant="ghost" size="sm" className="text-primary-600 font-bold hover:bg-primary-50">
                                        <Icon name="download" size={16} className="mr-2" />
                                        Export Data
                                    </Button> */}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-100/50">
                                                <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Activity</th>
                                                <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                                                <th className="px-8 py-5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Count</th>
                                                <th className="px-8 py-5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Unit Cost</th>
                                                <th className="px-8 py-5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Credits</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100/60">
                                            {usage.breakdown.map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 transition-all duration-300">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-2.5 rounded-xl bg-slate-100 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all shadow-sm`}>
                                                                <Icon name={item.name.toLowerCase().includes('video') ? 'play' : item.name.toLowerCase().includes('search') ? 'search' : 'activity'} size={16} />
                                                            </div>
                                                            <div className="font-bold text-slate-800 text-[13px] group-hover:text-primary-700 transition-colors uppercase tracking-tight">{item.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <Text variant="xs" className="text-slate-500 font-medium leading-relaxed max-w-xs">{item.description}</Text>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="inline-flex items-baseline gap-1 bg-slate-100/50 px-2 py-1 rounded-lg border border-slate-200/30">
                                                            <span className="font-bold text-slate-700 text-xs">{item.count}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Items</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <Text weight="black" className="text-slate-500 text-xs lowercase">x{item.cost}</Text>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors text-sm">
                                                                {item.total}
                                                            </span>
                                                            <div className="w-8 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                                                <div className="h-full bg-primary-500" style={{ width: `${(parseFloat(item.total) / 45) * 100}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-slate-50/50">
                                                <td colSpan="4" className="px-8 py-8 text-right">
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-4">Monthly total</span>
                                                    <span className="text-3xl font-bold text-slate-900 tracking-tightest">
                                                        {Number(usage.monthlyCredits.used).toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-8 text-right bg-primary-50/40">
                                                    <div className="flex flex-col items-end">
                                                        <div className="flex items-center gap-2 text-primary-600 mb-1">
                                                            <Icon name="activity" size={14} />
                                                            <span className="font-bold text-xs uppercase tracking-widest">Total Burned</span>
                                                        </div>
                                                        <span className="text-2xl font-bold text-primary-700 tracking-tightest">
                                                            {Number(usage.monthlyCredits.used).toFixed(1)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </SettingsPanel>
                        </div>
                    )}

                    {/* Account Settings Tab */}
                    {activeTab === 'account' && (
                        <div className="space-y-8 animate-fade-in">

                            <SettingsPanel className="p-6 sm:p-8">
                                <SettingsSectionHeader
                                    icon="lock"
                                    tone="amber"
                                    title={auth.has_password ? 'Password' : 'Create password login'}
                                    description={auth.has_password
                                        ? 'Update the password used for email sign-in.'
                                        : 'Add password sign-in alongside Google login.'}
                                />
                                <div className="mt-8">
                                <UpdatePasswordForm className="max-w-3xl" requiresCurrentPassword={auth.has_password} />
                                </div>
                            </SettingsPanel>

                            <div className="pt-8">
                                <SettingsPanel className="border-rose-100 bg-rose-50/30 p-6 shadow-sm sm:p-8">
                                    <SettingsSectionHeader
                                        icon="shield"
                                        tone="danger"
                                        title="Danger Zone"
                                        description="Account deletion is permanent."
                                    />
                                    <div className="mt-8">
                                    <DeleteUserForm className="max-w-3xl" requirePassword={auth.has_password} />
                                    </div>
                                </SettingsPanel>
                            </div>
                        </div>
                    )}


                    {/* updates account preferances Tab */}
                    {activeTab === 'updates' &&
                        (
                            <div className="space-y-8 animate-fade-in">
                                <SettingsPanel className="p-6 sm:p-8">
                                    <SettingsSectionHeader
                                        icon="mail"
                                        title="Notifications"
                                        description="Choose which account updates you receive."
                                    />

                                    <div className="mt-8 max-w-3xl space-y-4">
                                        {[
                                            { id: 'notif_product', label: 'Product updates', desc: 'New features, plan changes, and important product notices.' },
                                            { id: 'notif_digest', label: 'Weekly Analytics Digest', desc: 'Receive a weekly summary of your tracked creators and market trends.' },
                                            { id: 'notif_inapp', label: 'In-App Notifications', desc: 'Alerts within the dashboard for completed generations or system updates.' },
                                        ].map((pref) => (
                                            <div key={pref.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50/80">
                                                <div className="min-w-0">
                                                    <p className="mb-1 text-sm font-black text-slate-900">{pref.label}</p>
                                                    <p className="text-sm font-medium leading-6 text-slate-500">{pref.desc}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className={`relative h-6 w-12 flex-shrink-0 rounded-full transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 ${prefData[pref.id] ? 'bg-primary-500' : 'bg-slate-200'}`}
                                                    role="switch"
                                                    aria-checked={prefData[pref.id]}
                                                    onClick={() => setPrefData(pref.id, !prefData[pref.id])}
                                                >
                                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ease-in-out shadow-sm ${prefData[pref.id] ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        ))}

                                        <div className="pt-4 flex items-center justify-end gap-4">
                                            <Transition
                                                show={recentlySuccessfulPref}
                                                enter="transition ease-in-out"
                                                enterFrom="opacity-0"
                                                leave="transition ease-in-out"
                                                leaveTo="opacity-0"
                                            >
                                                <p className="text-sm font-bold text-emerald-600 flex items-center gap-1"><Icon name="check" size={14} /> Saved</p>
                                            </Transition>

                                            <Button
                                                variant="solid"
                                                className="font-bold px-6 shadow-md shadow-primary-500/20"
                                                disabled={processingPref || !isDirtyPref}
                                                onClick={() => patchPref(route('profile.preferences.update'), {
                                                    onSuccess: () => addToast('Communication preferences updated successfully!', 'success')
                                                })}
                                            >
                                                Save Preferences
                                            </Button>
                                        </div>
                                    </div>
                                </SettingsPanel>
                            </div>
                        )}

                    {/* integration Settings Tab */}
                    {activeTab === 'integration' &&
                        (
                            <div className="space-y-8 animate-fade-in">
                                <SettingsPanel className="p-6 sm:p-8">
                                    <SettingsSectionHeader
                                        icon="instagram"
                                        title="Instagram accounts"
                                        description="Connect Instagram Business accounts for AutoDM automation."
                                    >
                                            <a
                                                href={canConnectInstagramMore ? route('social-integrations.instagram.connect', { source: 'settings_integration' }) : route('settings.upgrade')}
                                                className={`inline-flex min-h-10 w-full items-center justify-center rounded-xl border px-4 py-2 text-sm font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 sm:w-auto ${canConnectInstagramMore
                                                    ? 'border-transparent bg-primary-600 text-white hover:bg-primary-700'
                                                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                                    }`}
                                                aria-disabled={!canConnectInstagramMore}
                                                onClick={(event) => {
                                                    if (!canConnectInstagramMore) {
                                                        event.preventDefault();
                                                    }
                                                }}
                                            >
                                                <Icon name="plus" size={16} className="mr-2" />
                                                {canConnectInstagramMore ? 'Connect Account' : 'Connect Locked'}
                                            </a>
                                    </SettingsSectionHeader>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
                                            Connected {connectedInstagramCount} / {instagramAccountLimit || 0}
                                        </span>
                                        {!hasPaidPlan && (
                                            <span className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">
                                                Paid plan required for new connections
                                            </span>
                                        )}
                                        {hasPaidPlan && !canConnectInstagramMore && (
                                            <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-black text-amber-600">
                                                Plan limit reached
                                            </span>
                                        )}
                                    </div>

                                    <div className="relative mt-6 space-y-4">
                                        {instagramAccounts.length > 0 ? (
                                            instagramAccounts.map((account) => {
                                                const normalizedStatus = String(account.status || '').toLowerCase();
                                                const isActive = normalizedStatus === 'active';
                                                const welcomeDmEnabled = Boolean(account.welcome_dm_enabled);
                                                const statusLabel = isActive ? 'Active' : 'Disconnected';
                                                const username = String(account.username || '').trim();
                                                const fallbackProfileUrl = username !== '' ? `https://www.instagram.com/${username.replace(/^@+/, '')}/` : 'https://www.instagram.com/';
                                                const profileUrl = String(account.profile_url || '').trim() || fallbackProfileUrl;
                                                const profileLinkLabel = username !== '' ? `instagram.com/${username.replace(/^@+/, '')}` : 'instagram.com';

                                                return (
                                                <div key={account.id} className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:bg-slate-50/50 lg:flex-row lg:items-center lg:justify-between">
                                                    <div className="flex min-w-0 items-center gap-4">
                                                        <div className="relative">
                                                            <div className="w-12 h-12 rounded-xl border-2 border-slate-50 overflow-hidden bg-slate-100">
                                                                {account.profile_picture_url ? (
                                                                    <img src={account.profile_picture_url} alt={account.username} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
                                                                        <Icon name="user" size={20} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                                <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] text-white">
                                                                    <Instagram size={10} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="break-all font-bold text-slate-900">@{account.username}</span>
                                                                <span
                                                                    className={`inline-flex h-5 min-w-[88px] items-center justify-center gap-1.5 rounded-md border px-2 text-[10px] font-bold uppercase ${isActive
                                                                        ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                                                                        : 'border-amber-100 bg-amber-50 text-amber-600'
                                                                        }`}
                                                                >
                                                                    {isActive ? (
                                                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                                    ) : (
                                                                        <Icon name="alertCircle" size={12} />
                                                                    )}
                                                                    {statusLabel}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500">
                                                                Instagram Business Account
                                                            </p>
                                                            <a
                                                                href={profileUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                                                            >
                                                                {profileLinkLabel}
                                                                <Icon name="externalLink" size={12} />
                                                            </a>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleWelcomeDm(account)}
                                                            disabled={!isActive || processingWelcomeDm || processingDisconnectAccount}
                                                            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 ${!isActive
                                                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                                }`}
                                                            title={!isActive ? 'Reconnect this account to enable Welcome DM.' : 'Toggle Welcome DM'}
                                                        >
                                                            <span>Welcome DM</span>
                                                            <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${welcomeDmEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${welcomeDmEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                            </span>
                                                        </button>
                                                        <a
                                                            href={route('social-integrations.instagram.connect', { reconnect_account_id: account.id, source: 'settings_integration' })}
                                                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                                        >
                                                            <Icon name="refresh" size={14} />
                                                            Reconnect
                                                        </a>
                                                        {isActive && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openDisconnectDialog(account)}
                                                                disabled={processingDisconnectAccount}
                                                                className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                <Icon name="x" size={14} />
                                                                Disconnect
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                );
                                            })
                                        ) : (
                                            <div className="py-12 flex flex-col items-center text-center">
                                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                                                    <Icon name="link" size={32} />
                                                </div>
                                                <h3 className="mb-2 text-lg font-black tracking-tight text-slate-950">No accounts connected</h3>
                                                <p className="mb-6 max-w-sm text-sm font-medium leading-6 text-slate-500">
                                                    Connect your Instagram Business account to start using the AutoDM automation features.
                                                </p>
                                                <a
                                                    href={canConnectInstagramMore ? route('social-integrations.instagram.connect', { source: 'settings_integration' }) : route('settings.upgrade')}
                                                    className={`inline-flex min-h-11 items-center rounded-xl border px-6 py-2.5 text-sm font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 ${canConnectInstagramMore
                                                        ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                        : 'border-slate-200 bg-slate-100 text-slate-400'
                                                        }`}
                                                    aria-disabled={!canConnectInstagramMore}
                                                    onClick={(event) => {
                                                        if (!canConnectInstagramMore) {
                                                            event.preventDefault();
                                                        }
                                                    }}
                                                >
                                                    Connect Instagram&nbsp;&nbsp;<Icon name="instagram" size={18} />
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 border-t border-slate-100 pt-6">
                                        <div className="flex gap-4 rounded-2xl border border-slate-200 bg-info-50 p-5">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-primary-500 flex-shrink-0">
                                                <Icon name="helpCircle" size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 mb-1">How it works</h4>
                                                <p className="text-slate-500 text-sm leading-relaxed">
                                                    When you connect an account, we use the Instagram Graph API to monitor your comments and DMs. Reconnecting is occasionally necessary if permissions change or if the connection expires (usually every 60 days).
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </SettingsPanel>
                            </div>
                        )}



                    <Modal show={isWelcomeDmModalOpen} onClose={closeWelcomeDmModal} maxWidth="lg">
                        <form onSubmit={submitWelcomeDmConfiguration} className="p-6 sm:p-8">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Welcome DM Messages</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Configure 3 message variants for @{selectedWelcomeAccount?.username || 'instagram'}.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeWelcomeDmModal}
                                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                                    aria-label="Close welcome DM modal"
                                >
                                    <Icon name="x" size={14} />
                                </button>
                            </div>

                            <div className="mt-6 space-y-4">
                                {[0, 1, 2].map((index) => (
                                    <div key={index}>
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                                            Variant {index + 1}
                                        </label>
                                        <textarea
                                            value={welcomeDmData.variants[index] || ''}
                                            onChange={(event) => {
                                                const nextVariants = [...welcomeDmData.variants];
                                                nextVariants[index] = event.target.value;
                                                setWelcomeDmData('variants', nextVariants);
                                            }}
                                            rows={3}
                                            maxLength={500}
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                                            placeholder="Write your welcome DM message..."
                                        />
                                        {welcomeDmErrors[`variants.${index}`] && (
                                            <p className="mt-1 text-xs font-semibold text-rose-600">
                                                {welcomeDmErrors[`variants.${index}`]}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-3">
                                <Button
                                    type="button"
                                    onClick={closeWelcomeDmModal}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    isLoading={processingWelcomeDm}
                                    variant="primary"
                                    size="sm"
                                >
                                    {processingWelcomeDm ? 'Saving...' : 'Enable Welcome DM'}
                                </Button>
                            </div>
                        </form>
                    </Modal>

                    <ConfirmDialog
                        show={Boolean(selectedDisconnectAccount)}
                        title="Disconnect Instagram account?"
                        message={`This will remove the stored access token for @${selectedDisconnectAccount?.username || 'this account'} and stop AutoDM, scheduling, publishing, and analytics until you reconnect it.`}
                        confirmLabel="Disconnect Account"
                        cancelLabel="Cancel"
                        variant="danger"
                        onConfirm={confirmDisconnectAccount}
                        onCancel={closeDisconnectDialog}
                        isLoading={processingDisconnectAccount}
                    />

                    {/* Bank Settings Tab */}
                    {activeTab === 'bank' && isApprovedAffiliate && (
                        <div className="space-y-8 animate-fade-in">
                            <SettingsPanel className="p-6 sm:p-8">
                                <SettingsSectionHeader
                                    icon="landmark"
                                    tone="emerald"
                                    title="Bank settings"
                                    description="Manage where affiliate payouts are sent."
                                />

                                <div className="mt-8">
                                <UpdateBankDetailsForm />
                                </div>

                                <div className="mt-10 pt-8 border-t border-slate-100">
                                    <div className="flex gap-4 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-amber-100 flex items-center justify-center text-amber-500 flex-shrink-0">
                                            <Icon name="shield" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 mb-1">Security Note</h4>
                                            <p className="text-slate-500 text-sm leading-relaxed">
                                                Payouts are processed to the bank details saved here. Ensure your IFSC and Account Number are accurate to avoid transaction delays or failures. For high-value payouts, our compliance team may reach out for verification.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </SettingsPanel>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </AuthenticatedLayout>
    );
}
