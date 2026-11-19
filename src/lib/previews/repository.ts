import { prisma } from "@/lib/db";
import { compileIrrobaExport } from "@/lib/irroba-blocks/compiler";
import { StoreBlueprintSchema, type StoreBlueprint } from "@/lib/types/blueprint";

type PreviewRow = NonNullable<Awaited<ReturnType<typeof prisma.storePreview.findUnique>>>;

export type PreviewLookup = { id: string } | { slug: string };

export type PreviewWithBlueprint =
  | { status: "ok"; preview: PreviewRow; blueprint: StoreBlueprint }
  | { status: "not_found" }
  | { status: "invalid"; preview: PreviewRow };

/** Busca um preview e valida o blueprint com zod. */
export async function getPreviewWithBlueprint(where: PreviewLookup): Promise<PreviewWithBlueprint> {
  const preview = await prisma.storePreview.findUnique({ where });
  if (!preview || !preview.blueprint) return { status: "not_found" };
  const parsed = StoreBlueprintSchema.safeParse(preview.blueprint);
  if (!parsed.success) return { status: "invalid", preview };
  return { status: "ok", preview, blueprint: parsed.data };
}

/** Caminho público do screenshot de página inteira (com fallback para previews antigos). */
export function resolveFullScreenshotPath(preview: Pick<PreviewRow, "extractedData" | "screenshotPath" | "slug">): string | null {
  const extractedObj =
    preview.extractedData && typeof preview.extractedData === "object"
      ? (preview.extractedData as { fullScreenshotPath?: string })
      : null;
  return (
    extractedObj?.fullScreenshotPath ??
    (preview.screenshotPath ? `/api/captures/${preview.slug}-full.png` : null)
  );
}

/** Avisos gravados na extração (ex.: loja sem produtos/banners legíveis). */
export function resolveExtractionWarnings(preview: Pick<PreviewRow, "extractedData">): string[] {
  const data = preview.extractedData;
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const warnings = (data as { extractionWarnings?: unknown }).extractionWarnings;
  return Array.isArray(warnings) ? warnings.filter((w): w is string => typeof w === "string") : [];
}

/** Grava blueprint + export compilado. */
export async function saveBlueprint(
  id: string,
  blueprint: StoreBlueprint,
  extra: { sellerWhatsapp?: string | null; generationMode?: string } = {}
) {
  return prisma.storePreview.update({
    where: { id },
    data: {
      storeName: blueprint.brand.name,
      ...(extra.sellerWhatsapp !== undefined ? { sellerWhatsapp: extra.sellerWhatsapp } : {}),
      ...(extra.generationMode ? { generationMode: extra.generationMode } : {}),
      blueprint: blueprint as object,
      compiledExport: compileIrrobaExport(blueprint) as object,
    },
  });
}
