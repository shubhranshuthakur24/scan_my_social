const INVALID_INSTAGRAM_SEGMENTS = new Set([
  'p',
  'reel',
  'reels',
  'explore',
  'stories',
  'direct',
  'accounts',
  'tv',
  'about',
  'legal',
  'developer',
  'graphql',
  'api',
]);

export interface NormalizedChannelResult {
  normalizedQuery: string;
  isInvalidUrl: boolean;
}

/**
 * Normalizes raw input from users into a clean creator handle.
 * Handles full Instagram URLs, @ prefixes, query parameters, and rejects
 * system/media routes (such as /p/, /reel/, /explore/).
 */
export function normalizeChannelInput(rawInput: string): NormalizedChannelResult {
  const raw = rawInput.trim();
  if (!raw) {
    return { normalizedQuery: '', isInvalidUrl: false };
  }

  const hasProtocol = /^https?:\/\//i.test(raw);
  const looksLikeInstagramUrl =
    /^www\.instagram\.com\//i.test(raw) ||
    /^instagram\.com\//i.test(raw) ||
    raw.toLowerCase().includes('instagram.com/');

  if (hasProtocol || looksLikeInstagramUrl) {
    try {
      const parsed = new URL(hasProtocol ? raw : `https://${raw}`);
      if (parsed.hostname.toLowerCase().includes('instagram.com')) {
        const segments = parsed.pathname
          .split('/')
          .map((s) => s.trim())
          .filter(Boolean);

        const firstSegment = segments[0]?.toLowerCase();
        if (!firstSegment || INVALID_INSTAGRAM_SEGMENTS.has(firstSegment)) {
          return { normalizedQuery: '', isInvalidUrl: true };
        }

        return {
          normalizedQuery: firstSegment.replace(/^@+/, '').trim(),
          isInvalidUrl: false,
        };
      }
    } catch {
      return { normalizedQuery: '', isInvalidUrl: true };
    }
  }

  const direct = raw.split(/[?#]/)[0].replace(/^@+/, '').replace(/\/+$/g, '').trim();
  return { normalizedQuery: direct, isInvalidUrl: false };
}
