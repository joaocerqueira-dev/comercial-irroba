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

export function sanitizeCssColor(color: string | undefined | null, fallback = "#111827"): string {
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

export function sanitizeFontName(font: string | undefined | null, fallback = "Poppins"): string {
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
