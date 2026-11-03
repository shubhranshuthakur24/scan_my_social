import { useEffect, useState } from 'react';
import Icon from '@/Components/Icon';
import { Link, usePage } from '@inertiajs/react';

export default function Sidebar({
    user,
    mobileOpen = false,
    onCloseMobile = () => { },
    desktopCollapsed = false,
    onToggleDesktop = () => { },
}) {
    const { props, url } = usePage();
    const affiliateApplicationStatus = props.auth?.affiliate_application_status || null;
    const isSuperAdmin = Boolean(
        props.auth?.is_super_admin
        || props.auth?.user?.role === 'super_admin'
    );
    const shouldShowAffiliateProgram = (
        user?.affiliate_status === 'approved'
        || user?.affiliate_status === 'approved_unclaimed'
        || user?.affiliate_status === 'approved_claimed'
        || affiliateApplicationStatus === 'approved_unclaimed'
        || affiliateApplicationStatus === 'approved_claimed'
    );

    // Sidebar Mode Logic
    const isAdminRoute = url.startsWith('/admin') || url.startsWith('/viral-image-prompts');
    const [mode, setMode] = useState(isAdminRoute ? 'admin' : 'user');

    // Auto-switch mode when URL changes (e.g. from a link/notification)
    useEffect(() => {
        if (isSuperAdmin && isAdminRoute) {
            setMode('admin');
        }
    }, [url, isAdminRoute, isSuperAdmin]);

    const shouldUseCollapsedDesktopLayout = desktopCollapsed && !mobileOpen;
    const linkPageUrl = route().has('social-bio-links.index') ? route('social-bio-links.index') : '#';
    const dashboardUrl = route().has('dashboard') ? route('dashboard') : '#';
    const videosUrl = route().has('videos') ? route('videos') : '#';
    const scriptsCollectionUrl = route().has('scripts') ? route('scripts', { scripting_tab: 'collection' }) : '#';
    const formsUrl = route().has('lead-forms.index') ? route('lead-forms.index') : '#';
    const crmUrl = route().has('crm.index') ? route('crm.index') : '#';
    const contentSchedulerUrl = route().has('instagram.my-profile')
        ? route('instagram.my-profile')
        : (route().has('autodm.index') ? route('autodm.index') : '#');
    const appointmentCalendarUrl = route().has('appointments.calendar') ? route('appointments.calendar') : '#';
    const settingsUrl = route().has('settings') ? route('settings') : '#';
    const affiliateUrl = route().has('affiliate') ? route('affiliate') : '#';
    const isVideosRoute = route().current('videos') || route().current('videos.show') || route().current('videos.refine');
    const isChannelsRoute = route().current('channels') || route().current('channels.create');
    const isWatchlistsRoute = route().current('watchlists.*');
    const isScriptsRoute = route().current('scripts') || route().current('scripts.show');
    const isCrmRoute = route().current('crm.*');
    const isLeadFormsRoute = route().current('lead-forms.*');
    const isContentSchedulerRoute = route().current('instagram.*') || route().current('autodm.*');
    const isAppointmentsRoute = route().current('appointments.*');
    const isLinkInBioRoute = route().current('social-bio-links.*');
    const isSettingsRoute = route().current('settings') || route().current('settings.*');
    const isDashboardRoute = route().current('dashboard');
    const isContentLibraryActive = isVideosRoute || isChannelsRoute || isWatchlistsRoute;
    const isScriptingActive = isScriptsRoute;
    const isCrmActive = isCrmRoute;
    // Split Navigation Items
    const userNavItems = [
        { name: 'Dashboard', id: 'home', href: dashboardUrl, active: isDashboardRoute },
        { name: 'Content Library', id: 'layers', href: videosUrl, active: isContentLibraryActive },
        { name: 'Scripting', id: 'scripts', href: scriptsCollectionUrl, active: isScriptingActive },
        { name: 'Social Bio Links', id: 'layers', href: linkPageUrl, active: isLinkInBioRoute },
        { name: 'Forms', id: 'forms', href: formsUrl, active: isLeadFormsRoute },
        { name: 'CRM', id: 'briefcase', href: crmUrl, active: isCrmActive },
        { name: 'Instagram', id: 'instagram', href: contentSchedulerUrl, active: isContentSchedulerRoute },
        { name: 'My Calendar', id: 'calendar', href: appointmentCalendarUrl, active: isAppointmentsRoute },
    ];

    const adminNavItems = isSuperAdmin ? [
        { name: 'Homes', id: 'home', href: route('admin.home'), active: route().current('admin.home') },
        { name: 'Channels', id: 'channel', href: route('admin.channels.index'), active: route().current('admin.channels.*') },
        { name: 'Payout Requests', id: 'landmark', href: route('admin.payouts.index'), active: route().current('admin.payouts.*') },
        { name: 'Manage Prompts', id: 'prompts', href: route('viral-image-prompts.manage'), active: route().current('viral-image-prompts.manage') || route().current('viral-image-prompts.create') || route().current('viral-image-prompts.edit') },
        { name: 'Script Intelligence', id: 'scripts', href: route('admin.script-intelligence.index'), active: route().current('admin.script-intelligence.*') },
        { name: 'Affiliates', id: 'briefcase', href: route('admin.affiliates.index'), active: route().current('admin.affiliates.*') },
        { name: 'Push Notifications', id: 'bell', href: route('admin.notifications.index'), active: route().current('admin.notifications.*') },
    ] : [];

    const navItems = mode === 'admin' && isSuperAdmin ? adminNavItems : userNavItems;
    const desktopToggleLabel = desktopCollapsed ? 'Open sidebar' : 'Collapse sidebar';

    const manageItems = mode === 'user' ? [
        { name: 'Settings', id: 'settings', href: settingsUrl, active: isSettingsRoute },
        ...(shouldShowAffiliateProgram ? [
            { name: 'Affiliate Program', id: 'briefcase', href: affiliateUrl, active: route().current('affiliate') },
        ] : []),
    ] : [];

    useEffect(() => {
        if (!mobileOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onCloseMobile();
            }
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [mobileOpen, onCloseMobile]);

    const handleNavClick = () => {
        if (mobileOpen) {
            onCloseMobile();
        }
    };

    const renderNavItem = (item) => {
        const isActive = item.active;
        const baseClasses = `group flex items-center gap-3 transition-all duration-150 relative overflow-hidden outline-none ${shouldUseCollapsedDesktopLayout
            ? 'w-10 h-10 lg:justify-center lg:mx-auto rounded-xl'
            : 'px-3.5 py-2.5 rounded-brand-sm'
            }`;

        const activeClasses = mode === 'admin'
            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
            : 'bg-primary-500 text-white shadow-md shadow-primary-500/20';

        const inactiveClasses = 'text-slate-500 hover:bg-slate-50 hover:text-slate-900';

        const finalClasses = `${baseClasses} ${isActive ? activeClasses : inactiveClasses} text-[13px] font-bold`;

        const iconColorClasses = isActive
            ? 'text-white'
            : `text-slate-400 group-hover:${mode === 'admin' ? 'text-slate-900' : 'text-primary-500'}`;

        const content = (
            <>
                <Icon
                    name={item.id}
                    size={18}
                    className={`transition-colors duration-150 ${iconColorClasses}`}
                />
                <span className={shouldUseCollapsedDesktopLayout ? 'lg:sr-only' : ''}>{item.name}</span>
                {isActive && !shouldUseCollapsedDesktopLayout && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white/30 rounded-l-full" />
                )}
            </>
        );

        if (item.external) {
            return (
                <a
                    key={item.name}
                    href={item.href}
                    className={finalClasses}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={handleNavClick}
                    title={shouldUseCollapsedDesktopLayout ? item.name : undefined}
                >
                    {content}
                </a>
            );
        }

        return (
            <Link
                key={item.name}
                href={item.href}
                className={finalClasses}
                aria-current={isActive ? 'page' : undefined}
                onClick={handleNavClick}
                title={shouldUseCollapsedDesktopLayout ? item.name : undefined}
            >
                {content}
            </Link>
        );
    };

    const sidebarContent = (
        <>
            {/* Brand & Mode Switcher */}
            <div className={`py-5 flex flex-col gap-5 shrink-0 border-b border-slate-100/80 mb-2 ${mode === 'admin' ? 'bg-slate-50/50' : ''} ${shouldUseCollapsedDesktopLayout ? 'px-2 items-center' : 'px-5'}`}>
                <div className={`flex items-center gap-3 ${shouldUseCollapsedDesktopLayout ? 'justify-center' : 'justify-between'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <img
                            src="/images/logo.webp"
                            alt="ScanMySocial Logo"
                            className="w-10 h-10 rounded-xl object-cover shadow-sm"
                        />
                        <img src="/images/ScanMySocial.avif" alt="ScanMySocial" className={`h-6 w-auto brightness-0 object-contain ${shouldUseCollapsedDesktopLayout ? 'lg:hidden' : ''}`} />
                    </div>
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700"
                        aria-label="Close navigation"
                    >
                        <Icon name="x" size={4} />
                    </button>
                </div>

                {/* Mode Switcher (Admin Only) */}
                {isSuperAdmin && !shouldUseCollapsedDesktopLayout && (
                    <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/50 relative">
                        <div
                            className={`absolute inset-y-1 transition-all duration-300 ease-out bg-white rounded-lg shadow-sm border border-slate-200/60 ${mode === 'user' ? 'left-1 w-[48%]' : 'left-[51%] w-[48%]'}`}
                        />
                        <button
                            onClick={() => setMode('user')}
                            className={`relative z-10 flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${mode === 'user' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            App View
                        </button>
                        <button
                            onClick={() => setMode('admin')}
                            className={`relative z-10 flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors duration-200 ${mode === 'admin' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Admin Mode
                        </button>
                    </div>
                )}

                {isSuperAdmin && shouldUseCollapsedDesktopLayout && (
                    <button
                        onClick={() => setMode(mode === 'user' ? 'admin' : 'user')}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${mode === 'admin' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:text-primary-600'}`}
                        title={mode === 'user' ? 'Switch to Admin Mode' : 'Switch to App View'}
                    >
                        <Icon name={mode === 'user' ? 'shield' : 'user'} size={18} />
                    </button>
                )}
            </div>

            {/* Primary nav */}
            <nav className={`space-y-1 flex flex-col shrink-0 ${shouldUseCollapsedDesktopLayout ? 'px-2 items-center' : 'px-4'}`} aria-label="Main Navigation">
                <div className={`text-[11px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-1.5 ${shouldUseCollapsedDesktopLayout ? 'lg:hidden' : ''}`}>
                    {mode === 'admin' ? 'Admin Console' : 'General'}
                </div>
                {navItems.map(renderNavItem)}
            </nav>

            {/* Premium Upgrade Banner (Only in user mode) */}
            {mode === 'user' && (!props.auth.plan || props.auth.plan === 'free') && (!shouldUseCollapsedDesktopLayout) && (
                <div className="px-4 mt-3 shrink-0">
                    <div className="relative overflow-hidden rounded-brand bg-linear-to-br from-primary-600 via-primary-500 to-accent-500 px-3 py-3 shadow-lg shadow-primary-500/25 group">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/20 blur-2xl rounded-full transition-transform duration-700 group-hover:scale-150" />
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-accent-400/35 blur-3xl rounded-full transition-transform duration-700 group-hover:scale-150" />

                        <div className="relative z-10 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <Icon name="wand" size={14} className="text-white drop-shadow-sm shrink-0" />
                                <div className="min-w-0">
                                    <h4 className="text-[13px] font-black text-white tracking-tight leading-tight">Supercharge Growth</h4>
                                    <p className="text-[11px] font-medium text-white/85 leading-snug">Unlock AI analytics & bulk imports.</p>
                                </div>
                            </div>
                            <Link
                                href={route('settings.upgrade')}
                                onClick={handleNavClick}
                                className="shrink-0 flex items-center gap-1 rounded-brand-sm bg-white px-3 py-1.5 text-[11px] font-black text-primary-700 shadow-sm shadow-black/5 transition-all duration-300 hover:bg-slate-50"
                            >
                                <Icon name="badgeCheck" size={12} className="text-primary-600" />
                                PRO
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage section */}
            {manageItems.length > 0 && (
                <div className={`space-y-0.5 mt-3 shrink-0 ${shouldUseCollapsedDesktopLayout ? 'px-3 lg:px-2' : 'px-4'}`}>
                    <div className={`text-[11px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-1.5 ${shouldUseCollapsedDesktopLayout ? 'lg:hidden' : ''}`}>Manage</div>
                    {manageItems.map(renderNavItem)}
                </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* User card */}
            {shouldUseCollapsedDesktopLayout ? (
                <div className="p-2 border-t border-slate-100/80 shrink-0 bg-white lg:flex lg:flex-col lg:items-center lg:gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 text-sm font-black shadow-sm shadow-primary-100 shrink-0">
                        {user.name.charAt(0)}
                    </div>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        data={{ _token: props.csrf_token }}
                        onClick={handleNavClick}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 shadow-sm"
                        aria-label="Log out"
                        title="Log out"
                    >
                        <Icon name="logout" size={18} />
                    </Link>
                </div>
            ) : (
                <div className="p-2 border-t border-slate-100/80 shrink-0 bg-white">
                    <div className="rounded-brand bg-primary-50 p-2.5 shadow-sm border border-primary-100/60">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary-200 flex items-center justify-center text-primary-600 text-sm font-black shadow-sm shadow-primary-100 shrink-0">
                                {user.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-black text-slate-900 truncate tracking-tight">{user.name}</p>
                                <p className="text-[11px] font-bold text-slate-400 truncate tracking-tight">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        data={{ _token: props.csrf_token }}
                        onClick={handleNavClick}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-white text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 rounded-xl text-[13px] font-black transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        aria-label="Log out"
                    >
                        <Icon name="logout" size={16} />
                        Log Out
                    </Link>
                </div>
            )}
        </>
    );

    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={`fixed inset-0 z-[290] bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden ${mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                onClick={onCloseMobile}
                aria-hidden={!mobileOpen}
            />

            {/* Mobile Drawer */}
            <aside
                className={`fixed left-0 top-0 z-[300] h-screen w-[86vw] max-w-[20rem] bg-white/95 backdrop-blur-xl border-r border-slate-300/80 flex flex-col shadow-2xl shadow-slate-900/20 overflow-hidden transition-transform duration-300 ease-out lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                aria-label="Mobile Navigation"
                aria-hidden={!mobileOpen}
            >
                {sidebarContent}
            </aside>

            {/* Desktop Sidebar */}
            <aside
                className={`fixed left-0 top-0 z-[290] hidden h-screen flex-col overflow-visible border-r border-slate-300/80 bg-white/90 shadow-[1px_0_10px_rgba(0,0,0,0.02)] backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex ${desktopCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
            >
                {sidebarContent}
                <button
                    type="button"
                    onClick={onToggleDesktop}
                    className="absolute -right-3 top-6 z-99 inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary-200 bg-primary-500 text-white shadow-sm shadow-primary-500/30 transition-colors hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/45"
                    aria-label={desktopToggleLabel}
                    aria-expanded={!desktopCollapsed}
                >
                    <Icon
                        name="chevronRight"
                        size={3.5}
                        className={`transition-transform duration-200 ${desktopCollapsed ? '' : 'rotate-180'}`}
                        aria-hidden="true"
                    />
                </button>
            </aside>
        </>
    );
}