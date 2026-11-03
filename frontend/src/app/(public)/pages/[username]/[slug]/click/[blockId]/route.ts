import { NextRequest, NextResponse } from 'next/server';
import { getTrustedClientIp } from '@/lib/server/trustedClientIp';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const INTERNAL_PROXY_KEY = process.env.INTERNAL_PROXY_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; slug: string; blockId: string }> }
) {
  const { username, slug, blockId } = await params;

  if (!username || !slug || !blockId) {
    return new NextResponse('Invalid redirect request.', { status: 404 });
  }

  const target = request.nextUrl.searchParams.get('target') === 'secondary' ? 'secondary' : 'primary';
  const trustedClientIp = getTrustedClientIp(request.headers);

  const forwardHeaders: Record<string, string> = {
    'User-Agent': request.headers.get('user-agent') || '',
    Referer: request.headers.get('referer') || '',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  if (trustedClientIp) {
    forwardHeaders['X-Client-IP'] = trustedClientIp;
  }

  if (INTERNAL_PROXY_KEY) {
    forwardHeaders['X-Proxy-Secret'] = INTERNAL_PROXY_KEY;
  }

  const targetApiUrl = `${API_BASE_URL}/public/web-pages/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/click/${encodeURIComponent(blockId)}?target=${target}`;

  try {
    const res = await fetch(targetApiUrl, {
      method: 'GET',
      headers: forwardHeaders,
      redirect: 'manual',
      cache: 'no-store',
    });

    const destination = res.headers.get('location');
    const isRedirectStatus = [301, 302, 303, 307, 308].includes(res.status);

    if (isRedirectStatus && destination) {
      // Validate safe redirect: starts with http/https or relative path
      if (/^https?:\/\//i.test(destination) || (destination.startsWith('/') && !destination.startsWith('//'))) {
        return NextResponse.redirect(destination, 302);
      }

      // Safeguard: If destination is an anchor, redirect back to the page with the hash
      if (destination.startsWith('#')) {
        const safePageUrl = new URL(`/pages/${encodeURIComponent(username)}/${encodeURIComponent(slug)}${destination}`, request.nextUrl.origin);
        return NextResponse.redirect(safePageUrl.toString(), 302);
      }
    }

    if (res.status === 404) {
      return new NextResponse('Page or section not found.', { status: 404 });
    }

    return new NextResponse('Redirect destination unavailable.', { status: 502 });
  } catch (err) {
    console.error('Error proxying web page click redirect:', err);
    return new NextResponse('Redirect service unavailable.', { status: 503 });
  }
}
