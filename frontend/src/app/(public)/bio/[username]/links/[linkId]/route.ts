import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; linkId: string }> }
) {
  const { username, linkId } = await params;

  const targetUrl = `${API_BASE_URL}/public/bio/${encodeURIComponent(username)}/links/${encodeURIComponent(linkId)}/redirect`;

  try {
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '';
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';

    // Request Laravel redirect endpoint with redirect: 'manual' to capture 302 Location
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'X-Forwarded-For': clientIp,
        'User-Agent': userAgent,
        Referer: referer,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'manual',
      cache: 'no-store',
    });

    // If Laravel returned a redirect (301, 302, 303, 307, 308)
    const destination = res.headers.get('location');
    if (destination) {
      return NextResponse.redirect(destination, 302);
    }

    if (res.status === 404) {
      return NextResponse.redirect(new URL(`/@${username}`, request.url), 302);
    }

    return NextResponse.redirect(new URL(`/@${username}`, request.url), 302);
  } catch {
    return NextResponse.redirect(new URL(`/@${username}`, request.url), 302);
  }
}
