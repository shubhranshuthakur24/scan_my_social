'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InstagramChannelDetailRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/content-library/channels/${params.id}`);
    } else {
      router.replace('/content-library/channels');
    }
  }, [params, router]);

  return null;
}
