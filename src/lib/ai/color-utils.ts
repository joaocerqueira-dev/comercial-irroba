/**
 * Color normalization, luminance, and WCAG contrast helpers for Irroba LIME theme tokens.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function parseColorToRgb(input: string | undefined | null): RgbColor | null {
  if (!input) return null;
  const raw = input.trim().toLowerCase();

  if (raw.startsWith("#")) {
    const hex = raw.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    return null;
  }

  const rgbMatch = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    const alpha = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    if (alpha === 0) return null; // transparent
    return {
      r: Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))),
      g: Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))),
      b: Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))),
    };
  }

  return null;
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function normalizeHex(input: string | undefined | null, fallback: string): string {
  const rgb = parseColorToRgb(input);
  if (!rgb) return fallback;
  return rgbToHex(rgb);
}

export function relativeLuminance(rgb: RgbColor): number {
  const transform = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(rgb.r) + 0.7152 * transform(rgb.g) + 0.0722 * transform(rgb.b);
}

export function getContrastingForeground(bgHex: string): "#FFFFFF" | "#111827" {
  const rgb = parseColorToRgb(bgHex);
  if (!rgb) return "#FFFFFF";
  const lum = relativeLuminance(rgb);
  return lum > 0.42 ? "#111827" : "#FFFFFF";
}

export function isNearWhiteOrBlack(hex: string): boolean {
  const rgb = parseColorToRgb(hex);
  if (!rgb) return true;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lum = relativeLuminance(rgb);
  return saturation < 0.12 && (lum > 0.85 || lum < 0.05);
}

export function darkenHex(hex: string, amount = 0.2): string {
  const rgb = parseColorToRgb(hex);
  if (!rgb) return "#111827";
  return rgbToHex({
    r: Math.max(0, rgb.r * (1 - amount)),
    g: Math.max(0, rgb.g * (1 - amount)),
    b: Math.max(0, rgb.b * (1 - amount)),
  });
}

export function lightenHex(hex: string, amount = 0.88): string {
  const rgb = parseColorToRgb(hex);
  if (!rgb) return "#F8FAFC";
  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  });
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = parseColorToRgb(hexA);
  const b = parseColorToRgb(hexB);
  if (!a || !b) return 1;
  const lumA = relativeLuminance(a);
  const lumB = relativeLuminance(b);
  const brightest = Math.max(lumA, lumB);
  const darkest = Math.min(lumA, lumB);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

export function isLightColor(hex: string): boolean {
  const rgb = parseColorToRgb(hex);
  if (!rgb) return true;
  return relativeLuminance(rgb) > 0.5;
}
