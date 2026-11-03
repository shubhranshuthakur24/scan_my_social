'use client';

import React from 'react';
import {
  Globe,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  Music,
  Video,
  FileText,
  BookOpen,
  Zap,
  Sparkles,
} from 'lucide-react';

export const InstagramIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const YoutubeIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

export const TwitterIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
    <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
  </svg>
);

export const LinkedinIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export const FacebookIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const TiktokIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

export const ThreadsIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 12c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8c3.314 0 6.137 2.015 7.322 4.908" />
    <path d="M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" />
    <path d="M12 15.5c2 0 3.5-1.5 3.5-3.5V8.5" />
  </svg>
);

export const PinterestIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="9" x2="12" y2="22" />
    <path d="M8 12c-1.5-3-1-6 2-8 3.5-2 8 0 8 5 0 4-2 7-5 7-1.5 0-2.5-1-2.5-1" />
  </svg>
);

export const SnapchatIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 3a6 6 0 0 0-6 6c0 2.5 1 4 1 5.5 0 1-1.5 1.5-2.5 2 0 1 1.5 1.5 2.5 1.5 1.5 0 2 1 3 1.5 1 .5 1.5.5 2 .5s1 0 2-.5c1-.5 1.5-1.5 3-1.5 1 0 2.5-.5 2.5-1.5-1-.5-2.5-1-2.5-2 0-1.5 1-3 1-5.5a6 6 0 0 0-6-6Z" />
  </svg>
);

export const BIO_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  globe: Globe,
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  twitter: TwitterIcon,
  x: TwitterIcon,
  linkedin: LinkedinIcon,
  facebook: FacebookIcon,
  tiktok: TiktokIcon,
  threads: ThreadsIcon,
  pinterest: PinterestIcon,
  snapchat: SnapchatIcon,
  mail: Mail,
  phone: Phone,
  calendar: Calendar,
  'shopping-bag': ShoppingBag,
  music: Music,
  video: Video,
  'file-text': FileText,
  'book-open': BookOpen,
  zap: Zap,
  sparkles: Sparkles,
};

export const AVAILABLE_BIO_ICONS = [
  { key: 'globe', label: 'Website', Icon: Globe },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { key: 'youtube', label: 'YouTube', Icon: YoutubeIcon },
  { key: 'twitter', label: 'Twitter / X', Icon: TwitterIcon },
  { key: 'linkedin', label: 'LinkedIn', Icon: LinkedinIcon },
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'tiktok', label: 'TikTok', Icon: TiktokIcon },
  { key: 'threads', label: 'Threads', Icon: ThreadsIcon },
  { key: 'pinterest', label: 'Pinterest', Icon: PinterestIcon },
  { key: 'snapchat', label: 'Snapchat', Icon: SnapchatIcon },
  { key: 'mail', label: 'Email', Icon: Mail },
  { key: 'phone', label: 'Phone', Icon: Phone },
  { key: 'calendar', label: 'Booking', Icon: Calendar },
  { key: 'shopping-bag', label: 'Shop', Icon: ShoppingBag },
  { key: 'music', label: 'Music', Icon: Music },
  { key: 'video', label: 'Video', Icon: Video },
  { key: 'file-text', label: 'Document', Icon: FileText },
  { key: 'book-open', label: 'Course', Icon: BookOpen },
  { key: 'zap', label: 'Flash Sale', Icon: Zap },
  { key: 'sparkles', label: 'Highlight', Icon: Sparkles },
];
