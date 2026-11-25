import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertPublicHttpUrl, UnsafeUrlError } from "@/lib/net/safe-url";
import { buildImageRequestFromBlueprint, processAiImageRequest } from "@/lib/ai/image-studio";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import { BrowserBusyError, limitAuthenticated } from "@/lib/net/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  prompt: z.string().max(600).default(""),
  mode: z.enum(["enhance", "resize", "generate"]).default("enhance"),
  aspectRatio: z.enum(["16:9", "21:9", "3:4", "1:1"]).default("16:9"),
  sourceImageUrl: z
    .string()
    .max(2048)
    .refine((v) => v.startsWith("/api/captures/") || /^https?:\/\//i.test(v), "URL de imagem inválida")
    .optional(),
  slotLabel: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const limited = limitAuthenticated(req, "ai-image");
  if (limited) return limited;

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

  if (body.sourceImageUrl && /^https?:\/\//i.test(body.sourceImageUrl)) {
    try {
      await assertPublicHttpUrl(body.sourceImageUrl);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof UnsafeUrlError ? err.message : "URL de imagem inválida" },
        { status: 400 }
      );
    }
  }

  try {
    const bp = preview.blueprint as unknown as StoreBlueprint | null;
    if (!bp) {
      return NextResponse.json({ error: "Blueprint ainda não gerado para este preview" }, { status: 400 });
    }
    const result = await processAiImageRequest(
      buildImageRequestFromBlueprint(bp, {
        previewId: preview.id,
        prompt: body.prompt,
        mode: body.mode,
        aspectRatio: body.aspectRatio,
        sourceImageUrl: body.sourceImageUrl,
        sourceStoreUrl: preview.sourceUrl,
        slotLabel: body.slotLabel,
      }),
      { signal: req.signal }
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BrowserBusyError) {
      return NextResponse.json({ error: err.message }, { status: 503, headers: { "Retry-After": "10" } });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao processar imagem com IA" },
      { status: 500 }
    );
  }
}
