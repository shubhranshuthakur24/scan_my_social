import React from 'react';
import {
  InstagramIcon,
  YoutubeIcon,
  TwitterIcon,
  LinkedinIcon,
  FacebookIcon,
  TiktokIcon,
  ThreadsIcon,
  PinterestIcon,
  SnapchatIcon,
} from './BioIcons';

export interface SocialPlatformConfig {
  key: string;
  name: string;
  icon: string;
  IconComponent: React.ComponentType<{ size?: number; className?: string }>;
  identifierLabel: string;
  placeholder: string;
  prefix?: string;
  domains: string[];
  buildUrl: (identifier: string) => string;
  extractIdentifier?: (raw: string) => string;
}

function cleanInput(value: string): string {
  let cleaned = value.trim();
  // Strip common URL wrappers or protocol
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?/, '');
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

export const SOCIAL_PLATFORMS: SocialPlatformConfig[] = [
  {
    key: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    IconComponent: InstagramIcon,
    identifierLabel: 'Username',
    placeholder: 'ravikant',
    prefix: '@',
    domains: ['instagram.com', 'instagr.am'],
    buildUrl: (identifier: string) => {
      let cleaned = cleanInput(identifier);
      cleaned = cleaned.replace(/^instagram\.com\//i, '');
      cleaned = cleaned.replace(/^@+/, '');
      return `https://instagram.com/${cleaned}`;
    },
  },
  {
    key: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    IconComponent: YoutubeIcon,
    identifierLabel: 'Channel / Handle',
    placeholder: '@creatorchannel',
    prefix: '@',
    domains: ['youtube.com', 'youtu.be'],
    buildUrl: (identifier: string) => {
      let cleaned = cleanInput(identifier);
      cleaned = cleaned.replace(/^youtube\.com\//i, '');
      // If user provided a path like @channel or c/channel or channel
      if (!cleaned.startsWith('@') && !cleaned.startsWith('c/') && !cleaned.startsWith('channel/')) {
        cleaned = `@${cleaned}`;
      }
      return `https://youtube.com/${cleaned}`;
    },
  },
  {
    key: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    IconComponent: FacebookIcon,
    identifierLabel: 'Username / Page Name',
    placeholder: 'yourpage',
    prefix: '/',
    domains: ['facebook.com', 'fb.com'],
    buildUrl: (identifier: string) => {
      let cleaned = cleanInput(identifier);
      cleaned = cleaned.replace(/^facebook\.com\//i, '');
      cleaned = cleaned.replace(/^fb\.com\//i, '');
      cleaned = cleaned.replace(/^@+/, '');
      return `https://facebook.com/${cleaned}`;
    },
  },
  {
    key: 'twitter',
    name: 'X (Twitter)',
    icon: 'twitter',
    IconComponent: TwitterIcon,
    identifierLabel: 'Username',
    placeholder: 'username',
    prefix: '@',
    domains: ['x.com', 'twitter.com'],
    buildUrl: (identifier: string) => {
      let cleaned = cleanInput(identifier);
      cleaned = cleaned.replace(/^(x|twitter)\.com\//i, '');
      cleaned = cleaned.replace(/^@+/, '');
      return `https://x.com/${cleaned}`;
    },
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    IconComponent: LinkedinIcon,
    identifierLabel: 'Profile / Company Slug',
    placeholder: 'in/username',
    prefix: 'in/',
    domains: ['linkedin.com'],
    buildUrl: (identifier: string) => {
      let cleaned = cleanInput(identifier);
      cleaned = cleaned.replace(/^linkedin\.com\//i, '');
      cleaned = cleaned.replace(/^@+/, '');
      if (!cleaned.startsWith('in/') && !cleaned.startsWith('company/')) {
        cleaned = `in/${cleaned}`;
      }
      return `https://linkedin.com/${cleaned}`;
    },
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    IconComponent: TiktokIcon,
    identifierLabel: 'Username',
    placeholder: '@creator',
    prefix: '@',
    domains: ['tiktok.com'],
    buildUrl: (identifier: string) => {
      let cleaned = cleanInput(identifier);
      cleaned = cleaned.replace(/^tiktok\.com\//i, '');
      if (!cleaned.startsWith('@')) {
        cleaned = `@${cleaned}`;
      }
      return `https://tiktok.com/${cleaned}`;
    },
  },
  {
    key: 'threads',
    name: 'Threads',
    icon: 'threads',
    IconComponent: ThreadsIcon,
    identifierLabel: 'Username',
    placeholder: '@username',
    prefix: '@',
    domains: ['threads.net'],
    buildUrl: (identifier: string) => {
      let cleaned = cleanInput(identifier);
      cleaned = cleaned.replace(/^threads\.net\//i, '');
      if (!cleaned.startsWith('@')) {
        cleaned = `@${cleaned}`;
      }
      return `https://threads.net/${cleaned}`;
    },
  },
  {
    key: 'pinterest',
    name: 'Pinterest',
    icon: 'pinterest',
    IconComponent: PinterestIcon,
    identifierLabel: 'Username',
    placeholder: 'username',
    prefix: '@',
    domains: ['pinterest.com'],
    buildUrl: (identifier: string) => {
      let cleaned = cleanInput(identifier);
      cleaned = cleaned.replace(/^pinterest\.com\//i, '');
      cleaned = cleaned.replace(/^@+/, '');
      return `https://pinterest.com/${cleaned}`;
    },
  },
  {
    key: 'snapchat',
    name: 'Snapchat',
    icon: 'snapchat',
    IconComponent: SnapchatIcon,
    identifierLabel: 'Username',
    placeholder: 'username',
    prefix: 'add/',
    domains: ['snapchat.com'],
    buildUrl: (identifier: string) => {
      let cleaned = cleanInput(identifier);
      cleaned = cleaned.replace(/^snapchat\.com\/add\//i, '');
      cleaned = cleaned.replace(/^snapchat\.com\//i, '');
      cleaned = cleaned.replace(/^add\//i, '');
      cleaned = cleaned.replace(/^@+/, '');
      return `https://snapchat.com/add/${cleaned}`;
    },
  },
];

export function isPlatformAlreadyAdded(platform: SocialPlatformConfig, existingLinks: Array<{ icon?: string | null; url: string }>): boolean {
  return existingLinks.some((link) => {
    // Check by icon match
    if (link.icon) {
      if (link.icon.toLowerCase() === platform.icon.toLowerCase()) return true;
      if (platform.key === 'twitter' && (link.icon === 'x' || link.icon === 'twitter')) return true;
    }
    // Check by url domain match
    try {
      const parsedUrl = new URL(link.url);
      const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
      return platform.domains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
    } catch {
      return false;
    }
  });
}

export function detectPlatform(link: { icon?: string | null; url: string }): SocialPlatformConfig | undefined {
  if (link.icon) {
    const found = SOCIAL_PLATFORMS.find((p) => p.icon.toLowerCase() === link.icon?.toLowerCase());
    if (found) return found;
    if (link.icon === 'x') return SOCIAL_PLATFORMS.find((p) => p.key === 'twitter');
  }
  try {
    const parsed = new URL(link.url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    return SOCIAL_PLATFORMS.find((p) => p.domains.some((d) => host === d || host.endsWith(`.${d}`)));
  } catch {
    return undefined;
  }
}

export function extractHandleFromUrl(platform: SocialPlatformConfig, url: string): string {
  try {
    let cleaned = url.trim().replace(/^https?:\/\/(www\.)?/, '');
    for (const d of platform.domains) {
      const reg = new RegExp(`^${d}/`, 'i');
      cleaned = cleaned.replace(reg, '');
    }
    if (platform.key === 'snapchat') cleaned = cleaned.replace(/^add\//i, '');
    if (platform.key === 'linkedin') cleaned = cleaned.replace(/^in\//i, '');
    return cleaned;
  } catch {
    return url;
  }
}

