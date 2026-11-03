'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InstagramChannelsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/content-library/channels');
  }, [router]);

  return null;
}
