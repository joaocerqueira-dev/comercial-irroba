import { escapeHtml } from "../../sanitize";
import { DEFAULT_COPY } from "@/lib/layout-patterns";
import type { StoreBlueprint } from "@/lib/types/blueprint";

/** Avaliações de Clientes. */
export function renderTestimonialsSection(bp: StoreBlueprint): string {
  const testimonialsHtml = bp.sections.testimonials
    .map(
      (t) => `<div class="reviewCard">
  <div class="reviewCard__stars">${"★".repeat(Math.round(t.rating))}</div>
  <p class="reviewCard__text">"${escapeHtml(t.comment)}"</p>
  <div class="reviewCard__author">— ${escapeHtml(t.author)}</div>
</div>`
    )
    .join("\n");

  return `<section class="reviewModule" data-irb-section="testimonials">
        <div class="container">
          <div class="productList__header" style="text-align:center;">
            <h2 class="productList__title">${escapeHtml(bp.sections.testimonialsTitle || "Quem compra recomenda")}</h2>
            <p class="productList__subtitle">${escapeHtml(
              bp.sections.testimonialsIllustrative
                ? DEFAULT_COPY.testimonialsIllustrativeNotice
                : DEFAULT_COPY.testimonialsSubtitle
            )}</p>
          </div>
          <div class="reviewGrid">${testimonialsHtml}</div>
        </div>
      </section>`;
}
