import { escapeAttr, escapeHtml, sanitizeCssColor, sanitizeUrl } from "../../sanitize";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { StorefrontContext } from "../context";

/** Banner Secundário de campanha (arte única ou editorial com texto). */
export function renderSecondaryBannerHtml(bp: StoreBlueprint, ctx: StorefrontContext): string {
  const { secondaryBg, secondaryFg, radiusCss } = ctx;
  const secondaryBanner = bp.sections.secondaryBanner;
  const secHeightPx = secondaryBanner?.heightPx
    ? Math.min(1000, Math.max(120, Math.round(secondaryBanner.heightPx)))
    : null;
  const secWidthPx = secondaryBanner?.widthPx
    ? Math.min(2560, Math.max(280, Math.round(secondaryBanner.widthPx)))
    : null;
  const secFit = secondaryBanner?.objectFit ?? "cover";
  const secondaryBannerHtml =
    secondaryBanner?.enabled && secondaryBanner.imageUrl
      ? secondaryBanner.mode === "artwork"
        ? `<section class="secondaryBannerSection">
  <div class="${!secWidthPx && bp.visualOverrides.banner.width === "container" ? "container" : ""}"${secWidthPx ? ` style="max-width:${secWidthPx}px;margin:0 auto;padding:0 20px;"` : ""}>
    <a href="#vitrines" style="display:block;">
      <img src="${escapeAttr(sanitizeUrl(secondaryBanner.imageUrl, ""))}" alt="${escapeAttr(secondaryBanner.headline)}" style="width:100%;height:${secHeightPx ? `${secHeightPx}px` : "auto"};max-height:${secHeightPx ?? 460}px;object-fit:${secFit};display:block;border-radius:${secWidthPx || bp.visualOverrides.banner.width === "container" ? radiusCss : "0px"};" />
    </a>
  </div>
</section>`
        : `<section class="secondaryBannerSection" style="padding:18px 0;">
  <div class="container"${secWidthPx ? ` style="max-width:${secWidthPx}px;"` : ""}>
    <div class="secondaryEditorial" style="background:${sanitizeCssColor(secondaryBanner.backgroundColor, secondaryBg)};color:${sanitizeCssColor(secondaryBanner.textColor, secondaryFg)};${secHeightPx ? `min-height:${secHeightPx}px;` : ""}">
      <div class="secondaryEditorial__text">
        <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.75;">Campanha Especial</span>
        <h2 style="margin:8px 0 10px;font-size:clamp(24px,3vw,34px);line-height:1.15;">${escapeHtml(secondaryBanner.headline)}</h2>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.55;opacity:0.9;">${escapeHtml(secondaryBanner.subheadline)}</p>
        <a href="#vitrines" class="btnSecondaryCustom">${escapeHtml(secondaryBanner.ctaText)}</a>
      </div>
      <div class="secondaryEditorial__media"${secHeightPx ? ` style="height:${secHeightPx}px;max-height:${secHeightPx}px;"` : ""}>
        <img src="${escapeAttr(sanitizeUrl(secondaryBanner.imageUrl, ""))}" alt="${escapeAttr(secondaryBanner.headline)}" style="object-fit:${secFit};" />
      </div>
    </div>
  </div>
</section>`
      : "";
  return secondaryBannerHtml;
}
