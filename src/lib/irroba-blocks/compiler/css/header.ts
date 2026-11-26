import { CONTAINER_WIDTH_PX } from "@/lib/layout-patterns";
import type { StorefrontContext } from "../context";

/** Barra de aviso (ticker) e cabeçalho LIME. */
export function cssHeader(ctx: StorefrontContext): string {
  const { headerBgCss, effectiveHeaderBlur, headerBorderAlpha, logoHeightPx } = ctx;
  return `    /* Tarja Informativa (.overlineModule) + Ticker Rolante */
    .overlineModule {
      background: var(--announcement-background);
      color: var(--announcement-foreground);
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      padding: 8px 16px;
      letter-spacing: 0.03em;
    }
    .overlineModule--ticker {
      position: relative;
      overflow: hidden;
      min-height: 34px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .overlineModule__track {
      position: relative;
      width: 100%;
      max-width: ${CONTAINER_WIDTH_PX}px;
      height: 34px;
      overflow: hidden;
    }
    .overlineModule__slide {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0;
      transform: translate3d(0, 100%, 0);
      transition: transform 0.48s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.38s ease;
      pointer-events: none;
      will-change: transform, opacity;
    }
    .overlineModule--ticker[data-transition="slide-horizontal"] .overlineModule__slide {
      transform: translate3d(100%, 0, 0);
    }
    .overlineModule--ticker[data-transition="fade"] .overlineModule__slide {
      transform: translate3d(0, 0, 0);
    }
    .overlineModule--ticker .overlineModule__slide.is-resetting {
      transition: none !important;
      opacity: 0;
    }
    .overlineModule--ticker .overlineModule__slide.is-active,
    .overlineModule--ticker[data-transition="slide-horizontal"] .overlineModule__slide.is-active,
    .overlineModule--ticker[data-transition="fade"] .overlineModule__slide.is-active {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      pointer-events: auto;
    }
    .overlineModule--ticker .overlineModule__slide.is-leaving {
      opacity: 0;
      transform: translate3d(0, -100%, 0);
    }
    .overlineModule--ticker[data-transition="slide-horizontal"] .overlineModule__slide.is-leaving {
      opacity: 0;
      transform: translate3d(-100%, 0, 0);
    }
    .overlineModule--ticker[data-transition="fade"] .overlineModule__slide.is-leaving {
      opacity: 0;
      transform: translate3d(0, 0, 0);
    }

    /* Cabeçalho Tema LIME (.headerContent) — Fundo independente da Logo + Posicionamento fiel */
    header.irb-header {
      background: ${headerBgCss};
      color: var(--header-foreground);
      backdrop-filter: ${effectiveHeaderBlur > 0 ? `blur(${effectiveHeaderBlur}px)` : "none"};
      -webkit-backdrop-filter: ${effectiveHeaderBlur > 0 ? `blur(${effectiveHeaderBlur}px)` : "none"};
      border-bottom: 1px solid rgba(0, 0, 0, ${headerBorderAlpha});
      z-index: 60;
      width: 100%;
      position: relative;
    }
    header.header--sticky {
      position: sticky;
      top: 0;
    }
    header.header--overlay {
      position: sticky;
      top: 0;
    }
    body:not(.irb-subview-active) header.header--overlay {
      margin-bottom: calc(-1 * var(--irb-header-height, 76px));
    }
    .headerContent {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 14px 0;
    }
    .headerContent--layout-2 { flex-direction: column; gap: 10px; }
    .headerLeftGroup { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .headerMenuBtn {
      display: none;
      background: transparent;
      border: none;
      color: var(--header-foreground);
      padding: 6px;
      cursor: pointer;
    }
    .headerContent_logo {
      display: flex;
      align-items: center;
      text-decoration: none;
      cursor: pointer;
      opacity: 1;
      position: relative;
      z-index: 2;
    }
    .headerContent_logo_img {
      max-height: ${logoHeightPx}px;
      max-width: 210px;
      object-fit: contain;
      opacity: 1;
      display: block;
    }
    .headerContent_logo_text {
      font-family: var(--title-font-family);
      font-size: 24px;
      font-weight: 700;
      color: var(--header-foreground);
      opacity: 1;
    }
    .headerContent_navInline {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: center;
      gap: 14px;
      flex: 1 1 auto;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 0 12px;
    }
    .headerContent_navInline::-webkit-scrollbar { display: none; }
    .headerContent_actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .headerIconBtn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: transparent;
      color: var(--header-foreground);
      border: none;
      border-radius: 999px;
      padding: 0;
      cursor: pointer;
      transition: background .15s ease, opacity .15s ease;
    }
    .headerIconBtn:hover { background: rgba(0, 0, 0, 0.06); }
    .headerIconBtn.is-active { background: rgba(0, 0, 0, 0.09); }
    .cartCountBadge {
      position: absolute;
      top: 3px;
      right: 2px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 17px;
      height: 17px;
      padding: 0 4px;
      border-radius: 999px;
      background: var(--primary-background);
      color: var(--primary-foreground);
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
    }`;
}
