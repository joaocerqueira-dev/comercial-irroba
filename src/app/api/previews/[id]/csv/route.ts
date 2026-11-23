import { NextRequest } from "next/server";
import { compileProductsCsv } from "@/lib/irroba-blocks/compiler";
import { getPreviewWithBlueprint } from "@/lib/previews/repository";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const result = await getPreviewWithBlueprint({ id });

  if (result.status === "not_found") {
    return new Response("Not found", { status: 404 });
  }
  if (result.status === "invalid") {
    return new Response("Invalid blueprint", { status: 500 });
  }

  const csv = compileProductsCsv(result.blueprint);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produtos-${result.preview.slug}.csv"`,
    },
  });
}
