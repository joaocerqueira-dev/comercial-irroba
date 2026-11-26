import { escapeAttr, escapeHtml, sanitizeCssColor, sanitizeUrl } from "../../sanitize";
import { CONTAINER_WIDTH_PX, DEFAULT_COPY, PALETTE } from "@/lib/layout-patterns";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import { RADIUS_MAP } from "../helpers";

export function renderSlimBannerHtml(bp: StoreBlueprint): string {
  const slim = bp.sections.slimBanner;
  const bg = sanitizeCssColor(slim?.backgroundColor ?? bp.theme.secondaryBackground, PALETTE.ink);
  const fg = sanitizeCssColor(slim?.textColor ?? bp.theme.secondaryForeground, PALETTE.white);
  const btnBg = sanitizeCssColor(bp.theme.btnPrimaryBackground, PALETTE.white);
  const btnFg = sanitizeCssColor(bp.theme.btnPrimaryColor, PALETTE.ink);
  const radius = RADIUS_MAP[bp.theme.radius].css;
  const slimHeightPx = slim?.heightPx ? Math.min(600, Math.max(40, Math.round(slim.heightPx))) : null;
  const slimWidthPx = slim?.widthPx ? Math.min(2560, Math.max(280, Math.round(slim.widthPx))) : null;
  const slimFit = slim?.objectFit ?? "cover";

  if (slim?.mode === "image" && slim.imageUrl) {
    const wrapStyle = slimWidthPx
      ? `padding:10px 0;max-width:${slimWidthPx}px;margin:0 auto;`
      : "padding:10px 0;";
    const imgHeightCss = slimHeightPx ? `height:${slimHeightPx}px;` : "height:auto;";
    return `<div style="${wrapStyle}">
  <a href="#vitrines" style="display:block;border-radius:${radius};overflow:hidden;">
    <img src="${escapeAttr(sanitizeUrl(slim.imageUrl, ""))}" alt="${escapeAttr(slim.headline)}" style="width:100%;${imgHeightCss}display:block;object-fit:${slimFit};" />
  </a>
</div>`;
  }

  const innerMaxW = slimWidthPx ?? CONTAINER_WIDTH_PX;
  const minHeightCss = slimHeightPx ? `min-height:${slimHeightPx}px;` : "";
  return `<div style="position:relative;left:50%;width:100vw;max-width:100vw;margin-left:-50vw;background:${bg};color:${fg};padding:18px 20px;box-sizing:border-box;${minHeightCss}display:flex;align-items:center;">
  <div style="width:100%;max-width:${innerMaxW}px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;">
      <span style="background:${btnBg};color:${btnFg};font-size:11px;font-weight:800;letter-spacing:0.08em;padding:5px 10px;border-radius:${radius};">${escapeHtml(slim?.badgeText || DEFAULT_COPY.slimBadge)}</span>
      <span style="font-size:16px;font-weight:600;">${escapeHtml(slim?.headline || bp.sections.announcementText)}</span>
    </div>
    <a href="#vitrines" style="display:inline-block;padding:10px 20px;border:1px solid ${fg};color:${fg};text-decoration:none;font-size:13px;font-weight:700;border-radius:${radius};">${escapeHtml(slim?.ctaText || "Aproveitar")}</a>
  </div>
</div>`;
}
