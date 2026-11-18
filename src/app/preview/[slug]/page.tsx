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

  return (
    <PreviewViewerClient
      slug={preview.slug}
      storeName={preview.storeName}
      sourceUrl={preview.sourceUrl}
      detectedPlatform={preview.detectedPlatform ?? "E-commerce"}
      screenshotPath={preview.screenshotPath}
      sellerWhatsapp={preview.sellerWhatsapp}
    />
  );
}
