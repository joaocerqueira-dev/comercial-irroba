/** Padrões estruturais de layout (dimensões, raios, limites de itens). */
import type { StoreBlueprint } from "@/lib/types/blueprint";

/** Largura do container padrão do tema LIME. */
export const CONTAINER_WIDTH_PX = 1280;

/** Limites de largura da tarja de benefícios. */
export const TARJA_WIDTH = { min: 600, max: 1920 } as const;

type Radius = StoreBlueprint["theme"]["radius"];

/** Raio extraído (px) → bucket. Limite superior inclusivo de cada bucket. */
export const RADIUS_BUCKETS: ReadonlyArray<{ maxPx: number; radius: Radius }> = [
  { maxPx: 2, radius: "none" },
  { maxPx: 6, radius: "small" },
  { maxPx: 14, radius: "medium" },
];
export const RADIUS_BUCKET_ABOVE: Radius = "large";

export function mapBorderRadius(px: number | undefined): Radius {
  if (px === undefined) return RADIUS_BUCKETS[0].radius;
  for (const b of RADIUS_BUCKETS) if (px <= b.maxPx) return b.radius;
  return RADIUS_BUCKET_ABOVE;
}

/** Bucket → valor CSS aplicado no compilador. */
export const RADIUS_CSS: Record<Radius, { css: string; label: string }> = {
  none: { css: "0px", label: "Sem arredondamento" },
  small: { css: "6px", label: "Pequeno" },
  medium: { css: "12px", label: "Médio" },
  large: { css: "24px", label: "Grande" },
};

/** Quantidade máxima de itens por seção gerada. */
export const SECTION_LIMITS = {
  heroSlides: 3,
  categories: 8,
  moodBanners: 4,
  /** Mínimo de banners "mood" extraídos para usá-los em vez das categorias. */
  moodBannersMinExtracted: 2,
  benefitImages: 6,
  productsPerShowcase: 8,
  benefits: 4,
  testimonials: 3,
  installments: 6,
} as const;

/** Defaults visuais do header e do card de produto. */
export const HEADER_DEFAULTS = {
  layout: "layout-1",
  backgroundOpacity: 0.98,
  blurPx: 8,
  categoryCase: "uppercase",
} as const;

export const PRODUCT_CARD_DEFAULTS = {
  titleAlign: "center",
  paddingX: 16,
} as const;
