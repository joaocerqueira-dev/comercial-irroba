import { PREVIEW_STATUS } from "@/lib/previews/status";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deletePreviewFiles } from "@/lib/previews/repository";

const STALE_PROCESSING_MS = 30 * 60 * 1000;

export async function GET() {
  // Limpa gerações que ficaram presas em "processing" (servidor reiniciado, etc.) e seus arquivos
  try {
    const stale = await prisma.storePreview.findMany({
      where: { status: PREVIEW_STATUS.processing, updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) } },
      select: { id: true, slug: true },
    });
    if (stale.length > 0) {
      await prisma.storePreview.deleteMany({ where: { id: { in: stale.map((p) => p.id) } } });
      for (const p of stale) {
        await deletePreviewFiles(p).catch(() => 0);
      }
    }
  } catch {
    // limpeza é best-effort
  }

  const previews = await prisma.storePreview.findMany({
    where: { status: PREVIEW_STATUS.ready },
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
