'use client';

import React from 'react';
import { BioThemeSettings } from '@/lib/api/socialBioLinksService';
import { ExternalLink } from 'lucide-react';
import { BIO_ICON_MAP } from '@/components/social-bio-links/BioIcons';

interface PublicBioLinkProps {
  id: number;
  title: string;
  url: string;
  description?: string | null;
  icon?: string | null;
  theme: BioThemeSettings;
}

export default function PublicBioLink({
  title,
  url,
  description,
  icon,
  theme,
}: PublicBioLinkProps) {
  const IconComp = icon ? BIO_ICON_MAP[icon] : null;

  const getButtonStyle = () => {
    switch (theme.button_style) {
      case 'pill':
        return 'rounded-full';
      case 'sharp':
        return 'rounded-none';
      case 'rounded':
      default:
        return 'rounded-2xl';
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`w-full p-4 sm:p-5 flex items-center justify-between text-left transition transform hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow-md ${getButtonStyle()}`}
      style={{
        backgroundColor: theme.button_background_color,
        color: theme.button_text_color,
      }}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {IconComp && (
          <div className="shrink-0 p-2 rounded-xl bg-black/5">
            <IconComp size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-base font-bold truncate leading-tight">{title}</p>
          {description && (
            <p className="text-xs opacity-80 truncate mt-1 leading-tight">{description}</p>
          )}
        </div>
      </div>

      <ExternalLink size={16} className="shrink-0 opacity-60 ml-3" />
    </a>
  );
}
