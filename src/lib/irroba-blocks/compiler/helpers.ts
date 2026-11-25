// Helpers puros compartilhados pelo compiler (cores, tipografia e limpeza de texto).
import { RADIUS_CSS, SERIF_FONT_PATTERN } from "@/lib/layout-patterns";

export const RADIUS_MAP = RADIUS_CSS;

export function colorWithAlpha(cssColor: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha));
  const trimmed = cssColor.trim();
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return `rgba(${r}, ${g}, ${b}, ${Number(clamped.toFixed(3))})`;
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${Number(clamped.toFixed(3))})`;
    }
  }
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${Number(clamped.toFixed(3))})`;
  }
  return clamped <= 0 ? "rgba(255, 255, 255, 0)" : trimmed;
}

export function splitHeadlineForItalicAccent(raw: string): { lead: string; accent: string } {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { lead: "Explore", accent: "Coleções" };
  }
  if (words.length === 1) {
    return { lead: "Explore", accent: words[0] };
  }
  if (words.length === 2) {
    return { lead: words[0], accent: words[1] };
  }
  return {
    lead: words.slice(0, -1).join(" "),
    accent: words[words.length - 1],
  };
}

const SERIF_FONTS = SERIF_FONT_PATTERN;

/** Fallback genérico coerente com a família (serifada ou não). */
export function fontFallback(fontName: string): string {
  return SERIF_FONTS.test(fontName) && !/sans/i.test(fontName) ? "serif" : "sans-serif";
}

/** Remove setas decorativas (↗ → etc.) usadas em títulos de vitrine/categoria. */
export function cleanAltText(text: string): string {
  return text
    .replace(/[\u2190-\u21FF\u2794\u279C\u27A4]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove atributos data-irb-* (usados só na prévia interativa) do HTML exportado. */
export function stripPreviewAttributes(html: string): string {
  return html.replace(/\s+data-irb-[a-z-]+="[^"]*"/g, "");
}
