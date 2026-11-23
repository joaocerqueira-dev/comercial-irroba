/** Normaliza URL de loja: aceita "loja.com.br", força https e valida domínio. Retorna null se inválida. */
export function normalizeStoreUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname)) return null;
    if (!/\.[a-z]{2,}$/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Máscara de WhatsApp: +55 (11) 99999-9999 */
export function formatWhatsapp(raw: string): string {
  let d = raw.replace(/\D/g, "").slice(0, 13);
  if (!d) return "";
  if (!d.startsWith("55") && d.length <= 11) d = `55${d}`.slice(0, 13);
  const cc = d.slice(0, 2);
  const ddd = d.slice(2, 4);
  const rest = d.slice(4);
  let out = `+${cc}`;
  if (ddd) out += ` (${ddd}`;
  if (ddd.length === 2) out += ")";
  if (rest) out += ` ${rest.length > 8 ? `${rest.slice(0, 5)}-${rest.slice(5)}` : rest.length > 4 ? `${rest.slice(0, 4)}-${rest.slice(4)}` : rest}`;
  return out;
}

/** WhatsApp válido: vazio (opcional) ou 55 + DDD + 8/9 dígitos. */
export function isValidWhatsapp(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  return d.length === 0 || /^55\d{2}9?\d{8}$/.test(d);
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
