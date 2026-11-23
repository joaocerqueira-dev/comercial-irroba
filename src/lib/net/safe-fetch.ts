import { isPublicHttpUrl } from "./safe-url";

export const MAX_REDIRECTS = 5;

const isRedirect = (status: number) => status >= 300 && status < 400;

/**
 * fetch com redirect: "manual": cada salto é revalidado com isPublicHttpUrl
 * (no máximo MAX_REDIRECTS). Retorna null se algum destino for interno,
 * se houver saltos demais ou se o redirecionamento não tiver Location.
 */
export async function fetchPublic(
  url: string,
  init: Omit<RequestInit, "redirect"> = {},
  maxRedirects = MAX_REDIRECTS
): Promise<Response | null> {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!(await isPublicHttpUrl(current))) return null;
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (!isRedirect(res.status)) return res;
    const location = res.headers.get("location");
    await res.body?.cancel().catch(() => undefined);
    if (!location) return null;
    current = new URL(location, current).toString();
  }
  return null;
}

/** Mesmo controle de saltos para um cliente genérico (ex.: APIRequestContext do Playwright com maxRedirects: 0). */
export async function followPublicRedirects<R>(
  url: string,
  request: (url: string) => Promise<R>,
  getRedirect: (res: R) => { status: number; location?: string | null },
  maxRedirects = MAX_REDIRECTS
): Promise<R | null> {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!(await isPublicHttpUrl(current))) return null;
    const res = await request(current);
    const { status, location } = getRedirect(res);
    if (!isRedirect(status)) return res;
    if (!location) return null;
    current = new URL(location, current).toString();
  }
  return null;
}
