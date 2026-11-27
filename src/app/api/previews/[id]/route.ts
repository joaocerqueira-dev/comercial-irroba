import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { StoreBlueprintSchema } from "@/lib/types/blueprint";
import { deletePreviewFiles, saveBlueprint } from "@/lib/previews/repository";
import { limitAuthenticated } from "@/lib/net/rate-limit";

const MAX_WHATSAPP_LENGTH = 32;
/** Blueprint salvo pelo Studio (HTML customizado incluso) fica bem abaixo disso. */
const MAX_PATCH_BYTES = 5_000_000;

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
  const limited = limitAuthenticated(req, "save");
  if (limited) return limited;
  if (Number(req.headers.get("content-length")) > MAX_PATCH_BYTES) {
    return NextResponse.json({ error: "Blueprint grande demais." }, { status: 413 });
  }
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

  if (typeof body?.sellerWhatsapp === "string" && body.sellerWhatsapp.length > MAX_WHATSAPP_LENGTH) {
    return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
  }

  try {
    const updated = await saveBlueprint(id, parsed.data, {
      sellerWhatsapp:
        typeof body?.sellerWhatsapp === "string" ? body.sellerWhatsapp.replace(/\D/g, "") || null : undefined,
      generationMode,
    });
    return NextResponse.json({ preview: updated });
  } catch (err) {
    console.error("[previews/patch] Falha ao salvar blueprint:", err);
    return NextResponse.json({ error: "Não foi possível salvar o preview. Tente novamente." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const limited = limitAuthenticated(req, "delete");
  if (limited) return limited;
  const { id } = await context.params;
  try {
    const deleted = await prisma.storePreview.delete({ where: { id } });
    await deletePreviewFiles(deleted).catch(() => 0);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") {
      return NextResponse.json({ error: "Preview não encontrado" }, { status: 404 });
    }
    console.error("[previews/delete] Falha ao excluir preview:", err);
    return NextResponse.json({ error: "Falha ao excluir preview" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
