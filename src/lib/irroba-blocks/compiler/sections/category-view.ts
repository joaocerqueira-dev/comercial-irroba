import { escapeAttr, escapeHtml } from "../../sanitize";
import { IRROBA_ICONS } from "../../icons";
import type { StoreBlueprint } from "@/lib/types/blueprint";

/** View de categoria/busca (.pageLayout--category). */
export function renderCategoryView(bp: StoreBlueprint): string {
  const visibleProducts = bp.products.filter((p) => p.visible !== false);
  return `    <!-- 2. VIEW: TELA DE CATEGORIA / BUSCA (.pageLayout--category com Filtro Lateral Esquerdo Irroba) -->
    <div id="irb-view-category" class="storeView">
      <div class="container">
        <nav class="irb-breadcrumb" aria-label="Breadcrumb">
          <button type="button" data-go-home="1">Início</button>
          <span>/</span>
          <strong id="irb-cat-breadcrumb" style="color:var(--body-foreground);">Categoria</strong>
        </nav>

        <div class="categoryHeroHeader">
          <div>
            <span style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;opacity:0.7;">Departamento</span>
            <h2 id="irb-cat-title" style="margin:4px 0 6px;font-size:32px;line-height:1.15;">Categoria</h2>
            <p id="irb-cat-count" style="margin:0;font-size:14px;opacity:0.8;">0 produtos encontrados</p>
          </div>
          <button type="button" data-go-home="1" class="product-btn" style="width:auto;padding:10px 18px;">Voltar à Página Inicial</button>
        </div>

        <div class="irb-cat-filter-backdrop" id="irb-cat-filter-backdrop" aria-hidden="true"></div>

        <div class="pageContent pageContent--category">
          <aside class="pageColumnLeft categorySidebar" id="irb-cat-sidebar" aria-label="Filtros da categoria">
            <div class="categorySidebar__head">
              <strong style="font-size:15px;color:#111827;">Filtrar Produtos</strong>
              <button type="button" class="categorySidebar__close" id="irb-cat-filter-close" aria-label="Fechar filtros">${IRROBA_ICONS.close}</button>
            </div>

            <div class="irb-active-filters" id="irb-active-filters"></div>

            <details open class="filters filter-category-container">
              <summary>
                <span class="filter-title">Categorias</span>
                ${IRROBA_ICONS.chevronDown}
              </summary>
              <ul class="filterSidebarList" id="irb-sidebar-cats">
                <li>
                  <button type="button" class="filterSidebarBtn active" data-sidebar-cat="all">
                    <span>Todos os produtos</span>
                    <span class="filterSidebarCount" data-cat-count="all">${visibleProducts.length}</span>
                  </button>
                </li>
                ${bp.sections.categories
                  .slice(0, 12)
                  .map(
                    (c) => `<li>
                  <button type="button" class="filterSidebarBtn" data-sidebar-cat="${escapeAttr(c.label)}">
                    <span>${escapeHtml(c.label)}</span>
                    <span class="filterSidebarCount" data-cat-count="${escapeAttr(c.label.toLowerCase())}">0</span>
                  </button>
                </li>`
                  )
                  .join("")}
              </ul>
            </details>

            <details open class="filters filter-price-container" data-price-name="Faixa de Preço">
              <summary>
                <span class="filter-title">Faixa de Preço</span>
                ${IRROBA_ICONS.chevronDown}
              </summary>
              <div class="filterPricePresets" id="irb-price-presets">
                <button type="button" class="filterPresetBtn" data-price-min="" data-price-max="150">Até R$ 150</button>
                <button type="button" class="filterPresetBtn" data-price-min="150" data-price-max="350">R$ 150 – R$ 350</button>
                <button type="button" class="filterPresetBtn" data-price-min="350" data-price-max="">Acima de R$ 350</button>
              </div>
              <div class="range_inputs">
                <div>
                  <label for="min-price-input">Mínimo (R$)</label>
                  <input type="number" min="0" step="1" id="min-price-input" class="price-input" placeholder="0" />
                </div>
                <div>
                  <label for="max-price-input">Máximo (R$)</label>
                  <input type="number" min="0" step="1" id="max-price-input" class="price-input" placeholder="9999" />
                </div>
              </div>
            </details>

            <details open class="filters filter-promo-container">
              <summary>
                <span class="filter-title">Ofertas</span>
                ${IRROBA_ICONS.chevronDown}
              </summary>
              <label class="filterCheckboxLabel">
                <input type="checkbox" id="irb-filter-promo-only" />
                <span>Apenas em promoção</span>
              </label>
            </details>

            <div class="filterActionContainer">
              <button type="button" id="irb-apply-filters-btn" class="filter-button">Aplicar</button>
              <button type="button" id="irb-clear-filters-btn" class="clear-filters">Limpar</button>
            </div>
          </aside>

          <div id="mainContent" class="pageContent__main">
            <div class="pageControls pageControls--category">
              <div class="toolbar-shop">
                <div class="toolbar-shop-left">
                  <button type="button" class="customFilterV2-toggle" id="irb-open-cat-filters" aria-label="Abrir filtros">
                    ${IRROBA_ICONS.sliders}
                    <span>Filtrar</span>
                    <span id="irb-cat-filter-badge" style="display:none;padding:1px 6px;border-radius:999px;background:rgba(255,255,255,0.25);font-size:11px;">0</span>
                  </button>
                  <div class="toolbar-shop-sorter">
                    <span>Visualização:</span>
                    <button type="button" class="js-changeGrid active" data-grid-cols="3" title="3 colunas" aria-label="Exibir 3 produtos por linha">${IRROBA_ICONS.grid3}</button>
                    <button type="button" class="js-changeGrid" data-grid-cols="4" title="4 colunas" aria-label="Exibir 4 produtos por linha">${IRROBA_ICONS.grid4}</button>
                  </div>
                </div>
                <select id="irb-cat-sort" class="categorySortSelect" aria-label="Ordenar produtos">
                  <option value="relevance">Ordenar: Padrão</option>
                  <option value="name-asc">Nome (A - Z)</option>
                  <option value="name-desc">Nome (Z - A)</option>
                  <option value="price-asc">Menor Preço</option>
                  <option value="price-desc">Maior Preço</option>
                  <option value="discount-desc">Maiores Descontos</option>
                </select>
              </div>
            </div>

            <div class="productList__grid productList--category" id="irb-cat-grid"></div>
          </div>
        </div>
      </div>
    </div>`;
}
