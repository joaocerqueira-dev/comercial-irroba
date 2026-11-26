import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BrowserBusyError, limitAuthenticated, withBrowserSlot } from "@/lib/net/rate-limit";
import { captureMobileStoreScreenshots } from "@/lib/scraper/mobile-screenshot";

export const runtime = "nodejs";
export const maxDuration = 60;

const SLOT_WAIT_MS = 20_000;

/** (Re)captura o screenshot mobile do site original. Autenticada pelo middleware (Basic auth). */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const limited = limitAuthenticated(req, "mobile-capture");
  if (limited) return limited;

  const { id } = await context.params;
  const preview = await prisma.storePreview.findUnique({
    where: { id },
    select: { id: true, slug: true, sourceUrl: true, extractedData: true },
  });
  if (!preview) {
    return NextResponse.json({ error: "Preview não encontrado." }, { status: 404 });
  }

  let captured: Awaited<ReturnType<typeof captureMobileStoreScreenshots>> = null;
  try {
    captured = await withBrowserSlot(
      () =>
        captureMobileStoreScreenshots(preview.sourceUrl, preview.slug, {
          force: true,
          signal: req.signal,
        }),
      { signal: req.signal, timeoutMs: SLOT_WAIT_MS }
    );
  } catch (err) {
    if (err instanceof BrowserBusyError) {
      return NextResponse.json({ error: err.message }, { status: 503, headers: { "Retry-After": "10" } });
    }
    captured = null;
  }

  if (!captured) {
    return NextResponse.json(
      { error: "Não foi possível capturar a versão mobile do site original no momento." },
      { status: 502 }
    );
  }

  const extracted = preview.extractedData;
  if (extracted && typeof extracted === "object" && !Array.isArray(extracted)) {
    await prisma.storePreview
      .update({
        where: { id: preview.id },
        data: {
          extractedData: {
            ...(extracted as Record<string, unknown>),
            mobileScreenshotPath: captured.mobileScreenshotPath,
            mobileFullScreenshotPath: captured.mobileFullScreenshotPath,
          },
        },
      })
      .catch(() => undefined);
  }

  return NextResponse.json(captured);
}
