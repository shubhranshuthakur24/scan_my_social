import 'server-only';

/**
 * Extracts the trusted client IP from platform-specific headers (Cloudflare, Vercel).
 * Used across Server Components and Route Handlers.
 * Returns null if no trusted platform IP could be derived.
 */
export function getTrustedClientIp(headers: Headers): string | null {
  // 1. Cloudflare edge header (canonical)
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim() !== '') {
    return cfIp.trim();
  }

  // 2. Vercel edge header (first IP in chain is client IP)
  const vercelChain = headers.get('x-vercel-forwarded-for');
  if (vercelChain && vercelChain.trim() !== '') {
    const firstIp = vercelChain.split(',')[0]?.trim();
    if (firstIp && firstIp !== '') {
      return firstIp;
    }
  }

  // 3. Fallback: standard x-real-ip if set by trusted reverse proxy
  const realIp = headers.get('x-real-ip');
  if (realIp && realIp.trim() !== '') {
    return realIp.trim();
  }

  return null;
}
