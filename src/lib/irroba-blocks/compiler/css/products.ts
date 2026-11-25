import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";

/** Listas de produtos e cards. */
export function cssProducts(): string {
  return `
    /* Listas de Produtos (.productList) */
    .productList { padding: 46px 0; }
    .productList__header { margin-bottom: 26px; }
    .productList__title { font-size: 28px; margin: 0 0 6px; font-weight: 700; }
    .productList__subtitle { margin: 0; color: ${G.gray500}; font-size: 14px; }
    .productList__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
    @media (max-width: 1024px) { .productList__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 720px) {
      .productList__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .bannerHero { min-height: 340px; }
      .secondaryEditorial { grid-template-columns: 1fr; }
      .secondaryEditorial__text { padding: 28px 22px; }
    }
    .product.product-grid {
      background: var(--productGrid-background);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: var(--irb-radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .product.product-grid:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08); }
    .product-image-wrap {
      position: relative;
      aspect-ratio: 1 / 1;
      background: ${G.gray50};
      overflow: hidden;
      cursor: pointer;
    }
    .product-image-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s ease; }
    .product.product-grid:hover .product-image-wrap img { transform: scale(1.04); }
    .product-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      background: var(--primary-background);
      color: var(--primary-foreground);
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: var(--irb-radius);
      z-index: 2;
    }
    .product-info {
      padding: 14px var(--productGrid-information-padding-x) 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .product-cat { font-size: 11px; color: ${G.gray500}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .product-title {
      font-family: var(--text-font-family);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.35;
      margin: 0 0 10px;
      cursor: pointer;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .product-price-wrap { display: flex; align-items: baseline; gap: 8px; margin-top: auto; }
    .product-price-old { font-size: 12px; color: var(--product-old-price-color); text-decoration: line-through; }
    .product-price { font-size: 17px; font-weight: 700; color: var(--product-price-color); }
    .product-installments { font-size: 11px; color: ${G.gray600}; margin-top: 3px; margin-bottom: 12px; }
    .product-btn {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--productList-buy-btn-border);
      border-radius: var(--irb-radius);
      background: var(--productList-buy-btn-background);
      color: var(--productList-buy-btn-foreground);
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity .15s;
    }
    .product-btn:hover { opacity: 0.9; }`;
}
