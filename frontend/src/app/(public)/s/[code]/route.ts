import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const INTERNAL_PROXY_KEY = process.env.INTERNAL_PROXY_KEY || '';

function renderNotFoundHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Link Not Available | Scan My Social</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1.25rem;
      padding: 2.5rem 2rem;
      max-width: 28rem;
      width: 100%;
      text-align: center;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background-color: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.025em;
      margin-bottom: 0.75rem;
    }
    p {
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 1.75rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0.625rem 1.5rem;
      border-radius: 0.75rem;
      background-color: #4f46e5;
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 700;
      text-decoration: none;
      transition: background-color 0.15s ease;
      width: 100%;
    }
    .btn:hover {
      background-color: #4338ca;
    }
    .footer {
      margin-top: 1.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">404 • Not Found</div>
    <h1>Link Unavailable</h1>
    <p>${message}</p>
    <a href="https://scanmysocial.com" class="btn">Go to Scan My Social</a>
    <div class="footer">Scan My Social &bull; Bio Links &amp; URL Shortener</div>
  </div>
</body>
</html>`;
}

function createHtmlNotFoundResponse(message: string) {
  return new NextResponse(renderNotFoundHtml(message), {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code || !/^[a-z0-9-]+$/i.test(code)) {
    return createHtmlNotFoundResponse('The link you are trying to visit is invalid or has expired.');
  }

  // 1. Resolve trusted platform-derived client IP
  // Precedence: Cloudflare cf-connecting-ip -> Vercel x-vercel-forwarded-for (first IP in chain) -> request.ip
  const cfIp = request.headers.get('cf-connecting-ip');
  const vercelChain = request.headers.get('x-vercel-forwarded-for');
  const vercelIp = vercelChain ? vercelChain.split(',')[0]?.trim() : null;
  const trustedClientIp = cfIp || vercelIp || '';

  // 2. Build whitelisted headers only (never forward browser cookies or authorization)
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';

  const forwardHeaders: Record<string, string> = {
    'User-Agent': userAgent,
    Referer: referer,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  if (trustedClientIp) {
    forwardHeaders['X-Client-IP'] = trustedClientIp;
  }

  if (INTERNAL_PROXY_KEY) {
    forwardHeaders['X-Proxy-Secret'] = INTERNAL_PROXY_KEY;
  }

  const targetUrl = `${API_BASE_URL}/public/s/${encodeURIComponent(code)}`;

  try {
    // 3. Query authoritative Laravel public redirect endpoint
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: forwardHeaders,
      redirect: 'manual', // Do not automatically follow redirect; capture 302 location
      cache: 'no-store',
    });

    // 4. Open-redirect defense: Ensure response is a redirect and destination is valid HTTP/HTTPS
    const destination = res.headers.get('location');
    const isRedirectStatus = [301, 302, 303, 307, 308].includes(res.status);

    if (isRedirectStatus && destination && /^https?:\/\//i.test(destination)) {
      return NextResponse.redirect(destination, 302);
    }

    if (res.status === 404) {
      return createHtmlNotFoundResponse('This shortened link does not exist, has expired, or is currently inactive.');
    }

    return createHtmlNotFoundResponse('This shortened link is currently unavailable.');
  } catch {
    return createHtmlNotFoundResponse('This shortened link could not be reached. Please check back later.');
  }
}
