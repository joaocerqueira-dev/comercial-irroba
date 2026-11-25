import { prisma } from "@/lib/db";
import { PREVIEW_STATUS } from "@/lib/previews/status";
import { deletePreviewFiles } from "@/lib/previews/repository";

/** Geração em "processing" há mais tempo que isso ficou presa (servidor reiniciado, etc.). */
export const STALE_PROCESSING_MS = 30 * 60 * 1000;
/** Intervalo mínimo entre duas limpezas disparadas pelo generate. */
export const STALE_CLEANUP_THROTTLE_MS = 10 * 60 * 1000;

/** Apaga previews presos em "processing" e os arquivos deles. Devolve quantos saíram. */
export async function cleanupStalePreviews(now = Date.now()): Promise<number> {
  const stale = await prisma.storePreview.findMany({
    where: { status: PREVIEW_STATUS.processing, updatedAt: { lt: new Date(now - STALE_PROCESSING_MS) } },
    select: { id: true, slug: true },
  });
  if (stale.length === 0) return 0;
  await prisma.storePreview.deleteMany({ where: { id: { in: stale.map((p) => p.id) } } });
  for (const p of stale) {
    await deletePreviewFiles(p).catch(() => 0);
  }
  return stale.length;
}

let lastRun = 0;
let running: Promise<number> | null = null;

/**
 * Versão com throttle e best-effort (nunca lança): roda no boot (instrumentation.ts)
 * e no POST do generate, no máximo uma vez a cada STALE_CLEANUP_THROTTLE_MS.
 */
export function cleanupStalePreviewsThrottled(now = Date.now()): Promise<number> {
  if (running) return running;
  if (now - lastRun < STALE_CLEANUP_THROTTLE_MS) return Promise.resolve(0);
  lastRun = now;
  running = cleanupStalePreviews(now)
    .catch((err) => {
      console.error("[maintenance] Falha ao limpar previews presos:", err);
      return 0;
    })
    .finally(() => {
      running = null;
    });
  return running;
}

/** Só para testes. */
export function resetStaleCleanupThrottle(): void {
  lastRun = 0;
  running = null;
}
