'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setError('Meta authorization was cancelled or failed.');
      setTimeout(() => {
        router.push('/instagram/profile');
      }, 3000);
      return;
    }

    let apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    if (!apiBase) {
      if (typeof window !== 'undefined' && window.location.hostname.includes('scanmysocial.com')) {
        apiBase = 'https://scanmysocial.com/api/v1';
      } else {
        apiBase = 'http://localhost:8000/api/v1';
      }
    }

    const backendCallbackUrl = `${apiBase}/auth/instagram/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;

    window.location.href = backendCallbackUrl;
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 max-w-md shadow-xs">
          <p className="text-sm font-bold text-rose-700">{error}</p>
          <p className="text-xs text-slate-500 mt-2">Redirecting to Instagram profile page...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <h2 className="text-base font-black text-slate-900">Connecting your Instagram account...</h2>
          <p className="text-xs font-medium text-slate-500">Completing Meta OAuth authentication with ScanMySocial backend.</p>
        </div>
      )}
    </div>
  );
}

export default function InstagramOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-xs font-bold text-slate-700 mt-3">Loading OAuth Callback Handler...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
