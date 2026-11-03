'use client';

import React from 'react';
import { PublicBioDTO, BioThemeSettings } from '@/lib/api/socialBioLinksService';
import { ExternalLink, ShieldCheck, Link as LinkIcon } from 'lucide-react';
import { BIO_ICON_MAP } from '@/components/social-bio-links/BioIcons';
import {
  pickReadableText,
  withAlpha,
  mixHex,
} from '@/lib/utils/themeColors';

interface PublicBioPageProps {
  data: PublicBioDTO;
}

const styleRadius: Record<string, string> = {
  rounded: 'rounded-2xl',
  pill: 'rounded-full',
  sharp: 'rounded-none',
};

const fontStyles: Record<string, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

function Avatar({
  displayName,
  avatarUrl,
  borderColor,
  surfaceColor,
  className = '',
  size = 'md',
}: {
  displayName: string;
  avatarUrl?: string | null;
  borderColor: string;
  surfaceColor: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'lg'
      ? 'h-24 w-24 sm:h-28 sm:w-28 text-3xl'
      : size === 'sm'
      ? 'h-12 w-12 text-lg'
      : 'h-20 w-20 sm:h-22 sm:w-22 text-2xl';

  return (
    <div
      className={`${sizeClass} ${className} flex shrink-0 items-center justify-center overflow-hidden rounded-full font-black shadow-xl`}
      style={{
        backgroundColor: surfaceColor,
        border: `3px solid ${borderColor}`,
      }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{displayName?.charAt(0)?.toUpperCase() || '@'}</span>
      )}
    </div>
  );
}

function Identity({
  displayName,
  username,
  slug,
  bio,
  avatarUrl,
  textColor,
  mutedColor,
  surfaceColor,
  align = 'center',
  showAvatar = true,
  fontClass = 'font-sans',
  avatarSize = 'md',
}: {
  displayName: string;
  username: string;
  slug?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  align?: 'left' | 'center';
  showAvatar?: boolean;
  fontClass?: string;
  avatarSize?: 'sm' | 'md' | 'lg';
}) {
  const alignment =
    align === 'left' ? 'items-start text-left' : 'items-center text-center';

  return (
    <div className={`flex flex-col ${alignment}`}>
      {showAvatar && (
        <Avatar
          displayName={displayName}
          avatarUrl={avatarUrl}
          borderColor={withAlpha(textColor, 0.28)}
          surfaceColor={surfaceColor}
          size={avatarSize}
          className="mb-3.5"
        />
      )}
      <h1
        className={`${fontClass} text-2xl sm:text-3xl max-w-full break-words font-black tracking-tight leading-tight`}
        style={{ color: textColor }}
      >
        {displayName}
      </h1>
      <p
        className="mt-1 text-xs sm:text-sm font-mono font-bold"
        style={{ color: mutedColor }}
      >
        @{username}
        {slug && slug !== 'main' ? `/${slug}` : ''}
      </p>
      {bio && (
        <p
          className="mt-2.5 max-w-md text-xs sm:text-sm leading-relaxed font-medium"
          style={{ color: mutedColor }}
        >
          {bio}
        </p>
      )}
    </div>
  );
}

