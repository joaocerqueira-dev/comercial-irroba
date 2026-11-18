import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { StoreBlueprintSchema } from "@/lib/types/blueprint";
import { compileProductsCsv } from "@/lib/irroba-blocks/compiler";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const preview = await prisma.storePreview.findUnique({ where: { id } });

  if (!preview || !preview.blueprint) {
    return new Response("Not found", { status: 404 });
  }

  const parsed = StoreBlueprintSchema.safeParse(preview.blueprint);
  if (!parsed.success) {
    return new Response("Invalid blueprint", { status: 500 });
  }

  const csv = compileProductsCsv(parsed.data);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produtos-${preview.slug}.csv"`,
    },
  });
}
