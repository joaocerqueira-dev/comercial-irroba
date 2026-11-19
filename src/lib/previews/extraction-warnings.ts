import type { ExtractedStoreData } from "@/lib/types/blueprint";

/**
 * Mensagem para quando a extração não leu produtos e/ou banners.
 * Retorna null quando há pelo menos um produto e um banner.
 */
export function buildExtractionWarning(
  data: Pick<ExtractedStoreData, "products" | "banners">
): string | null {
  const noProducts = data.products.length === 0;
  const noBanners = data.banners.length === 0;
  if (!noProducts && !noBanners) return null;
  const what = noProducts && noBanners ? "os produtos e banners" : noProducts ? "os produtos" : "os banners";
  return `Não conseguimos ler ${what} desta loja; a proposta usa imagens de exemplo.`;
}
