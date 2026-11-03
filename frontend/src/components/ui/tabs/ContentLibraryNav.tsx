'use client';

import React from 'react';
import { Film, Tv, Eye } from 'lucide-react';
import PrimaryNavTabs, { PrimaryNavTabItem } from './PrimaryNavTabs';

const contentLibraryTabs: PrimaryNavTabItem[] = [
  { name: 'Scraped Reels & Media', href: '/content-library/videos', icon: Film, exact: true },
  { name: 'Channels & Competitors', href: '/content-library/channels', icon: Tv },
  { name: 'Monitored Watchlists', href: '/content-library/watchlists', icon: Eye },
];

export interface ContentLibraryNavProps {
  rightElement?: React.ReactNode;
  className?: string;
}

export default function ContentLibraryNav({ rightElement, className = '' }: ContentLibraryNavProps) {
  return (
    <PrimaryNavTabs
      id="content-library"
      tabs={contentLibraryTabs}
      rightElement={rightElement}
      className={className}
    />
  );
}
