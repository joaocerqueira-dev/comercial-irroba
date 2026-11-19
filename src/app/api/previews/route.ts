import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const STALE_PROCESSING_MS = 30 * 60 * 1000;

export async function GET() {
  // Limpa gerações que ficaram presas em "processing" (servidor reiniciado, etc.)
  await prisma.storePreview
    .deleteMany({
      where: { status: "processing", updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) } },
    })
    .catch(() => undefined);

  const previews = await prisma.storePreview.findMany({
    where: { status: "ready" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      slug: true,
      sourceUrl: true,
      detectedPlatform: true,
      storeName: true,
      generationMode: true,
      status: true,
      screenshotPath: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ previews });
}
