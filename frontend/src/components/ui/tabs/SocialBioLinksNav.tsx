'use client';

import React from 'react';
import { Layers, Link as LinkIcon, BarChart2 } from 'lucide-react';
import PrimaryNavTabs, { PrimaryNavTabItem } from './PrimaryNavTabs';

const socialBioLinksTabs: PrimaryNavTabItem[] = [
  { name: 'Link in Bio', href: '/social-bio-links', icon: Layers, exact: true },
  { name: 'Linkshort', href: '/social-bio-links/linkshort', icon: LinkIcon },
  { name: 'Analytics', href: '/social-bio-links/analytics', icon: BarChart2 },
];

export interface SocialBioLinksNavProps {
  rightElement?: React.ReactNode;
  className?: string;
  activeTab?: 'bio' | 'linkshort' | 'analytics';
}

export default function SocialBioLinksNav({
  rightElement,
  className = '',
}: SocialBioLinksNavProps) {
  return (
    <PrimaryNavTabs
      id="social-bio-links"
      tabs={socialBioLinksTabs}
      rightElement={rightElement}
      className={className}
    />
  );
}