function LinkList({
  links,
  settings,
  textColor,
}: {
  links: PublicBioDTO['links'];
  settings: BioThemeSettings;
  textColor: string;
}) {
  const radius = styleRadius[settings.button_style] || styleRadius.rounded;
  const safeButtonText = pickReadableText(
    settings.button_background_color,
    settings.button_text_color
  );

  if (links.length === 0) {
    return (
      <div
        className="p-6 rounded-2xl border text-center font-bold text-xs sm:text-sm"
        style={{
          borderColor: withAlpha(textColor, 0.2),
          backgroundColor: withAlpha(textColor, 0.05),
          color: withAlpha(textColor, 0.65),
        }}
      >
        No links published yet.
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {links.map((link) => {
        const IconComp = link.icon ? BIO_ICON_MAP[link.icon] : null;

        return (
          <a
            key={link.id}
            href={link.url}
            className={`${radius} group flex min-h-0 items-center gap-3.5 px-4 py-3.5 sm:py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]`}
            style={{
              backgroundColor: settings.button_background_color,
              color: safeButtonText,
            }}
          >
            <span
              className="h-9 w-9 sm:h-10 sm:w-10 flex shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: withAlpha(safeButtonText, 0.12) }}
            >
              {IconComp ? (
                <IconComp size={18} className="text-current" />
              ) : (
                <LinkIcon size={18} className="text-current" />
              )}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="text-sm sm:text-base block truncate font-black leading-tight">
                {link.title}
              </span>
              {link.description && (
                <span
                  className="mt-0.5 block truncate text-xs leading-tight"
                  style={{ color: withAlpha(safeButtonText, 0.75) }}
                >
                  {link.description}
                </span>
              )}
            </span>
            <ExternalLink
              size={16}
              className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              style={{ color: withAlpha(safeButtonText, 0.65) }}
            />
          </a>
        );
      })}
    </div>
  );
}

function CoverImage({
  source,
  alt,
  className = '',
  position = 'center',
}: {
  source?: string | null;
  alt: string;
  className?: string;
  position?: string;
}) {
  if (!source) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={alt}
      className={`h-full w-full object-cover ${className}`}
      style={{ objectPosition: position }}
    />
  );
}

