/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import {
  WebPageThemeSettings,
  WebPageSection,
  PublicWebPageDto,
  WebPage,
} from '@/lib/api/webPagesService';
import { submitPublicWebPageForm } from '@/lib/api/publicWebPagesClient';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Play,
  HelpCircle,
  Quote,
  Sparkles,
  Zap,
  Shield,
  Star,
  Award,
  TrendingUp,
  Check,
  Clock,
  User,
  Layers,
} from 'lucide-react';

interface WebPageCanvasProps {
  webPage: WebPage | PublicWebPageDto;
  mode?: 'public' | 'preview' | 'thumbnail';
  className?: string;
}

interface BlockBaseProps {
  section: WebPageSection;
  settings: WebPageThemeSettings;
  isCompact: boolean;
  anchorId?: string;
}

interface BlockWithWebPageProps extends BlockBaseProps {
  webPage: WebPage | PublicWebPageDto;
  mode: 'public' | 'preview' | 'thumbnail';
}

interface FormFieldItem {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'textarea' | string;
  required?: boolean;
}

interface LinkListItem {
  label?: string;
  url?: string;
}

interface FaqItem {
  question?: string;
  answer?: string;
}

interface TestimonialItem {
  quote?: string;
  name?: string;
}

interface ContactFormBlockProps extends BlockBaseProps {
  webPage: WebPage | PublicWebPageDto;
  isPublic: boolean;
  isPreview: boolean;
}

export const defaultWebPageTheme: WebPageThemeSettings = {
  theme_key: 'studio',
  background_color: '#f8fafc',
  text_color: '#0f172a',
  muted_text_color: '#64748b',
  accent_color: '#ef4444',
  surface_color: '#ffffff',
  border_color: '#e2e8f0',
  button_style: 'rounded',
  radius_style: 'rounded',
  font_style: 'sans',
};

function buttonRadius(settings: WebPageThemeSettings): string {
  if (settings.button_style === 'pill') return '999px';
  if (settings.button_style === 'sharp') return '4px';
  return '12px';
}

function surfaceRadius(settings: WebPageThemeSettings): string {
  if (settings.radius_style === 'sharp') return '4px';
  if (settings.radius_style === 'soft') return '24px';
  return '12px';
}

function contrastColor(hexColor?: string): string {
  const hex = String(hexColor || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return '#ffffff';
  }
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 160 ? '#0f172a' : '#ffffff';
}

function resolveSafeVideoUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // YouTube match
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
  }

  // Vimeo match
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+))/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
  }

  if (trimmed.startsWith('https://www.youtube.com/embed/') || trimmed.startsWith('https://player.vimeo.com/video/')) {
    return trimmed;
  }

  return null;
}

function buildSectionAnchorMap(sections: WebPageSection[]): Map<string, string> {
  const map = new Map<string, string>();
  const usedIds = new Set<string>();
  const firstContactSectionId = sections.find((s) => s.type === 'contact_form')?.id;

  for (const section of sections) {
    if (section.type === 'contact_form') {
      if (section.id === firstContactSectionId) {
        usedIds.add('contact');
        map.set(section.id, 'contact');
      } else {
        const id = `contact-${section.id}`;
        usedIds.add(id);
        map.set(section.id, id);
      }
      continue;
    }

    // 1. Explicit anchor if set in content
    const explicitAnchor = typeof section.content?.anchor_id === 'string'
      ? section.content.anchor_id.trim().replace(/^#/, '')
      : null;
    if (explicitAnchor && !usedIds.has(explicitAnchor)) {
      usedIds.add(explicitAnchor);
      map.set(section.id, explicitAnchor);
      continue;
    }

    // 2. Slugified heading if present
    const heading = typeof section.content?.heading === 'string' ? section.content.heading.trim() : '';
    if (heading) {
      const slug = heading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (slug && !usedIds.has(slug)) {
        usedIds.add(slug);
        map.set(section.id, slug);
        continue;
      }
    }

    // 3. Fallback to section-${section.id}
    const fallback = `section-${section.id}`;
    if (!usedIds.has(fallback)) {
      usedIds.add(fallback);
      map.set(section.id, fallback);
    }
  }

  return map;
}

export default function WebPageCanvas({
  webPage,
  mode = 'preview',
  className = '',
}: WebPageCanvasProps) {
  const settings: WebPageThemeSettings = {
    ...defaultWebPageTheme,
    ...(webPage.theme_settings || {}),
  };

  const sections = Array.isArray(webPage.sections) ? webPage.sections : [];
  const isCompact = mode === 'thumbnail';
  const isPublic = mode === 'public';
  const isPreview = mode === 'preview';
  const anchorMap = buildSectionAnchorMap(sections);

  return (
    <div
      className={`w-full transition-colors duration-300 ${
        settings.font_style === 'serif' ? 'font-serif' : 'font-sans'
      } ${className}`}
      style={{
        backgroundColor: settings.background_color,
        color: settings.text_color,
        minHeight: isCompact ? 'auto' : '100vh',
      }}
    >
      <main className={`w-full ${isCompact ? 'space-y-4 p-4' : 'space-y-12 sm:space-y-20 pb-20'}`}>
        {sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            webPage={webPage}
            settings={settings}
            mode={mode}
            isCompact={isCompact}
            isPublic={isPublic}
            isPreview={isPreview}
            anchorId={anchorMap.get(section.id)}
          />
        ))}
      </main>
    </div>
  );
}

