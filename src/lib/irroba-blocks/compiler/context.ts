import { isApparelText, isFootwearText } from "@/lib/catalog/niche";
import { safeJsonForScript, sanitizeCssColor, sanitizeFontName, sanitizeUrl } from "../sanitize";
import { FONT_FALLBACKS, PALETTE } from "@/lib/layout-patterns";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import { RADIUS_MAP, colorWithAlpha } from "./helpers";

/**
 * Valores derivados do blueprint (cores sanitizadas, tipografia, cabeçalho, banner,
 * barra de aviso e variações da PDP) compartilhados pelo CSS, pelas seções e pelo runtime.
 */
export function buildStorefrontContext(bp: StoreBlueprint) {
  const primaryBg = sanitizeCssColor(bp.theme.primaryBackground, PALETTE.ink);
  const primaryFg = sanitizeCssColor(bp.theme.primaryForeground, PALETTE.white);
  const secondaryBg = sanitizeCssColor(bp.theme.secondaryBackground, PALETTE.footerDark);
  const secondaryFg = sanitizeCssColor(bp.theme.secondaryForeground, PALETTE.white);
  const neutralBg = sanitizeCssColor(bp.theme.neutralBackground, PALETTE.neutralSurface);
  const neutralFg = sanitizeCssColor(bp.theme.neutralForeground, PALETTE.ink);
  const bodyBg = sanitizeCssColor(bp.theme.bodyBackground, PALETTE.white);
  const bodyFg = sanitizeCssColor(bp.theme.bodyForeground, PALETTE.ink);

  const btnPrimaryBg = sanitizeCssColor(bp.theme.btnPrimaryBackground, primaryBg);
  const btnPrimaryFg = sanitizeCssColor(bp.theme.btnPrimaryColor, primaryFg);
  const btnPrimaryBorder = sanitizeCssColor(bp.theme.btnPrimaryBorder, "transparent");
  const btnSecBg = sanitizeCssColor(bp.theme.btnSecondaryBackground, PALETTE.ink);
  const btnSecFg = sanitizeCssColor(bp.theme.btnSecondaryColor, PALETTE.white);
  const btnSecBorder = sanitizeCssColor(bp.theme.btnSecondaryBorder, primaryBg);

  const announcementBg = sanitizeCssColor(bp.visualOverrides.announcement?.background, PALETTE.ink);
  const announcementFg = sanitizeCssColor(bp.visualOverrides.announcement?.foreground, PALETTE.white);
  const headerBg = sanitizeCssColor(bp.visualOverrides.header.background, bodyBg);
  const headerFg = sanitizeCssColor(bp.visualOverrides.header.foreground, bodyFg);

  const headingFont = sanitizeFontName(bp.theme.headingFont, FONT_FALLBACKS.heading);
  const bodyFont = sanitizeFontName(bp.theme.bodyFont, FONT_FALLBACKS.body);
  const radiusCss = RADIUS_MAP[bp.theme.radius].css;

  const cardBg = sanitizeCssColor(bp.visualOverrides.productCard.cardBackground, PALETTE.white);
  const cardPaddingX = bp.visualOverrides.productCard.paddingX;
  const buyBg = sanitizeCssColor(bp.visualOverrides.productCard.buyBtnBackground, btnPrimaryBg);
  const buyFg = sanitizeCssColor(bp.visualOverrides.productCard.buyBtnForeground, btnPrimaryFg);
  const buyBorder = sanitizeCssColor(bp.visualOverrides.productCard.buyBtnBorder, "transparent");
  const priceColor = sanitizeCssColor(bp.visualOverrides.productCard.priceColor, bodyFg);
  const oldPriceColor = sanitizeCssColor(bp.visualOverrides.productCard.oldPriceColor, PALETTE.oldPrice);

  const footerBg = sanitizeCssColor(bp.visualOverrides.footer.background, secondaryBg);
  const footerFg = sanitizeCssColor(bp.visualOverrides.footer.foreground, secondaryFg);
  const legalBg = sanitizeCssColor(bp.visualOverrides.footer.legalBackground, PALETTE.legalDark);
  const legalFg = sanitizeCssColor(bp.visualOverrides.footer.legalForeground, PALETTE.white);

  const visibleProducts = bp.products.filter((p) => p.visible !== false);

  const fontsParam = Array.from(new Set([headingFont, bodyFont]))
    .map((f) => `family=${encodeURIComponent(f)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400`)
    .join("&");

  const headerPosClass =
    bp.visualOverrides.header.position === "overlay"
      ? "header--overlay"
      : bp.visualOverrides.header.position === "sticky"
        ? "header--sticky"
        : "";

  const headerOpacity = Math.min(1, Math.max(0, bp.visualOverrides.header.backgroundOpacity));
  const headerBgCss = colorWithAlpha(headerBg, headerOpacity);
  const effectiveHeaderBlur = headerOpacity <= 0 ? 0 : bp.visualOverrides.header.blurPx;
  const headerBorderAlpha = Number((0.08 * headerOpacity).toFixed(4));
  const logoHeightPx = bp.visualOverrides.header.logoHeightPx
    ? Math.min(140, Math.max(20, Math.round(bp.visualOverrides.header.logoHeightPx)))
    : 46;

  const navHoverColor = sanitizeCssColor(bp.visualOverrides.header.linkHoverColor, primaryBg);
  const navHoverStyle = bp.visualOverrides.header.linkHoverStyle ?? "underline";
  const navHoverBg = sanitizeCssColor(bp.visualOverrides.header.linkHoverBackground, "rgba(0, 0, 0, 0.07)");

  const heroHeightPx = bp.visualOverrides.banner.heightPx
    ? Math.min(1200, Math.max(120, Math.round(bp.visualOverrides.banner.heightPx)))
    : null;
  const heroCustomWidthPx = bp.visualOverrides.banner.customWidthPx
    ? Math.min(2560, Math.max(280, Math.round(bp.visualOverrides.banner.customWidthPx)))
    : null;
  const heroFit = bp.visualOverrides.banner.objectFit ?? "cover";

  const rawAnnouncementMsgs = (bp.visualOverrides.announcement.messages ?? [])
    .map((m) => m.trim())
    .filter(Boolean);
  const announcementMessages =
    rawAnnouncementMsgs.length > 0 ? rawAnnouncementMsgs : [bp.sections.announcementText];
  const announcementRolling =
    bp.visualOverrides.announcement.rollingEnabled ?? announcementMessages.length > 1;
  const announcementIntervalMs =
    Math.min(30, Math.max(1, bp.visualOverrides.announcement.intervalSeconds ?? 4)) * 1000;
  const announcementTransition = bp.visualOverrides.announcement.transitionMode ?? "slide-up";

  // Detect appropriate variations for PDP by niche and product/category context
  const nicheLower = bp.brand.niche.toLowerCase();
  const productContext =
    visibleProducts
      .slice(0, 12)
      .map((p) => `${p.category || ""} ${p.title || ""}`)
      .join(" ")
      .toLowerCase() +
    " " +
    bp.sections.categories
      .map((c) => c.label)
      .join(" ")
      .toLowerCase();
  const fullVariationContext = `${nicheLower} ${productContext}`;
  const isFootwear = isFootwearText(fullVariationContext);
  const isApparel = isApparelText(fullVariationContext);
  const variationSizes =
    isFootwear && !/vestido|blusa|blazer|camiseta/.test(productContext)
      ? ["34", "35", "36", "37", "38", "39", "40"]
      : isApparel
        ? ["PP", "P", "M", "G", "GG"]
        : isFootwear
          ? ["34", "35", "36", "37", "38", "39", "40"]
          : ["Padrão"];

  const sanitizedProducts = visibleProducts.map((p) => ({
    ...p,
    imageUrl: sanitizeUrl(p.imageUrl, ""),
    images: (p.images && p.images.length > 0 ? p.images : [p.imageUrl])
      .map((u) => sanitizeUrl(u, ""))
      .filter(Boolean),
    categories: p.categories && p.categories.length > 0 ? p.categories : [p.category],
  }));
  const safeProductsJson = safeJsonForScript(sanitizedProducts);
  const safeCategoriesJson = safeJsonForScript(bp.sections.categories.map((c) => c.label));

  return {
    primaryBg,
    primaryFg,
    secondaryBg,
    secondaryFg,
    neutralBg,
    neutralFg,
    bodyBg,
    bodyFg,
    btnPrimaryBg,
    btnPrimaryFg,
    btnPrimaryBorder,
    btnSecBg,
    btnSecFg,
    btnSecBorder,
    announcementBg,
    announcementFg,
    headerBg,
    headerFg,
    headingFont,
    bodyFont,
    radiusCss,
    cardBg,
    cardPaddingX,
    buyBg,
    buyFg,
    buyBorder,
    priceColor,
    oldPriceColor,
    footerBg,
    footerFg,
    legalBg,
    legalFg,
    fontsParam,
    headerPosClass,
    headerOpacity,
    headerBgCss,
    effectiveHeaderBlur,
    headerBorderAlpha,
    logoHeightPx,
    navHoverColor,
    navHoverStyle,
    navHoverBg,
    heroHeightPx,
    heroCustomWidthPx,
    heroFit,
    announcementMessages,
    announcementRolling,
    announcementIntervalMs,
    announcementTransition,
    variationSizes,
    safeProductsJson,
    safeCategoriesJson,
  };
}

export type StorefrontContext = ReturnType<typeof buildStorefrontContext>;
