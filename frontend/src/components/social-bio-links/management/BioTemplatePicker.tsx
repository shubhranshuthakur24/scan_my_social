'use client';

import React, { useMemo, useState } from 'react';
import { BioThemePreset } from '@/lib/api/socialBioLinksService';
import { Check, Sparkles } from 'lucide-react';
import { BIO_ICON_MAP } from '@/components/social-bio-links/BioIcons';
import { pickReadableText, withAlpha } from '@/lib/utils/themeColors';

interface BioTemplatePickerProps {
  presets: Record<string, BioThemePreset>;
  selectedTheme: string;
  onSelect: (themeKey: string) => void;
  displayName?: string;
  username?: string;
  dense?: boolean;
}

const fontClassMap: Record<string, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

const radiusMap: Record<string, string> = {
  rounded: 'rounded-md',
  pill: 'rounded-full',
  sharp: 'rounded-none',
};

export default function BioTemplatePicker({
  presets,
  selectedTheme,
  onSelect,
  displayName = 'Creator Name',
  username = 'creator',
  dense = false,
}: BioTemplatePickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const list = Object.values(presets)
      .map((p) => p.category)
      .filter((c): c is string => Boolean(c));
    return ['All', ...Array.from(new Set(list))];
  }, [presets]);

  const visiblePresets = useMemo(() => {
    return Object.entries(presets).filter(([, preset]) => {
      if (activeCategory === 'All') return true;
      return preset.category === activeCategory;
    });
  }, [presets, activeCategory]);

  return (
    <div className="space-y-4">
      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer select-none ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div
        className={`grid grid-cols-2 ${
          dense ? 'sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
        }`}
      >
        {visiblePresets.map(([key, preset]) => {
          const isSelected = selectedTheme === key;
          const s = preset.settings;
          const layout = s.layout || 'editorial';
          const fontClass = fontClassMap[s.font_style || 'sans'] || 'font-sans';
          const buttonRadius = radiusMap[s.button_style || 'rounded'] || 'rounded-md';
          const safeBtnText = pickReadableText(s.button_background_color, s.button_text_color);
          const safePageText = pickReadableText(s.background_color, s.text_color);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`group text-left cursor-pointer transition flex flex-col focus:outline-hidden ${
                isSelected ? 'scale-[1.01]' : 'hover:-translate-y-0.5'
              }`}
            >
              {/* Aspect-[9/14] Live Miniature Card */}
              <div
                className={`relative w-full aspect-[9/14] rounded-2xl overflow-hidden border-2 transition-all duration-200 flex flex-col justify-between shadow-xs select-none ${
                  isSelected
                    ? 'border-primary-600 ring-2 ring-primary-500/25 shadow-md shadow-primary-500/10'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
                style={{
                  backgroundColor: s.background_color,
                  color: safePageText,
                }}
              >
                {/* 1. IMMERSIVE LAYOUT */}
                {layout === 'immersive' && (
                  <div className="relative w-full h-full flex flex-col justify-end p-2.5 sm:p-3 text-white overflow-hidden">
                    <div className="absolute inset-0">
                      {s.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.cover_image}
                          alt={preset.label}
                          className="w-full h-full object-cover"
                          style={{ objectPosition: '70% center' }}
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(160deg, ${s.button_background_color}, ${s.background_color})`,
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/90" />
                    </div>

                    <div className="relative z-10 space-y-2">
                      <div className="space-y-0.5">
                        <span className={`text-xs font-black leading-tight block truncate ${fontClass}`}>
                          {displayName}
                        </span>
                        <span className="text-[9px] font-mono text-white/75 block">
                          @{username}
                        </span>
                      </div>
                      <div className="space-y-1.5 w-full">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className={`w-full h-6 sm:h-7 ${buttonRadius} flex items-center px-2 text-[9px] font-bold shadow-xs truncate`}
                            style={{
                              backgroundColor: s.button_background_color,
                              color: safeBtnText,
                            }}
                          >
                            Sample Link {i}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. POSTER LAYOUT */}
                {layout === 'poster' && (
                  <div
                    className="relative w-full h-full flex flex-col justify-between p-3 overflow-hidden"
                    style={{
                      backgroundImage: `radial-gradient(circle at 78% 12%, ${withAlpha(s.button_background_color, 0.45)} 0, transparent 34%), linear-gradient(145deg, ${s.background_color} 18%, ${s.button_background_color}44 100%)`,
                    }}
                  >
                    <div className="space-y-1 pt-1">
                      <span className="text-[8px] font-mono uppercase tracking-[0.2em] opacity-60 block">
                        @{username}
                      </span>
                      <span className={`text-lg sm:text-xl font-black uppercase leading-[0.92] tracking-tight block line-clamp-2 ${fontClass}`}>
                        {displayName}
                      </span>
                    </div>
                    <div className="space-y-1.5 w-full pt-2">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className={`w-full h-6 sm:h-7 ${buttonRadius} flex items-center justify-center text-[9px] font-black uppercase shadow-xs`}
                          style={{
                            backgroundColor: s.button_background_color,
                            color: safeBtnText,
                          }}
                        >
                          Link {i}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. PORTRAIT LAYOUT */}
                {layout === 'portrait' && (
                  <div
                    className="relative w-full h-full flex flex-col justify-between items-center text-center p-3 overflow-hidden"
                    style={{
                      backgroundImage: `radial-gradient(circle at 50% 32%, ${withAlpha(s.button_background_color, 0.22)} 0, ${withAlpha(s.button_background_color, 0.22)} 30%, transparent 30.5%)`,
                    }}
                  >
                    <div className="flex flex-col items-center pt-2 space-y-1">
                      <div
                        className="w-12 h-12 rounded-full border-2 shadow-xs flex items-center justify-center text-xs font-black shrink-0"
                        style={{
                          borderColor: s.button_background_color,
                          backgroundColor: withAlpha(s.button_background_color, 0.15),
                        }}
                      >
                        {(displayName || username || 'A')[0].toUpperCase()}
                      </div>
                      <div className="pt-0.5">
                        <span className={`text-xs font-black block truncate max-w-[130px] ${fontClass}`}>
                          {displayName}
                        </span>
                        <span className="text-[9px] font-mono opacity-65">@{username}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 w-full">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className={`w-full h-6 sm:h-7 ${buttonRadius} flex items-center justify-center text-[9px] font-bold shadow-xs`}
                          style={{
                            backgroundColor: s.button_background_color,
                            color: safeBtnText,
                          }}
                        >
                          Sample Link {i}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. CINEMATIC LAYOUT */}
                {layout === 'cinematic' && (
                  <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
                    <div className="h-[55%] w-full relative overflow-hidden shrink-0">
                      {s.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.cover_image}
                          alt={preset.label}
                          className="w-full h-full object-cover"
                          style={{ objectPosition: 'center 38%' }}
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, ${s.button_background_color}55, ${s.background_color})`,
                          }}
                        />
                      )}
                      <div
                        className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
                        style={{
                          background: `linear-gradient(180deg, transparent 0%, ${s.background_color} 100%)`,
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 px-2.5 pb-1 text-center">
                        <span className={`text-xs font-black block truncate ${fontClass}`}>
                          {displayName}
                        </span>
                        <span className="text-[9px] font-mono opacity-65">@{username}</span>
                      </div>
                    </div>
                    <div className="p-2.5 pt-0 space-y-1.5 w-full">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className={`w-full h-6 sm:h-7 ${buttonRadius} flex items-center justify-center text-[9px] font-bold shadow-xs`}
                          style={{
                            backgroundColor: s.button_background_color,
                            color: safeBtnText,
                          }}
                        >
                          Sample Link {i}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. GALLERY LAYOUT */}
                {layout === 'gallery' && (
                  <div className="relative w-full h-full flex flex-col justify-between p-2.5 overflow-hidden">
                    <div className="text-center pt-0.5">
                      <span className={`text-xs font-black block truncate ${fontClass}`}>
                        {displayName}
                      </span>
                      <span className="text-[9px] font-mono opacity-65">@{username}</span>
                    </div>

                    <div className="h-16 grid grid-cols-[0.7fr_1.3fr_0.7fr] gap-1 overflow-hidden rounded-lg">
                      {['left center', 'center center', 'right center'].map((pos, idx) => (
                        <div key={idx} className="overflow-hidden bg-black/10 h-full">
                          {s.cover_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.cover_image}
                              alt={preset.label}
                              className="w-full h-full object-cover"
                              style={{ objectPosition: pos }}
                            />
                          ) : (
                            <div
                              className="w-full h-full"
                              style={{
                                background: `linear-gradient(145deg, ${s.button_background_color}, ${s.background_color})`,
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 w-full">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className={`w-full h-6 sm:h-7 ${buttonRadius} flex items-center justify-center text-[9px] font-bold shadow-xs`}
                          style={{
                            backgroundColor: s.button_background_color,
                            color: safeBtnText,
                          }}
                        >
                          Sample Link {i}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. SPLIT LAYOUT */}
                {layout === 'split' && (
                  <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
                    <div className="h-[46%] w-full relative overflow-hidden shrink-0">
                      {s.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.cover_image}
                          alt={preset.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, ${s.button_background_color}44, ${s.background_color})`,
                          }}
                        />
                      )}
                    </div>

                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div className="text-left">
                        <span className={`text-xs font-black block truncate leading-tight ${fontClass}`}>
                          {displayName}
                        </span>
                        <span className="text-[9px] font-mono opacity-60">@{username}</span>
                      </div>

                      <div className="space-y-1.5 w-full pt-1">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className={`w-full h-6 sm:h-7 ${buttonRadius} flex items-center justify-center text-[9px] font-bold shadow-xs`}
                            style={{
                              backgroundColor: s.button_background_color,
                              color: safeBtnText,
                            }}
                          >
                            Sample Link {i}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. EDITORIAL LAYOUT (DEFAULT - Atelier, etc.) */}
                {layout !== 'immersive' &&
                  layout !== 'poster' &&
                  layout !== 'portrait' &&
                  layout !== 'cinematic' &&
                  layout !== 'gallery' &&
                  layout !== 'split' && (
                    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
                      {/* Top cover preview - fills full width edge-to-edge */}
                      <div className="h-[44%] w-full relative overflow-hidden shrink-0">
                        {s.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.cover_image}
                            alt={preset.label}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{
                              background: `linear-gradient(135deg, ${s.button_background_color}33, ${s.background_color})`,
                            }}
                          />
                        )}
                      </div>

                      {/* Middle Info with overlapping avatar */}
                      <div className="px-2.5 -mt-5 text-center flex flex-col items-center relative z-10">
                        <div
                          className="w-10 h-10 rounded-full border-2 shadow-xs flex items-center justify-center text-xs font-black bg-white shrink-0"
                          style={{
                            borderColor: s.background_color,
                            color: s.text_color,
                          }}
                        >
                          {(displayName || username || 'A')[0].toUpperCase()}
                        </div>
                        <span className={`text-xs font-black leading-tight truncate max-w-[90%] mt-1 ${fontClass}`}>
                          {displayName}
                        </span>
                        <span className="text-[9px] font-mono opacity-60">@{username}</span>
                      </div>

                      {/* Links */}
                      <div className="p-2.5 pt-1 space-y-1.5 w-full">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className={`w-full h-6 sm:h-7 ${buttonRadius} flex items-center justify-center text-[9px] font-bold shadow-xs`}
                            style={{
                              backgroundColor: s.button_background_color,
                              color: safeBtnText,
                            }}
                          >
                            Sample Link {i}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Selection Check Badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md z-20">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Template Label & Metadata Below */}
              <div className="mt-2 flex items-start justify-between gap-1.5 px-0.5">
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{preset.label}</p>
                  <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider truncate">
                    {preset.category || 'Creator'}
                  </p>
                </div>
                {isSelected && (
                  <span className="text-[9px] font-black text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-md border border-primary-200 shrink-0">
                    Selected
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
