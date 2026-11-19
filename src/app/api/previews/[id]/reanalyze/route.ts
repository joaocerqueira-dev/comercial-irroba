import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ExtractedStoreDataSchema } from "@/lib/types/blueprint";
import { buildStoreBlueprint } from "@/lib/ai/architect";
import { compileIrrobaExport } from "@/lib/irroba-blocks/compiler";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
  const compiledExport = compileIrrobaExport(blueprint);

  const updated = await prisma.storePreview.update({
    where: { id },
    data: {
      storeName: blueprint.brand.name,
      generationMode: mode,
      blueprint: blueprint as object,
      compiledExport: compiledExport as object,
    },
  });

  return NextResponse.json({
    preview: updated,
    blueprint,
    mode,
    modelUsed: modelUsed ?? null,
    aiError: aiError ?? null,
  });
}
