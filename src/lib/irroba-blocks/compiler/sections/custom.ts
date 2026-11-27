// Seções customizadas da página inicial (HTML livre, galeria, editorial, banner, faixa e vitrine).
import { escapeAttr, escapeHtml, sanitizeCssColor, sanitizeCustomHtmlBlock, sanitizeUrl } from "../../sanitize";
import { getBenefitSvgIcon } from "../../icons";
import { CONTAINER_WIDTH_PX, PALETTE } from "@/lib/layout-patterns";
import type { CustomSection, StoreBlueprint } from "@/lib/types/blueprint";
import { RADIUS_MAP } from "../helpers";
import { buildCustomEditorialSplitHtml, buildCustomGalleryBlockHtml } from "../html-blocks";
import { buildProductCardMarkup } from "./showcase";

export function renderCustomSectionHtml(
  sec: CustomSection,
  bp: StoreBlueprint,
  productMap: Map<string, StoreBlueprint["products"][number]>,
  visibleProducts: StoreBlueprint["products"]
): string {
  const radiusCss = RADIUS_MAP[bp.theme.radius].css;
  const secondaryBg = sanitizeCssColor(bp.theme.secondaryBackground, PALETTE.footerDark);
  const secondaryFg = sanitizeCssColor(bp.theme.secondaryForeground, PALETTE.white);
  const primaryBg = sanitizeCssColor(bp.theme.primaryBackground, PALETTE.ink);
  const primaryFg = sanitizeCssColor(bp.theme.primaryForeground, PALETTE.white);
  const bodyColor = sanitizeCssColor(bp.theme.bodyForeground, PALETTE.ink);
  const dataAttrs = `data-irb-section="${escapeAttr(sec.id)}" data-irb-custom-section="${escapeAttr(sec.id)}" data-irb-custom-title="${escapeAttr(sec.title)}"`;

  if (sec.kind === "html") {
    const cleanHtml = sanitizeCustomHtmlBlock(sec.html);
    return `<section class="htmlContent" id="${escapeAttr(sec.id)}" ${dataAttrs}>
  <div class="${sec.width === "full" ? "container-full" : "container"}">${cleanHtml}</div>
</section>`;
  }

  if (sec.kind === "banner") {
    const heightPx = sec.heightPx ? Math.min(1000, Math.max(120, Math.round(sec.heightPx))) : null;
    const widthPx = sec.widthPx ? Math.min(2560, Math.max(280, Math.round(sec.widthPx))) : null;
    const fit = sec.objectFit ?? "cover";
    const imgUrl = sanitizeUrl(sec.imageUrl, "");
    const ctaHref = escapeAttr(sanitizeUrl(sec.ctaHref, "#vitrines"));
    if (sec.mode === "artwork" && imgUrl) {
      return `<section class="secondaryBannerSection" id="${escapeAttr(sec.id)}" ${dataAttrs}>
  <div class="${!widthPx && bp.visualOverrides.banner.width === "container" ? "container" : ""}"${widthPx ? ` style="max-width:${widthPx}px;margin:0 auto;padding:0 20px;"` : ""}>
    <a href="${ctaHref}" style="display:block;">
      <img src="${escapeAttr(imgUrl)}" alt="${escapeAttr(sec.headline || sec.title)}" referrerpolicy="no-referrer" style="width:100%;height:${heightPx ? `${heightPx}px` : "auto"};max-height:${heightPx ?? 460}px;object-fit:${fit};display:block;border-radius:${widthPx || bp.visualOverrides.banner.width === "container" ? radiusCss : "0px"};" />
    </a>
  </div>
</section>`;
    }
    return `<section class="secondaryBannerSection" id="${escapeAttr(sec.id)}" style="padding:18px 0;" ${dataAttrs}>
  <div class="container"${widthPx ? ` style="max-width:${widthPx}px;"` : ""}>
    <div class="secondaryEditorial" style="background:${sanitizeCssColor(sec.backgroundColor, secondaryBg)};color:${sanitizeCssColor(sec.textColor, secondaryFg)};${heightPx ? `min-height:${heightPx}px;` : ""}">
      <div class="secondaryEditorial__text">
        <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.75;">${escapeHtml(sec.title)}</span>
        <h2 style="margin:8px 0 10px;font-size:clamp(24px,3vw,34px);line-height:1.15;">${escapeHtml(sec.headline || sec.title)}</h2>
        ${sec.subheadline ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.55;opacity:0.9;">${escapeHtml(sec.subheadline)}</p>` : ""}
        <a href="${ctaHref}" class="btnSecondaryCustom">${escapeHtml(sec.ctaText || "Ver Coleção")}</a>
      </div>
      <div class="secondaryEditorial__media"${heightPx ? ` style="height:${heightPx}px;max-height:${heightPx}px;"` : ""}>
        ${imgUrl ? `<img src="${escapeAttr(imgUrl)}" alt="${escapeAttr(sec.headline || sec.title)}" referrerpolicy="no-referrer" style="object-fit:${fit};" />` : `<div style="width:100%;height:100%;min-height:260px;background:rgba(255,255,255,0.08);"></div>`}
      </div>
    </div>
  </div>
</section>`;
  }

  if (sec.kind === "slimBanner") {
    const bg = sanitizeCssColor(sec.backgroundColor, secondaryBg);
    const fg = sanitizeCssColor(sec.textColor, secondaryFg);
    const btnBg = sanitizeCssColor(bp.theme.btnPrimaryBackground, PALETTE.white);
    const btnFg = sanitizeCssColor(bp.theme.btnPrimaryColor, PALETTE.ink);
    const heightPx = sec.heightPx ? Math.min(600, Math.max(40, Math.round(sec.heightPx))) : null;
    const widthPx = sec.widthPx ? Math.min(2560, Math.max(280, Math.round(sec.widthPx))) : null;
    const fit = sec.objectFit ?? "cover";
    const imgUrl = sanitizeUrl(sec.imageUrl, "");
    const innerHtml =
      sec.mode === "image" && imgUrl
        ? `<div style="${widthPx ? `padding:10px 0;max-width:${widthPx}px;margin:0 auto;` : "padding:10px 0;"}">
  <a href="#vitrines" style="display:block;border-radius:${radiusCss};overflow:hidden;">
    <img src="${escapeAttr(imgUrl)}" alt="${escapeAttr(sec.headline || sec.title)}" referrerpolicy="no-referrer" style="width:100%;${heightPx ? `height:${heightPx}px;` : "height:auto;"}display:block;object-fit:${fit};" />
  </a>
</div>`
        : `<div style="position:relative;left:50%;width:100vw;max-width:100vw;margin-left:-50vw;background:${bg};color:${fg};padding:18px 20px;box-sizing:border-box;${heightPx ? `min-height:${heightPx}px;` : ""}display:flex;align-items:center;">
  <div style="width:100%;max-width:${widthPx ?? CONTAINER_WIDTH_PX}px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;">
      ${sec.badgeText ? `<span style="background:${btnBg};color:${btnFg};font-size:11px;font-weight:800;letter-spacing:0.08em;padding:5px 10px;border-radius:${radiusCss};">${escapeHtml(sec.badgeText)}</span>` : ""}
      <span style="font-size:16px;font-weight:600;">${escapeHtml(sec.headline || sec.title)}</span>
    </div>
    <a href="#vitrines" style="display:inline-block;padding:10px 20px;border:1px solid ${fg};color:${fg};text-decoration:none;font-size:13px;font-weight:700;border-radius:${radiusCss};">${escapeHtml(sec.ctaText || "Aproveitar")}</a>
  </div>
</div>`;
    return `<section class="bannerModule bannerModule--slim" id="${escapeAttr(sec.id)}" ${dataAttrs}><div class="container">${innerHtml}</div></section>`;
  }

  if (sec.kind === "showcase") {
    let list = sec.productIds
      .map((id) => productMap.get(id))
      .filter((p): p is StoreBlueprint["products"][number] => Boolean(p));
    if (list.length === 0 && sec.categoryFilter) {
      const norm = sec.categoryFilter.toLowerCase();
      list = visibleProducts.filter((p) =>
        [p.category, ...(p.categories ?? [])].some((c) => c.toLowerCase().includes(norm))
      );
    }
    if (list.length === 0) list = visibleProducts;
    const sliced = list.slice(0, Math.max(1, sec.limit));
    if (sliced.length === 0) return "";
    const cards = sliced
      .map((p) => buildProductCardMarkup(p, bp.visualOverrides.pageProduct.buyButtonText))
      .join("\n");
    return `<section class="productList" id="${escapeAttr(sec.id)}" ${dataAttrs}>
  <div class="${bp.visualOverrides.productCard.listWidth === "full" ? "container-full" : "container"}">
    <div class="productList__header" style="text-align:${bp.visualOverrides.productCard.titleAlign}">
      <h2 class="productList__title">${escapeHtml(sec.title)}</h2>
      ${sec.subtitle ? `<p class="productList__subtitle">${escapeHtml(sec.subtitle)}</p>` : ""}
    </div>
    <div class="productList__grid">${cards}</div>
  </div>
</section>`;
  }

  if (sec.kind === "gallery") {
    const galleryHtml = buildCustomGalleryBlockHtml(sec, bp);
    return `<section class="htmlContent" id="${escapeAttr(sec.id)}" ${dataAttrs}>
  <div class="container">${galleryHtml}</div>
</section>`;
  }

  if (sec.kind === "tarja") {
    const bg = sanitizeCssColor(sec.backgroundColor, sanitizeCssColor(bp.theme.neutralBackground, PALETTE.neutralSurface));
    const itemsHtml = sec.items
      .slice(0, 4)
      .map(
        (b) => `<div style="flex:1 1 220px;min-width:200px;display:flex;align-items:center;gap:14px;padding:14px 18px;background:#ffffff;border-radius:${radiusCss};border:1px solid rgba(0,0,0,0.06);box-sizing:border-box;">
  <div style="width:42px;height:42px;flex-shrink:0;border-radius:${radiusCss};background:${primaryBg};color:${primaryFg};display:flex;align-items:center;justify-content:center;">${getBenefitSvgIcon(b.icon)}</div>
  <div>
    <div style="font-size:14px;font-weight:700;color:${bodyColor};margin-bottom:2px;">${escapeHtml(b.title)}</div>
    <div style="font-size:12px;color:#4b5563;line-height:1.35;">${escapeHtml(b.subtitle)}</div>
  </div>
</div>`
      )
      .join("\n");
    return `<section class="bannerTarjaModule" id="${escapeAttr(sec.id)}" ${dataAttrs}>
  <div class="container">
    <div style="position:relative;left:50%;width:100vw;max-width:100vw;margin-left:-50vw;background:${bg};padding:14px 20px;box-sizing:border-box;">
      <div style="max-width:${CONTAINER_WIDTH_PX}px;margin:0 auto;display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;">${itemsHtml}</div>
    </div>
  </div>
</section>`;
  }

  // editorialSplit
  return `<section class="htmlContent" id="${escapeAttr(sec.id)}" ${dataAttrs}>
  <div class="container">${buildCustomEditorialSplitHtml(sec, bp)}</div>
</section>`;
}
