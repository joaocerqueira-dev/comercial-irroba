import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { StoreBlueprintSchema } from "@/lib/types/blueprint";
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

  const extractedObj =
    preview.extractedData && typeof preview.extractedData === "object"
      ? (preview.extractedData as { fullScreenshotPath?: string })
      : null;
  const fullScreenshotPath =
    extractedObj?.fullScreenshotPath ??
    (preview.screenshotPath ? `/api/captures/${preview.slug}-full.png` : null);

  return (
    <StudioClient
      id={preview.id}
      slug={preview.slug}
      sourceUrl={preview.sourceUrl}
      detectedPlatform={preview.detectedPlatform ?? "E-commerce"}
      generationMode={preview.generationMode}
      initialWhatsapp={preview.sellerWhatsapp ?? ""}
      screenshotPath={preview.screenshotPath}
      fullScreenshotPath={fullScreenshotPath}
      initialBlueprint={parsedBlueprint.data}
    />
  );
}
