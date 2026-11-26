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

    /* Página de Categoria (.pageLayout--category) + Filtro Lateral Esquerdo Irroba */
    .categoryHeroHeader {
      background: var(--neutral-background);
      color: var(--neutral-foreground);
      border-radius: var(--irb-radius);
      padding: 24px;
      margin: 8px 0 22px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .pageContent--category {
      display: grid;
      grid-template-columns: 264px minmax(0, 1fr);
      gap: 28px;
      align-items: start;
      padding-bottom: 56px;
    }
    .pageColumnLeft.categorySidebar {
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: var(--irb-radius);
      padding: 16px;
      position: sticky;
      top: calc(var(--irb-header-height, 72px) + 16px);
    }
    .categorySidebar__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    .categorySidebar__close {
      display: none;
      border: none;
      background: ${G.gray100};
      color: ${G.gray900};
      width: 30px;
      height: 30px;
      border-radius: 999px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .irb-active-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .irb-active-filter-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--neutral-background);
      color: var(--neutral-foreground);
      font-size: 11px;
      font-weight: 600;
      border: 1px solid rgba(0, 0, 0, 0.1);
      cursor: pointer;
    }
    .filters {
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding: 12px 0;
    }
    .filters:last-of-type { border-bottom: none; }
    .filters summary {
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      font-size: 13px;
      font-weight: 700;
      color: ${G.gray900};
    }
    .filters summary::-webkit-details-marker { display: none; }
    .filter-title { font-size: 13px; font-weight: 700; color: ${G.gray900}; }
    .filterSidebarList {
      list-style: none;
      padding: 10px 0 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .filterSidebarBtn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 7px 10px;
      border-radius: calc(var(--irb-radius) * 0.75);
      border: 1px solid transparent;
      background: transparent;
      color: ${G.gray700};
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      transition: background .15s, color .15s;
    }
    .filterSidebarBtn:hover { background: ${G.gray100}; color: ${G.gray900}; }
    .filterSidebarBtn.active {
      background: var(--primary-background);
      color: var(--primary-foreground);
      font-weight: 700;
    }
    .filterSidebarCount {
      font-size: 11px;
      opacity: 0.72;
      font-variant-numeric: tabular-nums;
    }
    .filterPricePresets {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }
    .filterPresetBtn {
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid ${G.gray300};
      background: #ffffff;
      color: ${G.gray700};
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .filterPresetBtn.active {
      background: var(--primary-background);
      color: var(--primary-foreground);
      border-color: var(--primary-background);
    }
    .range_inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 10px;
    }
    .range_inputs label { display: block; font-size: 11px; color: ${G.gray500}; margin-bottom: 3px; }
    .price-input {
      width: 100%;
      padding: 7px 9px;
      border-radius: var(--irb-radius);
      border: 1px solid ${G.gray300};
      font-size: 12px;
      color: ${G.gray900};
      background: #ffffff;
    }
    .filterSizeGrid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }
    .filterSizeChip {
      padding: 5px 10px;
      border-radius: var(--irb-radius);
      border: 1px solid ${G.gray300};
      background: #ffffff;
      color: ${G.gray700};
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .filterSizeChip.active {
      background: var(--primary-background);
      color: var(--primary-foreground);
      border-color: var(--primary-background);
    }
    .filterCheckboxLabel {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      font-size: 13px;
      color: ${G.gray700};
      cursor: pointer;
    }
    .filterActionContainer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding-top: 14px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      margin-top: 6px;
    }
    .filter-button {
      padding: 9px 12px;
      border: 1px solid var(--btn-primary-border);
      border-radius: var(--irb-radius);
      background: var(--btn-primary-background);
      color: var(--btn-primary-color);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .clear-filters {
      padding: 9px 12px;
      border: 1px solid ${G.gray300};
      border-radius: var(--irb-radius);
      background: #ffffff;
      color: ${G.gray700};
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .pageControls--category {
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    .toolbar-shop {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .toolbar-shop-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .customFilterV2-toggle {
      display: none;
      align-items: center;
      gap: 7px;
      padding: 8px 14px;
      border-radius: var(--irb-radius);
      border: 1px solid var(--btn-primary-border);
      background: var(--btn-primary-background);
      color: var(--btn-primary-color);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .toolbar-shop-sorter {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: ${G.gray600};
    }
    .js-changeGrid {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--irb-radius);
      border: 1px solid ${G.gray300};
      background: #ffffff;
      color: ${G.gray500};
      cursor: pointer;
    }
    .js-changeGrid.active {
      border-color: var(--primary-background);
      color: var(--primary-background);
      background: ${G.gray50};
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
    .productList__grid.productList--category {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .productList__grid.productList--category.grid-cols-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .irb-cat-filter-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 105;
      background: rgba(17, 24, 39, 0.55);
    }
    .irb-cat-filter-backdrop.open { display: block; }
    @media (max-width: 960px) {
      .pageContent--category { grid-template-columns: 1fr; }
      .customFilterV2-toggle { display: inline-flex; }
      .toolbar-shop-sorter { display: none; }
      .pageColumnLeft.categorySidebar {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: min(340px, 88vw);
        z-index: 112;
        border-radius: 0;
        overflow-y: auto;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.25);
      }
      .pageColumnLeft.categorySidebar.open { display: block; }
      .categorySidebar__close { display: inline-flex; }
      .productList__grid.productList--category,
      .productList__grid.productList--category.grid-cols-4 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
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
