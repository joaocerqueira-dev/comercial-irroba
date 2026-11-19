import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PreviewViewerClient from "@/components/PreviewViewerClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const preview = await prisma.storePreview.findUnique({
    where: { slug },
    select: { storeName: true, screenshotPath: true },
  });
  if (!preview) return { title: "Prévia não encontrada · Irroba" };
  const title = `${preview.storeName} na Irroba · Prévia da nova loja`;
  const description = `Veja como a loja ${preview.storeName} pode ficar na plataforma Irroba.`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      ...(preview.screenshotPath ? { images: [{ url: preview.screenshotPath }] } : {}),
    },
  };
}

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
