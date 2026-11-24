import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  captureMobileStoreScreenshots,
  getCachedMobileScreenshots,
} from "@/lib/scraper/mobile-screenshot";

export const runtime = "nodejs";
export const maxDuration = 60;

const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,120}$/i;

async function handleMobileCapture(slug: string) {
  if (!SAFE_SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Slug inválido." }, { status: 400 });
  }

  const cached = await getCachedMobileScreenshots(slug);
  if (cached) {
    return NextResponse.json(cached);
  }

  const preview = await prisma.storePreview.findUnique({
    where: { slug },
    select: { id: true, slug: true, sourceUrl: true, extractedData: true },
  });

  if (!preview) {
    return NextResponse.json({ error: "Preview não encontrado." }, { status: 404 });
  }

  const captured = await captureMobileStoreScreenshots(preview.sourceUrl, preview.slug);
  if (!captured) {
    return NextResponse.json(
      { error: "Não foi possível capturar a versão mobile do site original no momento." },
      { status: 502 }
    );
  }

  if (preview.extractedData && typeof preview.extractedData === "object" && !Array.isArray(preview.extractedData)) {
    await prisma.storePreview
      .update({
        where: { id: preview.id },
        data: {
          extractedData: {
            ...(preview.extractedData as Record<string, unknown>),
            mobileScreenshotPath: captured.mobileScreenshotPath,
            mobileFullScreenshotPath: captured.mobileFullScreenshotPath,
          },
        },
      })
      .catch(() => undefined);
  }

  return NextResponse.json(captured);
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  return handleMobileCapture(slug);
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  return handleMobileCapture(slug);
}
