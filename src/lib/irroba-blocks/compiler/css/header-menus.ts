import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";
import type { StoreBlueprint } from "@/lib/types/blueprint";
import type { StorefrontContext } from "../context";

/** Dropdown da conta, modal de pesquisa, menu de categorias e media queries do cabeçalho. */
export function cssHeaderMenus(bp: StoreBlueprint, ctx: StorefrontContext): string {
  const { headerOpacity, navHoverStyle } = ctx;
  return `    /* Dropdown Minha Conta abaixo do ícone com Blur no fundo */
    .headerAccountWrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .irb-account-backdrop {
      position: fixed;
      inset: 0;
      z-index: 55;
      background: rgba(15, 23, 42, 0.18);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      display: none;
    }
    .irb-account-backdrop.open { display: block; }
    .irb-account-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      min-width: 215px;
      padding: 8px;
      border-radius: calc(var(--irb-radius) + 4px);
      background: rgba(255, 255, 255, 0.86);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(255, 255, 255, 0.65);
      box-shadow: 0 20px 44px rgba(15, 23, 42, 0.2);
      z-index: 90;
      display: none;
      flex-direction: column;
      gap: 6px;
      animation: irbPopIn .16s ease-out;
    }
    .irb-account-dropdown.open { display: flex; }
    .irb-account-dropdown__item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: var(--irb-radius);
      font-family: var(--text-font-family);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-align: left;
      transition: transform .12s ease, opacity .15s ease, background .15s ease;
    }
    .irb-account-dropdown__item--primary {
      background: var(--btn-primary-background);
      color: var(--btn-primary-color);
      border: 1px solid var(--btn-primary-border);
    }
    .irb-account-dropdown__item--primary:hover { opacity: 0.92; }
    .irb-account-dropdown__item--secondary {
      background: rgba(17, 24, 39, 0.05);
      color: ${G.gray900};
      border: 1px solid rgba(17, 24, 39, 0.12);
    }
    .irb-account-dropdown__item--secondary:hover { background: rgba(17, 24, 39, 0.1); }
    .irb-account-dropdown__plus {
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      font-weight: 700;
      line-height: 1;
    }
    /* Pop-up Modal de Pesquisa (Padrão Tema LIME) */
    .irb-search-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.56);
      backdrop-filter: blur(4px);
      z-index: 130;
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding: 72px 16px 24px;
    }
    .irb-search-modal-backdrop.open { display: flex; }
    .irb-search-modal-card {
      width: 100%;
      max-width: 640px;
      background: #ffffff;
      color: ${G.gray900};
      border-radius: calc(var(--irb-radius) + 6px);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.24);
      overflow: hidden;
      animation: irbPopIn .18s ease-out;
    }
    @keyframes irbPopIn {
      from { opacity: 0; transform: translateY(-10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .irb-search-modal-top {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 18px;
      border-bottom: 1px solid ${G.gray200};
    }
    .headerContent_search {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
    }
    .headerContent_search input {
      width: 100%;
      padding: 10px 42px 10px 14px;
      border-radius: var(--irb-radius);
      border: 1px solid ${G.gray300};
      font-family: var(--text-font-family);
      font-size: 15px;
      outline: none;
      background: ${G.gray50};
      color: ${G.gray900};
    }
    .headerContent_search input:focus { border-color: var(--primary-background); background: #ffffff; }
    .headerSearchSubmit {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      color: ${G.gray700};
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .headerSearchClose {
      border: none;
      background: ${G.gray100};
      color: ${G.gray700};
      font-size: 20px;
      line-height: 1;
      width: 36px;
      height: 36px;
      border-radius: 999px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .headerSearchClose:hover { background: ${G.gray200}; }
    .irb-search-modal-body {
      padding: 16px 18px 20px;
      max-height: 60vh;
      overflow-y: auto;
    }
    .irb-search-results { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    .irb-search-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: var(--irb-radius);
      border: 1px solid ${G.gray100};
      background: #ffffff;
      cursor: pointer;
      text-align: left;
      width: 100%;
      transition: background .15s, border-color .15s;
    }
    .irb-search-item:hover { background: ${G.gray50}; border-color: ${G.gray300}; }
    .irb-search-item img { width: 46px; height: 46px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
    .headerContent_categories {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      padding: 10px 0 14px;
      border-top: 1px solid rgba(0, 0, 0, ${Number((0.06 * headerOpacity).toFixed(4))});
    }
    .categoryLink {
      text-decoration: none;
      color: var(--header-foreground);
      font-size: 12px;
      font-weight: 500;
      text-transform: ${bp.visualOverrides.header.categoryCase === "normal" ? "none" : bp.visualOverrides.header.categoryCase};
      letter-spacing: 0.04em;
      white-space: nowrap;
      flex-shrink: 0;
      padding: ${navHoverStyle === "pill" ? "6px 12px" : navHoverStyle === "bottom-bar" ? "6px 2px" : "2px 0"};
      border-radius: ${navHoverStyle === "pill" ? "999px" : "0"};
      transition: color .16s ease, background-color .16s ease, box-shadow .16s ease, opacity .16s ease;
      cursor: pointer;
    }
    .categoryLink:hover, .categoryLink.active {
      color: var(--header-link-hover-color);
      opacity: 1;
      ${
        navHoverStyle === "pill"
          ? "background: var(--header-link-hover-bg); text-decoration: none;"
          : navHoverStyle === "bottom-bar"
            ? "box-shadow: inset 0 -2px 0 0 var(--header-link-hover-color); text-decoration: none;"
            : navHoverStyle === "color-only"
              ? "text-decoration: none;"
              : "text-decoration: underline; text-underline-offset: 5px;"
      }
    }

    @media (max-width: 900px) {
      .headerMenuBtn { display: inline-flex; flex-shrink: 0; }
      .headerContent_navInline, .headerContent_categories { display: none; }
      .headerLeftGroup { min-width: 0; flex: 1 1 auto; }
      .headerContent_logo { min-width: 0; max-width: 100%; }
      .headerContent_logo_text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    }
    @media (max-width: 640px) {
      .container { padding: 0 12px; }
      .headerContent { gap: 8px; padding: 10px 0; }
      .headerLeftGroup { gap: 6px; min-width: 0; flex: 1 1 auto; }
      .headerContent_logo { min-width: 0; max-width: 100%; }
      .headerContent_logo_img { max-height: 34px; max-width: 128px; }
      .headerContent_logo_text { font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .headerContent_actions { gap: 2px; flex-shrink: 0; }
      .headerIconBtn { width: 34px; height: 34px; }
    }`;
}