export default function PublicBioPage({ data }: PublicBioPageProps) {
  const { displayName, username, slug, bio, avatarUrl, bannerUrl, themeSettings, links } = data;

  const settings: BioThemeSettings = {
    background_color: themeSettings?.background_color || '#eadce5',
    text_color: themeSettings?.text_color || '#35121e',
    button_background_color: themeSettings?.button_background_color || '#6f1026',
    button_text_color: themeSettings?.button_text_color || '#ffffff',
    button_style: themeSettings?.button_style || 'rounded',
    layout: themeSettings?.layout || 'editorial',
    font_style: themeSettings?.font_style || 'sans',
    cover_image: themeSettings?.cover_image ?? null,
  };

  const layout = settings.layout || 'editorial';
  const coverImage = bannerUrl || settings.cover_image;
  const safePageText = pickReadableText(settings.background_color, settings.text_color);
  const mutedPageText = withAlpha(safePageText, 0.72);
  const surfaceColor = mixHex(settings.background_color, safePageText, 0.08);
  const fontClass = fontStyles[settings.font_style || 'sans'] || fontStyles.sans;

  const containerClass =
    'relative overflow-hidden rounded-[2rem] border shadow-2xl transition-all duration-300 w-full';
  const baseStyle: React.CSSProperties = {
    backgroundColor: settings.background_color,
    borderColor: withAlpha(safePageText, 0.18),
    color: safePageText,
  };

  const linkList = (
    <LinkList
      links={links}
      settings={settings}
      textColor={safePageText}
    />
  );

  const renderCardContent = () => {
    // 1. IMMERSIVE LAYOUT
    if (layout === 'immersive') {
      return (
        <div
          className={`${containerClass} min-h-[640px] sm:min-h-[720px] flex flex-col`}
          style={baseStyle}
        >
          <div className="absolute inset-0">
            {coverImage ? (
              <CoverImage source={coverImage} alt={displayName} position="70% center" />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(160deg, ${settings.button_background_color}, ${settings.background_color})`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/95" />
          </div>

          <div className="relative z-10 mt-auto p-6 sm:p-9 flex flex-col justify-end">
            <Identity
              displayName={displayName}
              username={username}
              slug={slug}
              bio={bio}
              avatarUrl={avatarUrl}
              textColor="#ffffff"
              mutedColor="rgba(255,255,255,0.76)"
              surfaceColor="rgba(255,255,255,0.15)"
              align="left"
              showAvatar={false}
              fontClass={fontClass}
            />
            <div className="mt-6">{linkList}</div>
          </div>
        </div>
      );
    }

    // 2. SPLIT LAYOUT
    if (layout === 'split') {
      return (
        <div className={containerClass} style={baseStyle}>
          <div className="h-72 sm:h-96 shrink-0 overflow-hidden relative">
            {coverImage ? (
              <CoverImage source={coverImage} alt={displayName} />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(145deg, ${settings.button_background_color}, ${settings.background_color})`,
                }}
              />
            )}
          </div>
          <div
            className="p-6 sm:p-9 flex-1"
            style={{ backgroundColor: settings.background_color }}
          >
            <Identity
              displayName={displayName}
              username={username}
              slug={slug}
              bio={bio}
              avatarUrl={avatarUrl}
              textColor={safePageText}
              mutedColor={mutedPageText}
              surfaceColor={surfaceColor}
              align="left"
              showAvatar={false}
              fontClass={fontClass}
            />
            <div className="mt-6">{linkList}</div>
          </div>
        </div>
      );
    }

    // 3. CINEMATIC LAYOUT
    if (layout === 'cinematic') {
      return (
        <div
          className={`${containerClass} min-h-[640px] sm:min-h-[720px] flex flex-col`}
          style={baseStyle}
        >
          <div className="h-[360px] sm:h-[420px] relative shrink-0 overflow-hidden">
            {coverImage ? (
              <CoverImage source={coverImage} alt={displayName} position="center 38%" />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(135deg, ${settings.button_background_color}, ${settings.background_color})`,
                }}
              />
            )}
            <div
              className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
              style={{
                background: `linear-gradient(180deg, transparent 0%, ${withAlpha(settings.background_color, 0.98)} 100%)`,
              }}
            />
            <div className="absolute inset-x-0 bottom-0 px-6 pb-6 sm:px-9 sm:pb-8">
              <Identity
                displayName={displayName}
                username={username}
                slug={slug}
                bio={bio}
                avatarUrl={avatarUrl}
                textColor={safePageText}
                mutedColor={mutedPageText}
                surfaceColor={surfaceColor}
                showAvatar={false}
                fontClass={fontClass}
              />
            </div>
          </div>
          <div className="px-6 pb-6 sm:px-9 sm:pb-10 flex-1 pt-2">{linkList}</div>
        </div>
      );
    }

    // 4. POSTER LAYOUT
    if (layout === 'poster') {
      return (
        <div
          className={`${containerClass} min-h-[620px] sm:min-h-[700px] flex flex-col`}
          style={{
            ...baseStyle,
            backgroundImage: `radial-gradient(circle at 78% 12%, ${withAlpha(settings.button_background_color, 0.45)} 0, transparent 34%), linear-gradient(145deg, ${settings.background_color} 18%, ${mixHex(settings.background_color, settings.button_background_color, 0.38)} 100%)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(${withAlpha(safePageText, 0.25)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(safePageText, 0.25)} 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
          <div className="p-6 sm:p-9 relative z-10 flex min-h-0 flex-1 flex-col justify-between">
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.28em]"
                style={{ color: mutedPageText }}
              >
                @{username}
                {slug && slug !== 'main' ? `/${slug}` : ''}
              </p>
              <div className="mt-12 sm:mt-16 max-w-lg">
                <h1
                  className={`${fontClass} text-5xl sm:text-7xl break-words font-black uppercase tracking-tight leading-[0.88]`}
                  style={{ color: safePageText }}
                >
                  {displayName}
                </h1>
                {bio && (
                  <p
                    className="mt-5 text-sm sm:text-base max-w-sm leading-relaxed font-medium"
                    style={{ color: mutedPageText }}
                  >
                    {bio}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-10 sm:mt-14">{linkList}</div>
          </div>
        </div>
      );
    }

    // 5. PORTRAIT LAYOUT
    if (layout === 'portrait') {
      return (
        <div
          className={`${containerClass} flex flex-col`}
          style={{
            ...baseStyle,
            backgroundImage: `radial-gradient(circle at 50% 36%, ${withAlpha(settings.button_background_color, 0.22)} 0, ${withAlpha(settings.button_background_color, 0.22)} 26%, transparent 26.5%)`,
          }}
        >
          <div className="px-6 pb-8 pt-10 sm:px-9 sm:pb-10 sm:pt-14 flex-1 flex flex-col justify-between">
            <Identity
              displayName={displayName}
              username={username}
              slug={slug}
              bio={bio}
              avatarUrl={avatarUrl}
              textColor={safePageText}
              mutedColor={mutedPageText}
              surfaceColor={surfaceColor}
              fontClass={fontClass}
              avatarSize="lg"
            />
            <div className="mt-8 sm:mt-10">{linkList}</div>
          </div>
        </div>
      );
    }

    // 6. GALLERY LAYOUT
    if (layout === 'gallery') {
      return (
        <div className={containerClass} style={baseStyle}>
          <div className="px-6 pb-4 pt-6 sm:px-9 sm:pb-5 sm:pt-9">
            <Identity
              displayName={displayName}
              username={username}
              slug={slug}
              bio={bio}
              avatarUrl={avatarUrl}
              textColor={safePageText}
              mutedColor={mutedPageText}
              surfaceColor={surfaceColor}
              showAvatar={false}
              fontClass={fontClass}
            />
          </div>
          <div className="h-52 sm:h-64 grid shrink-0 grid-cols-[0.72fr_1.3fr_0.72fr] gap-2.5 sm:gap-3 px-5 sm:px-8 overflow-hidden">
            {['left center', 'center center', 'right center'].map((pos, idx) => (
              <div key={idx} className="overflow-hidden rounded-2xl bg-black/10">
                <CoverImage
                  source={coverImage}
                  alt={displayName}
                  position={pos}
                />
              </div>
            ))}
          </div>
          <div className="p-6 sm:p-9">{linkList}</div>
        </div>
      );
    }

    // 7. EDITORIAL LAYOUT (DEFAULT)
    return (
      <div
        className={containerClass}
        style={{ ...baseStyle, backgroundColor: surfaceColor }}
      >
        <div className="h-72 sm:h-88 relative shrink-0 overflow-hidden">
          {coverImage ? (
            <CoverImage source={coverImage} alt={displayName} />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: `linear-gradient(145deg, ${settings.button_background_color}, ${settings.background_color})`,
              }}
            />
          )}
        </div>
        <div
          className="p-6 sm:p-9 flex-1"
          style={{ backgroundColor: settings.background_color }}
        >
          <Identity
            displayName={displayName}
            username={username}
            slug={slug}
            bio={bio}
            avatarUrl={avatarUrl}
            textColor={safePageText}
            mutedColor={mutedPageText}
            surfaceColor={surfaceColor}
            align="left"
            showAvatar={false}
            fontClass={fontClass}
          />
          <div className="mt-6 sm:mt-7">{linkList}</div>
        </div>
      </div>
    );
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-8 sm:py-12 transition-colors duration-300"
      style={{
        backgroundColor: settings.background_color,
        color: safePageText,
      }}
    >
      <section className="mx-auto w-full max-w-xl flex flex-col items-center">
        {renderCardContent()}

        {/* Powered by Attribution Badge */}
        <footer className="mt-6 text-center">
          <a
            href="https://scanmysocial.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold transition-opacity hover:opacity-100"
            style={{ color: withAlpha(safePageText, 0.65) }}
          >
            <ShieldCheck size={14} />
            <span>Powered by ScanMySocial</span>
          </a>
        </footer>
      </section>
    </main>
  );
}