interface SectionRendererProps {
  section: WebPageSection;
  webPage: WebPage | PublicWebPageDto;
  settings: WebPageThemeSettings;
  mode: 'public' | 'preview' | 'thumbnail';
  isCompact: boolean;
  isPublic: boolean;
  isPreview: boolean;
  anchorId?: string;
}

function SectionRenderer({
  section,
  webPage,
  settings,
  mode,
  isCompact,
  isPublic,
  isPreview,
  anchorId,
}: SectionRendererProps) {
  switch (section.type) {
    case 'hero':
      return <HeroBlock section={section} webPage={webPage} settings={settings} isCompact={isCompact} mode={mode} anchorId={anchorId} />;
    case 'text':
      return <TextBlock section={section} settings={settings} isCompact={isCompact} anchorId={anchorId} />;
    case 'image':
      return <ImageBlock section={section} settings={settings} isCompact={isCompact} anchorId={anchorId} />;
    case 'video':
      return <VideoBlock section={section} settings={settings} isCompact={isCompact} anchorId={anchorId} />;
    case 'cta':
      return <CtaBlock section={section} webPage={webPage} settings={settings} isCompact={isCompact} mode={mode} anchorId={anchorId} />;
    case 'link_list':
      return <LinkListBlock section={section} settings={settings} isCompact={isCompact} mode={mode} anchorId={anchorId} />;
    case 'faq':
      return <FaqBlock section={section} settings={settings} isCompact={isCompact} anchorId={anchorId} />;
    case 'testimonials':
      return <TestimonialsBlock section={section} settings={settings} isCompact={isCompact} anchorId={anchorId} />;
    case 'contact_form':
      return (
        <ContactFormBlock
          section={section}
          webPage={webPage}
          settings={settings}
          isCompact={isCompact}
          isPublic={isPublic}
          isPreview={isPreview}
          anchorId={anchorId}
        />
      );
    case 'features':
      return <FeaturesBlock section={section} settings={settings} isCompact={isCompact} anchorId={anchorId} />;
    case 'stats':
      return <StatsBlock section={section} settings={settings} isCompact={isCompact} anchorId={anchorId} />;
    case 'gallery':
      return <GalleryBlock section={section} settings={settings} isCompact={isCompact} anchorId={anchorId} />;
    case 'pricing':
      return <PricingBlock section={section} webPage={webPage} settings={settings} isCompact={isCompact} mode={mode} anchorId={anchorId} />;
    case 'profile':
      return <ProfileBlock section={section} settings={settings} isCompact={isCompact} mode={mode} anchorId={anchorId} />;
    case 'timeline':
      return <TimelineBlock section={section} settings={settings} isCompact={isCompact} anchorId={anchorId} />;
    default:
      return null;
  }
}

// -------------------------------------------------------------
// BLOCK COMPONENTS
// -------------------------------------------------------------

