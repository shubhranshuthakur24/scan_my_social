import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getTrustedClientIp } from '@/lib/server/trustedClientIp';
import { getPublicBioServer } from '@/lib/api/publicBio.server';
import PublicBioPage from '@/components/social-bio-links/public/PublicBioPage';

interface PageProps {
  params: Promise<{
    username: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const headerStore = await headers();
  const clientIp = getTrustedClientIp(headerStore);

  const cleanUsername = username.replace(/^@/, '');
  const data = await getPublicBioServer(cleanUsername, undefined, clientIp);

  if (!data) {
    return {
      title: `@${cleanUsername} — Bio Page Unavailable`,
      description: 'This Social Bio Links page could not be found or is private.',
    };
  }

  const title = `${data.displayName} (@${data.username}) — Scan My Social`;
  const description = data.bio || `${data.displayName}'s official bio links.`;
  const image = data.avatarUrl || data.bannerUrl || '/images/logo.webp';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [
        {
          url: image,
          alt: data.displayName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function PublicBioUsernamePage({ params }: PageProps) {
  const { username } = await params;
  const headerStore = await headers();
  const clientIp = getTrustedClientIp(headerStore);

  const cleanUsername = username.replace(/^@/, '');
  const data = await getPublicBioServer(cleanUsername, undefined, clientIp);

  if (!data) {
    notFound();
  }

  return <PublicBioPage data={data} />;
}
