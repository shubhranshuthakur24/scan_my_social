'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { WebPageTemplate } from '@/lib/api/webPagesService';
import { Check, ArrowRight, LayoutTemplate } from 'lucide-react';

interface WebPageTemplatePickerProps {
  templates: WebPageTemplate[];
  selectedKey?: string;
  onSelect: (template: WebPageTemplate) => void;
}

export default function WebPageTemplatePicker({
  templates,
  selectedKey,
  onSelect,
}: WebPageTemplatePickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const safeTemplates: WebPageTemplate[] = Array.isArray(templates)
    ? templates
    : Object.values(templates || {}).filter((item): item is WebPageTemplate => Boolean(item && typeof item === 'object' && 'key' in item));
  const categories = ['all', ...Array.from(new Set(safeTemplates.map((t) => t.category).filter(Boolean)))];

  const filteredTemplates = activeCategory === 'all'
    ? safeTemplates
    : safeTemplates.filter((t) => t.category.toLowerCase() === activeCategory.toLowerCase());

  const handleImageError = (templateKey: string) => {
    setFailedImages((prev) => ({ ...prev, [templateKey]: true }));
  };

  return (
    <div className="space-y-6">
      {/* Category Pills (WPT-01) */}
      <div
        role="group"
        aria-label="Filter templates by category"
        className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 max-w-full"
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              aria-pressed={isActive}
              aria-label={cat === 'all' ? 'All template categories' : `${cat} category`}
              onClick={() => setActiveCategory(cat)}
              className={`min-h-[44px] px-3.5 py-2 inline-flex items-center justify-center rounded-xl text-xs font-bold capitalize transition cursor-pointer select-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          );
        })}
      </div>

      {/* Templates Grid (WPT-02, WPT-05, WPT-07) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredTemplates.map((tpl) => {
          const isSelected = selectedKey === tpl.key;
          const imageFailed = Boolean(failedImages[tpl.key]);
          const normalizedKey = tpl.key.replace(/_/g, '-');
          const imageSrc = tpl.preview_image || `/images/web-page-templates/${normalizedKey}.jpg`;

          return (
            <button
              key={tpl.key}
              type="button"
              aria-pressed={isSelected}
              aria-label={isSelected ? `${tpl.name} template, selected` : `Select ${tpl.name} template`}
              onClick={() => onSelect(tpl)}
              className={`group text-left flex flex-col justify-between rounded-2xl border overflow-hidden cursor-pointer transition-all hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500 ${
                isSelected
                  ? 'border-primary-600 ring-2 ring-primary-500/25 bg-primary-50/20 shadow-xs'
                  : 'bg-white border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {/* Preview Image / Fallback Container */}
              <div className="relative h-40 bg-slate-100 overflow-hidden">
                {imageFailed ? (
                  /* WPT-05: Clean design-system error fallback */
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400 p-4 text-center select-none"
                    role="img"
                    aria-label={`${tpl.name} preview unavailable`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-400">
                      <LayoutTemplate size={20} aria-hidden="true" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">Preview unavailable</span>
                  </div>
                ) : (
                  /* WPT-07: Next.js Image Component */
                  <Image
                    src={imageSrc}
                    alt={`${tpl.name} preview`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition duration-500"
                    unoptimized={imageSrc.startsWith('http')}
                    onError={() => handleImageError(tpl.key)}
                  />
                )}

                {isSelected && (
                  <div
                    className="absolute top-2 right-2 bg-primary-600 text-white p-1 rounded-full shadow-sm z-10"
                    aria-hidden="true"
                  >
                    <Check size={14} />
                  </div>
                )}
                <span
                  className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md z-10"
                  aria-hidden="true"
                >
                  {tpl.category}
                </span>
              </div>

              {/* Body Content */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-primary-600 transition">
                    {tpl.name}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between min-h-[26px]">
                  <span className="text-[10px] font-bold text-slate-400">
                    {tpl.sections?.length || 0} sections
                  </span>
                  {isSelected && (
                    <span
                      className="text-xs font-black text-primary-700 inline-flex items-center gap-1"
                      aria-hidden="true"
                    >
                      Selected ✓
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
