import fs from "node:fs/promises";
import path from "node:path";
import { CAPTURES_DIR } from "@/lib/files/captures";
import { assertPublicHttpUrl } from "@/lib/net/safe-url";
import { getSharedBrowser } from "./browser";
import { gotoPublic, installSsrfGuard, withPageTimeout } from "./page-guard";

const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

export interface MobileScreenshotResult {
  mobileScreenshotPath: string;
  mobileFullScreenshotPath: string;
}

const inFlightCaptures = new Map<string, Promise<MobileScreenshotResult | null>>();

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getCachedMobileScreenshots(
  slug: string,
  capturesDir: string = CAPTURES_DIR
): Promise<MobileScreenshotResult | null> {
  const safeSlug = path.basename(slug);
  const mobileFile = `${safeSlug}-mobile.png`;
  const mobileFullFile = `${safeSlug}-mobile-full.jpg`;
  const hasFull = await fileExists(path.join(capturesDir, mobileFullFile));
  const hasViewport = await fileExists(path.join(capturesDir, mobileFile));
  if (!hasFull && !hasViewport) return null;

  return {
    mobileScreenshotPath: hasViewport
      ? `/api/captures/${mobileFile}`
      : `/api/captures/${mobileFullFile}`,
    mobileFullScreenshotPath: hasFull
      ? `/api/captures/${mobileFullFile}`
      : `/api/captures/${mobileFile}`,
  };
}

export async function captureMobileStoreScreenshots(
  rawUrl: string,
  slug: string,
  options: { signal?: AbortSignal; capturesDir?: string; force?: boolean } = {}
): Promise<MobileScreenshotResult | null> {
  const safeSlug = path.basename(slug);
  const capturesDir = options.capturesDir ?? CAPTURES_DIR;

  // force: recaptura mesmo com arquivos em cache (rota autenticada do Studio)
  if (!options.force) {
    const cached = await getCachedMobileScreenshots(safeSlug, capturesDir);
    if (cached) return cached;
  }

  const existingJob = inFlightCaptures.get(safeSlug);
  if (existingJob) return existingJob;

  const job = (async (): Promise<MobileScreenshotResult | null> => {
    const normalizedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    await assertPublicHttpUrl(normalizedUrl);
    await fs.mkdir(capturesDir, { recursive: true });

    const mobileFile = `${safeSlug}-mobile.png`;
    const mobileFullFile = `${safeSlug}-mobile-full.jpg`;
    const mobileDiskPath = path.join(capturesDir, mobileFile);
    const mobileFullDiskPath = path.join(capturesDir, mobileFullFile);

    let context: Awaited<ReturnType<Awaited<ReturnType<typeof getSharedBrowser>>["newContext"]>> | null =
      null;
    try {
      options.signal?.throwIfAborted();
      const browser = await getSharedBrowser();
      context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        locale: "pt-BR",
        serviceWorkers: "block",
        userAgent: MOBILE_USER_AGENT,
      });

      const page = await context.newPage();
      await installSsrfGuard(page);
      await gotoPublic(page, normalizedUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(1500);

      await withPageTimeout(page.evaluate(async () => {
        const maxScroll = Math.min(document.body.scrollHeight || 3800, 5200);
        for (let y = 500; y <= maxScroll; y += 650) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 280));
        }
        window.scrollTo(0, 0);
      }));
      await page.waitForTimeout(700);

      await page.screenshot({ path: mobileDiskPath, fullPage: false }).catch(() => undefined);
      await page
        .screenshot({ path: mobileFullDiskPath, fullPage: true, type: "jpeg", quality: 80 })
        .catch(() => undefined);

      return await getCachedMobileScreenshots(safeSlug, capturesDir);
    } catch {
      return null;
    } finally {
      if (context) {
        await context.close().catch(() => undefined);
      }
    }
  })();

  inFlightCaptures.set(safeSlug, job);
  try {
    return await job;
  } finally {
    inFlightCaptures.delete(safeSlug);
  }
}
