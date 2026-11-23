import { NextRequest } from "next/server";
import { compileStorefrontDocument } from "@/lib/irroba-blocks/compiler";
import { getPreviewWithBlueprint } from "@/lib/previews/repository";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const result = await getPreviewWithBlueprint({ slug });

  if (result.status !== "ok") {
    return new Response(
      result.status === "not_found" ? "<h1>Preview não encontrado</h1>" : "<h1>Blueprint inválido</h1>",
      {
        status: result.status === "not_found" ? 404 : 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  const html = compileStorefrontDocument(result.blueprint);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
