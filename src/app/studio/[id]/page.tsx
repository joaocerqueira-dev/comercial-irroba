import { notFound } from "next/navigation";
import { getPreviewWithBlueprint, resolveFullScreenshotPath } from "@/lib/previews/repository";
import { normalizeBaseUrl } from "@/lib/public-url";
import StudioClient from "@/components/StudioClient";

export const dynamic = "force-dynamic";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPreviewWithBlueprint({ id });
  if (result.status !== "ok") {
    notFound();
  }
  const { preview, blueprint } = result;
  const fullScreenshotPath = resolveFullScreenshotPath(preview);

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
      initialBlueprint={blueprint}
      publicAssetBaseUrl={normalizeBaseUrl(process.env.PUBLIC_ASSET_BASE_URL)}
    />
  );
}
