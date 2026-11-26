import { isPublicHttpUrl } from "./safe-url";
import { getSafeDispatcher } from "./safe-dispatcher";

export const MAX_REDIRECTS = 5;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Só 301/302/303/307/308 com Location são redirect. 304 (Not Modified), 300 e afins
 * são respostas finais: tratá-los como salto faria o fetch devolver null sem motivo.
 */
export function isRedirect(status: number, location: string | null | undefined): location is string {
  return REDIRECT_STATUSES.has(status) && Boolean(location);
}

/**
 * fetch com redirect: "manual": cada salto é revalidado com isPublicHttpUrl
 * (no máximo MAX_REDIRECTS). Retorna null se algum destino for interno
 * ou se houver saltos demais. 3xx sem Location é resposta final.
 *
 * O `dispatcher` revalida o IP resolvido no momento da conexão (DNS rebinding);
 * veja safe-dispatcher.ts. O `fetch` global aceita um Agent do pacote `undici`
 * (testado com o undici interno do Node 22 e do Node 24).
 */
export async function fetchPublic(
  url: string,
  init: Omit<RequestInit, "redirect"> = {},
  maxRedirects = MAX_REDIRECTS
): Promise<Response | null> {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!(await isPublicHttpUrl(current))) return null;
    const res = await fetch(current, {
      ...init,
      redirect: "manual",
      dispatcher: getSafeDispatcher(),
    } as RequestInit);
    const location = res.headers.get("location");
    if (!isRedirect(res.status, location)) return res;
    await res.body?.cancel().catch(() => undefined);
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
    if (!isRedirect(status, location)) return res;
    current = new URL(location, current).toString();
  }
  return null;
}

/** Teto padrão para HTML lido de lojas externas. */
export const DEFAULT_HTML_MAX_BYTES = 5 * 1024 * 1024;

export class ResponseTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Resposta acima do limite de ${maxBytes} bytes.`);
    this.name = "ResponseTooLargeError";
  }
}

/**
 * Lê o corpo em stream sem passar de `maxBytes`.
 * - `truncate: true`: corta no limite e devolve o que já chegou (útil para HTML).
 * - `truncate: false` (padrão): cancela o stream e lança ResponseTooLargeError.
 */
export async function readBufferCapped(
  res: Response,
  maxBytes: number,
  { truncate = false }: { truncate?: boolean } = {}
): Promise<Buffer> {
  const declared = Number(res.headers.get("content-length"));
  if (!truncate && Number.isFinite(declared) && declared > maxBytes) {
    await res.body?.cancel().catch(() => undefined);
    throw new ResponseTooLargeError(maxBytes);
  }
  if (!res.body) return Buffer.alloc(0);

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      if (total + value.byteLength > maxBytes) {
        if (!truncate) throw new ResponseTooLargeError(maxBytes);
        chunks.push(value.subarray(0, maxBytes - total));
        total = maxBytes;
        break;
      }
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    // Libera a conexão quando paramos antes do fim
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

/** Texto UTF-8 limitado a `maxBytes` (corta no limite em vez de falhar). */
export async function readTextCapped(res: Response, maxBytes = DEFAULT_HTML_MAX_BYTES): Promise<string> {
  const buf = await readBufferCapped(res, maxBytes, { truncate: true });
  return new TextDecoder("utf-8").decode(buf);
}
