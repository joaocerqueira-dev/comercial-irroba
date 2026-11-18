import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StoreBlueprintSchema, type CompiledExport } from "@/lib/types/blueprint";
import { compileIrrobaExport } from "@/lib/irroba-blocks/compiler";
import StudioClient from "@/components/StudioClient";

export const dynamic = "force-dynamic";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preview = await prisma.storePreview.findUnique({ where: { id } });

  if (!preview || !preview.blueprint) {
    notFound();
  }

  const parsedBlueprint = StoreBlueprintSchema.safeParse(preview.blueprint);
  if (!parsedBlueprint.success) {
    notFound();
  }

  const compiledExport =
    (preview.compiledExport as CompiledExport | null) ??
    compileIrrobaExport(parsedBlueprint.data);

  return (
    <StudioClient
      id={preview.id}
      slug={preview.slug}
      sourceUrl={preview.sourceUrl}
      detectedPlatform={preview.detectedPlatform ?? "E-commerce"}
      generationMode={preview.generationMode}
      initialWhatsapp={preview.sellerWhatsapp ?? ""}
      initialBlueprint={parsedBlueprint.data}
      initialExport={compiledExport}
    />
  );
}
