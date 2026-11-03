'use client';

import React from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import type { SavedFilterPresetsProps } from './types';

export default function SavedFilterPresets({
  presets,
  onApplyPreset,
  onDeletePreset,
}: SavedFilterPresetsProps) {
  if (!presets || presets.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        Saved Presets:
      </span>
      {presets.map((preset) => (
        <div
          key={preset.id}
          onClick={() => onApplyPreset(preset)}
          className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors cursor-pointer"
        >
          <Bookmark size={12} className="text-slate-400 group-hover:text-primary-600" />
          <span>{preset.name}</span>
          <button
            type="button"
            onClick={(e) => onDeletePreset(preset.id, e)}
            title="Delete preset"
            className="text-slate-300 hover:text-rose-500 ml-0.5 cursor-pointer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
