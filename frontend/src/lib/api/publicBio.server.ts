import 'server-only';
import { cache } from 'react';
import { PublicBioDTO } from './socialBioLinksService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function buildProxyHeaders(clientIp: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const proxySecret = process.env.INTERNAL_PROXY_KEY;
  if (proxySecret) {
    headers['X-Proxy-Secret'] = proxySecret;
  }

  if (clientIp && clientIp.trim() !== '') {
    headers['X-Client-IP'] = clientIp.trim();
  }

  return headers;
}

/**
 * Deduplicated server-side fetcher for public bio cards.
 * React cache() ensures generateMetadata() and PublicBioUsernamePage() share a single HTTP request per visit.
 */
export const getPublicBioServer = cache(
  async (
    username: string,
    slug?: string,
    clientIp: string | null = null
  ): Promise<PublicBioDTO | null> => {
    // Sanitize any leading '@' if passed in params
    const cleanUsername = username.replace(/^@/, '');
    const path = slug
      ? `${API_BASE_URL}/public/bio/${encodeURIComponent(cleanUsername)}/${encodeURIComponent(slug)}`
      : `${API_BASE_URL}/public/bio/${encodeURIComponent(cleanUsername)}`;

    try {
      const res = await fetch(path, {
        headers: buildProxyHeaders(clientIp),
        cache: 'no-store',
      });

      if (res.status === 404) {
        return null;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch public bio (${res.status})`);
      }

      return res.json();
    } catch (err) {
      console.error('Error in getPublicBioServer:', err);
      return null;
    }
  }
);
