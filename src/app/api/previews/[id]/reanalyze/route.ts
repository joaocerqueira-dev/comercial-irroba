import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ExtractedStoreDataSchema } from "@/lib/types/blueprint";
import { buildStoreBlueprint } from "@/lib/ai/architect";
import { limitAuthenticated } from "@/lib/net/rate-limit";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Só Gemini (sem Playwright): entra no rate limit, mas não no semáforo do navegador
  const limited = limitAuthenticated(req, "reanalyze");
  if (limited) return limited;

  const { id } = await context.params;
  const preview = await prisma.storePreview.findUnique({ where: { id } });

  if (!preview || !preview.extractedData) {
    return NextResponse.json(
      { error: "Dados extraídos não encontrados para reanálise" },
      { status: 404 }
    );
  }

  const parsedExtracted = ExtractedStoreDataSchema.safeParse(preview.extractedData);
  if (!parsedExtracted.success) {
    return NextResponse.json(
      { error: "Formato de dados extraídos incompatível. Gere um novo preview da URL." },
      { status: 400 }
    );
  }

  const { blueprint, mode, modelUsed, aiError } = await buildStoreBlueprint(parsedExtracted.data);

  if (mode !== "gemini") {
    return NextResponse.json(
      {
        error: `${aiError || "Gemini 3.5 temporariamente indisponível."} O layout atual foi preservado sem alterações.`,
        preserved: true,
      },
      { status: 503 }
    );
  }

  // Não grava: o estúdio decide (substituir tudo / só paleta) e salva via PATCH.
  return NextResponse.json({
    blueprint,
    mode,
    modelUsed: modelUsed ?? null,
    aiError: aiError ?? null,
  });
}
