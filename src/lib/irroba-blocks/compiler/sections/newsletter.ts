import { escapeAttr, escapeHtml } from "../../sanitize";
import type { StoreBlueprint } from "@/lib/types/blueprint";

/** Newsletter. */
export function renderNewsletterSection(bp: StoreBlueprint): string {
  return `<section class="newsletterModule" data-irb-section="newsletter">
        <div class="container">
          <div class="newsletterBox">
            <div>
              <h3 style="margin:0 0 6px;font-size:22px;">${escapeHtml(bp.sections.newsletter?.headline || `Receba novidades da ${bp.brand.name}`)}</h3>
              <p style="margin:0;opacity:0.85;font-size:14px;">${escapeHtml(bp.sections.newsletter?.subheadline || "Cadastre seu e-mail para garantir ofertas exclusivas em primeira mão.")}</p>
            </div>
            <form class="newsletterForm" onsubmit="event.preventDefault(); this.querySelector('button').textContent='Cadastrado ✓';">
              <input type="email" required placeholder="${escapeAttr(bp.sections.newsletter?.placeholder || "Digite seu melhor e-mail")}" />
              <button type="submit">${escapeHtml(bp.sections.newsletter?.ctaText || "Cadastrar")}</button>
            </form>
          </div>
        </div>
      </section>`;
}