function CtaButton({
  label,
  url,
  variant = 'primary',
  webPage,
  sectionId,
  settings,
  isCompact,
  mode,
}: {
  label?: string;
  url?: string;
  variant?: 'primary' | 'secondary';
  webPage: WebPage | PublicWebPageDto;
  sectionId: string;
  settings: WebPageThemeSettings;
  isCompact: boolean;
  mode: 'public' | 'preview' | 'thumbnail';
}) {
  if (!label) return null;

  const isPrimary = variant === 'primary';
  const username =
    'username' in webPage && typeof (webPage as { username?: unknown }).username === 'string'
      ? (webPage as { username: string }).username
      : 'user';
  const slug = webPage.slug;

  const target = variant === 'secondary' ? 'secondary' : 'primary';
  const isAnchor = typeof url === 'string' && url.trim().startsWith('#');
  const href = mode === 'public' && !isAnchor
    ? `/pages/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/click/${encodeURIComponent(sectionId)}?target=${target}`
    : (url || '#');

  const handleClick = (e: React.MouseEvent) => {
    if (mode === 'thumbnail') {
      e.preventDefault();
      return;
    }
    if (mode === 'preview') {
      e.preventDefault();
      alert(`[Preview Mode] CTA clicked: "${label}" -> ${url || 'No URL specified'}`);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      target={mode === 'public' && url && !url.startsWith('#') ? '_blank' : undefined}
      rel={mode === 'public' && url && !url.startsWith('#') ? 'noopener noreferrer' : undefined}
      className={`inline-flex items-center justify-center gap-2 font-black transition ${
        isCompact ? 'px-3 py-1.5 text-[10px]' : 'px-6 py-3 text-sm hover:-translate-y-0.5 shadow-xs'
      }`}
      style={
        isPrimary
          ? {
              backgroundColor: settings.accent_color,
              borderColor: settings.accent_color,
              borderRadius: buttonRadius(settings),
              color: contrastColor(settings.accent_color),
            }
          : {
              backgroundColor: 'transparent',
              borderColor: settings.border_color,
              borderWidth: '1px',
              borderRadius: buttonRadius(settings),
              color: settings.text_color,
            }
      }
    >
      <span>{label}</span>
      {!isCompact && <ArrowRight size={14} />}
    </a>
  );
}

function HeroBlock({ section, webPage, settings, isCompact, mode, anchorId }: BlockWithWebPageProps) {
  const content = section.content || {};
  const hasImage = Boolean(content.image_url);
  const layout = (content.layout_style as string) || (content.layout as string) || (hasImage ? 'split' : 'centered');

  return (
    <section id={anchorId} className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${isCompact ? 'px-3 py-4' : 'max-w-6xl px-6 py-12 sm:py-20'}`}>
      <div
        className={`flex flex-col ${
          layout === 'split' && hasImage
            ? 'md:flex-row md:items-center md:justify-between gap-8 md:gap-12'
            : layout === 'centered'
            ? 'items-center text-center max-w-3xl mx-auto gap-6'
            : 'gap-8'
        }`}
      >
        <div className={`space-y-4 ${layout === 'split' && hasImage ? 'md:w-1/2' : 'w-full'}`}>
          {content.eyebrow && (
            <p
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: settings.accent_color }}
            >
              {content.eyebrow}
            </p>
          )}
          <h1
            className={`font-black tracking-tight leading-tight break-words ${
              isCompact ? 'text-lg' : 'text-3xl sm:text-5xl lg:text-6xl'
            }`}
          >
            {content.heading || 'Your compelling headline'}
          </h1>
          {content.body && (
            <p
              className={`leading-relaxed ${isCompact ? 'text-xs' : 'text-base sm:text-lg'}`}
              style={{ color: settings.muted_text_color }}
            >
              {content.body}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <CtaButton
              label={content.primary_label}
              url={content.primary_url}
              variant="primary"
              webPage={webPage}
              sectionId={section.id}
              settings={settings}
              isCompact={isCompact}
              mode={mode}
            />
            <CtaButton
              label={content.secondary_label}
              url={content.secondary_url}
              variant="secondary"
              webPage={webPage}
              sectionId={section.id}
              settings={settings}
              isCompact={isCompact}
              mode={mode}
            />
          </div>
        </div>

        {hasImage && (
          <div className={`${layout === 'split' ? 'md:w-1/2' : 'w-full'}`}>
            <img
              src={content.image_url}
              alt={content.heading || 'Hero'}
              className="w-full object-cover shadow-sm"
              style={{
                borderRadius: surfaceRadius(settings),
                maxHeight: isCompact ? '180px' : '480px',
              }}
              onError={(e) => {
                // Fallback image if broken
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function TextBlock({ section, settings, isCompact, anchorId }: BlockBaseProps) {
  const content = section.content || {};

  return (
    <section id={anchorId} className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${isCompact ? 'px-3 py-3' : 'max-w-4xl px-6 py-8'}`}>
      <div
        className="p-6 sm:p-10 border shadow-2xs"
        style={{
          backgroundColor: settings.surface_color,
          borderColor: settings.border_color,
          borderRadius: surfaceRadius(settings),
        }}
      >
        {content.heading && (
          <h2 className={`font-black mb-3 break-words ${isCompact ? 'text-base' : 'text-2xl sm:text-3xl'}`}>
            {content.heading}
          </h2>
        )}
        {content.body && (
          <p
            className={`whitespace-pre-line leading-relaxed ${isCompact ? 'text-xs' : 'text-sm sm:text-base'}`}
            style={{ color: settings.muted_text_color }}
          >
            {content.body}
          </p>
        )}
      </div>
    </section>
  );
}

function ImageBlock({ section, settings, isCompact, anchorId }: BlockBaseProps) {
  const content = section.content || {};

  return (
    <section id={anchorId} className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${isCompact ? 'px-3 py-3' : 'max-w-5xl px-6 py-8'}`}>
      <div
        className="overflow-hidden border shadow-2xs"
        style={{
          backgroundColor: settings.surface_color,
          borderColor: settings.border_color,
          borderRadius: surfaceRadius(settings),
        }}
      >
        {content.image_url && (
          <img
            src={content.image_url}
            alt={content.heading || 'Image'}
            className="w-full object-cover"
            style={{ maxHeight: isCompact ? '200px' : '500px' }}
          />
        )}
        {(content.heading || content.body) && (
          <div className="p-5 sm:p-8 space-y-2">
            {content.heading && (
              <h3 className={`font-black ${isCompact ? 'text-sm' : 'text-xl'}`}>
                {content.heading}
              </h3>
            )}
            {content.body && (
              <p
                className={`leading-relaxed ${isCompact ? 'text-xs' : 'text-sm'}`}
                style={{ color: settings.muted_text_color }}
              >
                {content.body}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function VideoBlock({ section, settings, isCompact, anchorId }: BlockBaseProps) {
  const content = section.content || {};
  const safeEmbedUrl = resolveSafeVideoUrl(content.url);

  return (
    <section id={anchorId} className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${isCompact ? 'px-3 py-3' : 'max-w-4xl px-6 py-8'}`}>
      <div
        className="p-5 sm:p-8 border shadow-2xs space-y-4"
        style={{
          backgroundColor: settings.surface_color,
          borderColor: settings.border_color,
          borderRadius: surfaceRadius(settings),
        }}
      >
        {content.heading && (
          <h3 className={`font-black ${isCompact ? 'text-sm' : 'text-xl'}`}>
            {content.heading}
          </h3>
        )}
        {safeEmbedUrl ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-inner">
            <iframe
              src={safeEmbedUrl}
              title={content.heading || 'Video'}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-slate-100 text-slate-400 gap-2">
            <Play size={24} />
            <span className="text-xs font-bold">No valid YouTube or Vimeo URL provided</span>
          </div>
        )}
      </div>
    </section>
  );
}

