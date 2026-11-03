/**
 * Resolves the root public site origin for bio links, short links, and public pages.
 * Enforces https://scanmysocial.com unless running in a local development browser (localhost / 127.0.0.1).
 */
export function getPublicSiteUrl(): string {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_PUBLIC_SITE_URL || 'https://scanmysocial.com';
}

/**
 * Builds a complete, canonical public URL from a path (e.g. '/@username' or '/s/xyz').
 */
export function buildPublicCardUrl(path: string | null | undefined): string {
  if (!path) return '';
  const trimmed = path.trim();
  if (!trimmed) return '';

  // Reject unsafe executable schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return '';
  }

  // Reject protocol-relative URLs (//example.com) to prevent unintended open redirects
  if (trimmed.startsWith('//')) {
    return '';
  }

  // If already a valid absolute HTTP or HTTPS URL, return safely as-is without re-prefixing
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const base = getPublicSiteUrl().replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return `${base}${cleanPath}`;
}
