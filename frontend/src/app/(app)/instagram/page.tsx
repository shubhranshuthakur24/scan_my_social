'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InstagramIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/instagram/profile');
  }, [router]);

  return null;
}
