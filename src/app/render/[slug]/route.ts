import { NextRequest } from "next/server";
import { compileStorefrontDocument } from "@/lib/irroba-blocks/compiler";
import { getPreviewWithBlueprint } from "@/lib/previews/repository";
import { RENDER_CSP } from "@/lib/security/preview-isolation";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const result = await getPreviewWithBlueprint({ slug });

  if (result.status !== "ok") {
    // Sem blueprint ainda não há vitrine: mesmo 404 de preview inexistente
    const missing = result.status === "not_found" || result.status === "no_blueprint";
    return new Response(
      missing ? "<h1>Preview não encontrado</h1>" : "<h1>Blueprint inválido</h1>",
      {
        status: missing ? 404 : 500,
        headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": RENDER_CSP },
      }
    );
  }

  const html = compileStorefrontDocument(result.blueprint);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // HTML gerado por IA a partir de outra loja: CSP restritiva + sandbox (origem opaca)
      "Content-Security-Policy": RENDER_CSP,
    },
  });
}
