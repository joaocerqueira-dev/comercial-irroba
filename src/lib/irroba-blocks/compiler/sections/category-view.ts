import type { StoreBlueprint } from "@/lib/types/blueprint";
import { renderCategoryPillsHtml } from "./header";

/** View de categoria/busca (.pageLayout--category). */
export function renderCategoryView(bp: StoreBlueprint): string {
  const categoryPillsHtml = renderCategoryPillsHtml(bp);
  return `    <!-- 2. VIEW: TELA DE CATEGORIA / BUSCA (.pageLayout--category) -->
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

        <div class="categoryToolbar">
          <div class="catFilterChips" id="irb-cat-chips">
            <button type="button" class="catFilterChip" data-filter-cat="all">Todos os produtos</button>
            ${categoryPillsHtml}
          </div>
          <select id="irb-cat-sort" class="categorySortSelect" aria-label="Ordenar produtos">
            <option value="relevance">Ordenar: Mais relevantes</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
            <option value="name-asc">Nome (A–Z)</option>
          </select>
        </div>

        <div class="productList__grid" id="irb-cat-grid" style="padding-bottom:56px;"></div>
      </div>
    </div>`;
}
