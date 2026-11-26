import { escapeAttr, escapeHtml, formatBrl, sanitizeUrl } from "../../sanitize";
import type { StoreBlueprint } from "@/lib/types/blueprint";

export function buildProductCardMarkup(p: StoreBlueprint["products"][number], buyButtonText: string): string {
  const discountPct =
    p.compareAtPrice && p.compareAtPrice > p.price
      ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
      : 0;
  const allCats = Array.from(new Set([p.category, ...(p.categories ?? [])])).join("|");

  return `<article class="product product-grid" data-product-id="${escapeAttr(p.id)}" data-title="${escapeAttr(p.title.toLowerCase())}" data-category="${escapeAttr(allCats.toLowerCase())}">
  <div class="product-image-wrap" data-open-pdp="${escapeAttr(p.id)}">
    ${discountPct > 0 ? `<span class="product-badge">-${discountPct}%</span>` : ""}
    <img src="${escapeAttr(sanitizeUrl(p.imageUrl, ""))}" alt="${escapeAttr(p.title)}" referrerpolicy="no-referrer" loading="lazy" />
  </div>
  <div class="product-info">
    <span class="product-cat">${escapeHtml(p.category)}</span>
    <h3 class="product-title" data-open-pdp="${escapeAttr(p.id)}">${escapeHtml(p.title)}</h3>
    <div class="product-price-wrap">
      ${p.compareAtPrice && p.compareAtPrice > p.price ? `<span class="product-price-old">${formatBrl(p.compareAtPrice)}</span>` : ""}
      <span class="product-price">${formatBrl(p.price)}</span>
    </div>
    ${p.installmentsText ? `<div class="product-installments">${escapeHtml(p.installmentsText)}</div>` : ""}
    <button type="button" class="product-btn" data-add-cart="${escapeAttr(p.id)}">${escapeHtml(buyButtonText)}</button>
  </div>
</article>`;
}

/** Vitrines (Listas de Produtos): a primeira vai no slot showcase1, as demais em extraShowcases. */
export function renderShowcases(bp: StoreBlueprint): {
  firstShowcaseHtml: string;
  extraShowcasesHtml: string;
} {
  const visibleProducts = bp.products.filter((p) => p.visible !== false);
  const productMap = new Map(visibleProducts.map((p) => [p.id, p]));

  const renderShowcase = (showcase: StoreBlueprint["sections"]["showcases"][number], index: number) => {
    const items = showcase.productIds
      .map((id) => productMap.get(id))
      .filter((p): p is StoreBlueprint["products"][number] => Boolean(p));
    const list = items.length > 0 ? items : visibleProducts.slice(0, 8);
    if (list.length === 0) return "";

    const cards = list
      .map((p) => buildProductCardMarkup(p, bp.visualOverrides.pageProduct.buyButtonText))
      .join("\n");

    return `<section class="productList" id="showcase-${index + 1}">
  <div class="${bp.visualOverrides.productCard.listWidth === "full" ? "container-full" : "container"}">
    <div class="productList__header" style="text-align:${bp.visualOverrides.productCard.titleAlign}">
      <h2 class="productList__title">${escapeHtml(showcase.title)}</h2>
      ${showcase.subtitle ? `<p class="productList__subtitle">${escapeHtml(showcase.subtitle)}</p>` : ""}
    </div>
    <div class="productList__grid">${cards}</div>
  </div>
</section>`;
  };

  const firstShowcaseHtml = bp.sections.showcases[0] ? renderShowcase(bp.sections.showcases[0], 0) : "";
  const extraShowcasesHtml = bp.sections.showcases
    .slice(1)
    .map((sc, idx) => renderShowcase(sc, idx + 1))
    .join("\n");

  return { firstShowcaseHtml, extraShowcasesHtml };
}
