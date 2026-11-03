import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/Components/Sidebar';
import NotificationDropdown from '@/Components/Notifications/NotificationDropdown';
import FlashToaster from '@/Components/FlashToaster';
import ModuleTabs from '@/Components/ModuleTabs';
import { Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    BookOpen,
    Bookmark,
    CalendarDays,
    CalendarRange,
    Clock3,
    FolderKanban,
    Gift,
    Grid2x2,
    Link2,
    Menu,
    MousePointerClick,
    PanelsTopLeft,
    RefreshCw,
    Send,
    ScrollText,
    Settings,
    Sparkles,
    UsersRound,
    X,
} from 'lucide-react';

const DESKTOP_SIDEBAR_STORAGE_KEY = 'scanmysocial.sidebar.collapsed';

// Sidebar preference and viewport helpers.
const getInitialDesktopSidebarCollapsed = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        return window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY) === '1';
    } catch (error) {
        console.error('Failed to read desktop sidebar preference', error);
        return false;
    }
};

const AuthenticatedLayout = ({
    header,
    headerZClass = 'z-[230]',
    topbarTitle = null,
    topbarDescription = null,
    moduleTabsAction = null,
    children,
}) => {
    // Shared authenticated page state.
    const { props, url } = usePage();
    const user = props.auth.user;
    const isAdminRoute = url.startsWith('/admin') || url.startsWith('/viral-image-prompts');

    // Sidebar state.
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(getInitialDesktopSidebarCollapsed);

    // Persist the desktop sidebar preference between visits.
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, isDesktopSidebarCollapsed ? '1' : '0');
        } catch (error) {
            console.error('Failed to persist desktop sidebar preference', error);
        }
    }, [isDesktopSidebarCollapsed]);

    const closeMobileSidebar = useCallback(() => {
        setIsMobileSidebarOpen(false);
    }, []);

    const toggleDesktopSidebar = useCallback(() => {
        setIsDesktopSidebarCollapsed((previousValue) => !previousValue);
        setIsMobileSidebarOpen(false);
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsMobileSidebarOpen((previousValue) => !previousValue);
    }, []);

    // Close the mobile sidebar after Inertia navigation.
    useEffect(() => {
        closeMobileSidebar();
    }, [url, closeMobileSidebar]);

    const toggleLabel = isMobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu';
    const ToggleIcon = isMobileSidebarOpen ? X : Menu;

    // Top navigation tabs for module-level workflows.
    const moduleTabs = useMemo(() => {
        const queryParams = new URLSearchParams(String(url || '').split('?')[1] || '');
        const contentTabFromUrl = (queryParams.get('content_tab') || '').toLowerCase();
        const scriptingTabFromUrl = (queryParams.get('scripting_tab') || '').toLowerCase();
        const hasOpenRecreateFlag = queryParams.get('open_recreate') === '1';

        const isVideosRoute = route().current('videos') || route().current('videos.show') || route().current('videos.refine');
        const isChannelsRoute = route().current('channels') || route().current('channels.create');
        const isWatchlistsRoute = route().current('watchlists.*');
        const isProjectsRoute = route().current('projects') || route().current('projects.show');
        const isScriptsRoute = route().current('scripts') || route().current('scripts.*');
        const isSocialBioLinksRoute = route().current('social-bio-links.index')
            || route().current('social-bio-links.linkshort')
            || route().current('social-bio-links.cards.*')
            || route().current('social-bio-links.short-links.*')
            || route().current('social-bio-links.web-pages.*');
        const isContentSchedulerRoute = route().current('instagram.*') || route().current('autodm.*');
        const isAppointmentsRoute = route().current('appointments.*');

        // Content Library tabs.
        if (isVideosRoute || isChannelsRoute || isWatchlistsRoute || isProjectsRoute) {
            const resolvedContentTab = isProjectsRoute ? 'projects' : (isWatchlistsRoute ? 'competitors' : (isChannelsRoute ? 'competitors' : 'library'));

            return {
                group: 'content-library',
                tabs: [
                    {
                        key: 'library',
                        name: 'Library',
                        icon: BookOpen,
                        href: route().has('videos') ? route('videos') : '#',
                        active: resolvedContentTab === 'library',
                    },
                    {
                        key: 'competitors',
                        name: 'Competitors',
                        icon: UsersRound,
                        href: route().has('channels') ? route('channels') : '#',
                        active: resolvedContentTab === 'competitors',
                    },
                    {
                        key: 'projects',
                        name: 'Projects',
                        icon: FolderKanban,
                        href: route().has('projects') ? route('projects') : '#',
                        active: resolvedContentTab === 'projects',
                    },
                ],
            };
        }

        // Scripting tabs.
        if (isScriptsRoute) {
            let resolvedScriptingTab = scriptingTabFromUrl || 'collection';
            if (route().current('scripts.create') || route().current('scripts.build')) {
                resolvedScriptingTab = 'create_fresh';
            } else if (hasOpenRecreateFlag) {
                resolvedScriptingTab = 'recreated';
            }

            return {
                group: 'scripting',
                tabs: [
                    {
                        key: 'collection',
                        name: 'Collection',
                        icon: ScrollText,
                        href: route().has('scripts') ? route('scripts', { scripting_tab: 'collection' }) : '#',
                        active: resolvedScriptingTab === 'collection',
                    },
                    {
                        key: 'create_fresh',
                        name: 'Create Fresh Script',
                        icon: Sparkles,
                        href: route().has('scripts.create')
                            ? route('scripts.create')
                            : '#',
                        active: resolvedScriptingTab === 'create_fresh',
                    },
                    {
                        key: 'recreated',
                        name: 'Recreated',
                        icon: RefreshCw,
                        href: route().has('scripts')
                            ? route('scripts', { scripting_tab: 'recreated', open_recreate: '1' })
                            : '#',
                        active: resolvedScriptingTab === 'recreated',
                    },
                ],
            };
        }

        // Social bio links tabs.
        if (isSocialBioLinksRoute) {
            const resolvedSocialTab = route().current('social-bio-links.linkshort') || route().current('social-bio-links.short-links.*')
                ? 'linkshort'
                : (route().current('social-bio-links.web-pages.*') ? 'web_pages' : 'link_in_bio');

            return {
                group: 'social-bio-links',
                tabs: [
                    {
                        key: 'link_in_bio',
                        name: 'Link in Bio',
                        icon: Link2,
                        href: route().has('social-bio-links.index')
                            ? route('social-bio-links.index')
                            : '#',
                        active: resolvedSocialTab === 'link_in_bio',
                    },
                    {
                        key: 'linkshort',
                        name: 'Linkshort',
                        icon: MousePointerClick,
                        href: route().has('social-bio-links.linkshort')
                            ? route('social-bio-links.linkshort')
                            : '#',
                        active: resolvedSocialTab === 'linkshort',
                    },
                    {
                        key: 'web_pages',
                        name: 'Web Pages',
                        icon: PanelsTopLeft,
                        href: route().has('social-bio-links.web-pages.index')
                            ? route('social-bio-links.web-pages.index')
                            : '#',
                        active: resolvedSocialTab === 'web_pages',
                    },
                ],
            };
        }

        // Appointments tabs.
        if (isAppointmentsRoute) {
            return {
                group: 'appointments',
                tabs: [
                    {
                        key: 'calendar',
                        name: 'Appointment Calendar',
                        icon: CalendarDays,
                        href: route().has('appointments.calendar') ? route('appointments.calendar') : '#',
                        active: route().current('appointments.calendar'),
                    },
                    {
                        key: 'event-types',
                        name: 'My Events',
                        icon: Clock3,
                        href: route().has('appointments.index') ? route('appointments.index') : '#',
                        active: route().current('appointments.index') || route().current('appointments.create') || route().current('appointments.event-types.edit'),
                    },
                    {
                        key: 'upcoming',
                        name: 'Upcoming Appointments',
                        icon: ScrollText,
                        href: route().has('appointments.upcoming') ? route('appointments.upcoming') : '#',
                        active: route().current('appointments.upcoming'),
                    },
                    {
                        key: 'settings',
                        name: 'Availability & Rules',
                        icon: Settings,
                        href: route().has('appointments.settings') ? route('appointments.settings') : '#',
                        active: route().current('appointments.settings'),
                    },
                ],
            };
        }

        // Content Scheduler tabs.
        if (isContentSchedulerRoute) {
            return {
                group: 'instagram',
                tabs: [
                    {
                        key: 'my-profile',
                        name: 'My Profile',
                        icon: Grid2x2,
                        href: route().has('instagram.my-profile') ? route('instagram.my-profile') : '#',
                        active: route().current('instagram.my-profile'),
                    },
                    {
                        key: 'calendar',
                        name: 'Publishing Calendar',
                        icon: CalendarRange,
                        href: route().has('instagram.calendar') ? route('instagram.calendar') : '#',
                        active: route().current('instagram.calendar'),
                    },
                    {
                        key: 'schedule',
                        name: 'Schedule',
                        icon: Clock3,
                        href: route().has('instagram.schedule') ? route('instagram.schedule') : '#',
                        active: route().current('instagram.schedule'),
                    },
                    {
                        key: 'autodm',
                        name: 'AutoDM',
                        icon: Send,
                        href: route().has('autodm.index') ? route('autodm.index') : '#',
                        active: route().current('autodm.*'),
                    },
                    {
                        key: 'analytics',
                        name: 'Analytics',
                        icon: BarChart3,
                        href: route().has('instagram.analytics') ? route('instagram.analytics') : '#',
                        active: route().current('instagram.analytics'),
                    },
                ],
            };
        }

        return null;
    }, [url]);

    return (
        <div className={`min-h-screen bg-mist grain-overlay font-sans ${isAdminRoute ? 'admin-route' : ''}`}>
            {/* Global flash notifications */}
            <FlashToaster />

            {/* Keyboard skip link */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-700 focus:shadow-lg"
            >
                Skip to content
            </a>

            {/* Primary sidebar navigation */}
            <Sidebar
                user={user}
                mobileOpen={isMobileSidebarOpen}
                onCloseMobile={closeMobileSidebar}
                desktopCollapsed={isDesktopSidebarCollapsed}
                onToggleDesktop={toggleDesktopSidebar}
            />

            {/* Main application shell */}
            <div className={`transition-[padding] duration-300 ease-out ${isDesktopSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
                {/* Sticky top navigation */}
                <div className="sticky top-0 z-50 border-b border-slate-300/80 bg-white/90 backdrop-blur-md">
                    <div className="pl-2 pr-2 py-2.5 sm:pl-2.5 sm:pr-2.5 sm:py-3 lg:pl-2 lg:pr-2">
                        <div className="flex items-center justify-between gap-3">
                            {/* Sidebar toggle and module tabs */}
                            <div className={`flex flex-1 min-w-0 items-center gap-3 ${topbarTitle ? 'lg:pl-6' : ''}`}>
                                <button
                                    type="button"
                                    onClick={toggleSidebar}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 lg:hidden"
                                    aria-label={toggleLabel}
                                    aria-expanded={isMobileSidebarOpen}
                                >
                                    <ToggleIcon className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
                                </button>
                                {topbarTitle ? (
                                    <div className="min-w-0 space-y-0.5">
                                        <h1 className="truncate text-sm font-black text-slate-900 sm:text-base md:text-lg">
                                            {topbarTitle}
                                        </h1>
                                        {topbarDescription ? (
                                            <p className="truncate text-[11px] font-semibold text-slate-500 sm:text-xs">
                                                {topbarDescription}
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>

                            {/* Utility actions */}
                            <div className="flex flex-1 items-center justify-end gap-2">
                                {user.affiliate_status !== 'approved' && (
                                    /* Referral program CTA */
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                        className="hidden md:block p-[2px] relative overflow-hidden rounded-full group shadow-sm shadow-primary-500/10 hover:shadow-md hover:shadow-primary-500/20 transition-shadow duration-300"
                                    >
                                        {/* Referral CTA animated border */}
                                        <motion.div
                                            className="absolute inset-[-200%] bg-[conic-gradient(from_0deg,transparent_0%,#6d28d9_12%,#8b5cf6_18%,#c084fc_22%,#f5f3ff_25%,#c084fc_28%,#8b5cf6_32%,#6d28d9_38%,transparent_42%)] opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
                                        />

                                        <Link
                                            href={route('referrals')}
                                            className="relative z-10 flex items-center gap-2 px-4 py-2 bg-primary-50 group-hover:bg-white rounded-full transition-all duration-300 active:scale-95"
                                        >
                                            <div className="flex items-center gap-2 text-primary-600">
                                                <motion.div
                                                    animate={{
                                                        rotate: [0, -10, 10, -10, 10, 0],
                                                        scale: [1, 1.1, 1]
                                                    }}
                                                    transition={{
                                                        duration: 2.5,
                                                        repeat: Infinity,
                                                        ease: "easeInOut",
                                                        repeatDelay: 5
                                                    }}
                                                >
                                                    <Gift className="h-4.5 w-4.5" strokeWidth={2.2} />
                                                </motion.div>

                                                <span className="hidden lg:inline-block text-[10px] sm:text-xs font-black tracking-tight uppercase">
                                                    Join our referral program
                                                </span>

                                                <div className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                )}

                                {/* Notifications */}
                                <NotificationDropdown />

                                {/* Version badge */}
                                <div className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-bold border border-primary-100 flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                                    </span>
                                    v1.0.1
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Optional page header */}
                {header && (
                    <header className={`sticky top-16 ${headerZClass} border-b border-slate-300/80 bg-white/90 backdrop-blur-md`}>
                        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                            {header}
                        </div>
                    </header>
                )}

                {/* Page content */}
                <main id="main-content">
                    <div className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
                        {(moduleTabs || moduleTabsAction) && (
                            <div className="mb-4 flex flex-col gap-2 md:mb-5 md:flex-row md:items-center md:justify-between">
                                {moduleTabs ? (
                                    <ModuleTabs moduleTabs={moduleTabs} variant="inline" className="flex-1 min-w-0" />
                                ) : (
                                    <div className="flex-1 min-w-0" />
                                )}
                                {moduleTabsAction ? (
                                    <div className="flex shrink-0 items-center justify-end">
                                        {moduleTabsAction}
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AuthenticatedLayout;
