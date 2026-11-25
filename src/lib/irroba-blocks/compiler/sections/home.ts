import {
  getNormalizedSectionLayout,
  type CompiledExport,
  type SectionKey,
  type StoreBlueprint,
} from "@/lib/types/blueprint";
import type { StorefrontContext } from "../context";
import { renderTarjaBenefitsHtml } from "./tarja";
import { renderSlimBannerHtml } from "./slim-banner";
import { renderShowcases } from "./showcase";
import { renderHeroSection } from "./hero";
import { renderSecondaryBannerHtml } from "./secondary-banner";
import { renderTestimonialsSection } from "./testimonials";
import { renderNewsletterSection } from "./newsletter";

/** Página inicial: seções na ordem e visibilidade definidas pelo Editor de Seções. */
export function renderHomeSections(
  bp: StoreBlueprint,
  ctx: StorefrontContext,
  exportPkg: CompiledExport
): string {
  const editorialGalleryBlock = exportPkg.htmlBlocks[0];
  const editorialLookbookBlock = exportPkg.htmlBlocks[1];
  const tarjaBenefitsHtml = renderTarjaBenefitsHtml(bp);
  const slimBannerHtml = renderSlimBannerHtml(bp);
  const { firstShowcaseHtml, extraShowcasesHtml } = renderShowcases(bp);
  const secondaryBannerHtml = renderSecondaryBannerHtml(bp, ctx);

  const homeSectionMap: Record<SectionKey, string> = {
    hero: renderHeroSection(bp, ctx),
    tarja: `<section class="bannerTarjaModule" id="bannerTarja-benefits" data-irb-section="tarja">
        <div class="container">${tarjaBenefitsHtml}</div>
      </section>`,
    editorialGallery: `<section class="htmlContent" id="htmlContent-editorial-gallery" data-irb-section="editorialGallery">
        <div class="container">${editorialGalleryBlock.html}</div>
      </section>`,
    slimBanner:
      bp.sections.slimBanner?.enabled !== false
        ? `<section class="bannerModule bannerModule--slim" id="banner-slim" data-irb-section="slimBanner"><div class="container">${slimBannerHtml}</div></section>`
        : "",
    showcase1: `<div id="vitrines" data-irb-section="showcase1">
        ${firstShowcaseHtml}
      </div>`,
    secondaryBanner: secondaryBannerHtml,
    editorialLookbook: `<section class="htmlContent" id="htmlContent-editorial-lookbook" data-irb-section="editorialLookbook">
        <div class="container">${editorialLookbookBlock.html}</div>
      </section>`,
    extraShowcases: extraShowcasesHtml,
    testimonials: renderTestimonialsSection(bp),
    newsletter: renderNewsletterSection(bp),
  };

  return getNormalizedSectionLayout(bp.sections.layout)
    .filter((sec) => sec.enabled)
    .map((sec) => homeSectionMap[sec.id] || "")
    .join("\n      ");
}