function CtaBlock({ section, webPage, settings, isCompact, mode, anchorId }: BlockWithWebPageProps) {
  const content = section.content || {};

  return (
    <section id={anchorId} className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${isCompact ? 'px-3 py-4' : 'max-w-4xl px-6 py-12'}`}>
      <div
        className="p-8 sm:p-14 text-center border shadow-xs space-y-5"
        style={{
          backgroundColor: settings.surface_color,
          borderColor: settings.border_color,
          borderRadius: surfaceRadius(settings),
        }}
      >
        <h2 className={`font-black tracking-tight break-words ${isCompact ? 'text-lg' : 'text-3xl sm:text-4xl'}`}>
          {content.heading || 'Take the next step'}
        </h2>
        {content.body && (
          <p
            className={`max-w-xl mx-auto leading-relaxed ${isCompact ? 'text-xs' : 'text-base'}`}
            style={{ color: settings.muted_text_color }}
          >
            {content.body}
          </p>
        )}
        <div className="pt-2">
          <CtaButton
            label={content.primary_label || 'Get Started'}
            url={content.primary_url}
            variant="primary"
            webPage={webPage}
            sectionId={section.id}
            settings={settings}
            isCompact={isCompact}
            mode={mode}
          />
        </div>
      </div>
    </section>
  );
}

function LinkListBlock({
  section,
  settings,
  isCompact,
  mode,
  anchorId,
}: BlockBaseProps & { mode: 'public' | 'preview' | 'thumbnail' }) {
  const content = section.content || {};
  const links = Array.isArray(content.links) ? (content.links as LinkListItem[]) : [];

  return (
    <section id={anchorId} className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${isCompact ? 'px-3 py-3' : 'max-w-3xl px-6 py-8'}`}>
      <div className="space-y-4">
        {content.heading && (
          <h3 className={`font-black ${isCompact ? 'text-sm mb-2' : 'text-2xl mb-4'}`}>
            {content.heading}
          </h3>
        )}
        <div className="space-y-3">
          {links.map((item: LinkListItem, i: number) => {
            const url = typeof item.url === 'string' ? item.url.trim() : '';
            const isExternal = /^https?:\/\//i.test(url);

            return (
              <a
                key={i}
                href={mode === 'thumbnail' ? '#' : url || '#'}
                target={mode === 'public' && isExternal ? '_blank' : undefined}
                rel={mode === 'public' && isExternal ? 'noopener noreferrer' : undefined}
                onClick={(e) => {
                  if (mode === 'thumbnail') e.preventDefault();
                  if (mode === 'preview') {
                    e.preventDefault();
                    alert(`[Preview Mode] Link: "${item.label}" -> ${item.url}`);
                  }
                }}
                className={`flex items-center justify-between p-4 border transition ${
                  isCompact ? 'text-xs py-2.5' : 'text-sm hover:translate-x-1 shadow-2xs'
                }`}
                style={{
                  backgroundColor: settings.surface_color,
                  borderColor: settings.border_color,
                  borderRadius: buttonRadius(settings),
                  color: settings.text_color,
                }}
              >
                <span className="font-bold">{item.label || 'Link title'}</span>
                <ExternalLink size={isCompact ? 12 : 15} style={{ color: settings.accent_color }} />
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FaqBlock({ section, settings, isCompact, anchorId }: BlockBaseProps) {
  const content = section.content || {};
  const items = Array.isArray(content.items) ? (content.items as FaqItem[]) : [];

  return (
    <section id={anchorId} className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${isCompact ? 'px-3 py-3' : 'max-w-4xl px-6 py-8'}`}>
      {content.heading && (
        <h3 className={`font-black mb-6 ${isCompact ? 'text-sm' : 'text-2xl sm:text-3xl'}`}>
          {content.heading}
        </h3>
      )}
      <div className="space-y-3">
        {items.map((faq: FaqItem, i: number) => (
          <div
            key={i}
            className="p-5 border shadow-2xs space-y-2"
            style={{
              backgroundColor: settings.surface_color,
              borderColor: settings.border_color,
              borderRadius: surfaceRadius(settings),
            }}
          >
            <h4 className={`font-bold flex items-start gap-2 ${isCompact ? 'text-xs' : 'text-base'}`}>
              <HelpCircle size={16} className="shrink-0 mt-0.5" style={{ color: settings.accent_color }} />
              <span>{faq.question || 'Question'}</span>
            </h4>
            <p
              className={`leading-relaxed pl-6 ${isCompact ? 'text-[11px]' : 'text-sm'}`}
              style={{ color: settings.muted_text_color }}
            >
              {faq.answer || 'Answer details.'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsBlock({ section, settings, isCompact, anchorId }: BlockBaseProps) {
  const content = section.content || {};
  const items = Array.isArray(content.items) ? (content.items as TestimonialItem[]) : [];

  return (
    <section id={anchorId} className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${isCompact ? 'px-3 py-3' : 'max-w-5xl px-6 py-8'}`}>
      {content.heading && (
        <h3 className={`font-black mb-6 ${isCompact ? 'text-sm' : 'text-2xl sm:text-3xl'}`}>
          {content.heading}
        </h3>
      )}
      <div className={`grid gap-4 ${isCompact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {items.map((t: TestimonialItem, i: number) => (
          <div
            key={i}
            className="p-6 border shadow-2xs space-y-3 flex flex-col justify-between"
            style={{
              backgroundColor: settings.surface_color,
              borderColor: settings.border_color,
              borderRadius: surfaceRadius(settings),
            }}
          >
            <Quote size={20} style={{ color: settings.accent_color }} />
            <p
              className={`italic leading-relaxed ${isCompact ? 'text-xs' : 'text-sm'}`}
              style={{ color: settings.text_color }}
            >
              &ldquo;{t.quote || 'Great experience working together.'}&rdquo;
            </p>
            <span
              className="text-xs font-black uppercase tracking-wider block"
              style={{ color: settings.muted_text_color }}
            >
              — {t.name || 'Client Name'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactFormBlock({
  section,
  webPage,
  settings,
  isCompact,
  isPublic,
  isPreview,
  anchorId,
}: ContactFormBlockProps) {
  const content = section.content || {};
  const fields: FormFieldItem[] = Array.isArray(content.fields) && content.fields.length > 0
    ? (content.fields as FormFieldItem[])
    : [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'message', label: 'Message', type: 'textarea', required: false },
      ];

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompact) return;

    if (isPreview) {
      alert(`[Preview Mode] Form submitted with data:\n${JSON.stringify(formData, null, 2)}`);
      setSuccessMessage('Preview Mode: Form submission simulated successfully.');
      return;
    }

    if (isPublic) {
      setIsSubmitting(true);
      setSuccessMessage(null);
      setErrors({});

      try {
        const username =
          'username' in webPage && typeof (webPage as { username?: unknown }).username === 'string'
            ? (webPage as { username: string }).username
            : '';
        const res = await submitPublicWebPageForm(username, webPage.slug, section.id, formData);
        if (res.success) {
          setSuccessMessage(res.message || 'Thanks, your response has been recorded.');
          setFormData({});
        } else {
          setErrors(res.errors || {});
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to submit form.';
        setErrors({ general: [msg] });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <section id={anchorId || 'contact'} className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${isCompact ? 'px-3 py-3' : 'max-w-4xl px-6 py-12'}`}>
      {anchorId === 'contact' && (
        <div id={`contact-${section.id}`} className="scroll-mt-8 sm:scroll-mt-12" aria-hidden="true" />
      )}
      <div
        className="p-6 sm:p-12 border shadow-xs"
        style={{
          backgroundColor: settings.surface_color,
          borderColor: settings.border_color,
          borderRadius: surfaceRadius(settings),
        }}
      >
        <div className="mb-6 space-y-1">
          <h3 className={`font-black ${isCompact ? 'text-base' : 'text-2xl sm:text-3xl'}`}>
            {content.heading || 'Get in Touch'}
          </h3>
          <p className="text-xs font-medium" style={{ color: settings.muted_text_color }}>
            Send a direct message and we will respond promptly.
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errors.general && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{errors.general.join(', ')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot field to trap automated spam bots */}
          <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
            <label htmlFor={`hp_website_${section.id}`}>Do not fill this field</label>
            <input
              id={`hp_website_${section.id}`}
              name="hp_website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={formData.hp_website || ''}
              onChange={(e) => handleInputChange('hp_website', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field: FormFieldItem) => {
              const isWide = field.type === 'textarea';
              const fieldError = errors[`data.${field.key}`] || errors[field.key];
              const inputId = `field_${section.id}_${field.key}`;

              return (
                <div key={field.key} className={isWide ? 'sm:col-span-2' : ''}>
                  <label
                    htmlFor={inputId}
                    className="block text-[10px] font-black uppercase tracking-wider mb-1.5"
                    style={{ color: settings.muted_text_color }}
                  >
                    {field.label}
                    {field.required && <span className="text-rose-500"> *</span>}
                  </label>

                  {field.type === 'textarea' ? (
                    <textarea
                      id={inputId}
                      rows={isCompact ? 2 : 4}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      required={field.required}
                      disabled={isCompact || isSubmitting}
                      className="w-full text-xs font-medium p-3 bg-white/50 border focus:ring-2 outline-none transition"
                      style={{
                        borderColor: fieldError ? '#e11d48' : settings.border_color,
                        borderRadius: buttonRadius(settings),
                        color: settings.text_color,
                      }}
                    />
                  ) : (
                    <input
                      id={inputId}
                      type={field.type === 'phone' ? 'tel' : (field.type || 'text')}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      required={field.required}
                      disabled={isCompact || isSubmitting}
                      className="w-full text-xs font-medium p-3 bg-white/50 border focus:ring-2 outline-none transition"
                      style={{
                        borderColor: fieldError ? '#e11d48' : settings.border_color,
                        borderRadius: buttonRadius(settings),
                        color: settings.text_color,
                      }}
                    />
                  )}

                  {fieldError && (
                    <p className="text-[10px] text-rose-600 font-bold mt-1">
                      {fieldError.join(', ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={isCompact || isSubmitting}
            className={`font-black transition flex items-center justify-center gap-2 ${
              isCompact ? 'px-3 py-2 text-[10px]' : 'px-6 py-3 text-sm'
            } ${isSubmitting ? 'opacity-70 cursor-wait' : 'hover:-translate-y-0.5'}`}
            style={{
              backgroundColor: settings.accent_color,
              borderColor: settings.accent_color,
              borderRadius: buttonRadius(settings),
              color: contrastColor(settings.accent_color),
            }}
          >
            <span>{isSubmitting ? 'Sending...' : content.button_label || 'Send Message'}</span>
            {!isCompact && <ArrowRight size={14} />}
          </button>
        </form>
      </div>
    </section>
  );
}

// -------------------------------------------------------------
// 6 REUSABLE SECTION PRIMITIVES (BATCH B)
// -------------------------------------------------------------

function DynamicIcon({
  name,
  size = 20,
  className = '',
  style,
}: {
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  switch (name?.toLowerCase().replace(/[-_\s]+/g, '')) {
    case 'zap':
    case 'lightning':
      return <Zap size={size} className={className} style={style} />;
    case 'shield':
    case 'security':
      return <Shield size={size} className={className} style={style} />;
    case 'star':
      return <Star size={size} className={className} style={style} />;
    case 'award':
      return <Award size={size} className={className} style={style} />;
    case 'trendingup':
    case 'growth':
      return <TrendingUp size={size} className={className} style={style} />;
    case 'check':
    case 'checkmark':
      return <Check size={size} className={className} style={style} />;
    case 'clock':
    case 'time':
      return <Clock size={size} className={className} style={style} />;
    case 'user':
    case 'profile':
      return <User size={size} className={className} style={style} />;
    case 'layers':
      return <Layers size={size} className={className} style={style} />;
    case 'sparkles':
    default:
      return <Sparkles size={size} className={className} style={style} />;
  }
}

interface FeatureItemData {
  icon?: string;
  title?: string;
  description?: string;
}

function FeaturesBlock({ section, settings, isCompact, anchorId }: BlockBaseProps) {
  const content = section.content || {};
  const items = Array.isArray(content.items) ? (content.items as FeatureItemData[]) : [];
  const columns = Number(content.columns) || 3;

  const colClass =
    columns === 2
      ? 'md:grid-cols-2'
      : columns === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section
      id={anchorId}
      className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${
        isCompact ? 'px-3 py-4' : 'max-w-6xl px-6 py-10 sm:py-16'
      }`}
    >
      <div className="space-y-8 sm:space-y-12">
        {(content.heading || content.subheading) && (
          <div className="text-center max-w-2xl mx-auto space-y-3">
            {content.heading && (
              <h2
                className={`font-black tracking-tight break-words ${
                  isCompact ? 'text-lg' : 'text-2xl sm:text-3xl lg:text-4xl'
                }`}
              >
                {content.heading}
              </h2>
            )}
            {content.subheading && (
              <p
                className={`leading-relaxed break-words ${
                  isCompact ? 'text-xs' : 'text-sm sm:text-base'
                }`}
                style={{ color: settings.muted_text_color }}
              >
                {content.subheading}
              </p>
            )}
          </div>
        )}

        {items.length > 0 && (
          <div className={`grid grid-cols-1 ${colClass} gap-4 sm:gap-6`}>
            {items.map((item, idx) => (
              <div
                key={idx}
                className={`flex flex-col border shadow-2xs transition-all ${
                  isCompact
                    ? 'p-3 rounded-lg gap-2'
                    : 'p-6 rounded-2xl gap-3 hover:-translate-y-0.5'
                }`}
                style={{
                  backgroundColor: settings.surface_color,
                  borderColor: settings.border_color,
                  borderRadius: surfaceRadius(settings),
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${settings.accent_color || '#6366f1'}18`,
                    color: settings.accent_color,
                  }}
                >
                  <DynamicIcon name={item.icon} size={20} />
                </div>
                <div className="space-y-1">
                  <h3
                    className={`font-black tracking-tight break-words ${
                      isCompact ? 'text-xs' : 'text-base sm:text-lg'
                    }`}
                    style={{ color: settings.text_color }}
                  >
                    {item.title || 'Feature Title'}
                  </h3>
                  {item.description && (
                    <p
                      className={`leading-relaxed break-words ${
                        isCompact ? 'text-[11px]' : 'text-xs sm:text-sm'
                      }`}
                      style={{ color: settings.muted_text_color }}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface StatItemData {
  value?: string;
  label?: string;
  description?: string;
}

function StatsBlock({ section, settings, isCompact, anchorId }: BlockBaseProps) {
  const content = section.content || {};
  const items = Array.isArray(content.items) ? (content.items as StatItemData[]) : [];

  return (
    <section
      id={anchorId}
      className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${
        isCompact ? 'px-3 py-3' : 'max-w-6xl px-6 py-8 sm:py-14'
      }`}
    >
      <div className="space-y-6 sm:space-y-8">
        {content.heading && (
          <h2
            className={`font-black tracking-tight text-center break-words ${
              isCompact ? 'text-lg' : 'text-2xl sm:text-3xl'
            }`}
          >
            {content.heading}
          </h2>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {items.map((item, idx) => (
              <div
                key={idx}
                className={`text-center border shadow-2xs flex flex-col justify-center ${
                  isCompact ? 'p-3 rounded-lg' : 'p-5 sm:p-6 rounded-2xl'
                }`}
                style={{
                  backgroundColor: settings.surface_color,
                  borderColor: settings.border_color,
                  borderRadius: surfaceRadius(settings),
                }}
              >
                <div
                  className={`font-black tracking-tight break-words ${
                    isCompact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl lg:text-4xl'
                  }`}
                  style={{ color: settings.accent_color }}
                >
                  {item.value || '0'}
                </div>
                <div
                  className={`font-bold tracking-wider uppercase mt-1 sm:mt-2 break-words ${
                    isCompact ? 'text-[10px]' : 'text-xs sm:text-sm'
                  }`}
                  style={{ color: settings.text_color }}
                >
                  {item.label || 'Metric'}
                </div>
                {item.description && (
                  <p
                    className={`mt-1 leading-normal break-words ${
                      isCompact ? 'text-[10px]' : 'text-xs'
                    }`}
                    style={{ color: settings.muted_text_color }}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface GalleryImageData {
  url: string;
  alt?: string;
  caption?: string;
}

function GalleryBlock({ section, settings, isCompact, anchorId }: BlockBaseProps) {
  const content = section.content || {};
  const images = Array.isArray(content.images) ? (content.images as GalleryImageData[]) : [];

  return (
    <section
      id={anchorId}
      className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${
        isCompact ? 'px-3 py-4' : 'max-w-6xl px-6 py-10 sm:py-16'
      }`}
    >
      <div className="space-y-6 sm:space-y-8">
        {content.heading && (
          <h2
            className={`font-black tracking-tight text-center break-words ${
              isCompact ? 'text-lg' : 'text-2xl sm:text-3xl'
            }`}
          >
            {content.heading}
          </h2>
        )}

        {images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {images.map((img, idx) => (
              <figure
                key={idx}
                className="group relative overflow-hidden border shadow-2xs flex flex-col"
                style={{
                  backgroundColor: settings.surface_color,
                  borderColor: settings.border_color,
                  borderRadius: surfaceRadius(settings),
                }}
              >
                <div className="w-full aspect-4/3 sm:aspect-square overflow-hidden bg-slate-100">
                  <img
                    src={img.url}
                    alt={img.alt || `Gallery visual ${idx + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                {img.caption && (
                  <figcaption
                    className="p-3 text-xs font-medium leading-relaxed break-words"
                    style={{ color: settings.muted_text_color }}
                  >
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs font-bold text-slate-400 border border-dashed rounded-xl">
            No gallery images configured yet.
          </div>
        )}
      </div>
    </section>
  );
}

interface PricingPlanData {
  name: string;
  price: string;
  billing_period?: string;
  description?: string;
  features?: string[];
  cta_label?: string;
  cta_url?: string;
  is_popular?: boolean;
}

function PricingBlock({
  section,
  webPage,
  settings,
  isCompact,
  mode,
  anchorId,
}: BlockWithWebPageProps) {
  const content = section.content || {};
  const plans = Array.isArray(content.plans) ? (content.plans as PricingPlanData[]) : [];

  const gridClass =
    plans.length === 2
      ? 'md:grid-cols-2 max-w-4xl'
      : plans.length >= 3
      ? 'md:grid-cols-2 lg:grid-cols-3'
      : 'max-w-md';

  return (
    <section
      id={anchorId}
      className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${
        isCompact ? 'px-3 py-4' : 'max-w-6xl px-6 py-10 sm:py-16'
      }`}
    >
      <div className="space-y-8 sm:space-y-12">
        {content.heading && (
          <h2
            className={`font-black tracking-tight text-center break-words ${
              isCompact ? 'text-lg' : 'text-2xl sm:text-3xl lg:text-4xl'
            }`}
          >
            {content.heading}
          </h2>
        )}

        {plans.length > 0 && (
          <div className={`grid grid-cols-1 ${gridClass} mx-auto gap-6 sm:gap-8 items-stretch`}>
            {plans.map((plan, idx) => {
              const isPopular = Boolean(plan.is_popular);
              const features = Array.isArray(plan.features) ? plan.features : [];

              return (
                <div
                  key={idx}
                  className={`relative flex flex-col justify-between border transition-all ${
                    isPopular ? 'ring-2 shadow-lg -translate-y-1' : 'shadow-2xs'
                  } ${isCompact ? 'p-4 rounded-xl' : 'p-6 sm:p-8 rounded-2xl'}`}
                  style={{
                    backgroundColor: settings.surface_color,
                    borderColor: isPopular ? settings.accent_color : settings.border_color,
                    borderRadius: surfaceRadius(settings),
                  }}
                >
                  {isPopular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full shadow-xs whitespace-nowrap"
                      style={{
                        backgroundColor: settings.accent_color,
                        color: contrastColor(settings.accent_color),
                      }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div>
                    <h3
                      className={`font-black tracking-tight break-words ${
                        isCompact ? 'text-base' : 'text-xl'
                      }`}
                    >
                      {plan.name || 'Plan Name'}
                    </h3>
                    {plan.description && (
                      <p
                        className={`mt-1 leading-relaxed break-words ${
                          isCompact ? 'text-[11px]' : 'text-xs sm:text-sm'
                        }`}
                        style={{ color: settings.muted_text_color }}
                      >
                        {plan.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-baseline gap-1.5 flex-wrap">
                      <span
                        className={`font-black tracking-tight break-words ${
                          isCompact ? 'text-2xl' : 'text-3xl sm:text-4xl'
                        }`}
                        style={{ color: settings.text_color }}
                      >
                        {plan.price || '$0'}
                      </span>
                      {plan.billing_period && (
                        <span
                          className="text-xs sm:text-sm font-medium"
                          style={{ color: settings.muted_text_color }}
                        >
                          {plan.billing_period}
                        </span>
                      )}
                    </div>

                    {features.length > 0 && (
                      <ul className="mt-6 space-y-2.5 text-xs sm:text-sm">
                        {features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2.5 break-words">
                            <CheckCircle2
                              size={16}
                              className="shrink-0 mt-0.5"
                              style={{ color: settings.accent_color }}
                            />
                            <span className="font-medium" style={{ color: settings.text_color }}>
                              {feat}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100">
                    <CtaButton
                      label={plan.cta_label || 'Select Plan'}
                      url={plan.cta_url || '#contact'}
                      variant={isPopular ? 'primary' : 'secondary'}
                      webPage={webPage}
                      sectionId={section.id}
                      settings={settings}
                      isCompact={isCompact}
                      mode={mode}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

interface SocialLinkData {
  label: string;
  url: string;
}

function ProfileBlock({
  section,
  settings,
  isCompact,
  mode,
  anchorId,
}: BlockBaseProps & { mode: 'public' | 'preview' | 'thumbnail' }) {
  const content = section.content || {};
  const socialLinks = Array.isArray(content.social_links)
    ? (content.social_links as SocialLinkData[])
    : [];

  return (
    <section
      id={anchorId}
      className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${
        isCompact ? 'px-3 py-4' : 'max-w-4xl px-6 py-10 sm:py-16'
      }`}
    >
      <div
        className={`border shadow-xs ${
          isCompact ? 'p-4 rounded-xl' : 'p-6 sm:p-10 rounded-3xl'
        }`}
        style={{
          backgroundColor: settings.surface_color,
          borderColor: settings.border_color,
          borderRadius: surfaceRadius(settings),
        }}
      >
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 text-center md:text-left">
          {content.avatar_url ? (
            <div
              className={`overflow-hidden shrink-0 border-2 shadow-xs ${
                isCompact
                  ? 'w-20 h-20 rounded-full'
                  : 'w-28 h-28 sm:w-36 sm:h-36 rounded-2xl'
              }`}
              style={{ borderColor: settings.accent_color }}
            >
              <img
                src={content.avatar_url as string}
                alt={(content.name as string) || 'Profile photo'}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className={`flex items-center justify-center shrink-0 border-2 rounded-2xl bg-slate-100 ${
                isCompact ? 'w-20 h-20' : 'w-28 h-28 sm:w-36 sm:h-36'
              }`}
              style={{ borderColor: settings.border_color }}
            >
              <User size={isCompact ? 32 : 48} className="text-slate-400" />
            </div>
          )}

          <div className="space-y-3 flex-1 min-w-0">
            <div>
              <h2
                className={`font-black tracking-tight break-words ${
                  isCompact ? 'text-lg' : 'text-2xl sm:text-3xl'
                }`}
                style={{ color: settings.text_color }}
              >
                {(content.name as string) || 'Your Name'}
              </h2>
              {content.role && (
                <p
                  className={`font-bold mt-0.5 break-words ${
                    isCompact ? 'text-xs' : 'text-sm sm:text-base'
                  }`}
                  style={{ color: settings.accent_color }}
                >
                  {content.role as string}
                </p>
              )}
            </div>

            {content.bio && (
              <p
                className={`leading-relaxed break-words whitespace-pre-line ${
                  isCompact ? 'text-xs' : 'text-sm sm:text-base'
                }`}
                style={{ color: settings.muted_text_color }}
              >
                {content.bio as string}
              </p>
            )}

            {socialLinks.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                {socialLinks.map((link, idx) => {
                  const url = typeof link.url === 'string' ? link.url.trim() : '';
                  const isExternal = /^https?:\/\//i.test(url);

                  return (
                    <a
                      key={idx}
                      href={mode === 'thumbnail' ? '#' : url || '#'}
                      target={mode === 'public' && isExternal ? '_blank' : undefined}
                      rel={mode === 'public' && isExternal ? 'noopener noreferrer' : undefined}
                      onClick={(e) => {
                        if (mode === 'thumbnail') e.preventDefault();
                        if (mode === 'preview') {
                          e.preventDefault();
                          alert(`[Preview Mode] Social Link: "${link.label}" -> ${link.url}`);
                        }
                      }}
                      className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition hover:translate-y-[-1px] shadow-2xs"
                      style={{
                        backgroundColor: settings.surface_color,
                        borderColor: settings.border_color,
                        color: settings.text_color,
                      }}
                      aria-label={link.label || 'Social Link'}
                    >
                      <span>{link.label || 'Link'}</span>
                      <ExternalLink size={12} style={{ color: settings.accent_color }} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

interface TimelineStepData {
  time_or_step?: string;
  title?: string;
  description?: string;
}

function TimelineBlock({ section, settings, isCompact, anchorId }: BlockBaseProps) {
  const content = section.content || {};
  const steps = Array.isArray(content.steps) ? (content.steps as TimelineStepData[]) : [];

  return (
    <section
      id={anchorId}
      className={`mx-auto scroll-mt-8 sm:scroll-mt-12 ${
        isCompact ? 'px-3 py-4' : 'max-w-4xl px-6 py-10 sm:py-16'
      }`}
    >
      <div className="space-y-8 sm:space-y-12">
        {content.heading && (
          <h2
            className={`font-black tracking-tight text-center break-words ${
              isCompact ? 'text-lg' : 'text-2xl sm:text-3xl'
            }`}
            style={{ color: settings.text_color }}
          >
            {content.heading}
          </h2>
        )}

        {steps.length > 0 && (
          <div
            className="relative border-l-2 ml-4 sm:ml-8 pl-6 sm:pl-8 space-y-8 sm:space-y-10"
            style={{ borderColor: settings.border_color }}
          >
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                <span
                  className="absolute -left-[31px] sm:-left-[39px] top-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 bg-white"
                  style={{
                    borderColor: settings.accent_color,
                    backgroundColor: settings.surface_color,
                  }}
                />

                {step.time_or_step && (
                  <span
                    className="inline-block px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider rounded-md mb-1.5 break-words"
                    style={{
                      backgroundColor: `${settings.accent_color || '#6366f1'}18`,
                      color: settings.accent_color,
                    }}
                  >
                    {step.time_or_step}
                  </span>
                )}

                <h3
                  className={`font-black tracking-tight break-words ${
                    isCompact ? 'text-sm' : 'text-base sm:text-lg'
                  }`}
                  style={{ color: settings.text_color }}
                >
                  {step.title || 'Step Title'}
                </h3>

                {step.description && (
                  <p
                    className={`mt-1 leading-relaxed break-words ${
                      isCompact ? 'text-xs' : 'text-sm'
                    }`}
                    style={{ color: settings.muted_text_color }}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

