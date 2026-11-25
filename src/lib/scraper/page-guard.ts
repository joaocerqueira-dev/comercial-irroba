import type { Page, Request as PwRequest, Response as PwResponse } from "playwright";
import { MAX_REDIRECTS } from "@/lib/net/safe-fetch";
import { assertPublicHttpUrl, isPublicHttpUrl, UnsafeUrlError } from "@/lib/net/safe-url";

export const BLOCKED_TRACKER_PATTERNS = [
  "googletagmanager.com",
  "google-analytics.com",
  "analytics.google.com",
  "connect.facebook.net",
  "facebook.com/tr",
  "static.hotjar.com",
  "clarity.ms",
  "analytics.tiktok.com",
  "code.jivosite.com",
  "d335luupugsy2.cloudfront.net",
  "doubleclick.net",
  "googlesyndication.com",
];

const isRedirect = (status: number) => status >= 300 && status < 400;

/**
 * Bloqueia requisições do navegador para a rede interna (SSRF).
 *
 * O Chromium segue redirects de navegação SEM chamar o handler de `page.route` de novo.
 * Por isso, em navegações (documento principal e iframes), o próprio handler busca a
 * resposta com `maxRedirects: 0` e valida cada salto. Se houve redirect, devolve ao
 * navegador um 302 direto para o destino final já validado (assim a URL da página e os
 * caminhos relativos ficam corretos). Esse último salto o navegador faz sozinho; a
 * checagem de `assertNavigationChainPublic` depois do `goto` cobre o caso de o destino
 * mudar entre a validação e o acesso.
 *
 * Limitação: redirects de sub-recursos (img, script, css) também não passam pelo handler.
 * Só o primeiro destino deles é validado; a defesa restante é o egress do container.
 */
export async function installSsrfGuard(page: Page, { timeoutMs = 20_000 } = {}): Promise<void> {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const rawUrl = request.url();
    const lower = rawUrl.toLowerCase();
    if (BLOCKED_TRACKER_PATTERNS.some((p) => lower.includes(p))) {
      return route.abort();
    }
    if (!/^https?:/i.test(rawUrl)) return route.continue();
    if (!(await isPublicHttpUrl(rawUrl))) return route.abort("blockedbyclient");
    if (!request.isNavigationRequest()) return route.continue();

    try {
      let current = rawUrl;
      let res = await route.fetch({ maxRedirects: 0, timeout: timeoutMs });
      for (let hop = 0; isRedirect(res.status()); hop++) {
        const location = res.headers()["location"];
        await res.dispose().catch(() => undefined);
        if (!location || hop >= MAX_REDIRECTS) return route.abort("blockedbyclient");
        const next = new URL(location, current).toString();
        if (!(await isPublicHttpUrl(next))) return route.abort("blockedbyclient");
        current = next;
        res = await page.context().request.get(current, {
          headers: request.headers(),
          maxRedirects: 0,
          timeout: timeoutMs,
        });
      }
      if (current === rawUrl) return route.fulfill({ response: res });
      await res.dispose().catch(() => undefined);
      return route.fulfill({ status: 302, headers: { location: current } });
    } catch {
      return route.abort("failed");
    }
  });
}

/**
 * Valida a URL final e todos os saltos de redirect da navegação.
 * Lança UnsafeUrlError se algum for interno.
 */
export async function assertNavigationChainPublic(page: Page, response: PwResponse | null): Promise<void> {
  const urls = new Set<string>();
  if (response) {
    urls.add(response.url());
    let req: PwRequest | null = response.request();
    while (req) {
      urls.add(req.url());
      req = req.redirectedFrom();
    }
  }
  const pageUrl = page.url();
  if (/^https?:/i.test(pageUrl)) urls.add(pageUrl);
  for (const url of urls) {
    try {
      await assertPublicHttpUrl(url);
    } catch (err) {
      throw err instanceof UnsafeUrlError ? err : new UnsafeUrlError("Navegação para endereço inválido.");
    }
  }
}

/** `page.goto` + validação da cadeia de redirects. */
export async function gotoPublic(
  page: Page,
  url: string,
  options: Parameters<Page["goto"]>[1] = {}
): Promise<PwResponse | null> {
  const response = await page.goto(url, options);
  await assertNavigationChainPublic(page, response);
  return response;
}
