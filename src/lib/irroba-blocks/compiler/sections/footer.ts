import { escapeAttr, escapeHtml, sanitizeUrl } from "../../sanitize";
import type { StoreBlueprint } from "@/lib/types/blueprint";

/** Rodapé (informações, pagamentos e faixa legal). */
export function renderFooter(bp: StoreBlueprint): string {
  return `  <footer class="footer">
    <div class="footerContent--top">
      <div class="${bp.visualOverrides.footer.width === "full" ? "container-full" : "container"}">
        <div class="footerGrid">
          <div>
            <h4 class="footerTitle">${escapeHtml(bp.brand.name)}</h4>
            <p class="footerText">${escapeHtml(bp.footer.aboutText)}</p>
          </div>
          <div>
            <h4 class="footerTitle">Departamentos</h4>
            <ul class="footerList">
              ${bp.sections.categories
                .slice(0, 6)
                .map(
                  (c) =>
                    `<li><a href="#categoria" data-filter-cat="${escapeAttr(c.label)}">${escapeHtml(c.label)}</a></li>`
                )
                .join("")}
            </ul>
          </div>
          <div>
            <h4 class="footerTitle">Atendimento</h4>
            <ul class="footerList">
              ${bp.footer.whatsapp ? `<li>WhatsApp: ${escapeHtml(bp.footer.whatsapp)}</li>` : ""}
              ${bp.footer.email ? `<li>E-mail: ${escapeHtml(bp.footer.email)}</li>` : ""}
              ${bp.footer.instagram ? `<li><a href="${escapeAttr(sanitizeUrl(bp.footer.instagram))}" target="_blank" rel="noopener">Instagram Oficial</a></li>` : ""}
              <li>Compra 100% Segura • Checkout Transparente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="footerContent--bottom">
      <div class="container" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <span>Pagamentos: PIX • Cartão em até 6x • Boleto</span>
        <span>Segurança: SSL 256-bits • Ambiente Irroba E-commerce</span>
      </div>
    </div>
    <div class="footer-legal-info">
      ${bp.footer.legalText?.trim() ? escapeHtml(bp.footer.legalText.trim()) : `© ${new Date().getFullYear()} ${escapeHtml(bp.brand.name)} — Versão Beta demonstrativa estruturada no Tema LIME da Irroba.`}
    </div>
  </footer>`;
}
