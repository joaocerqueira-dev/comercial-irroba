import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPreviewWithBlueprint } from "@/lib/previews/repository";
import { MAX_IMAGE_URL_LENGTH } from "@/lib/types/blueprint";
import { assertPublicHttpUrl, UnsafeUrlError } from "@/lib/net/safe-url";
import { buildImageRequestFromBlueprint, processAiImageRequest } from "@/lib/ai/image-studio";
import { BrowserBusyError, limitAuthenticated } from "@/lib/net/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  prompt: z.string().max(600).default(""),
  mode: z.enum(["enhance", "resize", "generate"]).default("enhance"),
  aspectRatio: z.enum(["16:9", "21:9", "3:4", "1:1"]).default("16:9"),
  sourceImageUrl: z
    .string()
    .max(MAX_IMAGE_URL_LENGTH)
    .refine((v) => v.startsWith("/api/captures/") || /^https?:\/\//i.test(v), "URL de imagem inválida")
    .optional(),
  slotLabel: z.string().max(120).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const limited = limitAuthenticated(req, "ai-image");
  if (limited) return limited;

  const { id } = await context.params;
  // Blueprint lido do banco também passa pelo schema (não confia no JSON gravado)
  const found = await getPreviewWithBlueprint({ id });
  if (found.status === "not_found") {
    return NextResponse.json({ error: "Preview não encontrado" }, { status: 404 });
  }
  if (found.status === "invalid") {
    return NextResponse.json(
      { error: "O blueprint deste preview está em formato incompatível. Gere o preview novamente." },
      { status: 409 }
    );
  }
  const { preview, blueprint: bp } = found;

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
    // Detalhe (Gemini, Playwright, disco) só no log; o cliente recebe mensagem genérica
    console.error("[ai-image] Falha ao processar imagem:", err);
    return NextResponse.json({ error: "Não foi possível processar a imagem com IA. Tente novamente." }, { status: 500 });
  }
}
