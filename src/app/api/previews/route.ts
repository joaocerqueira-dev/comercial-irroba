import { PREVIEW_STATUS } from "@/lib/previews/status";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET é só leitura: a limpeza de previews presos roda no boot (src/instrumentation.ts)
// e no POST do generate (lib/previews/maintenance.ts).
export async function GET() {
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
