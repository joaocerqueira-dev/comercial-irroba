import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { StorefrontContext } from "../context";

/** Carrossel hero e banner secundário editorial. */
export function cssBanners(bp: StoreBlueprint, ctx: StorefrontContext): string {
  const { heroHeightPx, heroCustomWidthPx, heroFit } = ctx;
  return `
    /* Carrossel Hero (.bannerModule) */
    .bannerModule { position: relative; width: 100%; overflow: hidden; }
    .heroSlide { display: none; width: 100%; }
    .heroSlide.active { display: block; }
    .heroSlide__artLink { display: block; width: 100%; }
    .heroSlide__artImg {
      width: 100%;
      height: ${heroHeightPx ? `${heroHeightPx}px` : "auto"};
      max-height: ${heroHeightPx ?? 540}px;
      object-fit: ${heroFit};
      display: block;
      border-radius: ${heroCustomWidthPx || bp.visualOverrides.banner.width === "container" ? "var(--irb-radius)" : "0px"};
    }
    .heroNavBtn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.4);
      background: rgba(17,24,39,0.55);
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .heroNavBtn.prev { left: 16px; }
    .heroNavBtn.next { right: 16px; }
    .heroDots {
      position: absolute;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      display: flex;
      gap: 8px;
    }
    .heroDot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      border: none;
      background: rgba(255,255,255,0.5);
      cursor: pointer;
      padding: 0;
    }
    .heroDot.active { background: #ffffff; width: 24px; }

    .bannerHero {
      position: relative;
      min-height: ${heroHeightPx ?? 430}px;
      ${heroHeightPx ? `height: ${heroHeightPx}px;` : ""}
      display: flex;
      align-items: center;
      background: ${G.gray900};
      overflow: hidden;
      border-radius: ${heroCustomWidthPx || bp.visualOverrides.banner.width === "container" ? "var(--irb-radius)" : "0px"};
    }
    .bannerHero__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: ${heroFit}; opacity: 0.7; }
    .bannerHero__overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(17,24,39,0.82) 0%, rgba(17,24,39,0.35) 60%, rgba(17,24,39,0.1) 100%);
    }
    .bannerHero__content { position: relative; z-index: 2; max-width: 640px; padding: 56px 28px; color: #ffffff; }
    .bannerHero__tag {
      display: inline-block;
      background: var(--primary-background);
      color: var(--primary-foreground);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 5px 10px;
      border-radius: var(--irb-radius);
      margin-bottom: 14px;
    }
    .bannerHero__title { font-size: clamp(28px, 4vw, 46px); line-height: 1.12; margin: 0 0 14px; font-weight: 700; }
    .bannerHero__subtitle { font-size: 16px; line-height: 1.5; margin: 0 0 24px; color: rgba(255,255,255,0.92); }
    .bannerHero__cta {
      display: inline-block;
      background: var(--btn-primary-background);
      color: var(--btn-primary-color);
      border: 1px solid var(--btn-primary-border);
      text-decoration: none;
      padding: 14px 28px;
      font-weight: 700;
      font-size: 14px;
      border-radius: var(--irb-radius);
    }

    /* Secondary Editorial Banner */
    .secondaryEditorial { border-radius: var(--irb-radius); overflow: hidden; display: grid; grid-template-columns: 1.2fr 1fr; align-items: center; }
    .secondaryEditorial__text { padding: 44px 40px; }
    .secondaryEditorial__media { height: 100%; min-height: 300px; max-height: 380px; overflow: hidden; }
    .secondaryEditorial__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .btnSecondaryCustom {
      display: inline-block;
      padding: 13px 26px;
      border-radius: var(--irb-radius);
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      background: ${bp.theme.btnSecondaryOutline ? "transparent" : "var(--btn-secondary-background)"};
      color: ${bp.theme.btnSecondaryOutline ? "inherit" : "var(--btn-secondary-color)"};
      border: 2px solid ${bp.theme.btnSecondaryOutline ? "currentColor" : "var(--btn-secondary-border)"};
    }`;
}
