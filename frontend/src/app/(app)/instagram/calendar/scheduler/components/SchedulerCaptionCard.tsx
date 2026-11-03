'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { Info, Sparkles, Hash } from 'lucide-react';
import { MediaFormat } from './SchedulerFormatCard';

export interface SchedulerCaptionCardProps {
  format: MediaFormat;
  caption: string;
  setCaption: (val: string) => void;
  hashtags: string[];
  setHashtags: React.Dispatch<React.SetStateAction<string[]>>;
  customTagInput: string;
  setCustomTagInput: (val: string) => void;
  handleAddHashtag: (tag: string) => void;
  handleRemoveHashtag: (tag: string) => void;
  triggerToast: (msg: string) => void;
  className?: string;
}

export default function SchedulerCaptionCard({
  format,
  caption,
  setCaption,
  hashtags,
  setHashtags,
  customTagInput,
  setCustomTagInput,
  handleAddHashtag,
  handleRemoveHashtag,
  triggerToast,
  className = '',
}: SchedulerCaptionCardProps) {
  if (format === 'story') {
    return (
      <div className={`rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 shadow-2xs space-y-2 ${className}`}>
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">4. Story Content Details</span>
        <div className="p-3.5 rounded-xl bg-primary-50 border border-primary-200/60 text-xs font-semibold text-primary-900 flex items-center gap-2.5">
          <Info size={18} className="text-primary-600 shrink-0" />
          <span>Instagram Stories are 24-hour fullscreen broadcasts. Captions and hashtags are not supported on Stories via the Meta Content Publishing API.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">4. Post Caption & Hashtags</span>
        <span className="text-[10px] font-bold text-slate-400">{caption.length} / 2,200 chars</span>
      </div>

      {/* Caption Textarea */}
      <div className="space-y-1.5">
        <textarea
          rows={5}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write your post caption here..."
          className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Hashtag Manager */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Hashtags ({hashtags.length} / 30)
          </span>
          {hashtags.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(hashtags.join(' '));
                  triggerToast('Copied all hashtags to clipboard!');
                }}
                className="text-[10px] font-bold text-primary-600 hover:underline cursor-pointer"
              >
                Copy All
              </button>
              <button
                type="button"
                onClick={() => setHashtags([])}
                className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Active Hashtag Pills */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 bg-primary-50 border border-primary-200/80 text-primary-700 px-2.5 py-1 rounded-xl text-xs font-bold shadow-2xs"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveHashtag(tag)}
                  className="hover:text-rose-600 font-black ml-0.5 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Preset Hashtag Suggestions */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-semibold text-slate-400 block">Recommended Viral Tags:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {['viral', 'reelsinstagram', 'contentcreator', 'aigrowth', 'instagramtips', 'growthhacking', 'creatorlife'].map((preset) => {
              const isSelected = hashtags.includes(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddHashtag(preset)}
                  disabled={isSelected}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-slate-100/80 hover:bg-primary-100 text-slate-700 hover:text-primary-800 border border-slate-200/60'
                  }`}
                >
                  + #{preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Hashtag Input */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddHashtag(customTagInput);
              }
            }}
            placeholder="Type hashtag and press Enter (e.g. #marketing)..."
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleAddHashtag(customTagInput)}
          >
            Add Tag
          </Button>
        </div>
      </div>
    </div>
  );
}
