import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";

/** Drawers, modal de conta e prefers-reduced-motion. */
export function cssOverlays(): string {
  return `
    /* Drawers & Account Modal */
    .irb-drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(17, 24, 39, 0.55);
      z-index: 110;
      display: none;
      justify-content: flex-end;
    }
    .irb-drawer-backdrop.open { display: flex; }
    .irb-drawer-backdrop.left { justify-content: flex-start; }
    .irb-drawer-panel {
      width: 100%;
      max-width: 390px;
      background: #ffffff;
      color: ${G.gray900};
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 20px;
    }
    .mobileNavLink {
      display: block;
      padding: 12px 4px;
      border-bottom: 1px solid ${G.gray100};
      color: ${G.gray900};
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }
    .irb-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(17, 24, 39, 0.65);
      z-index: 120;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .irb-modal-backdrop.open { display: flex; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }`;
}
