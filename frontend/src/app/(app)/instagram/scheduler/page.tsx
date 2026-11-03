'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SchedulerRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/instagram/calendar/scheduler${qs ? `?${qs}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-500 font-semibold">Redirecting to Calendar Scheduler...</p>
      </div>
    </div>
  );
}

export default function DeprecatedSchedulerPage() {
  return (
    <Suspense fallback={null}>
      <SchedulerRedirect />
    </Suspense>
  );
}
