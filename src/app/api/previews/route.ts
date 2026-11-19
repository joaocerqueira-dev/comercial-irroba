import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
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
