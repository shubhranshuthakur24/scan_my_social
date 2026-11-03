export function normalizeHex(color?: string | null, fallback = '#111827'): string {
  if (typeof color !== 'string') {
    return fallback;
  }

  let value = color.trim();
  if (!value.startsWith('#')) {
    value = `#${value}`;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase();
  }

  return fallback;
}

export function hexToRgb(color?: string | null): { r: number; g: number; b: number } {
  const hex = normalizeHex(color);

  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function srgbToLinear(channel: number): number {
  const value = channel / 255;
  if (value <= 0.03928) {
    return value / 12.92;
  }
  return ((value + 0.055) / 1.055) ** 2.4;
}

export function luminance(color?: string | null): number {
  const rgb = hexToRgb(color);
  return (
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b)
  );
}

export function contrastRatio(background?: string | null, foreground?: string | null): number {
  const bg = luminance(background);
  const fg = luminance(foreground);
  const lighter = Math.max(bg, fg);
  const darker = Math.min(bg, fg);
  return (lighter + 0.05) / (darker + 0.05);
}

export function pickReadableText(
  background?: string | null,
  preferredText?: string | null,
  minRatio = 4.5
): string {
  const preferred = normalizeHex(preferredText, '#111827');
  const bg = normalizeHex(background, '#ffffff');

  if (contrastRatio(bg, preferred) >= minRatio) {
    return preferred;
  }

  const white = '#ffffff';
  const nearBlack = '#111827';

  return contrastRatio(bg, white) >= contrastRatio(bg, nearBlack) ? white : nearBlack;
}

export function mixHex(baseColor?: string | null, mixColor?: string | null, mixRatio = 0.5): string {
  const base = hexToRgb(baseColor);
  const mix = hexToRgb(mixColor);
  const ratio = Math.max(0, Math.min(1, mixRatio));

  const blended = {
    r: Math.round(base.r * (1 - ratio) + mix.r * ratio),
    g: Math.round(base.g * (1 - ratio) + mix.g * ratio),
    b: Math.round(base.b * (1 - ratio) + mix.b * ratio),
  };

  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');

  return `#${toHex(blended.r)}${toHex(blended.g)}${toHex(blended.b)}`;
}

export function withAlpha(color?: string | null, alpha = 1): string {
  const rgb = hexToRgb(color);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
}
