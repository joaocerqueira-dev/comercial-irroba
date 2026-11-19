import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deletePreviewCaptures } from "@/lib/files/captures";
import { StoreBlueprintSchema } from "@/lib/types/blueprint";
import { saveBlueprint } from "@/lib/previews/repository";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const preview = await prisma.storePreview.findUnique({ where: { id } });
  if (!preview) {
    return NextResponse.json({ error: "Preview não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ preview });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = StoreBlueprintSchema.safeParse(body?.blueprint);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Blueprint inválido", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const exists = await prisma.storePreview.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: "Preview não encontrado" }, { status: 404 });
  }

  const generationMode =
    typeof body?.generationMode === "string" && ["gemini", "heuristic"].includes(body.generationMode)
      ? (body.generationMode as string)
      : undefined;

  const updated = await saveBlueprint(id, parsed.data, {
    sellerWhatsapp:
      typeof body?.sellerWhatsapp === "string" ? body.sellerWhatsapp.replace(/\D/g, "") || null : undefined,
    generationMode,
  });

  return NextResponse.json({ preview: updated });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const deleted = await prisma.storePreview.delete({ where: { id } });
    await deletePreviewCaptures(deleted.slug, deleted.id).catch(() => 0);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") {
      return NextResponse.json({ error: "Preview não encontrado" }, { status: 404 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao excluir preview" },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
