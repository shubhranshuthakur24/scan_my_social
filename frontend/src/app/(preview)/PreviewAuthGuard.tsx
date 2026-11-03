'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthSession } from '@/lib/api/authService';
import { useAuthStore } from '@/lib/store/useAuthStore';
import WebPagesSkeleton from '@/components/web-pages/WebPagesSkeleton';

export default function PreviewAuthGuard({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    let active = true;
    getAuthSession().then((session) => {
      if (!active) return;
      if (!session.isAuthenticated || !session.user) {
        router.push('/login');
      } else {
        const token = localStorage.getItem('viralyzer_token') || 'valid_token';
        setAuth(
          {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: (session.user.role as any) || 'user',
            plan: 'pro',
            avatar: session.user.avatar,
          },
          token
        );
        setAuthorized(true);
      }
    });

    return () => {
      active = false;
    };
  }, [router, setAuth]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-900 p-8 flex items-center justify-center">
        <div className="w-full max-w-4xl opacity-50">
          <WebPagesSkeleton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
