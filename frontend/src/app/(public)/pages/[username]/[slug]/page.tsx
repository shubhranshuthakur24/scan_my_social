import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getTrustedClientIp } from '@/lib/server/trustedClientIp';
import { getPublicWebPageServer } from '@/lib/api/publicWebPages.server';
import { PublicWebPageDto } from '@/lib/api/webPagesService';
import WebPageCanvas from '@/components/web-pages/WebPageCanvas';

interface PageProps {
  params: Promise<{
    username: string;
    slug: string;
  }>;
}

function extractPageImage(page: PublicWebPageDto, siteOrigin: string): string | null {
  const sections = Array.isArray(page.sections) ? page.sections : [];

  // 1. Try to find Hero image
  const heroSection = sections.find((s) => s.type === 'hero' && s.content?.image_url);
  if (heroSection?.content?.image_url) {
    const img = String(heroSection.content.image_url).trim();
    if (img !== '') {
      return img.startsWith('http') ? img : `${siteOrigin}${img.startsWith('/') ? '' : '/'}${img}`;
    }
  }

  // 2. Try to find Image section
  const imageSection = sections.find((s) => s.type === 'image' && s.content?.image_url);
  if (imageSection?.content?.image_url) {
    const img = String(imageSection.content.image_url).trim();
    if (img !== '') {
      return img.startsWith('http') ? img : `${siteOrigin}${img.startsWith('/') ? '' : '/'}${img}`;
    }
  }

  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const headerStore = await headers();
  const clientIp = getTrustedClientIp(headerStore);
  const siteOrigin = process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || 'https://scanmysocial.com';
  const canonicalUrl = `${siteOrigin}/pages/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;

  const res = await getPublicWebPageServer(username, slug, clientIp);
  if (res.kind !== 'success' || !res.web_page.is_published) {
    return {
      title: 'Page Not Found',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const page = res.web_page;
  const title = `${page.title} — @${username}`;
  const description = page.description || page.title;
  const ogImageUrl = extractPageImage(page, siteOrigin);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: page.title,
      description,
      type: 'website',
      url: canonicalUrl,
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, alt: page.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

export default async function PublicWebPage({ params }: PageProps) {
  const { username, slug } = await params;
  const headerStore = await headers();
  const clientIp = getTrustedClientIp(headerStore);

  const res = await getPublicWebPageServer(username, slug, clientIp);

  if (res.kind === 'not_found' || (res.kind === 'success' && !res.web_page.is_published)) {
    notFound();
  }

  if (res.kind === 'error') {
    throw new Error('PublicWebPageLoadFailure');
  }

  return (
    <div className="min-h-screen w-full">
      <WebPageCanvas webPage={res.web_page} mode="public" />
    </div>
  );
}
