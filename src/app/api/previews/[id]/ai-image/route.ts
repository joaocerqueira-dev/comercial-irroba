import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { processAiImageRequest } from "@/lib/ai/image-studio";
import type { StoreBlueprint } from "@/lib/types/blueprint";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  prompt: z.string().max(600).default(""),
  mode: z.enum(["enhance", "resize", "generate"]).default("enhance"),
  aspectRatio: z.enum(["16:9", "21:9", "3:4", "1:1"]).default("16:9"),
  sourceImageUrl: z.string().optional(),
  slotLabel: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const preview = await prisma.storePreview.findUnique({ where: { id } });
  if (!preview) {
    return NextResponse.json({ error: "Preview não encontrado" }, { status: 404 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await req.json();
    body = BodySchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "Parâmetros inválidos para geração de imagem." }, { status: 400 });
  }

  try {
    const bp = preview.blueprint as unknown as StoreBlueprint | null;
    if (!bp) {
      return NextResponse.json({ error: "Blueprint ainda não gerado para este preview" }, { status: 400 });
    }
    const result = await processAiImageRequest({
      previewId: preview.id,
      prompt: body.prompt,
      mode: body.mode,
      aspectRatio: body.aspectRatio,
      sourceImageUrl: body.sourceImageUrl,
      sourceStoreUrl: preview.sourceUrl,
      slotLabel: body.slotLabel,
      brandName: bp.brand.name,
      niche: bp.brand.niche,
      headingFont: bp.theme.headingFont,
      bodyFont: bp.theme.bodyFont,
      palette: {
        primary: bp.theme.primaryBackground,
        primaryFg: bp.theme.primaryForeground,
        secondary: bp.theme.secondaryBackground,
        secondaryFg: bp.theme.secondaryForeground,
        neutral: bp.theme.neutralBackground,
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao processar imagem com IA" },
      { status: 500 }
    );
  }
}
