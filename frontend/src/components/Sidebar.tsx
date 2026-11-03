'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileCode,
  Layers,
  FormInput,
  Briefcase,
  Camera,
  Film,
  Calendar,
  Settings,
  Shield,
  User,
  LogOut,
  ChevronRight,
  Sparkles,
  Award,
  X,
  Bell,
  Landmark,
  Tv,
  Boxes,
  MessageSquare,
  Globe,
  Volume2,
} from 'lucide-react';

import { useAuthStore } from '@/lib/store/useAuthStore';
import { useSocialBioStore } from '@/lib/store/useSocialBioStore';
import { useLinkShortStore } from '@/lib/store/useLinkShortStore';
import { useSocialBioAnalyticsStore } from '@/lib/store/useSocialBioAnalyticsStore';
import { logoutUser } from '@/lib/api/authService';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  desktopCollapsed?: boolean;
  onToggleDesktop?: () => void;
  user?: {
    name: string;
    email: string;
    role?: string;
    is_super_admin?: boolean;
    plan?: string;
  };
}

export default function Sidebar({
  mobileOpen = false,
  onCloseMobile = () => { },
  desktopCollapsed = false,
  onToggleDesktop = () => { },
  user,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: storeUser, logout: storeLogout } = useAuthStore();
  const currentUser = user || storeUser || { name: 'User', email: '' };

  const handleLogout = async () => {
    await logoutUser();
    storeLogout();
    useSocialBioStore.getState().resetStore();
    useLinkShortStore.getState().resetStore();
    useSocialBioAnalyticsStore.getState().resetStore();
    router.push('/login');
  };

  const isSuperAdmin = Boolean((currentUser as any).is_super_admin || currentUser.role === 'super_admin');
  const isAdminRoute = pathname.startsWith('/admin');
  const [mode, setMode] = useState<'user' | 'admin'>(isAdminRoute ? 'admin' : 'user');

  useEffect(() => {
    if (isSuperAdmin && isAdminRoute) {
      setMode('admin');
    }
  }, [pathname, isAdminRoute, isSuperAdmin]);

  const shouldUseCollapsedLayout = desktopCollapsed && !mobileOpen;

  const userNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Content Library', href: '/content-library/videos', icon: Film },
    { name: 'Instagram', href: '/instagram', icon: Camera },
    { name: 'Watermark Remover', href: '/video-tools/watermark-remover', icon: Sparkles },
    { name: 'Audio Noise Remover', href: '/audio-tools/noise-remover', icon: Volume2 },
    { name: 'Scripting', href: '/scripting', icon: FileCode },
    { name: 'Social Bio Links', href: '/social-bio-links', icon: Layers },
    { name: 'Web Pages', href: '/web-pages', icon: Globe },
    { name: 'Forms', href: '/lead-forms', icon: FormInput },
    { name: 'CRM', href: '/crm', icon: Briefcase },
    { name: 'My Calendar', href: '/calendar', icon: Calendar },
  ];

  const adminNavItems = isSuperAdmin
    ? [
      { name: 'Admin Console', href: '/admin/home', icon: LayoutDashboard },
      { name: 'Channels', href: '/admin/channels', icon: Tv },
      { name: 'Payout Requests', href: '/admin/payouts', icon: Landmark },
      { name: 'Manage Prompts', href: '/admin/prompts', icon: Sparkles },
      { name: 'Script Intelligence', href: '/admin/script-intelligence', icon: FileCode },
      { name: 'Affiliates', href: '/admin/affiliates', icon: Briefcase },
      { name: 'Push Notifications', href: '/admin/notifications', icon: Bell },
    ]
    : [];

  const navItems = mode === 'admin' && isSuperAdmin ? adminNavItems : userNavItems;

  const manageItems =
    mode === 'user'
      ? [
        { name: 'Settings', href: '/settings', icon: Settings },
        { name: 'Affiliate Program', href: '/affiliate', icon: Award },
        { name: 'UI Components', href: '/components', icon: Boxes },
      ]
      : [];

  const renderNavItem = (item: { name: string; href: string; icon: React.ElementType }) => {
    const IconComponent = item.icon;
    const isContentLibraryMatch =
      item.href === '/content-library/videos' && pathname.startsWith('/content-library');
    const isWatermarkMatch =
      item.href === '/video-tools/watermark-remover' &&
      (pathname.startsWith('/video-tools/watermark-remover') ||
        pathname.startsWith('/image-tools/watermark-remover'));

    const isActive =
      isContentLibraryMatch ||
      isWatermarkMatch ||
      pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href));

    const baseClasses = `group flex items-center gap-3 transition-all duration-150 relative overflow-hidden outline-none ${shouldUseCollapsedLayout
      ? 'w-10 h-10 lg:justify-center lg:mx-auto rounded-xl'
      : 'px-3.5 py-2.5 rounded-xl'
      }`;

    const activeClasses =
      mode === 'admin'
        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
        : 'bg-primary-600 text-white shadow-md shadow-primary-600/20';

    const inactiveClasses = 'text-slate-500 hover:bg-primary-50/60 hover:text-slate-900';

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={() => mobileOpen && onCloseMobile()}
        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} text-[13px] font-semibold`}
        title={shouldUseCollapsedLayout ? item.name : undefined}
      >
        <IconComponent size={18} className="shrink-0" />
        <span className={shouldUseCollapsedLayout ? 'lg:sr-only' : ''}>{item.name}</span>
        {isActive && !shouldUseCollapsedLayout && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white/40 rounded-l-full" />
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header / Logo */}
      <div
        className={`py-5 flex flex-col gap-4 shrink-0 border-b border-slate-100 mb-2 ${shouldUseCollapsedLayout ? 'px-2 items-center' : 'px-5'
          }`}
      >
        <div
          className={`flex items-center gap-3 ${shouldUseCollapsedLayout ? 'justify-center' : 'justify-between'
            }`}
        >
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            <img
              src="/images/logo.webp"
              alt="Scan My Social"
              className="w-10 h-10 rounded-xl object-cover  shadow-primary-500/25 shrink-0"
            />
            {!shouldUseCollapsedLayout && (
              <img
                src="/images/ScanMySocial.avif"
                alt="ScanMySocial"
                className="h-6 w-auto brightness-0 object-contain"
              />
            )}
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Switcher */}
        {isSuperAdmin && !shouldUseCollapsedLayout && (
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 relative">
            <button
              onClick={() => {
                setMode('user');
                router.push('/dashboard');
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 cursor-pointer ${mode === 'user'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              App View
            </button>
            <button
              onClick={() => {
                setMode('admin');
                router.push('/admin/home');
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 cursor-pointer ${mode === 'admin'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Admin Console
            </button>
          </div>
        )}
      </div>

      {/* Main Nav */}
      <nav className={`space-y-1 flex flex-col shrink-0 ${shouldUseCollapsedLayout ? 'px-2 items-center' : 'px-4'}`}>
        {!shouldUseCollapsedLayout && (
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-3 mb-1">
            {mode === 'admin' ? 'Admin Navigation' : 'Main Menu'}
          </div>
        )}
        {navItems.map(renderNavItem)}
      </nav>

      {/* Upgrade Banner */}
      {mode === 'user' && !shouldUseCollapsedLayout && currentUser.plan === 'free' && (
        <div className="px-4 mt-4 shrink-0">
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-600 to-rose-500 p-3.5 shadow-lg text-white">
            <div className="flex items-center justify-between gap-2 relative z-10">
              <div>
                <h4 className="text-xs font-bold leading-tight">Supercharge Growth</h4>
                <p className="text-[11px] opacity-90 leading-tight">Unlock AI Scraping & Analytics.</p>
              </div>
              <Link
                href="/settings"
                className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-extrabold text-primary-700 shadow-sm hover:bg-slate-50"
              >
                PRO
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Manage Section */}
      {manageItems.length > 0 && (
        <div className={`space-y-1 mt-4 shrink-0 ${shouldUseCollapsedLayout ? 'px-2 items-center' : 'px-4'}`}>
          {!shouldUseCollapsedLayout && (
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-3 mb-1">Manage</div>
          )}
          {manageItems.map(renderNavItem)}
        </div>
      )}

      <div className="flex-1" />

      {/* User Info / Logout */}
      <div className="p-3 border-t border-slate-100 shrink-0 bg-white">
        {!shouldUseCollapsedLayout ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs shrink-0">
                {(currentUser.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name || 'User'}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="w-10 h-10 mx-auto flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-out lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-30 hidden h-screen border-r border-slate-200 bg-white/90 backdrop-blur-md transition-all duration-300 ease-out lg:block ${desktopCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        {sidebarContent}
        <button
          type="button"
          onClick={onToggleDesktop}
          className="absolute -right-3.5 top-6 z-40 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-transform"
          aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight size={14} className={`transition-transform ${desktopCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>
    </>
  );
}
