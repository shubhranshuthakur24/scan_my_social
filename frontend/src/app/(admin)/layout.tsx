'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { getAuthSession } from '@/lib/api/authService';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    getAuthSession().then((session) => {
      if (!session.isAuthenticated || !session.user) {
        router.push('/login');
      } else {
        const token = localStorage.getItem('viralyzer_token') || 'valid_token';
        setAuth(
          {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: (session.user.role as any) || 'super_admin',
            plan: 'pro',
            avatar: session.user.avatar,
          },
          token
        );
        setIsCheckingAuth(false);
      }
    });
  }, [router, setAuth]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-xs font-bold tracking-wider uppercase text-purple-400">Verifying admin session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased">
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        desktopCollapsed={desktopCollapsed}
        onToggleDesktop={() => setDesktopCollapsed(!desktopCollapsed)}
      />
      <Header
        onOpenMobileSidebar={() => setMobileOpen(true)}
        desktopCollapsed={desktopCollapsed}
      />
      <main
        className={`transition-all duration-300 min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 ${
          desktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
