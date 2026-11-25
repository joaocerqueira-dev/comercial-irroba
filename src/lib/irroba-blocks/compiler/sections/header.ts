import { IRROBA_ICONS } from "../../icons";
import { escapeAttr, escapeHtml, sanitizeUrl } from "../../sanitize";
import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { StorefrontContext } from "../context";

/** Chips de categoria usados no modal de pesquisa e na página de categoria. */
export function renderCategoryPillsHtml(bp: StoreBlueprint): string {
  return bp.sections.categories
    .slice(0, 8)
    .map(
      (c) =>
        `<button type="button" class="catFilterChip" data-filter-cat="${escapeAttr(c.label)}">${escapeHtml(c.label)}</button>`
    )
    .join("");
}

/** Cabeçalho LIME (logo, navegação, conta, sacola) + modal de pesquisa. */
export function renderHeader(bp: StoreBlueprint, ctx: StorefrontContext): string {
  const { headerPosClass } = ctx;
  const logoHtml = bp.brand.logoUrl
    ? `<img src="${escapeAttr(sanitizeUrl(bp.brand.logoUrl))}" alt="${escapeAttr(bp.brand.name)}" class="headerContent_logo_img" />`
    : `<span class="headerContent_logo_text">${escapeHtml(bp.brand.name)}</span>`;

  const navLinksHtml = bp.sections.categories
    .slice(0, 8)
    .map(
      (c) =>
        `<a href="#categoria" class="categoryLink" data-filter-cat="${escapeAttr(c.label)}">${escapeHtml(c.label)}</a>`
    )
    .join("");
  const categoryPillsHtml = renderCategoryPillsHtml(bp);

  return `  <div class="irb-account-backdrop" id="irb-account-backdrop" aria-hidden="true"></div>

  <header class="irb-header ${headerPosClass}">
    <div class="container">
      <div class="headerContent headerContent--${bp.theme.headerLayout}">
        <div class="headerLeftGroup">
          <button type="button" class="headerMenuBtn" id="irb-open-mobile-menu" aria-label="Abrir menu">
            ${IRROBA_ICONS.menu}
          </button>
          <a href="#home" class="headerContent_logo" id="irb-go-home-logo">${logoHtml}</a>
        </div>

        ${
          bp.theme.headerLayout === "layout-1"
            ? `<nav class="headerContent_navInline" aria-label="Categorias">
          <a href="#home" class="categoryLink active" data-go-home="1">Início</a>
          ${navLinksHtml}
        </nav>`
            : ""
        }

        <div class="headerContent_actions">
          <button type="button" class="headerIconBtn" id="irb-toggle-search" aria-label="Pesquisar" title="Pesquisar">
            ${IRROBA_ICONS.search}
          </button>
          <div class="headerAccountWrap" id="irb-account-wrap">
            <button type="button" class="headerIconBtn" id="irb-open-account" aria-label="Minha Conta" aria-expanded="false" aria-haspopup="menu" title="Minha Conta">
              ${IRROBA_ICONS.person}
            </button>
            <div class="irb-account-dropdown" id="irb-account-dropdown" role="menu" aria-label="Opções da conta">
              <button type="button" class="irb-account-dropdown__item irb-account-dropdown__item--primary" data-account-action="login" role="menuitem">
                ${IRROBA_ICONS.person}
                <span>Entrar</span>
              </button>
              <button type="button" class="irb-account-dropdown__item irb-account-dropdown__item--secondary" data-account-action="register" role="menuitem">
                <span class="irb-account-dropdown__plus">+</span>
                <span>Criar conta</span>
              </button>
            </div>
          </div>
          <button type="button" class="headerIconBtn" id="irb-open-cart" aria-label="Sacola" title="Sacola">
            ${IRROBA_ICONS.shoppingBag}
            <span class="cartCountBadge" id="irb-cart-count">0</span>
          </button>
        </div>
      </div>

      ${
        bp.theme.headerLayout !== "layout-1"
          ? `<nav class="headerContent_categories" aria-label="Categorias">
        <a href="#home" class="categoryLink active" data-go-home="1">Início</a>
        ${navLinksHtml}
      </nav>`
          : ""
      }
    </div>
  </header>

  <!-- Pop-up Modal de Pesquisa (Padrão Tema LIME) -->
  <div class="irb-search-modal-backdrop" id="irb-search-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Pesquisar na loja">
    <div class="irb-search-modal-card" id="irb-search-modal-card">
      <div class="irb-search-modal-top">
        <form class="headerContent_search" id="irb-search-form">
          <input type="search" id="irb-search-input" placeholder="O que você está procurando?" aria-label="Buscar produtos" autocomplete="off" />
          <button type="submit" class="headerSearchSubmit" aria-label="Pesquisar">
            ${IRROBA_ICONS.search}
          </button>
        </form>
        <button type="button" class="headerSearchClose" id="irb-close-search" aria-label="Fechar busca">&times;</button>
      </div>
      <div class="irb-search-modal-body">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${G.gray500};margin-bottom:8px;">Categorias populares</div>
        <div class="catFilterChips" style="margin-bottom:14px;">${categoryPillsHtml}</div>
        <div id="irb-search-live-title" style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${G.gray500};">Sugestões em destaque</div>
        <div class="irb-search-results" id="irb-search-live-results"></div>
      </div>
    </div>
  </div>`;
}
