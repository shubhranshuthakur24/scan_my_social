import 'server-only';
import { cache } from 'react';
import { PublicWebPageDto } from './webPagesService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function buildProxyHeaders(clientIp: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const proxySecret = process.env.INTERNAL_PROXY_KEY;
  if (proxySecret) {
    headers['X-Proxy-Secret'] = proxySecret;
  }

  // Only forward X-Client-IP if we have a trustworthy, non-empty platform IP
  if (clientIp && clientIp.trim() !== '') {
    headers['X-Client-IP'] = clientIp.trim();
  }

  return headers;
}

export type PublicWebPageServerResult =
  | { kind: 'success'; web_page: PublicWebPageDto }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

/**
 * Deduplicated server-side fetcher for public web pages.
 * React cache() ensures generateMetadata() and PublicWebPage() share a single HTTP request per visit.
 */
export const getPublicWebPageServer = cache(async (
  username: string,
  slug: string,
  clientIp: string | null
): Promise<PublicWebPageServerResult> => {
  try {
    const res = await fetch(`${API_BASE_URL}/public/web-pages/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`, {
      headers: buildProxyHeaders(clientIp),
      cache: 'no-store',
    });

    if (res.status === 404) {
      return { kind: 'not_found' };
    }

    if (!res.ok) {
      return { kind: 'error', message: `Server error (${res.status})` };
    }

    const data = await res.json();
    if (!data || !data.web_page) {
      return { kind: 'not_found' };
    }

    return { kind: 'success', web_page: data.web_page };
  } catch (err) {
    console.error('Error in getPublicWebPageServer:', err);
    return { kind: 'error', message: err instanceof Error ? err.message : 'Network failure' };
  }
});

export async function forwardPublicWebPageSubmitServer(
  username: string,
  slug: string,
  blockId: string,
  payload: Record<string, unknown>,
  clientIp: string | null
): Promise<{ success: boolean; message?: string; errors?: Record<string, string[]> }> {
  const headers = buildProxyHeaders(clientIp) as Record<string, string>;
  headers['Content-Type'] = 'application/json';

  const res = await fetch(
    `${API_BASE_URL}/public/web-pages/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/submit/${encodeURIComponent(blockId)}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store',
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      message: data.message || 'Submission failed.',
      errors: data.errors,
    };
  }

  return {
    success: true,
    message: data.message || 'Thanks, your response has been recorded.',
  };
}
