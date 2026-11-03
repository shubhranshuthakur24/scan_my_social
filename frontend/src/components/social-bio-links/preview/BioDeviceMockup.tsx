'use client';

import React, { useState, useEffect } from 'react';
import { BioCard, BioCardSummary, BioThemeSettings } from '@/lib/api/socialBioLinksService';
import { useSocialBioStore, selectEffectiveCard } from '@/lib/store/useSocialBioStore';
import { ExternalLink, ShieldCheck, Smartphone, Link as LinkIcon } from 'lucide-react';
import { BIO_ICON_MAP } from '@/components/social-bio-links/BioIcons';
import PhoneMockupFrame from '@/components/PhoneMockupFrame';
import {
  pickReadableText,
  withAlpha,
  mixHex,
} from '@/lib/utils/themeColors';

interface BioDeviceMockupProps {
  card?: BioCard | BioCardSummary;
  cardId?: number;
  previewThemeSettings?: BioThemeSettings;
  className?: string;
  showTitle?: boolean;
  actionOverlay?: React.ReactNode;
}

const fontStyles: Record<string, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

const styleRadius: Record<string, string> = {
  rounded: 'rounded-xl',
  pill: 'rounded-full',
  sharp: 'rounded-none',
};

export default function BioDeviceMockup({
  card: propCard,
  cardId,
  previewThemeSettings,
  className = '',
  showTitle = true,
  actionOverlay,
}: BioDeviceMockupProps) {
  const storeCard = useSocialBioStore((s) => (!propCard && cardId ? selectEffectiveCard(s, cardId) : undefined));
  const card = propCard || storeCard;

  if (!card) {
    return null;
  }
  // Normalize settings with safe defaults
  const settings: BioThemeSettings = {
    background_color: previewThemeSettings?.background_color || card.theme_settings?.background_color || '#eadce5',
    text_color: previewThemeSettings?.text_color || card.theme_settings?.text_color || '#35121e',
    button_background_color: previewThemeSettings?.button_background_color || card.theme_settings?.button_background_color || '#6f1026',
    button_text_color: previewThemeSettings?.button_text_color || card.theme_settings?.button_text_color || '#ffffff',
    button_style: previewThemeSettings?.button_style || card.theme_settings?.button_style || 'rounded',
    layout: previewThemeSettings?.layout || card.theme_settings?.layout || 'editorial',
    font_style: previewThemeSettings?.font_style || card.theme_settings?.font_style || 'sans',
    cover_image: previewThemeSettings?.cover_image ?? card.theme_settings?.cover_image ?? null,
  };

  const layout = settings.layout || 'editorial';
  const coverImage = card.banner_url || settings.cover_image;
  const safePageText = pickReadableText(settings.background_color, settings.text_color);
  const mutedPageText = withAlpha(safePageText, 0.72);
  const surfaceColor = mixHex(settings.background_color, safePageText, 0.08);
  const fontClass = fontStyles[settings.font_style || 'sans'] || fontStyles.sans;
  const buttonRadius = styleRadius[settings.button_style || 'rounded'] || styleRadius.rounded;
  const safeButtonText = pickReadableText(settings.button_background_color, settings.button_text_color);

  const activeLinks = (card.links || []).filter((l) => l.is_active);
  const displayName = card.display_name || card.username || 'My Bio Page';
  const username = card.username || 'username';
  const slug = card.slug;
  const bio = card.bio || card.custom_bio;
  const avatarUrl = card.avatar_url;

  const [avatarFailed, setAvatarFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    setCoverFailed(false);
  }, [coverImage]);

  const hasValidCover = Boolean(coverImage && !coverFailed);
  const hasValidAvatar = Boolean(avatarUrl && !avatarFailed);

  const isDark =
    settings.text_color?.toLowerCase() === '#ffffff' ||
    settings.text_color?.toLowerCase() === '#fff' ||
    settings.text_color?.toLowerCase() === '#f8fafc';

  // Render link buttons stack
  const renderLinks = () => {
    if (activeLinks.length === 0) {
      return (
        <div
          className="p-3.5 rounded-xl border text-center text-xs font-bold"
          style={{
            borderColor: withAlpha(safePageText, 0.2),
            backgroundColor: withAlpha(safePageText, 0.05),
            color: withAlpha(safePageText, 0.7),
          }}
        >
          No active links yet
        </div>
      );
    }

    return (
      <div className="space-y-2 w-full">
        {activeLinks.map((link) => {
          const IconComp = link.icon ? BIO_ICON_MAP[link.icon] : null;

          return (
            <div
              key={link.id}
              className={`w-full py-2.5 px-3 flex items-center justify-between text-left shadow-xs transition ${buttonRadius}`}
              style={{
                backgroundColor: settings.button_background_color,
                color: safeButtonText,
              }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {IconComp ? (
                  <div className="shrink-0 opacity-90">
                    <IconComp size={14} />
                  </div>
                ) : (
                  <div className="shrink-0 opacity-70">
                    <LinkIcon size={14} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate leading-tight">{link.title}</p>
                  {link.description && (
                    <p className="text-[10px] opacity-75 truncate mt-0.5 leading-tight">
                      {link.description}
                    </p>
                  )}
                </div>
              </div>
              <ExternalLink size={11} className="shrink-0 opacity-60 ml-2" />
            </div>
          );
        })}
      </div>
    );
  };

  // Render Layout Content
  const renderLayoutContent = () => {
    // 1. IMMERSIVE LAYOUT
    if (layout === 'immersive') {
      return (
        <div className="relative min-h-[560px] flex flex-col justify-end p-4 text-white">
          <div className="absolute inset-0">
            {hasValidCover && coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImage}
                alt={displayName}
                onError={() => setCoverFailed(true)}
                className="w-full h-full object-cover"
                style={{ objectPosition: '70% center' }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(160deg, ${settings.button_background_color}, ${settings.background_color})`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/95" />
          </div>

          <div className="relative z-10 flex flex-col justify-end space-y-3 pb-3">
            <div>
              <h1 className={`${fontClass} text-xl font-black leading-tight tracking-tight text-white`}>
                {displayName}
              </h1>
              <p className="text-xs font-mono font-bold text-white/75 mt-0.5">
                @{username}
                {!card.is_primary && slug ? `/${slug}` : ''}
              </p>
              {bio && <p className="text-xs text-white/80 mt-1.5 leading-relaxed line-clamp-3">{bio}</p>}
            </div>
            <div className="pt-1">{renderLinks()}</div>
          </div>
        </div>
      );
    }

    // 2. SPLIT LAYOUT
    if (layout === 'split') {
      return (
        <div className="flex flex-col min-h-full">
          <div className="h-44 w-full relative overflow-hidden shrink-0">
            {hasValidCover && coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImage}
                alt={displayName}
                onError={() => setCoverFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(145deg, ${settings.button_background_color}, ${settings.background_color})`,
                }}
              />
            )}
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
            <div>
              <h1 className={`${fontClass} text-lg font-black leading-tight tracking-tight`} style={{ color: safePageText }}>
                {displayName}
              </h1>
              <p className="text-xs font-mono font-bold mt-0.5" style={{ color: mutedPageText }}>
                @{username}
                {!card.is_primary && slug ? `/${slug}` : ''}
              </p>
              {bio && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: mutedPageText }}>{bio}</p>}
            </div>
            <div className="pt-2">{renderLinks()}</div>
          </div>
        </div>
      );
    }

    // 3. CINEMATIC LAYOUT
    if (layout === 'cinematic') {
      return (
        <div className="flex flex-col min-h-full">
          <div className="h-56 relative shrink-0 overflow-hidden">
            {coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImage}
                alt={displayName}
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center 38%' }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg, ${settings.button_background_color}, ${settings.background_color})`,
                }}
              />
            )}
            <div
              className="absolute inset-x-0 bottom-0 h-3/4 pointer-events-none"
              style={{
                background: `linear-gradient(180deg, transparent 0%, ${withAlpha(settings.background_color, 0.98)} 100%)`,
              }}
            />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h1 className={`${fontClass} text-lg font-black leading-tight tracking-tight`} style={{ color: safePageText }}>
                {displayName}
              </h1>
              <p className="text-xs font-mono font-bold mt-0.5" style={{ color: mutedPageText }}>
                @{username}
                {!card.is_primary && slug ? `/${slug}` : ''}
              </p>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
            {bio && <p className="text-xs leading-relaxed" style={{ color: mutedPageText }}>{bio}</p>}
            <div className="pt-2">{renderLinks()}</div>
          </div>
        </div>
      );
    }

    // 4. POSTER LAYOUT
    if (layout === 'poster') {
      return (
        <div
          className="flex-1 flex flex-col justify-between p-4 min-h-[560px] relative overflow-hidden"
          style={{
            backgroundImage: `radial-gradient(circle at 78% 12%, ${withAlpha(settings.button_background_color, 0.45)} 0, transparent 34%), linear-gradient(145deg, ${settings.background_color} 18%, ${mixHex(settings.background_color, settings.button_background_color, 0.38)} 100%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(${withAlpha(safePageText, 0.25)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(safePageText, 0.25)} 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
            }}
          />
          <div className="relative z-10 pt-2 space-y-3">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em]" style={{ color: mutedPageText }}>
              @{username}
              {!card.is_primary && slug ? `/${slug}` : ''}
            </p>
            <h1 className={`${fontClass} text-3xl font-black uppercase tracking-tight leading-[0.9]`} style={{ color: safePageText }}>
              {displayName}
            </h1>
            {bio && <p className="text-xs leading-relaxed pt-1" style={{ color: mutedPageText }}>{bio}</p>}
          </div>
          <div className="relative z-10 pt-4">{renderLinks()}</div>
        </div>
      );
    }

    // 5. PORTRAIT LAYOUT
    if (layout === 'portrait') {
      return (
        <div
          className="flex-1 flex flex-col justify-between p-4 min-h-[560px]"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 30%, ${withAlpha(settings.button_background_color, 0.22)} 0, ${withAlpha(settings.button_background_color, 0.22)} 30%, transparent 30.5%)`,
          }}
        >
          <div className="flex flex-col items-center text-center pt-4 space-y-2">
            <div
              className="w-20 h-20 rounded-full border-4 shadow-md overflow-hidden flex items-center justify-center font-black text-2xl bg-black/10 shrink-0"
              style={{
                borderColor: settings.button_background_color,
                backgroundColor: surfaceColor,
              }}
            >
              {hasValidAvatar && avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span style={{ color: safePageText }}>{(displayName || username || 'A')[0].toUpperCase()}</span>
              )}
            </div>
            <div>
              <h1 className={`${fontClass} text-lg font-black leading-tight tracking-tight`} style={{ color: safePageText }}>
                {displayName}
              </h1>
              <p className="text-xs font-mono font-bold mt-0.5" style={{ color: mutedPageText }}>
                @{username}
                {!card.is_primary && slug ? `/${slug}` : ''}
              </p>
              {bio && <p className="text-xs mt-1.5 max-w-[220px] mx-auto leading-relaxed" style={{ color: mutedPageText }}>{bio}</p>}
            </div>
          </div>
          <div className="pt-4">{renderLinks()}</div>
        </div>
      );
    }

    // 6. GALLERY LAYOUT
    if (layout === 'gallery') {
      return (
        <div className="flex flex-col min-h-full p-4 space-y-3">
          <div className="text-center pt-2">
            <h1 className={`${fontClass} text-lg font-black leading-tight tracking-tight`} style={{ color: safePageText }}>
              {displayName}
            </h1>
            <p className="text-xs font-mono font-bold mt-0.5" style={{ color: mutedPageText }}>
              @{username}
              {!card.is_primary && slug ? `/${slug}` : ''}
            </p>
            {bio && <p className="text-xs mt-1 leading-relaxed" style={{ color: mutedPageText }}>{bio}</p>}
          </div>

          <div className="h-32 grid grid-cols-[0.7fr_1.3fr_0.7fr] gap-1.5 overflow-hidden rounded-xl">
            {['left center', 'center center', 'right center'].map((pos, idx) => (
              <div key={idx} className="overflow-hidden bg-black/10 h-full">
                {hasValidCover && coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImage}
                    alt={displayName}
                    onError={() => setCoverFailed(true)}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: pos }}
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: `linear-gradient(145deg, ${settings.button_background_color}, ${settings.background_color})`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 flex-1 flex flex-col justify-end">{renderLinks()}</div>
        </div>
      );
    }

    // 7. EDITORIAL LAYOUT (DEFAULT)
    return (
      <div className="flex flex-col min-h-full">
        {/* Cover / Banner */}
        <div className="h-32 w-full relative overflow-hidden shrink-0 border-b border-black/5">
          {hasValidCover && coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={displayName}
              onError={() => setCoverFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(145deg, ${settings.button_background_color}, ${settings.background_color})`,
              }}
            />
          )}
        </div>

        {/* Profile Avatar Overlapping Cover */}
        <div className="relative -mt-10 flex flex-col items-center text-center px-4">
          <div
            className="w-18 h-18 rounded-full border-4 shadow-md overflow-hidden flex items-center justify-center font-black text-lg bg-black/10 shrink-0"
            style={{
              borderColor: settings.background_color,
              backgroundColor: surfaceColor,
            }}
          >
            {hasValidAvatar && avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                onError={() => setAvatarFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span style={{ color: safePageText }}>{(displayName || username || 'A')[0].toUpperCase()}</span>
            )}
          </div>

          <div className="pt-2 pb-3 space-y-1 w-full">
            <h1 className={`${fontClass} text-base font-black tracking-tight leading-tight`} style={{ color: safePageText }}>
              {displayName}
            </h1>
            <p className="text-[11px] font-mono font-bold" style={{ color: mutedPageText }}>
              @{username}
              {!card.is_primary && slug ? `/${slug}` : ''}
            </p>
            {bio && <p className="text-xs leading-relaxed opacity-90 pt-0.5 line-clamp-3" style={{ color: mutedPageText }}>{bio}</p>}
          </div>

          {/* Links */}
          <div className="w-full pt-1 pb-4">{renderLinks()}</div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {showTitle && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <Smartphone size={14} />
          <span>Live Phone Preview</span>
        </div>
      )}

      <PhoneMockupFrame
        screenStyle={{
          backgroundColor: settings.background_color,
          color: safePageText,
        }}
        statusBarStyle={{
          color: safePageText,
          opacity: 0.85,
        }}
        homeIndicatorClassName={isDark ? 'bg-white/40' : 'bg-black/25'}
      >
        {/* Screen Content Container with Dynamic Theme Layout */}
        <div
          className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden scrollbar-none flex flex-col justify-between"
          style={{
            backgroundColor: settings.background_color,
            color: safePageText,
          }}
        >
          {/* Main Layout Rendering */}
          <div className="flex-1 w-full">{renderLayoutContent()}</div>

          {/* Footer Branding */}
          <div
            className="py-3 text-center flex items-center justify-center gap-1 text-[10px] font-bold shrink-0"
            style={{ color: withAlpha(safePageText, 0.55) }}
          >
            <ShieldCheck size={12} />
            <span>Powered by ScanMySocial</span>
          </div>
        </div>

        {/* Action Overlay inside the phone on hover or keyboard focus */}
        {actionOverlay && (
          <div className="absolute inset-0 z-40 flex flex-col justify-between opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-all duration-200 rounded-[2.45rem] overflow-hidden">
            {actionOverlay}
          </div>
        )}
      </PhoneMockupFrame>
    </div>
  );
}
