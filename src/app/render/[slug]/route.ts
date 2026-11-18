import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { StoreBlueprintSchema } from "@/lib/types/blueprint";
import { compileStorefrontDocument } from "@/lib/irroba-blocks/compiler";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const preview = await prisma.storePreview.findUnique({ where: { slug } });

  if (!preview || !preview.blueprint) {
    return new Response("<h1>Preview não encontrado</h1>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const parsed = StoreBlueprintSchema.safeParse(preview.blueprint);
  if (!parsed.success) {
    return new Response("<h1>Blueprint inválido</h1>", {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const html = compileStorefrontDocument(parsed.data);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
