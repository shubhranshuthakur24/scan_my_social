'use client';

import React, { useState } from 'react';
import { BioCard, BioThemeSettings, BioThemePreset } from '@/lib/api/socialBioLinksService';
import { AlertTriangle, CheckCircle2, Sliders, Type } from 'lucide-react';
import BioTemplatePicker from './BioTemplatePicker';

interface BioThemePickerProps {
  card: BioCard;
  theme: string;
  themeSettings: BioThemeSettings;
  themePresets: Record<string, BioThemePreset>;
  onDraftThemeChange: (theme: string, settings: BioThemeSettings) => void;
  onSaveTheme: () => Promise<void>;
  isMutating: boolean;
  isDirty: boolean;
}

// WCAG Contrast calculation helper
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  return null;
}

function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export default function BioThemePicker({
  card,
  theme,
  themeSettings,
  themePresets,
  onDraftThemeChange,
  onSaveTheme,
  isMutating,
  isDirty,
}: BioThemePickerProps) {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Contrast evaluations against active live draft settings
  const textContrast = calculateContrastRatio(themeSettings.background_color, themeSettings.text_color);
  const isTextContrastValid = textContrast >= 4.5;

  const buttonContrast = calculateContrastRatio(
    themeSettings.button_background_color,
    themeSettings.button_text_color
  );
  const isButtonContrastValid = buttonContrast >= 3.0;

  // Fully apply the selected template preset (layout, font, cover image, and colors)
  const handleSelectPreset = (presetKey: string) => {
    const preset = themePresets[presetKey];
    if (preset?.settings) {
      onDraftThemeChange(presetKey, {
        ...preset.settings,
      });
    } else {
      onDraftThemeChange(presetKey, themeSettings);
    }
  };

  const updateSetting = (key: keyof BioThemeSettings, value: unknown) => {
    onDraftThemeChange(theme, {
      ...themeSettings,
      [key]: value,
    });
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!isTextContrastValid) {
      setSaveError('Body text contrast ratio must be at least 4.5:1 against the background.');
      return;
    }

    if (!isButtonContrastValid) {
      setSaveError('Button text contrast ratio must be at least 3.0:1 against button background.');
      return;
    }

    try {
      await onSaveTheme();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save theme';
      setSaveError(message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-sm font-black text-slate-900">Templates & Visual Theme</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Choose a designer-crafted starting template with complete layout, imagery, and typography, or customize individual styling. Live changes preview immediately on the phone simulator.
        </p>
      </div>

      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span>Theme and design settings saved successfully.</span>
        </div>
      )}

      {/* 1. High-Fidelity Template Picker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">Choose a Template</label>
          <span className="text-[11px] text-slate-400">Selecting applies complete visual direction</span>
        </div>
        <BioTemplatePicker
          presets={themePresets}
          selectedTheme={theme}
          onSelect={handleSelectPreset}
          displayName={card.display_name}
          username={card.username}
          dense={true}
        />
      </div>

      {/* Divider */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-slate-900 font-bold">
        <Sliders size={15} className="text-primary-600" />
        <span className="text-xs font-black">Fine-Tune Styling & Geometry</span>
      </div>

      {/* Custom Color Controls */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
        <h3 className="text-xs font-bold text-slate-800">Custom Color Palette</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Background */}
          <div>
            <label htmlFor="theme-bg-hex" className="block text-[11px] font-bold text-slate-600 mb-1">Page Background</label>
            <div className="flex items-center gap-2">
              <input
                id="theme-bg-color"
                type="color"
                value={themeSettings.background_color}
                aria-label="Page background color picker"
                onChange={(e) => updateSetting('background_color', e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
              />
              <input
                id="theme-bg-hex"
                type="text"
                value={themeSettings.background_color}
                aria-label="Page background hex code"
                onChange={(e) => updateSetting('background_color', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono text-slate-700 uppercase"
              />
            </div>
          </div>

          {/* Text Color */}
          <div>
            <label htmlFor="theme-text-hex" className="block text-[11px] font-bold text-slate-600 mb-1">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                id="theme-text-color"
                type="color"
                value={themeSettings.text_color}
                aria-label="Text color picker"
                onChange={(e) => updateSetting('text_color', e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
              />
              <input
                id="theme-text-hex"
                type="text"
                value={themeSettings.text_color}
                aria-label="Text color hex code"
                onChange={(e) => updateSetting('text_color', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono text-slate-700 uppercase"
              />
            </div>
          </div>

          {/* Button Background */}
          <div>
            <label htmlFor="theme-btn-bg-hex" className="block text-[11px] font-bold text-slate-600 mb-1">Button Background</label>
            <div className="flex items-center gap-2">
              <input
                id="theme-btn-bg-color"
                type="color"
                value={themeSettings.button_background_color}
                aria-label="Button background color picker"
                onChange={(e) => updateSetting('button_background_color', e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
              />
              <input
                id="theme-btn-bg-hex"
                type="text"
                value={themeSettings.button_background_color}
                aria-label="Button background hex code"
                onChange={(e) => updateSetting('button_background_color', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono text-slate-700 uppercase"
              />
            </div>
          </div>

          {/* Button Text */}
          <div>
            <label htmlFor="theme-btn-text-hex" className="block text-[11px] font-bold text-slate-600 mb-1">Button Text</label>
            <div className="flex items-center gap-2">
              <input
                id="theme-btn-text-color"
                type="color"
                value={themeSettings.button_text_color}
                aria-label="Button text color picker"
                onChange={(e) => updateSetting('button_text_color', e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
              />
              <input
                id="theme-btn-text-hex"
                type="text"
                value={themeSettings.button_text_color}
                aria-label="Button text hex code"
                onChange={(e) => updateSetting('button_text_color', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono text-slate-700 uppercase"
              />
            </div>
          </div>
        </div>

        {/* Contrast Ratio Feedback Badges */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200/60 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Text vs Background:</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                isTextContrastValid
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {textContrast}:1 {isTextContrastValid ? '✓ WCAG AA' : '✕ Low Contrast (min 4.5)'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Button Contrast:</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                isButtonContrastValid
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {buttonContrast}:1 {isButtonContrastValid ? '✓ Pass' : '✕ Low Contrast (min 3.0)'}
            </span>
          </div>
        </div>
      </div>

      {/* Button Geometry, Layout Variant & Typography */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Button Style */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Button Shape</label>
          <div role="radiogroup" aria-label="Button Shape" className="grid grid-cols-3 gap-2">
            {(['rounded', 'pill', 'sharp'] as const).map((style) => (
              <button
                key={style}
                type="button"
                role="radio"
                aria-checked={themeSettings.button_style === style}
                onClick={() => updateSetting('button_style', style)}
                className={`py-2 px-2 text-xs font-bold capitalize transition border cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  themeSettings.button_style === style
                    ? 'border-primary-600 bg-primary-50 text-primary-600 ring-1 ring-primary-600'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                } ${
                  style === 'rounded'
                    ? 'rounded-xl'
                    : style === 'pill'
                    ? 'rounded-full'
                    : 'rounded-none'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Layout Variant */}
        <div>
          <label htmlFor="theme-layout-variant" className="block text-xs font-bold text-slate-700 mb-1.5">Layout Variant</label>
          <select
            id="theme-layout-variant"
            value={themeSettings.layout || 'editorial'}
            onChange={(e) => updateSetting('layout', e.target.value as BioThemeSettings['layout'])}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-primary-500 focus:outline-hidden capitalize"
          >
            <option value="editorial">Editorial (Classic Center)</option>
            <option value="immersive">Immersive (Full Bleed)</option>
            <option value="split">Split (Compact Grid)</option>
            <option value="poster">Poster (Hero Header)</option>
            <option value="cinematic">Cinematic (Bold Accents)</option>
            <option value="portrait">Portrait (Avatar Focus)</option>
            <option value="gallery">Gallery (Visual Drops)</option>
          </select>
        </div>

        {/* Font Style */}
        <div>
          <label htmlFor="theme-font-style" className="block text-xs font-bold text-slate-700 mb-1.5">Typography Font</label>
          <select
            id="theme-font-style"
            value={themeSettings.font_style || 'sans'}
            onChange={(e) => updateSetting('font_style', e.target.value as BioThemeSettings['font_style'])}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-primary-500 focus:outline-hidden capitalize"
          >
            <option value="sans">Modern Sans (Default)</option>
            <option value="serif">Refined Serif (Editorial)</option>
            <option value="mono">Clean Mono (Technical)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
