/**
 * Converte caminhos internos (/api/captures/...) em URLs absolutas públicas
 * usadas no export para a Irroba. A base vem de PUBLIC_ASSET_BASE_URL; sem ela,
 * usa o fallback (normalmente window.location.origin), que só funciona localmente.
 */
export function normalizeBaseUrl(base: string | null | undefined): string | null {
  if (!base) return null;
  const trimmed = base.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

export function toAbsolutePublicUrl(
  url: string,
  base: string | null | undefined,
  fallbackOrigin?: string
): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return url;
  const b = normalizeBaseUrl(base) ?? normalizeBaseUrl(fallbackOrigin);
  return b ? `${b}${url}` : url;
}

const CAPTURE_ATTR_RE = /(src|href)=(["'])(\/api\/captures\/[^"']+)\2/g;
const CAPTURE_CSS_RE = /url\((["']?)(\/api\/captures\/[^"')]+)\1\)/g;

/** Reescreve src/href/url() que apontam para /api/captures no HTML exportado. */
export function absolutizeCaptureUrls(
  html: string,
  base: string | null | undefined,
  fallbackOrigin?: string
): string {
  return html
    .replace(CAPTURE_ATTR_RE, (_m, attr, q, p) => `${attr}=${q}${toAbsolutePublicUrl(p, base, fallbackOrigin)}${q}`)
    .replace(CAPTURE_CSS_RE, (_m, q, p) => `url(${q}${toAbsolutePublicUrl(p, base, fallbackOrigin)}${q})`);
}

/** Lista (sem repetição) os caminhos /api/captures referenciados num HTML. */
export function listCaptureUrls(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(CAPTURE_ATTR_RE)) found.add(m[3]);
  for (const m of html.matchAll(CAPTURE_CSS_RE)) found.add(m[2]);
  return [...found];
}
