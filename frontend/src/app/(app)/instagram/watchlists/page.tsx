'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InstagramWatchlistsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/content-library/watchlists');
  }, [router]);

  return null;
}
