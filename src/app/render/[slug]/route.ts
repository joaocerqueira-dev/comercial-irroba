import { NextRequest } from "next/server";
import { compileStorefrontDocument } from "@/lib/irroba-blocks/compiler";
import { getPreviewWithBlueprint } from "@/lib/previews/repository";
import { RENDER_CSP } from "@/lib/security/preview-isolation";
import { requestCanView, withShareSecret } from "@/lib/share/access";

// HTML compilado por slug, invalidado por updatedAt. O BOOT no ETag invalida o cache
// do navegador quando o servidor reinicia (novo deploy pode mudar o compilador).
// ponytail: cache em memória por processo; Redis/CDN se houver mais de uma réplica
const BOOT = Date.now().toString(36);
const MAX_CACHED = 50;
const htmlCache = new Map<string, { version: number; html: string }>();

const notFound = (status: 404 | 500) =>
  new Response(status === 404 ? "<h1>Preview não encontrado</h1>" : "<h1>Blueprint inválido</h1>", {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": RENDER_CSP },
  });

export function GET(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  return withShareSecret(() => render(req, context));
}

async function render(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const result = await getPreviewWithBlueprint({ slug });
  // Sem acesso: mesmo 404 de preview inexistente (não revela que existe). Antes do 304 e do cache.
  if (result.status === "not_found" || !(await requestCanView(req, result.preview))) return notFound(404);
  // Sem blueprint ainda não há vitrine: mesmo 404 de preview inexistente
  if (result.status !== "ok") return notFound(result.status === "invalid" ? 500 : 404);

  const version = new Date(result.preview.updatedAt).getTime() || 0;
  const etag = `"${BOOT}-${version}"`;
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    // Sempre revalida (o Studio salva e recarrega), mas reaproveita com 304 quando nada mudou
    "Cache-Control": "private, no-cache",
    ETag: etag,
    // HTML gerado por IA a partir de outra loja: CSP restritiva + sandbox (origem opaca)
    "Content-Security-Policy": RENDER_CSP,
  };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  const cached = htmlCache.get(slug);
  let html = cached && version && cached.version === version ? cached.html : null;
  if (!html) {
    html = compileStorefrontDocument(result.blueprint);
    htmlCache.delete(slug);
    htmlCache.set(slug, { version, html });
    if (htmlCache.size > MAX_CACHED) htmlCache.delete(htmlCache.keys().next().value!);
  }

  return new Response(html, { headers });
}
