import { IRROBA_ICONS } from "../../icons";
import { escapeAttr, escapeHtml } from "../../sanitize";
import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";
import type { StoreBlueprint } from "@/lib/types/blueprint";

/** Drawer de navegação mobile, modal de conta e mini-carrinho lateral. */
export function renderOverlays(bp: StoreBlueprint): string {
  const mobileNavLinksHtml = bp.sections.categories
    .slice(0, 8)
    .map(
      (c) =>
        `<a href="#categoria" class="mobileNavLink" data-filter-cat="${escapeAttr(c.label)}">${escapeHtml(c.label)}</a>`
    )
    .join("");

  return `  <!-- Mobile Navigation Drawer -->
  <div id="irb-mobile-drawer" class="irb-drawer-backdrop left" role="dialog" aria-modal="true">
    <div class="irb-drawer-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:1px solid ${G.gray200};">
        <strong style="font-size:17px;">Menu da Loja</strong>
        <button type="button" id="irb-mobile-close" style="border:none;background:${G.gray100};width:32px;height:32px;border-radius:999px;cursor:pointer;display:flex;align-items:center;justify-content:center;">${IRROBA_ICONS.close}</button>
      </div>
      <div style="padding:10px 0;overflow-y:auto;">
        <a href="#home" class="mobileNavLink" data-go-home="1">Início</a>
        ${mobileNavLinksHtml}
      </div>
    </div>
  </div>

  <!-- Account Modal (Demo: Entrar & Criar conta) -->
  <div id="irb-account-modal" class="irb-modal-backdrop" role="dialog" aria-modal="true">
    <div style="background:#ffffff;color:${G.gray900};max-width:400px;width:100%;border-radius:12px;padding:24px;position:relative;">
      <button type="button" id="irb-account-close" style="position:absolute;top:14px;right:14px;border:none;background:${G.gray100};width:30px;height:30px;border-radius:999px;cursor:pointer;display:flex;align-items:center;justify-content:center;">${IRROBA_ICONS.close}</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        ${IRROBA_ICONS.person}
        <h3 id="irb-account-modal-title" style="margin:0;font-size:19px;">Entrar na sua conta</h3>
      </div>
      <p id="irb-account-modal-desc" style="margin:0 0 16px;font-size:13px;color:${G.gray600};">Acesse seus pedidos, favoritos e dados cadastrais no ambiente seguro da Irroba.</p>
      <form id="irb-account-form" onsubmit="event.preventDefault(); document.getElementById('irb-account-msg').style.display='block';">
        <input type="text" id="irb-account-name-field" placeholder="Seu nome completo" style="display:none;width:100%;padding:10px 12px;border:1px solid ${G.gray300};border-radius:8px;margin-bottom:10px;font-size:14px;" />
        <input type="email" required placeholder="Seu e-mail" style="width:100%;padding:10px 12px;border:1px solid ${G.gray300};border-radius:8px;margin-bottom:10px;font-size:14px;" />
        <input type="password" required placeholder="Sua senha" style="width:100%;padding:10px 12px;border:1px solid ${G.gray300};border-radius:8px;margin-bottom:14px;font-size:14px;" />
        <button type="submit" id="irb-account-submit-btn" class="product-btn" style="padding:12px;">Entrar na Conta (Demo)</button>
      </form>
      <div id="irb-account-msg" style="display:none;margin-top:12px;padding:10px;border-radius:8px;background:#ecfdf5;color:#065f46;font-size:12px;font-weight:600;">
        Ação de demonstração validada com sucesso!
      </div>
    </div>
  </div>

  <!-- Mini-Carrinho Lateral -->
  <div id="irb-cart-drawer" class="irb-drawer-backdrop" role="dialog" aria-modal="true">
    <div class="irb-drawer-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:1px solid ${G.gray200};">
        <div style="display:flex;align-items:center;gap:8px;">
          ${IRROBA_ICONS.shoppingBag}
          <strong style="font-size:18px;">Sua Sacola</strong>
        </div>
        <button type="button" id="irb-cart-close" style="border:none;background:${G.gray100};width:32px;height:32px;border-radius:999px;cursor:pointer;display:flex;align-items:center;justify-content:center;">${IRROBA_ICONS.close}</button>
      </div>
      <div id="irb-cart-items" style="flex:1;overflow-y:auto;padding:14px 0;display:flex;flex-direction:column;gap:12px;"></div>
      <div style="border-top:1px solid ${G.gray200};padding-top:14px;">
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;margin-bottom:12px;">
          <span>Subtotal</span>
          <span id="irb-cart-total">R$ 0,00</span>
        </div>
        <button type="button" onclick="this.textContent='Checkout Transparente Irroba pronto para conversão ✓'" class="product-btn" style="padding:14px;font-size:14px;">Finalizar Compra (Demo)</button>
      </div>
    </div>
  </div>`;
}
