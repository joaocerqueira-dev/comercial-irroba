import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";
import type { StoreBlueprint } from "@/lib/types/blueprint";

/** Controle de views, breadcrumb, página de categoria e PDP. */
export function cssPages(bp: StoreBlueprint): string {
  return `
    /* Views Control */
    .storeView { display: none; }
    .storeView.active { display: block; }

    /* Breadcrumb */
    .irb-breadcrumb {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 18px 0 10px;
      font-size: 12px;
      color: ${G.gray500};
    }
    .irb-breadcrumb a, .irb-breadcrumb button {
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      color: ${G.gray600};
      cursor: pointer;
      text-decoration: none;
    }
    .irb-breadcrumb a:hover, .irb-breadcrumb button:hover {
      color: var(--primary-background);
      text-decoration: underline;
    }

    /* Página de Categoria (.pageLayout--category) */
    .categoryHeroHeader {
      background: var(--neutral-background);
      color: var(--neutral-foreground);
      border-radius: var(--irb-radius);
      padding: 28px 24px;
      margin: 8px 0 22px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .categoryToolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 22px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    .catFilterChips { display: flex; flex-wrap: wrap; gap: 8px; }
    .catFilterChip {
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid ${G.gray300};
      background: #ffffff;
      color: ${G.gray700};
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .catFilterChip.active {
      background: var(--primary-background);
      color: var(--primary-foreground);
      border-color: var(--primary-background);
    }
    .categorySortSelect {
      padding: 8px 12px;
      border-radius: var(--irb-radius);
      border: 1px solid ${G.gray300};
      font-size: 13px;
      background: #ffffff;
      color: ${G.gray900};
    }

    /* Página Completa de Produto (PDP .product-content) */
    .pdpGrid {
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      gap: 36px;
      padding: 16px 0 48px;
      align-items: start;
    }
    @media (max-width: 820px) { .pdpGrid { grid-template-columns: 1fr; gap: 22px; } }
    .pdpGallery {
      display: flex;
      flex-direction: ${bp.visualOverrides.pageProduct.galleryOrientation === "vertical" ? "row" : "column-reverse"};
      gap: 12px;
    }
    .pdpThumbs {
      display: flex;
      flex-direction: ${bp.visualOverrides.pageProduct.galleryOrientation === "vertical" ? "column" : "row"};
      gap: 8px;
      flex-shrink: 0;
    }
    .pdpThumb {
      width: 68px;
      height: 68px;
      border-radius: var(--irb-radius);
      border: 2px solid transparent;
      overflow: hidden;
      cursor: pointer;
      background: ${G.gray50};
      padding: 0;
    }
    .pdpThumb.active { border-color: var(--primary-background); }
    .pdpThumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .pdpMainImageWrap {
      flex: 1;
      background: ${G.gray50};
      border-radius: var(--irb-radius);
      border: 1px solid rgba(0, 0, 0, 0.06);
      overflow: hidden;
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pdpMainImageWrap img { width: 100%; height: 100%; object-fit: contain; transition: transform .3s ease; }
    .pdpMainImageWrap:hover img { transform: scale(1.04); }
    .productInfo__title { font-size: clamp(22px, 3vw, 30px); line-height: 1.2; margin: 6px 0 10px; }
    .pdpRating { display: flex; align-items: center; gap: 8px; font-size: 13px; color: ${G.gray600}; margin-bottom: 16px; }
    .pdpPriceBox {
      background: var(--neutral-background);
      color: var(--neutral-foreground);
      padding: 16px 18px;
      border-radius: var(--irb-radius);
      margin-bottom: 18px;
    }
    .pdpSizeList { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .pdpSizeBtn {
      min-width: 44px;
      height: 38px;
      padding: 0 12px;
      border-radius: var(--irb-radius);
      border: 1px solid ${G.gray300};
      background: #ffffff;
      color: ${G.gray900};
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    .pdpSizeBtn.active {
      background: var(--primary-background);
      color: var(--primary-foreground);
      border-color: var(--primary-background);
    }
    .pdpBuyRow { display: flex; gap: 10px; margin: 18px 0; }
    .pdpQtyBox {
      display: inline-flex;
      align-items: center;
      border: 1px solid ${G.gray300};
      border-radius: var(--irb-radius);
      overflow: hidden;
      background: #ffffff;
    }
    .pdpQtyBox button {
      width: 36px;
      height: 46px;
      border: none;
      background: transparent;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      color: ${G.gray900};
    }
    .pdpQtyBox span { min-width: 32px; text-align: center; font-weight: 700; font-size: 14px; }
    .pdpShippingBox {
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: var(--irb-radius);
      padding: 14px;
      margin-bottom: 18px;
    }`;
}
