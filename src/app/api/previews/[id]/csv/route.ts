import { NextRequest } from "next/server";
import { compileProductsCsv } from "@/lib/irroba-blocks/compiler";
import { getPreviewWithBlueprint } from "@/lib/previews/repository";
import { canAccessPreview, requireUser } from "@/lib/auth/guard";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const { id } = await context.params;
  const result = await getPreviewWithBlueprint({ id });

  // Sem blueprint ainda não há CSV para baixar: mesmo 404 de antes
  if (
    result.status === "not_found" ||
    !canAccessPreview(user, result.preview.ownerId) ||
    result.status === "no_blueprint"
  ) {
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
