'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { getAuthSession } from '@/lib/api/authService';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
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
            bio: session.user.bio || '',
            role: (session.user.role === 'super_admin' ? 'super_admin' : 'user'),
            plan: 'pro',
            avatar: session.user.avatar,
          },
          token
        );
      }
    });
  }, [router, setAuth]);

  return (
    <div className="min-h-screen bg-mist font-sans text-slate-900 antialiased">
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
        className={`transition-all duration-300 min-h-[calc(100vh-4rem)] px-5 sm:px-8 py-6 sm:py-8 ${
          desktopCollapsed ? 'lg:pl-28 lg:pr-10' : 'lg:pl-72 lg:pr-10'
        }`}
      >
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
