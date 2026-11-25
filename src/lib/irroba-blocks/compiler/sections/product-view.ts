import { IRROBA_ICONS } from "../../icons";
import { escapeAttr, escapeHtml } from "../../sanitize";
import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { StorefrontContext } from "../context";

/** View da página completa de produto (PDP .product-content). */
export function renderProductView(bp: StoreBlueprint, ctx: StorefrontContext): string {
  const { variationSizes } = ctx;
  return `    <!-- 3. VIEW: PÁGINA COMPLETA DE PRODUTO (PDP .product-content) -->
    <div id="irb-view-product" class="storeView">
      <div class="container">
        <nav class="irb-breadcrumb" aria-label="Breadcrumb">
          <button type="button" data-go-home="1">Início</button>
          <span>/</span>
          <button type="button" id="irb-pdp-cat-link">Categoria</button>
          <span>/</span>
          <strong id="irb-pdp-breadcrumb-title" style="color:var(--body-foreground);">Produto</strong>
        </nav>

        <div class="pdpGrid">
          <div class="pdpGallery">
            <div class="pdpThumbs" id="irb-pdp-thumbs"></div>
            <div class="pdpMainImageWrap">
              <img id="irb-pdp-img" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Produto" />
            </div>
          </div>

          <div class="productInfo">
            <span id="irb-pdp-cat" style="font-size:11px;text-transform:uppercase;color:${G.gray500};letter-spacing:0.08em;font-weight:700;"></span>
            <h2 id="irb-pdp-title" class="productInfo__title"></h2>
            <div class="pdpRating">
              <span style="color:#f59e0b;letter-spacing:2px;">★★★★★</span>
              <span>5.0 · 18 avaliações verificadas</span>
            </div>

            <div class="pdpPriceBox">
              <div id="irb-pdp-old" style="font-size:14px;color:var(--product-old-price-color);text-decoration:line-through;"></div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <span id="irb-pdp-price" style="font-size:30px;font-weight:800;color:var(--product-price-color);"></span>
                <span id="irb-pdp-pix-badge" style="font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;background:var(--primary-background);color:var(--primary-foreground);"></span>
              </div>
              <div id="irb-pdp-installments" style="font-size:13px;margin-top:6px;opacity:0.85;"></div>
            </div>

            <div>
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Selecione uma opção:</div>
              <div class="pdpSizeList" id="irb-pdp-sizes">
                ${variationSizes
                  .map(
                    (s, i) =>
                      `<button type="button" class="pdpSizeBtn ${i === 0 ? "active" : ""}" data-size-opt="${escapeAttr(s)}">${escapeHtml(s)}</button>`
                  )
                  .join("")}
              </div>
            </div>

            <div class="pdpBuyRow">
              <div class="pdpQtyBox">
                <button type="button" id="irb-pdp-qty-dec" aria-label="Diminuir">−</button>
                <span id="irb-pdp-qty">1</span>
                <button type="button" id="irb-pdp-qty-inc" aria-label="Aumentar">+</button>
              </div>
              <button type="button" id="irb-pdp-add" class="product-btn" style="flex:1;padding:14px 20px;font-size:15px;">
                ${IRROBA_ICONS.shoppingBag}
                <span>${escapeHtml(bp.visualOverrides.pageProduct.buyButtonText)}</span>
              </button>
            </div>

            <div class="pdpShippingBox">
              <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;margin-bottom:8px;">
                ${IRROBA_ICONS.truck}
                <span>Calcular Frete e Prazo</span>
              </div>
              <form id="irb-cep-form" style="display:flex;gap:8px;">
                <input type="text" id="irb-cep-input" placeholder="Digite seu CEP (ex: 14400-000)" style="flex:1;padding:9px 12px;border:1px solid ${G.gray300};border-radius:var(--irb-radius);font-size:13px;" />
                <button type="submit" style="padding:9px 16px;border:none;border-radius:var(--irb-radius);background:var(--primary-background);color:var(--primary-foreground);font-weight:700;font-size:13px;cursor:pointer;">Calcular</button>
              </form>
              <div id="irb-cep-result" style="margin-top:8px;font-size:12px;color:${G.gray700};display:none;"></div>
            </div>

            <div style="border-top:1px solid rgba(0,0,0,0.08);padding-top:16px;">
              <h3 style="margin:0 0 8px;font-size:15px;">Descrição do Produto</h3>
              <p id="irb-pdp-desc" style="font-size:14px;line-height:1.6;opacity:0.88;margin:0;"></p>
            </div>
          </div>
        </div>

        <section style="border-top:1px solid rgba(0,0,0,0.08);padding:38px 0 56px;">
          <h2 class="productList__title" style="font-size:24px;margin-bottom:20px;">Produtos Relacionados</h2>
          <div class="productList__grid" id="irb-pdp-related"></div>
        </section>
      </div>
    </div>`;
}
