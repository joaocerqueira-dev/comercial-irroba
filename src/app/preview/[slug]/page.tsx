import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PreviewViewerClient from "@/components/PreviewViewerClient";

export const dynamic = "force-dynamic";

export default async function PublicPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const preview = await prisma.storePreview.findUnique({ where: { slug } });

  if (!preview || !preview.blueprint) {
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
    <PreviewViewerClient
      slug={preview.slug}
      storeName={preview.storeName}
      sourceUrl={preview.sourceUrl}
      detectedPlatform={preview.detectedPlatform ?? "E-commerce"}
      screenshotPath={preview.screenshotPath}
      fullScreenshotPath={fullScreenshotPath}
      sellerWhatsapp={preview.sellerWhatsapp}
    />
  );
}
