import { IRROBA_ICONS } from "../../icons";
import { escapeAttr, escapeHtml, sanitizeUrl } from "../../sanitize";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { StorefrontContext } from "../context";

function getHeroSlidesToRender(bp: StoreBlueprint) {
  const activeSlides = (bp.sections.heroSlides ?? []).filter((s) => s.enabled);
  const slidesToRender =
    activeSlides.length > 0
      ? activeSlides
      : [
          {
            id: "slide-fallback",
            imageUrl: bp.sections.hero.imageUrl,
            headline: bp.sections.hero.headline,
            subheadline: bp.sections.hero.subheadline,
            ctaText: bp.sections.hero.ctaText,
            ctaHref: "#vitrines",
            mode: "editorial" as const,
            enabled: true,
          },
        ];
  return slidesToRender;
}

function renderHeroSlidesHtml(
  bp: StoreBlueprint,
  slidesToRender: ReturnType<typeof getHeroSlidesToRender>
): string {
  return slidesToRender
    .map((slide, idx) => {
      const imgUrl = escapeAttr(sanitizeUrl(slide.imageUrl, ""));
      if (slide.mode === "artwork") {
        return `<div class="heroSlide ${idx === 0 ? "active" : ""}" data-slide-idx="${idx}">
  <a href="${escapeAttr(sanitizeUrl(slide.ctaHref, "#vitrines"))}" class="heroSlide__artLink">
    <img class="heroSlide__artImg" src="${imgUrl}" alt="${escapeAttr(slide.headline)}" />
  </a>
</div>`;
      }
      return `<div class="heroSlide ${idx === 0 ? "active" : ""}" data-slide-idx="${idx}">
  <div class="bannerHero">
    <img class="bannerHero__img" src="${imgUrl}" alt="${escapeAttr(slide.headline)}" />
    <div class="bannerHero__overlay"></div>
    <div class="bannerHero__content">
      <span class="bannerHero__tag">${escapeHtml(bp.brand.niche)}</span>
      <${idx === 0 ? "h1" : "h2"} class="bannerHero__title">${escapeHtml(slide.headline)}</${idx === 0 ? "h1" : "h2"}>
      <p class="bannerHero__subtitle">${escapeHtml(slide.subheadline)}</p>
      <a href="${escapeAttr(sanitizeUrl(slide.ctaHref, "#vitrines"))}" class="bannerHero__cta">${escapeHtml(slide.ctaText)}</a>
    </div>
  </div>
</div>`;
    })
    .join("\n");
}

/** Banner Principal (carrossel hero). */
export function renderHeroSection(bp: StoreBlueprint, ctx: StorefrontContext): string {
  const { heroCustomWidthPx } = ctx;
  const slidesToRender = getHeroSlidesToRender(bp);
  const heroSlidesHtml = renderHeroSlidesHtml(bp, slidesToRender);
  return `<section class="bannerModule" data-irb-section="hero">
        <div class="${!heroCustomWidthPx && bp.visualOverrides.banner.width === "container" ? "container" : ""}" style="position:relative;${heroCustomWidthPx ? `max-width:${heroCustomWidthPx}px;margin:0 auto;padding:0 20px;` : ""}">
          ${heroSlidesHtml}
          ${
            slidesToRender.length > 1
              ? `<button type="button" class="heroNavBtn prev" id="irb-hero-prev" aria-label="Slide anterior">${IRROBA_ICONS.chevronLeft}</button>
                 <button type="button" class="heroNavBtn next" id="irb-hero-next" aria-label="Próximo slide">${IRROBA_ICONS.chevronRight}</button>
                 <div class="heroDots">${slidesToRender
                   .map(
                     (_, i) =>
                       `<button type="button" class="heroDot ${i === 0 ? "active" : ""}" data-hero-dot="${i}" aria-label="Slide ${i + 1}"></button>`
                   )
                   .join("")}</div>`
              : ""
          }
        </div>
      </section>`;
}
