import { STOREFRONT_GRAYS as G } from "@/lib/layout-patterns";

/** Depoimentos, newsletter e rodapé. */
export function cssFooter(): string {
  return `
    /* Depoimentos (.reviewModule) */
    .reviewModule { padding: 46px 0; background: var(--neutral-background); color: var(--neutral-foreground); }
    .reviewGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    @media (max-width: 768px) { .reviewGrid { grid-template-columns: 1fr; } }
    .reviewCard { background: #ffffff; color: ${G.gray900}; padding: 22px; border-radius: var(--irb-radius); border: 1px solid rgba(0, 0, 0, 0.06); }
    .reviewCard__stars { color: #f59e0b; font-size: 16px; margin-bottom: 8px; }
    .reviewCard__text { font-size: 14px; line-height: 1.5; color: ${G.gray700}; margin: 0 0 12px; }
    .reviewCard__author { font-size: 13px; font-weight: 700; color: ${G.gray900}; }

    /* Newsletter (.newsletterModule) */
    .newsletterModule { padding: 44px 0; background: var(--body-background); border-top: 1px solid rgba(0, 0, 0, 0.06); }
    .newsletterBox {
      background: var(--neutral-background);
      color: var(--neutral-foreground);
      border-radius: var(--irb-radius);
      padding: 32px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .newsletterForm { display: flex; gap: 10px; flex: 1 1 320px; max-width: 460px; }
    .newsletterForm input { flex: 1; padding: 12px 14px; border-radius: var(--irb-radius); border: 1px solid ${G.gray300}; font-size: 14px; }
    .newsletterForm button {
      background: var(--btn-primary-background);
      color: var(--btn-primary-color);
      border: 1px solid var(--btn-primary-border);
      padding: 12px 20px;
      border-radius: var(--irb-radius);
      font-weight: 700;
      cursor: pointer;
    }

    /* Rodapé */
    .footerContent--top { background: var(--footer-background); color: var(--footer-foreground); padding: 44px 0; }
    .footerGrid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 28px; }
    @media (max-width: 768px) { .footerGrid { grid-template-columns: 1fr; } }
    .footerTitle { font-size: 16px; font-weight: 700; margin: 0 0 12px; }
    .footerText { font-size: 14px; line-height: 1.6; opacity: 0.88; margin: 0; }
    .footerList { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
    .footerList a { color: inherit; text-decoration: none; opacity: 0.88; cursor: pointer; }
    .footerList a:hover { opacity: 1; text-decoration: underline; }
    .footerContent--bottom {
      background: var(--footer-background);
      color: var(--footer-foreground);
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding: 18px 0;
      font-size: 12px;
      opacity: 0.95;
    }
    .footer-legal-info {
      background: var(--footerLegal-background);
      color: var(--footerLegal-foreground);
      text-align: center;
      padding: 14px 20px;
      font-size: 12px;
    }`;
}
