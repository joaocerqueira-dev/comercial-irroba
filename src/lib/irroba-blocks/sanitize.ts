import { FONT_FALLBACKS, PALETTE } from "@/lib/layout-patterns";
/**
 * Utilities to sanitize scraped store content before compiling HTML/CSS blocks.
 */

export function escapeHtml(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttr(input: string | undefined | null): string {
  return escapeHtml(input).replaceAll("`", "&#96;");
}

export function sanitizeUrl(url: string | undefined | null, fallback = "#"): string {
  if (!url) return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/** JSON seguro para interpolar dentro de <script>: escapa <, >, &, U+2028 e U+2029. */
export function safeJsonForScript(value: unknown): string {
  return (JSON.stringify(value) ?? "null")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Texto seguro dentro de comentário CSS (impede fechar o comentário ou abrir tags). */
export function escapeCssComment(input: string | undefined | null): string {
  if (!input) return "";
  return input.replace(/\*\//g, "* /").replace(/\/\*/g, "/ *").replace(/[<>]/g, "");
}

export function sanitizeCssColor(color: string | undefined | null, fallback: string = PALETTE.ink): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function sanitizeFontName(font: string | undefined | null, fallback: string = FONT_FALLBACKS.body): string {
  if (!font) return fallback;
  const cleaned = font.replace(/['";{}<>]/g, "").split(",")[0]?.trim();
  return cleaned || fallback;
}

export function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function escapeCsvCell(value: string | number | undefined | null): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes(";")) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}
