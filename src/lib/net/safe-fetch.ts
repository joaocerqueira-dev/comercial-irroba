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
